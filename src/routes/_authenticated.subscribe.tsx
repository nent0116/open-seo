import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCustomer } from "autumn-js/react";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { QueryError } from "@/client/components/QueryState";
import { StatusScreen } from "@/client/components/StatusScreen";
import { PlanPageAccountMenu } from "@/client/features/billing/PlanPageAccountMenu";
import { PlanOfferCard } from "@/client/features/billing/PlanOfferCard";
import {
  BASE_PLAN_OFFER,
  monthlyCreditsFeature,
} from "@/client/features/billing/plan-offers";
import { captureClientEvent } from "@/client/lib/posthog";
import { useSession } from "@/lib/auth-client";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { getSubscribeRouteState } from "@/client/features/billing/route-state";
import { getCustomerPlanStatus } from "@/client/features/billing/plan-detection";
import { normalizeAuthRedirect } from "@/lib/auth-redirect";
import { useCanManageBilling } from "@/client/features/team/organizationQueries";
import { AUTUMN_MANAGED_ACCESS_FEATURE_ID } from "@/shared/billing";
import { SUPPORT_EMAIL } from "@/client/lib/support";
import { Button } from "@/client/components/ui/button";

const PLAN_FEATURES = [
  "キーワード調査、被リンク、順位計測、サイト監査",
  "Claude、Cursor、ChatGPT向けのMCPサーバーとエージェントスキル",
  "Google Search Console連携",
  monthlyCreditsFeature(BASE_PLAN_OFFER),
];

// How long the post-checkout "finalizing" screen polls Autumn before giving
// up and letting the user through anyway.
const FINALIZING_TIMEOUT_MS = 30_000;

export const Route = createFileRoute("/_authenticated/subscribe")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { upgrade?: true; redirect?: string; checkout?: "success" } => ({
    upgrade:
      search.upgrade === true || search.upgrade === "true" ? true : undefined,
    redirect:
      typeof search.redirect === "string"
        ? normalizeAuthRedirect(search.redirect)
        : undefined,
    checkout: search.checkout === "success" ? "success" : undefined,
  }),
  component: SubscribePage,
});

