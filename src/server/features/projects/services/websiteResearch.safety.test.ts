import { beforeEach, expect, it, vi } from "vitest";
import type * as Serp from "@/server/lib/dataforseo/serp";
import type * as Ai from "ai";

const {
  generateText,
  readSite,
  search,
  listSections,
  listCompetitors,
  listKeywords,
  enforceSafetyLimits,
} = vi.hoisted(() => ({
  generateText:
    vi.fn<
      (options: {
        output: { schema: unknown };
        tools?: ResearchTools;
        abortSignal: AbortSignal;
      }) => Promise<{ output: Record<string, unknown> }>
    >(),
  readSite: vi.fn(),
  search: vi.fn(),
  listSections: vi.fn(),
  listCompetitors: vi.fn(),
  listKeywords: vi.fn(),
  enforceSafetyLimits: vi.fn(),
}));
vi.mock("ai", async (importOriginal) => ({
  NoObjectGeneratedError: (await importOriginal<typeof Ai>())
    .NoObjectGeneratedError,
  generateText,
  Output: { object: (value: unknown) => value },
  stepCountIs: vi.fn(),
  tool: (value: unknown) => value,
}));
vi.mock("@/server/lib/scrape", () => ({ readSite }));
vi.mock("@/server/lib/dataforseo/serp", async (importOriginal) => ({
  ...(await importOriginal<typeof Serp>()),
  fetchLiveSerp: search,
}));
vi.mock("@/server/lib/dataforseo/usage-limits", () => ({
  enforceDataforseoSafetyLimits: enforceSafetyLimits,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: vi.fn(),
  getOptionalEnvValue: vi.fn(),
}));
vi.mock("@/server/lib/openrouter", () => ({
  buildChatAgentModel: vi.fn(),
  requireOpenRouterAccess: vi.fn(async () => ({ apiKey: "test-key" })),
}));
vi.mock("@/server/lib/chatAgent", () => ({
  requireOpenRouterCostUsd: vi.fn(),
}));
vi.mock("@/server/billing/researchSpend", () => ({
  billResearchSpend: vi.fn(),
}));
vi.mock(
  "@/server/features/project-context/repositories/ProjectContextRepository",
  () => ({ ProjectContextRepository: { listSections, listCompetitors } }),
);
vi.mock(
  "@/server/features/ai-visibility/repositories/AiVisibilityRepository",
  () => ({ AiVisibilityRepository: { listResearchKeywords: listKeywords } }),
);

import { NoObjectGeneratedError } from "ai";
import { researchWebsite } from "./websiteResearch";
import { AppError } from "@/server/lib/errors";
import { customer } from "@/server/features/ai-visibility/services/aiVisibilityTestFixtures";

const project = {
  id: "project",
  name: "Saved project",
  brandName: "Saved brand",
  domain: "saved.com",
  locationCode: 2840,
  languageCode: "en",
};
type ResearchTools = {
  search_competitors: {
    execute: (input: { queries: string[] }) => Promise<unknown>;
  };
  read_business_sites: {
    execute: (input: { domains: string[] }) => Promise<unknown>;
  };
};

const invalidJson = new NoObjectGeneratedError({
  response: { id: "", timestamp: new Date(), modelId: "" },
  usage: {
    inputTokens: 0,
    inputTokenDetails: {
      noCacheTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokens: 0,
    outputTokenDetails: { textTokens: 0, reasoningTokens: 0 },
    totalTokens: 0,
  },
  finishReason: "stop",
});

beforeEach(() => {
  enforceSafetyLimits.mockResolvedValue(undefined);
  listSections.mockResolvedValue([
    { key: "business_overview", content: "Saved overview" },
  ]);
  listCompetitors.mockResolvedValue([]);
  listKeywords.mockResolvedValue(["saved keyword"]);
  search.mockResolvedValue({ billing: { costUsd: 0.002 }, data: [] });
  generateText.mockImplementation(async ({ tools }) => {
    await tools?.search_competitors.execute({
      queries: ["business competitors", "alternative products"],
    });
    return { output: { competitors: [] } };
  });
});
const researchSavedWebsite = () =>
  researchWebsite("https://saved.com", project, customer);

it.each([1, 2])(
  "stops research when the safety limit denies conversation %i, even if the model consumes the tool error",
  async (deniedAttempt) => {
    listCompetitors.mockResolvedValue([]);
    for (let attempt = 1; attempt < deniedAttempt; attempt++)
      enforceSafetyLimits.mockResolvedValueOnce(undefined);
    enforceSafetyLimits.mockRejectedValueOnce(
      new AppError("DATAFORSEO_USAGE_LIMIT_EXCEEDED"),
    );
    // The real AI SDK returns tool failures to the model instead of throwing.
    const succeed = generateText.getMockImplementation()!;
    let attempt = 0;
    generateText.mockImplementation(async (options) => {
      attempt++;
      try {
        const result = await succeed(options);
        if (attempt < deniedAttempt) throw invalidJson;
        return result;
      } catch (error) {
        if (
          error instanceof AppError &&
          error.code === "DATAFORSEO_USAGE_LIMIT_EXCEEDED"
        )
          return { output: { competitors: [] } };
        throw error;
      }
    });

    await expect(researchSavedWebsite()).rejects.toMatchObject({
      code: "DATAFORSEO_USAGE_LIMIT_EXCEEDED",
    });
    expect(enforceSafetyLimits).toHaveBeenCalledTimes(deniedAttempt);
    expect(enforceSafetyLimits).toHaveBeenNthCalledWith(deniedAttempt, {
      estimatedCostUsd: 0.016,
      requests: 24,
    });
    expect(search).toHaveBeenCalledTimes((deniedAttempt - 1) * 2);
    expect(generateText).toHaveBeenCalledTimes(deniedAttempt);
  },
);
