import { queryOptions } from "@tanstack/react-query";
import { billingAccountQueryOptions } from "@/client/features/billing/billingAccountQuery";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { captureClientEvent } from "@/client/lib/posthog";
import { queryClient } from "@/client/tanstack-db";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { hasOrgPermission } from "@/lib/org-permissions";
import {
  createPlanCheckout,
  reportCheckoutStart,
} from "@/serverFunctions/billing";
import type { CheckoutPlanId } from "@/shared/billing";

const CHECKOUT_URL_KEY = ["billing", "checkout-url"] as const;

// Checkout links are made one at a time, so the last link made is the one
// Autumn keeps open (see below).
let checkoutQueue: Promise<unknown> = Promise.resolve();

const planCheckoutQueryOptions = (
  organizationId: string,
  planId: CheckoutPlanId,
  redirectTo: string,
) =>
  queryOptions({
    queryKey: [...CHECKOUT_URL_KEY, organizationId, planId, redirectTo],
    queryFn: () => {
      const created = checkoutQueue.then(async () => {
        const url = await createPlanCheckout({ data: { planId, redirectTo } });
        // Autumn just expired every earlier link, so forget the finished
        // ones: picking that plan again must make a new link. Links still
        // queued are newer than this one; removing them would cancel them.
        queryClient.removeQueries({
          queryKey: CHECKOUT_URL_KEY,
          predicate: (query) =>
            query.state.fetchStatus === "idle" &&
            (query.queryKey[2] !== organizationId ||
              query.queryKey[3] !== planId ||
              query.queryKey[4] !== redirectTo),
        });
        return url;
      });
      checkoutQueue = created.catch(() => undefined);
      return created;
    },
    // Autumn's checkout sessions last an hour; start over after 10 minutes.
    staleTime: 10 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });

// Autumn keeps one open Stripe checkout per customer and expires it when a
// checkout with different details is requested. Every upgrade link returns to
// the app home, so the paywall, Billing and other tabs all get the same live
// session back instead of cancelling each other's.
const UPGRADE_REDIRECT = "/";

/**
 * Starts creating the upgrade checkout link before the click, since Autumn
 * takes a few seconds to make one. Nothing is billed until the customer
 * confirms at checkout, so an unused link only costs the call; skip orgs that
 * can't use it.
 */
export function prefetchUpgradeCheckout(planId: CheckoutPlanId) {
  if (!isHostedClientAuthMode()) return;
  void Promise.all([
    queryClient.ensureQueryData(billingAccountQueryOptions()),
    queryClient.ensureQueryData(organizationContextQueryOptions()),
  ])
    .then(([account, organization]) => {
      if (
        account.planStatus !== "free" ||
        !hasOrgPermission(organization.role, { billing: ["manage"] })
      ) {
        return;
      }
      return queryClient.prefetchQuery(
        planCheckoutQueryOptions(
          organization.organizationId,
          planId,
          UPGRADE_REDIRECT,
        ),
      );
    })
    // The click creates the link itself if this didn't.
    .catch(() => undefined);
}

/** Revalidates the active organization and billing permission before checkout. */
export async function openPlanCheckout(
  planId: CheckoutPlanId,
  redirectTo: string,
) {
  // Let links still being made for other plans finish first: each one expires
  // the link made before it, so this plan's link has to be made, or kept, last.
  await checkoutQueue;
  captureClientEvent("billing:checkout_start", {
    planId,
  });
  // Checkout must not wait on or fail with ad measurement, and keepalive
  // carries the request past the redirect below.
  void reportCheckoutStart({
    data: { planId },
    fetch: (input, init) => fetch(input, { ...init, keepalive: true }),
  }).catch(() => undefined);
  // A different tab can switch organizations while a prefetched URL stays fresh.
  // Resolve the checkout against the active server session again on every click.
  window.location.assign(
    await createPlanCheckout({ data: { planId, redirectTo } }),
  );
}

export function openUpgradeCheckout(planId: CheckoutPlanId) {
  return openPlanCheckout(planId, UPGRADE_REDIRECT);
}
