import { waitUntil } from "cloudflare:workers";
import { z } from "zod";
import {
  createDataforseoClient,
  SERP_ANALYSIS_DEPTH,
} from "@/server/lib/dataforseo";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import { mcpResponse } from "@/server/mcp/formatters";
import { buildProjectMeta } from "@/server/mcp/context";
import { optionalMetaOutputSchema } from "@/server/mcp/output-schemas";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import { resolveMarket } from "@/shared/keyword-locations";
import { assertLocalResearchLocation } from "@/server/features/keywords/services/research/local-volume";
import { toolErrorMessage } from "@/server/mcp/tool-error-message";
import { formatMcpTable, type McpTableColumn } from "@/server/mcp/table";
import {
  languageCodeSchema,
  locationCodeSchema,
  projectIdSchema,
} from "@/server/mcp/schemas";

// A repeat within this window is answered from the saved rows, uncharged, so a
// caller that lost a response can call again instead of paying twice.
const SERP_RESULTS_CACHE_TTL_SECONDS = 12 * 60 * 60;

const paaSourceSchema = z.looseObject({
  title: z.string().nullable(),
  url: z.string(),
});
const paaAnswerSchema = z.looseObject({
  text: z.string().nullable(),
  sources: z.array(paaSourceSchema),
});
const paaQuestionSchema = z.looseObject({
  question: z.string(),
  answers: z.array(paaAnswerSchema),
});

const providerQuestionSchema = z.object({
  title: z.string().trim().min(1),
  expanded_element: z.array(z.unknown()).nullish(),
});
const providerSourceSchema = z.object({
  title: z.string().nullish(),
  url: z.string().trim().min(1),
});
const providerAnswerSchema = z.object({
  description: z.string().nullish(),
  text: z.string().nullish(),
  markdown: z.string().nullish(),
  title: z.string().nullish(),
  url: z.string().nullish(),
  references: z.array(z.unknown()).nullish(),
  items: z.array(z.unknown()).nullish(),
  components: z.array(z.unknown()).nullish(),
});

// PAA may already contain a regular snippet or a nested AI answer. Only read
// what the original SERP returned; never expand questions or fetch source URLs.
function readPaaAnswers(
  elements: unknown[],
): z.infer<typeof paaAnswerSchema>[] {
  return elements.flatMap((element) => {
    const parsed = providerAnswerSchema.safeParse(element);
    if (!parsed.success) return [];
    const answer = parsed.data;
    const text =
      answer.description?.trim() ||
      answer.text?.trim() ||
      answer.markdown?.trim() ||
      null;
    const sources = [answer, ...(answer.references ?? [])].flatMap((source) => {
      const parsedSource = providerSourceSchema.safeParse(source);
      return parsedSource.success
        ? [
            {
              title: parsedSource.data.title ?? null,
              url: parsedSource.data.url,
            },
          ]
        : [];
    });
    return [
      ...(text || sources.length ? [{ text, sources }] : []),
      ...readPaaAnswers([
        ...(answer.items ?? []),
        ...(answer.components ?? []),
      ]),
    ];
  });
}

function readPaaQuestions(items: unknown): z.infer<typeof paaQuestionSchema>[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const parsed = providerQuestionSchema.safeParse(item);
    return parsed.success
      ? [
          {
            question: parsed.data.title,
            answers: readPaaAnswers(parsed.data.expanded_element ?? []),
          },
        ]
      : [];
  });
}

const serpItemSchema = z
  .object({
    type: z.string().nullable().optional(),
    rank: z.number().nullable(),
    title: z.string().nullable(),
    url: z.string().nullable(),
    domain: z.string().nullable(),
    description: z.string().nullable(),
    questions: z.array(paaQuestionSchema).optional(),
  })
  .passthrough();

type SerpItem = z.infer<typeof serpItemSchema>;

const SERP_ITEM_COLUMNS: McpTableColumn<SerpItem>[] = [
  { header: "rank", value: (item) => item.rank },
  { header: "domain", value: (item) => item.domain },
  { header: "title", value: (item) => item.title },
  { header: "url", value: (item) => item.url },
];

const querySchema = z.object({
  keyword: z.string().min(1).describe("Search query to fetch the SERP for."),
  locationCode: locationCodeSchema.optional(),
  languageCode: languageCodeSchema.optional(),
  locationName: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional city, county, or region inside the query's country, for a local SERP. Call search_serp_locations first and pass its locationName verbatim. Same price as a national SERP.",
    ),
});

const inputSchema = {
  projectId: projectIdSchema,
  includePaa: z
    .boolean()
    .optional()
    .describe(
      "Include People Also Ask questions, available answer snippets, and source URLs from the same SERP response. Default false. No extra clicks or API requests; answers may be empty. This option has a separate 12-hour cache entry.",
    ),
  queries: z
    .array(querySchema)
    .min(1)
    .max(10)
    .describe(
      "1-10 queries. Bulk-friendly — prefer this over multiple single-query calls.",
    ),
  depth: z
    .number()
    .int()
    .min(10)
    .max(100)
    .multipleOf(10)
    .optional()
    .describe(
      "How many SERP rows to crawl per keyword — a multiple of 10 from 10 to 100, default 20. Google has no offset, so a deeper crawl re-fetches the top too: each additional 10 adds ~2.5 credits per keyword. Only raise it when you need ranks past the top 20.",
    ),
} as const;

