import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiObservations, aiRuns } from "@/db/schema";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { runCheck } from "./aiVisibilityRuns";
import { setSchedule } from "./aiVisibilitySchedule";
import { configuration, customer } from "./aiVisibilityTestFixtures";

const { testDb, workflow } = await vi.hoisted(async () => {
  const { createAiVisibilityTestDb } = await import("../aiVisibilityTestDb");
  return {
    testDb: await createAiVisibilityTestDb(),
    workflow: { create: vi.fn(), get: vi.fn() },
  };
});
vi.mock("cloudflare:workers", () => ({
  env: { DATABASE_PROVIDER: "d1", AI_VISIBILITY_WORKFLOW: workflow },
}));
vi.mock("@/db", () => ({ db: testDb.db }));
vi.mock("@/db/runBatch", () => ({ runBatch: testDb.runBatch }));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: async () => "dataforseo-key",
  isHostedServerAuthMode: async () => false,
}));

const projectId = "project";
const workflowStatus = (status: string) =>
  workflow.get.mockResolvedValue({ status: async () => ({ status }) });

beforeEach(async () => {
  await testDb.seedProject();
  await repo.saveConfiguration(
    configuration({
      engines: ["chatgpt"],
      prompts: [{ text: "Which SEO tools?" }, { text: "Is OpenSEO good?" }],
    }),
  );
  workflowStatus("running");
  workflow.create.mockResolvedValue(undefined);
});

describe("AI visibility checks", () => {
  it.each(["baseline", "manual"] as const)(
    "does not enable scheduling while a concurrent %s startup is unconfirmed",
    async (trigger) => {
      let rejectStart!: (error: Error) => void;
      let notifyStarting!: () => void;
      const starting = new Promise<void>((resolve) => {
        notifyStarting = resolve;
      });
      workflow.create.mockImplementationOnce(() => {
        notifyStarting();
        return new Promise((_resolve, reject) => {
          rejectStart = reject;
        });
      });
      const first =
        trigger === "baseline"
          ? setSchedule({ projectId, enabled: true }, customer)
          : runCheck({ projectId, maxCostUsd: 1 }, customer);
      const firstFailure = expect(first).rejects.toThrow(
        "Workflow unavailable",
      );
      await starting;

      const competingError = await setSchedule(
        { projectId, enabled: true },
        customer,
      ).then(
        () => null,
        (error: unknown) => error,
      );
      rejectStart(new Error("Workflow unavailable"));
      await firstFailure;

      expect(competingError).toMatchObject({ reason: "RUN_IN_PROGRESS" });
      expect(await repo.getTracker(projectId)).toMatchObject({
        enabled: false,
      });
      const { run, state } = await setSchedule(
        { projectId, enabled: true },
        customer,
      );
      expect(run).toMatchObject({ trigger: "baseline", status: "queued" });
      expect(state.tracker).toMatchObject({ enabled: true });
    },
  );
  it("keeps scheduling disabled after startup fails and starts a fresh baseline on retry", async () => {
    workflow.create.mockRejectedValueOnce(new Error("Workflow unavailable"));
    await expect(
      setSchedule({ projectId, enabled: true }, customer),
    ).rejects.toThrow("Workflow unavailable");
    expect(await repo.getTracker(projectId)).toMatchObject({ enabled: false });
    const { run, state } = await setSchedule(
      { projectId, enabled: true },
      customer,
    );
    expect(run).toMatchObject({ trigger: "baseline", status: "queued" });
    expect(state.tracker).toMatchObject({ enabled: true });
    expect(workflow.create).toHaveBeenCalledTimes(2);
  });
  it("runs one check at a time and points a second start at the running one", async () => {
    const run = await runCheck({ projectId, maxCostUsd: 1 }, customer);
    expect(run).toMatchObject({ status: "queued", expected: 2, pending: 2 });
    expect(workflow.create).toHaveBeenCalledWith({
      id: run.id,
      params: { runId: run.id, customer: { ...customer, projectId } },
    });
    await expect(
      runCheck({ projectId, maxCostUsd: 1 }, customer),
    ).rejects.toMatchObject({ reason: "RUN_IN_PROGRESS", runId: run.id });
    expect(workflow.create).toHaveBeenCalledOnce();
  });

  it("fails a check whose workflow stopped, so it never blocks the next one", async () => {
    const stuck = await runCheck({ projectId, maxCostUsd: 1 }, customer);
    await testDb.db
      .update(aiRuns)
      .set({ status: "running", createdAt: "2026-01-01T00:00:00.000Z" });
    workflowStatus("errored");

    const next = await runCheck({ projectId, maxCostUsd: 1 }, customer);

    expect(next.id).not.toBe(stuck.id);
    expect(await repo.getRunInternal(stuck.id)).toMatchObject({
      status: "failed",
    });
    expect(
      await testDb.db
        .selectDistinct({ status: aiObservations.status })
        .from(aiObservations)
        .where(eq(aiObservations.runId, stuck.id)),
    ).toEqual([{ status: "failed" }]);
  });

  it("refuses a check that now costs more than the approved maximum", async () => {
    await expect(
      runCheck({ projectId, maxCostUsd: 0.001 }, customer),
    ).rejects.toMatchObject({ reason: "COST_LIMIT_EXCEEDED" });
    expect(await repo.listRuns(projectId)).toEqual([]);
  });
});
