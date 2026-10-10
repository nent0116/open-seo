import { beforeEach, expect, it, vi } from "vitest";
import { billResearchSpend } from "./researchSpend";
import { captureServerEvent } from "@/server/lib/posthog";
import type * as Subscription from "./subscription";

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => true,
  getRequiredEnvValue: async () => "test-key",
}));
vi.mock("@/server/lib/posthog", () => ({ captureServerEvent: vi.fn() }));
vi.mock("./subscription", async (importOriginal) => ({
  ...(await importOriginal<typeof Subscription>()),
  getUsageCreditsRemaining: async () => ({
    monthlyRemaining: 100,
    topupRemaining: 0,
  }),
}));

const customer = {
  organizationId: "organization",
  userId: "user",
  userEmail: "user@example.com",
  projectId: "project",
};
const spend = [
  {
    provider: "openrouter" as const,
    creditFeature: "agent" as const,
    operation: "ai_prompt_generation",
    costUsd: 0.01,
  },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json({ message: "Unavailable" }, { status: 503 }),
      ),
  );
});

it("records uncertain research metering without reporting success or replaying track", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(billResearchSpend(customer, spend)).resolves.toBeUndefined();
  expect(error).toHaveBeenCalledWith(
    "Research credit metering failed",
    expect.objectContaining({
      organizationId: customer.organizationId,
      projectId: customer.projectId,
      spend,
    }),
  );
  expect(captureServerEvent).not.toHaveBeenCalled();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.filter(([request]) =>
        (request instanceof Request ? request.url : String(request)).endsWith(
          "/balances.track",
        ),
      ),
  ).toHaveLength(1);
  error.mockRestore();
});

it("accepts Autumn's queued deduction acknowledgement without a balance", async () => {
  vi.mocked(fetch).mockImplementationOnce(async (request) => {
    if (!(request instanceof Request))
      throw new Error("Expected a billing request");
    const body: { customer_id: string; value: number } = await request.json();
    return Response.json(
      { customer_id: body.customer_id, value: body.value, balance: null },
      { status: 202 },
    );
  });
  await billResearchSpend(customer, spend);
  expect(captureServerEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      event: "usage:credits_consume",
      organizationId: customer.organizationId,
    }),
  );
});