type Args = z.infer<z.ZodObject<typeof inputSchema>>;

export const getSerpResultsTool = {
  name: "get_serp_results",
  config: {
    title: "Get Google SERP results",
    description:
      "Fetch live Google organic search results for 1-10 keywords. Use this to inspect who ranks for a query, verify competitors, compare SERPs across keywords, or gather source URLs before content planning. Returns the top `depth` result rows per keyword (default 20). Charges credits per keyword: ~5 each at the default depth 20, and each additional 10 of depth adds ~2.5. A keyword fetched in this project in the last 12 hours with the same market and depth returns those rows again at no charge once the original call has finished, so if a response is lost, wait a minute and repeat the same call. Per-keyword errors don't fail the batch.",
    inputSchema,
    outputSchema: z.looseObject({
      results: z.array(
        z.union([
          z
            .object({
              keyword: z.string(),
              ok: z.literal(true),
              items: z.array(serpItemSchema),
            })
            .passthrough(),
          z
            .object({
              keyword: z.string(),
              ok: z.literal(false),
              error: z.string(),
            })
            .passthrough(),
        ]),
      ),
      ...optionalMetaOutputSchema,
    }),
    annotations: {
      readOnlyHint: false,
      openWorldHint: true,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: Args, context) => {
    const client = createDataforseoClient(context.billing);
    const depth = args.depth ?? SERP_ANALYSIS_DEPTH;
    const results = await Promise.all(
      args.queries.map(async (q) => {
        try {
          const market = resolveMarket(q, context.project);
          if (q.locationName) {
            await assertLocalResearchLocation(
              market.locationCode,
              q.locationName,
            );
          }
          const cacheKey = await buildCacheKey("mcp:serp-results", {
            organizationId: context.billing.organizationId,
            projectId: args.projectId,
            keyword: q.keyword,
            ...market,
            locationName: q.locationName,
            depth,
            ...(args.includePaa ? { includePaa: true } : {}),
          });
          const cached = z
            .array(serpItemSchema)
            .safeParse(await getCached(cacheKey));
          if (cached.success) {
            return {
              keyword: q.keyword,
              ok: true as const,
              items: cached.data,
            };
          }

          const items = await client.serp.live({
            keyword: q.keyword,
            ...market,
            locationName: q.locationName,
            depth,
          });
          // Trim noise — return only essentials per item.
          const trimmed = items.slice(0, depth).map((item) => ({
            type: item.type,
            rank: item.rank_absolute ?? item.rank_group ?? null,
            title: item.title ?? null,
            url: item.url ?? null,
            domain: item.domain ?? null,
            description: item.description ?? null,
            ...(args.includePaa && item.type === "people_also_ask"
              ? { questions: readPaaQuestions(item.items) }
              : {}),
          }));
          // DataForSEO reports "no results" transiently; don't pin that for
          // the whole window. waitUntil, not void: workerd cancels
          // unregistered pending I/O once the response is sent.
          if (trimmed.length > 0) {
            waitUntil(
              setCached(
                cacheKey,
                trimmed,
                SERP_RESULTS_CACHE_TTL_SECONDS,
              ).catch((error) => {
                console.error("mcp.serp-results.cache-write failed:", error);
              }),
            );
          }
          return { keyword: q.keyword, ok: true as const, items: trimmed };
        } catch (error) {
          return {
            keyword: q.keyword,
            ok: false as const,
            error: toolErrorMessage(error),
          };
        }
      }),
    );

    const okCount = results.filter((r) => r.ok).length;
    const text =
      results
        .map((r) => {
          if (!r.ok) {
            return `"${r.keyword}": FAILED — ${r.error}`;
          }
          if (r.items.length === 0) {
            return `"${r.keyword}" (0 results)`;
          }
          const questions = r.items.flatMap((item) => item.questions ?? []);
          const paaText = questions.length
            ? `\n\nPeople Also Ask:\n${formatMcpTable(questions, [
                { header: "question", value: (q) => q.question },
                { header: "answers", value: (q) => q.answers },
              ])}`
            : "";
          return `"${r.keyword}" (${r.items.length} results):\n${formatMcpTable(r.items, SERP_ITEM_COLUMNS)}${paaText}`;
        })
        .join("\n\n") +
      `\n\n${okCount} of ${results.length} queries succeeded.`;

    return mcpResponse({
      text,
      meta: buildProjectMeta(
        context,
        args.projectId,
        `/p/${args.projectId}/keywords`,
      ),
      structuredContent: { results },
    });
  }),
};
