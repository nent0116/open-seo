import { expect, it, vi } from "vitest";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { collectAiRound } from "./aiVisibilityCollection";
import { configuration } from "./aiVisibilityTestFixtures";

const { testDb, fetchTaskResult } = await vi.hoisted(async () => {
  const { createAiVisibilityTestDb } = await import("../aiVisibilityTestDb");
  return { testDb: await createAiVisibilityTestDb(), fetchTaskResult: vi.fn() };
});
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("cloudflare:workflows", () => ({
  NonRetryableError: class extends Error {},
}));
vi.mock("@/db", () => ({ db: testDb.db }));
vi.mock("@/db/runBatch", () => ({ runBatch: testDb.runBatch }));
vi.mock("@/server/lib/dataforseo", () => ({
  MAX_TASKS_PER_POST: 100,
  fetchAiTrackingTaskResult: fetchTaskResult,
}));

const runId = "run";
const market = { locationCode: 2840, languageCode: "en" };

it("does not replace evidence belonging to a different run", async () => {
  await testDb.seedProject();
  const rows = configuration({
    engines: ["chatgpt"],
    prompts: [{ text: "Which SEO tools?" }],
  });
  await repo.saveConfiguration(rows);
  await repo.createRun(
    {
      id: runId,
      trackerId: rows.tracker.id,
      projectId: "project",
      trigger: "manual",
      status: "running",
      ...market,
      createdAt: "2026-09-05T12:00:00.000Z",
    },
    [
      {
        id: "answer-0",
        runId,
        promptId: rows.prompts[0].id,
        engine: "chatgpt",
        branded: false,
      },
    ],
  );

  const original = {
    status: "completed" as const,
    answerMarkdown: "Original answer",
  };
  await repo.persistAnswer({
    runId,
    observationId: "answer-0",
    values: original,
    sources: [
      {
        id: "source",
        observationId: "answer-0",
        url: "https://openseo.so/",
        domain: "openseo.so",
        position: 1,
      },
    ],
    matches: [],
  });
  await repo.updateRun(runId, { status: "completed" });
  const tracker = await repo.getTracker("project");
  await repo.createRun(
    {
      id: "other-run",
      trackerId: tracker.id,
      projectId: "project",
      trigger: "manual",
      status: "running",
      ...market,
      createdAt: "2026-09-06T12:00:00.000Z",
    },
    [],
  );
  fetchTaskResult.mockResolvedValueOnce({
    status: "completed",
    result: { markdown: "Wrong answer", sources: [] },
  });
  await collectAiRound(
    "other-run",
    [
      {
        tag: "answer-0",
        taskId: "foreign-task",
        costUsd: 0.002,
        engine: "chatgpt",
        prompt: "Which SEO tools?",
        attempts: 1,
      },
    ],
    true,
  );
  expect(await repo.getObservation("answer-0")).toMatchObject(original);
  expect((await repo.getEvidence(["answer-0"])).sources).toMatchObject([
    { id: "source" },
  ]);
});
