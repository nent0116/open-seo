import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { projectAiConfiguration } from "./aiVisibilityConfiguration";

export const customer = {
  organizationId: "organization",
  userId: "user",
  userEmail: "user@example.com",
};

export const collectionTasks = [
  { tag: "answer-0", prompt: "Which SEO tools?" },
  { tag: "answer-1", prompt: "Best rank tracker?" },
];
export const liveCollectionTasks = collectionTasks.map((task) => ({
  ...task,
  engine: "chatgpt" as const,
}));
export const pendingAiTask = {
  ...liveCollectionTasks[0],
  taskId: "task",
  attempts: 1,
};
export const liveAiAnswer = {
  status: "fulfilled",
  value: { status: "completed", result: { markdown: "OpenSEO", sources: [] } },
} as const;
export const retryableAiFailure = {
  status: "failed",
  message: "Internal Server Error.",
  code: "UPSTREAM_UNAVAILABLE",
  retryable: true,
} as const;

/** A new tracker for `project` with the given patch applied. */
export function configuration(
  patch: AiTrackerPatch = {
    engines: ["chatgpt"],
    prompts: [{ text: "Which SEO tools?" }],
  },
  projectId = "project",
) {
  return projectAiConfiguration({
    previous: null,
    projectId,
    projectMarket: { locationCode: 2840, languageCode: "en" },
    patch,
    now: "2026-09-05T12:00:00.000Z",
  }).rows;
}
