import { beforeEach, expect, it, vi } from "vitest";
import { generateAiPrompts } from "./aiPromptSuggestions";
import { saveAiTrackerSchema } from "@/types/schemas/ai-visibility";

const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("ai", () => ({ generateText: generate, Output: { object: vi.fn() } }));
vi.mock("../repositories/AiVisibilityRepository", () => ({
  AiVisibilityRepository: { getConfiguration: async () => null },
}));
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: {
    getProjectForOrganization: async () => ({
      name: "OpenSEO",
      domain: "openseo.so",
    }),
  },
}));
vi.mock(
  "@/server/features/project-context/repositories/ProjectContextRepository",
  () => ({
    ProjectContextRepository: {
      listSections: async () => [],
      listCompetitors: async () => [],
    },
  }),
);
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => false,
  getRequiredEnvValue: async () => "test-key",
  getOptionalEnvValue: async () => undefined,
}));
vi.mock("@/server/lib/openrouter", () => ({ buildChatAgentModel: vi.fn() }));
vi.mock("@/server/billing/subscription", () => ({
  checkUsageCreditsDepleted: vi.fn(),
}));
vi.mock("@/server/billing/researchSpend", () => ({
  billResearchSpend: vi.fn(),
}));
vi.mock("@/server/lib/chatAgent", () => ({
  requireOpenRouterCostUsd: vi.fn(),
}));

const projectId = "00000000-0000-4000-8000-000000000001";
const input = {
  projectId,
  locationCode: 2840,
  languageCode: "en",
  excludePrompts: [],
};
const customer = {
  organizationId: "organization",
  userId: "user",
  userEmail: "user@example.com",
};
const prompts = [
  "Which tools?",
  "How much?",
  "Which features?",
  "Which provider?",
  "Which alternatives?",
];
beforeEach(() => {
  generate.mockResolvedValue({ output: { name: "a".repeat(100), prompts } });
});

it("returns a generated topic that can be saved by the tracker", async () => {
  const result = await generateAiPrompts(input, customer);
  const saved = saveAiTrackerSchema.parse({
    projectId,
    prompts: result.prompts.map((text) => ({ text, topic: result.topic })),
  });
  expect(saved.prompts?.[0].topic).toBe(result.topic);
});

it.each([undefined, "Requested topic"])(
  "rejects an unsaveable generated topic with requested topic %s",
  async (topic) => {
    generate.mockResolvedValueOnce({
      output: { name: "a".repeat(101), prompts },
    });
    await expect(
      generateAiPrompts({ ...input, topic }, customer),
    ).rejects.toThrow();
  },
);
