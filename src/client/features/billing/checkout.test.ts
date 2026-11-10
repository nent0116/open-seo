import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { openUpgradeCheckout, prefetchUpgradeCheckout } from "./checkout";
import { AUTUMN_PAID_PLAN_ID } from "@/shared/billing";

const {
  queryClient,
  createPlanCheckout,
  getBillingAccount,
  getOrganizationContext,
  assign,
  reportCheckoutStart,
} = await vi.hoisted(async () => {
  const { QueryClient } = await import("@tanstack/query-core");
  return {
    queryClient: new QueryClient(),
    createPlanCheckout: vi.fn(),
    getBillingAccount: vi.fn(),
    getOrganizationContext: vi.fn(),
    assign: vi.fn(),
    reportCheckoutStart: vi.fn(),
  };
});
vi.mock("@/client/tanstack-db", () => ({ queryClient }));
vi.mock("@/serverFunctions/billing", () => ({
  createPlanCheckout,
  getBillingAccount,
  reportCheckoutStart,
}));
vi.mock("@/serverFunctions/organization", () => ({ getOrganizationContext }));
vi.mock("@/lib/auth-mode", () => ({ isHostedClientAuthMode: () => true }));
vi.mock("@/client/lib/posthog", () => ({ captureClientEvent: vi.fn() }));

beforeEach(() => {
  reportCheckoutStart.mockResolvedValue(undefined);
  getBillingAccount.mockResolvedValue({ planStatus: "free" });
  getOrganizationContext.mockResolvedValue({
    organizationId: "organization-a",
    role: "owner",
  });
  createPlanCheckout.mockResolvedValue(
    "https://checkout.example/organization-a",
  );
  vi.stubGlobal("window", { location: { assign } });
});
afterEach(() => {
  queryClient.clear();
  vi.unstubAllGlobals();
});

async function warmUpgradeCheckout() {
  prefetchUpgradeCheckout(AUTUMN_PAID_PLAN_ID);
  await vi.waitFor(() => expect(createPlanCheckout).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(queryClient.isFetching()).toBe(0));
}

describe("upgrade checkout navigation", () => {
  it("revalidates the checkout after another tab switches the active organization", async () => {
    await warmUpgradeCheckout();
    getOrganizationContext.mockResolvedValue({
      organizationId: "organization-b",
      role: "owner",
    });
    await queryClient.refetchQueries({
      queryKey: organizationContextQueryOptions().queryKey,
    });
    createPlanCheckout.mockResolvedValue(
      "https://checkout.example/organization-b",
    );

    await openUpgradeCheckout(AUTUMN_PAID_PLAN_ID);

    expect(assign).toHaveBeenCalledWith(
      "https://checkout.example/organization-b",
    );
  });

  it("does not navigate to a cached checkout when the server denies billing access", async () => {
    await warmUpgradeCheckout();
    createPlanCheckout.mockRejectedValue(new Error("Billing access denied"));

    await expect(openUpgradeCheckout(AUTUMN_PAID_PLAN_ID)).rejects.toThrow(
      "Billing access denied",
    );

    expect(assign).not.toHaveBeenCalled();
  });
});
