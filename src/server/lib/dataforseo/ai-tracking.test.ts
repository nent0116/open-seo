import { expect, it, vi } from "vitest";
import { postAiTrackingTasks } from "./ai-tracking";

vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: async () => "test-key",
}));

it("accepts only submitted tags once while retaining all provider charges", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        status_code: 20000,
        tasks: [
          {
            id: "task",
            status_code: 20100,
            cost: 0.01,
            data: { tag: "answer" },
          },
          {
            id: "foreign",
            status_code: 20100,
            cost: 0.02,
            data: { tag: "other-run" },
          },
          {
            id: "duplicate",
            status_code: 20100,
            cost: 0.03,
            data: { tag: "answer" },
          },
        ],
      }),
    ),
  );
  const result = await postAiTrackingTasks({
    engine: "chatgpt",
    tasks: [{ tag: "answer", prompt: "Which tools?" }],
    locationCode: 2840,
    languageCode: "en",
  });
  expect(result.data).toEqual([{ tag: "answer", taskId: "task" }]);
  expect(result.billing.costUsd).toBeCloseTo(0.06);
});