function SubscribePage() {
  const navigate = useNavigate();
  const { upgrade: isUpgradeFlow, redirect, checkout } = Route.useSearch();
  const { data: session } = useSession();
  const [isAttaching, setIsAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizingTimedOut, setFinalizingTimedOut] = useState(false);
  const checkoutCompleted = checkout === "success";

  const hasSession = Boolean(session?.user?.id);
  const customerQuery = useCustomer({
    queryOptions: {
      enabled: hasSession,
    },
  });

  // Checkout is owner-only; other members hitting the paywall are pointed at
  // their organization owner instead of a Subscribe button that would 403.
  const canManageBilling = useCanManageBilling();

  // Read managed access from the already-loaded Autumn customer (local, no API
  // call) instead of a separate server round-trip.
  const hasManagedAccess = customerQuery.check({
    featureId: AUTUMN_MANAGED_ACCESS_FEATURE_ID,
  }).allowed;

  const planStatus = getCustomerPlanStatus(customerQuery.data);
  const subscribeRouteState = getSubscribeRouteState({
    hasSession,
    isCustomerLoading: customerQuery.isLoading,
    isCustomerError: customerQuery.isError,
    hasCustomerData: customerQuery.data != null,
    hasManagedAccess,
    planStatus,
    isUpgradeFlow: isUpgradeFlow === true,
    checkoutCompleted,
    finalizingTimedOut,
  });

  // Autumn can lag Stripe by a few seconds after checkout; poll until the
  // subscription shows up so the just-paid user isn't shown the paywall again.
  const isFinalizing = subscribeRouteState === "finalizing";
  const { refetch: refetchCustomer } = customerQuery;
  useEffect(() => {
    if (!isFinalizing) return;
    const interval = setInterval(() => {
      void refetchCustomer();
    }, 2000);
    return () => clearInterval(interval);
  }, [refetchCustomer, isFinalizing]);

  // Armed once on landing with checkout=success (not on the finalizing state,
  // which a refetch with no cached data can leave for "loading" and re-enter)
  // so the deadline is a hard bound from arrival.
  useEffect(() => {
    if (!checkoutCompleted || finalizingTimedOut) return;
    const timeout = setTimeout(
      () => setFinalizingTimedOut(true),
      FINALIZING_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [checkoutCompleted, finalizingTimedOut]);

  useEffect(() => {
    if (subscribeRouteState === "redirectToApp") {
      if (checkoutCompleted) {
        captureClientEvent("billing:checkout_success");
      }
      void navigate({ href: redirect ?? "/", replace: true });
    }
  }, [checkoutCompleted, navigate, redirect, subscribeRouteState]);

  useEffect(() => {
    if (subscribeRouteState === "showPaywall" && !isUpgradeFlow) {
      captureClientEvent("billing:paywall_viewed");
    }
  }, [isUpgradeFlow, subscribeRouteState]);

  if (
    subscribeRouteState === "loading" ||
    subscribeRouteState === "redirectToApp"
  ) {
    return <StatusScreen pending />;
  }

  if (subscribeRouteState === "finalizing") {
    return (
      <StatusScreen
        logo
        size="sm"
        title="サブスクリプションを開始しています…"
        pending
        description="通常は数秒で完了します。"
        footer={
          <>
            時間がかかっていますか？{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              メールアドレス {SUPPORT_EMAIL}
            </a>
            。
          </>
        }
      />
    );
  }

  if (subscribeRouteState === "error") {
    return (
      <StatusScreen logo title="請求機能を利用できません" size="sm">
        <QueryError
          error={customerQuery.error}
          fallback="現在、請求状況を確認できません。もう一度お試しください。"
          onRetry={() => void customerQuery.refetch()}
          isRetrying={customerQuery.isFetching}
        />
      </StatusScreen>
    );
  }

  async function handleSubscribe() {
    setError(null);
    setIsAttaching(true);

    try {
      captureClientEvent("billing:checkout_start");
      const successUrl = new URL(window.location.href);
      successUrl.searchParams.set("checkout", "success");
      await customerQuery.attach({
        planId: BASE_PLAN_OFFER.planId,
        redirectMode: "always",
        successUrl: successUrl.toString(),
        checkoutSessionParams: BASE_PLAN_OFFER.checkoutSessionParams,
      });
    } catch (err) {
      setError(
        getStandardErrorMessage(
          err,
          "決済手続きを開始できませんでした。もう一度お試しください。",
        ),
      );
      setIsAttaching(false);
    }
  }

  const firstName = session?.user?.name?.split(" ")[0] || "";

  return (
    <div className="w-full max-w-sm space-y-6">
      <PlanPageAccountMenu email={session?.user?.email} />

      <div className="space-y-3 text-center">
        <img
          src="/transparent-logo.png"
          alt="OpenSEO"
          className="mx-auto size-10 rounded-lg"
        />
        <h1 className="text-xl font-semibold">
          {isUpgradeFlow
            ? "プランをアップグレード"
            : firstName
              ? `${firstName}さん、OpenSEOへようこそ！`
              : "OpenSEOへようこそ！"}
        </h1>
        <p className="text-sm text-muted-foreground">
          自分らしいSEOを。必要なSEOツールを1か所に、適正な価格で。
        </p>
      </div>

      <PlanOfferCard
        offer={BASE_PLAN_OFFER}
        features={PLAN_FEATURES}
        afterFeatures={
          /* Sub-bullet of the Usage Credits line above. */
          <li className="-mt-1 pl-6 text-xs">
            <a
              className="text-muted-foreground underline decoration-muted-foreground/40 decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
              href="https://openseo.so/pricing"
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                captureClientEvent("billing:pricing_estimator_click")
              }
            >
              利用クレジットで何ができますか？{" "}
              <span aria-hidden="true">&#8599;</span>
            </a>
          </li>
        }
      >
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {canManageBilling ? (
          <Button
            className="w-full"
            variant="secondary"
            pending={isAttaching}
            onClick={() => void handleSubscribe()}
          >
            {isAttaching ? "移動しています…" : "申し込む"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            サブスクリプションを開始できるのは組織の所有者だけです。所有者にアップグレードを依頼してください。
          </p>
        )}
      </PlanOfferCard>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          ご質問はメールでお問い合わせください：{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
          。
        </p>
        {isUpgradeFlow ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void navigate({ to: "/", replace: true })}
          >
            <ArrowRight className="size-3.5 rotate-180" />
            アプリへ戻る
          </Button>
        ) : null}
      </div>
    </div>
  );
}
