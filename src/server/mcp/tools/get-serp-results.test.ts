import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSerpResultsTool } from "./get-serp-results";
import { makeToolContext, textContent } from "./tool-test-support";
import type * as r2CacheModule from "@/server/lib/r2-cache";

const mocks = vi.hoisted(() => ({
  createDataforseoClient: vi.fn(),
  getProjectForOrganization: vi.fn(),
  cache: new Map<string, unknown>(),
}));

vi.mock("cloudflare:workers", () => ({
  env: {},
  waitUntil: (promise: Promise<unknown>) => promise,
}));
vi.mock("@/server/lib/r2-cache", async (importOriginal) => ({
  ...(await importOriginal<typeof r2CacheModule>()),
  getCached: async (key: string) => mocks.cache.get(key) ?? null,
  setCached: async (key: string, value: unknown) => {
    mocks.cache.set(key, value);
  },
}));
vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: mocks.createDataforseoClient,
  SERP_ANALYSIS_DEPTH: 20,
}));
vi.mock("@/server/features/projects/services/ProjectService", () => ({
  ProjectService: {
    getProjectForOrganization: mocks.getProjectForOrganization,
  },
}));

const toolContext = makeToolContext();

function mockLiveSerp(rows: number) {
  const live = vi.fn().mockResolvedValue(
    Array.from({ length: rows }, (_, index) => ({
      type: "organic",
      rank_absolute: index + 1,
      title: `Result ${index + 1}`,
      url: `https://example.com/${index + 1}`,
      domain: "example.com",
      description: "desc",
    })),
  );
  mocks.createDataforseoClient.mockReturnValue({ serp: { live } });
  return live;
}

const paa = {
  type: "people_also_ask",
  items: [
    {
      title: "How do I find food suppliers?",
      expanded_element: [
        {
          description: "Compare suppliers and their minimum orders.",
          title: "Supplier guide",
          url: "https://example.com/suppliers",
        },
      ],
    },
    { title: "Can I request samples?", expanded_element: null },
  ],
};

describe("get_serp_results", () => {
  beforeEach(() => {
    mocks.cache.clear();
    mocks.getProjectForOrganization.mockResolvedValue({
      id: "project_1",
      locationCode: 2840,
      languageCode: "en",
    });
  });

  it("crawls and returns rows to the requested depth", async () => {
    const live = mockLiveSerp(40);

    const result = await getSerpResultsTool.handler(
      {
        projectId: "project_1",
        queries: [{ keyword: "seo tools" }],
        depth: 30,
      },
      toolContext,
    );

    expect(live).toHaveBeenCalledWith(expect.objectContaining({ depth: 30 }));
    // Rows are trimmed to the depth that was crawled, not the fixed top 20.
    expect(textContent(result)).toContain('"seo tools" (30 results)');
  });

  it("answers a repeated query from the saved rows without another paid call", async () => {
    const live = mockLiveSerp(20);
    const args = {
      projectId: "project_1",
      queries: [{ keyword: "seo tools" }],
    };

    const first = await getSerpResultsTool.handler(args, toolContext);
    const repeat = await getSerpResultsTool.handler(args, toolContext);

    expect(live).toHaveBeenCalledTimes(1);
    expect(repeat.structuredContent).toEqual(first.structuredContent);
  });

  it("returns PAA questions and answer sources in structured and text content", async () => {
    mocks.createDataforseoClient.mockReturnValue({
      serp: { live: vi.fn().mockResolvedValue([paa]) },
    });

    const result = await getSerpResultsTool.handler(
      {
        projectId: "project_1",
        queries: [{ keyword: "food suppliers" }],
        includePaa: true,
      },
      toolContext,
    );

    expect(result.structuredContent).toMatchObject({
      results: [
        {
          items: [
            {
              questions: [
                {
                  question: "How do I find food suppliers?",
                  answers: [
                    {
                      text: "Compare suppliers and their minimum orders.",
                      sources: [
                        {
                          title: "Supplier guide",
                          url: "https://example.com/suppliers",
                        },
                      ],
                    },
                  ],
                },
                { question: "Can I request samples?", answers: [] },
              ],
            },
          ],
        },
      ],
    });
    expect(textContent(result)).toContain("How do I find food suppliers?");
    expect(textContent(result)).toContain(
      "Compare suppliers and their minimum orders.",
    );
    expect(textContent(result)).toContain("https://example.com/suppliers");
    getSerpResultsTool.config.outputSchema.parse(result.structuredContent);
  });

  it.each([
    {
      format: "plain text",
      answer: {
        text: "Compare suppliers.",
        markdown: "**Compare suppliers.**",
      },
      expectedText: "Compare suppliers.",
    },
    {
      format: "Markdown table",
      answer: {
        type: "ai_overview_table_element",
        markdown: "| Supplier | Minimum order |\n|---|---|\n| A | 10 units |",
      },
      expectedText: "| Supplier | Minimum order |\n|---|---|\n| A | 10 units |",
    },
  ])(
    "reads $format already embedded in PAA without expanding the question",
    async ({ answer, expectedText }) => {
      mocks.createDataforseoClient.mockReturnValue({
        serp: {
          live: vi.fn().mockResolvedValue([
            {
              type: "people_also_ask",
              items: [
                {
                  title: "How do I find food suppliers?",
                  expanded_element: [
                    {
                      type: "people_also_ask_ai_overview_expanded_element",
                      items: [
                        {
                          ...answer,
                          references: [
                            {
                              title: "Supplier guide",
                              url: "https://example.com/suppliers",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ]),
        },
      });

      const result = await getSerpResultsTool.handler(
        {
          projectId: "project_1",
          queries: [{ keyword: "food suppliers" }],
          includePaa: true,
        },
        toolContext,
      );

      expect(result.structuredContent).toMatchObject({
        results: [
          {
            items: [
              {
                questions: [
                  {
                    question: "How do I find food suppliers?",
                    answers: [
                      {
                        text: expectedText,
                        sources: [
                          {
                            title: "Supplier guide",
                            url: "https://example.com/suppliers",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    },
  );

  it("keeps default and PAA-detail cache entries separate", async () => {
    const live = vi.fn().mockResolvedValue([paa]);
    mocks.createDataforseoClient.mockReturnValue({ serp: { live } });
    const args = {
      projectId: "project_1",
      queries: [{ keyword: "food suppliers" }],
    };

    const normal = await getSerpResultsTool.handler(args, toolContext);
    const detailed = await getSerpResultsTool.handler(
      { ...args, includePaa: true },
      toolContext,
    );
    const repeat = await getSerpResultsTool.handler(
      { ...args, includePaa: true },
      toolContext,
    );
    const explicitDefault = await getSerpResultsTool.handler(
      { ...args, includePaa: false },
      toolContext,
    );

    expect(normal.structuredContent?.results).toEqual([
      {
        keyword: "food suppliers",
        ok: true,
        items: [
          {
            type: "people_also_ask",
            rank: null,
            organicRank: null,
            title: null,
            url: null,
            domain: null,
            description: null,
          },
        ],
      },
    ]);
    expect(detailed.structuredContent).not.toEqual(normal.structuredContent);
    expect(repeat.structuredContent).toEqual(detailed.structuredContent);
    expect(explicitDefault.structuredContent).toEqual(normal.structuredContent);
    expect(live).toHaveBeenCalledTimes(2);
    // PAA is extracted from the same response, without paid click expansion.
    expect(live).toHaveBeenCalledWith({
      keyword: "food suppliers",
      locationCode: 2840,
      languageCode: "en",
      locationName: undefined,
      depth: 20,
      device: undefined,
    });
  });

  it("fetches a mobile SERP separately from a saved desktop one", async () => {
    const live = mockLiveSerp(20);
    const query = { projectId: "project_1" };

    await getSerpResultsTool.handler(
      { ...query, queries: [{ keyword: "seo tools" }] },
      toolContext,
    );
    await getSerpResultsTool.handler(
      { ...query, queries: [{ keyword: "seo tools", device: "mobile" }] },
      toolContext,
    );

    expect(live).toHaveBeenCalledTimes(2);
    expect(live).toHaveBeenLastCalledWith(
      expect.objectContaining({ device: "mobile" }),
    );
  });
});
