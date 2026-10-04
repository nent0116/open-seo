import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorState } from "@/client/components/ErrorState";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/client/components/ui/card";
import { Field, FieldError } from "@/client/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/client/components/ui/input-group";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { useCanManageBilling } from "@/client/features/team/organizationQueries";
import { captureClientEvent } from "@/client/lib/posthog";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { buildCheckoutSuccessUrl } from "@/client/features/billing/checkout-url";
import { BillingUsageChart } from "@/client/features/billing/BillingUsageChart";
import { BillingFeatureBreakdown } from "@/client/features/billing/BillingFeatureBreakdown";
import { parseTopUpAmount } from "@/client/features/billing/HostedBillingContentUtils";
import { getBillingRouteState } from "@/client/features/billing/route-state";
import { getCustomerPaidPlan } from "@/client/features/billing/plan-detection";
import { useCreditBalance } from "@/client/features/billing/useCreditBalance";
import {
  BASE_PLAN_OFFER,
  monthlyCreditsFeature,
} from "@/client/features/billing/plan-offers";
import {
  AUTUMN_CHECKOUT_SESSION_PARAMS,
  BILLING_ROUTE,
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  AUTUMN_SEO_DATA_TOP_UP_PLAN_ID,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
} from "@/shared/billing";

export const Route = createFileRoute("/_app/billing")({
  beforeLoad: () => {
    if (!isHostedClientAuthMode()) {
      throw notFound();
    }
  },
  component: BillingPage,
});

type BillingAction = "plan" | "topUp";

function BillingPage() {
  const [topUpAmount, setTopUpAmount] = useState("20");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<{
    action: BillingAction;
    message: string;
  } | null>(null);

  const {
    session: { data: session, isPending: isSessionPending },
    customerQuery,
    isFreePlan,
    monthlyRemaining,
    topUpRemaining,
    totalRemaining,
    isOutOfCredits,
    isLowCredits,
  } = useCreditBalance({
    // Expanded so the plan card can show the subscribed plan's name.
    expand: ["subscriptions.plan"],
  });

  // Subscription changes are owner-only; other members see balances but are
  // pointed at the owner instead of checkout (the server enforces this too).
  const canManageBilling = useCanManageBilling();

  const paidPlan = getCustomerPaidPlan(customerQuery.data);
  const billingRouteState = getBillingRouteState({
    hasSession: Boolean(session?.user?.id),
    isSessionPending,
    isCustomerLoading: customerQuery.isLoading,
    isCustomerError: customerQuery.isError,
    hasCustomerData: customerQuery.data != null,
  });

  const { isValid: isValidTopUp, parsed: parsedTopUpAmount } =
    parseTopUpAmount(topUpAmount);
  const showTopUpError = topUpAmount.trim() !== "" && !isValidTopUp;

  if (billingRouteState === "loading") {
    return <SkeletonPage />;
  }

  if (billingRouteState === "error") {
    return (
      <div className="mx-auto box-content max-w-7xl space-y-4 px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
        <PageHeader title="請求機能を利用できません" />
        <QueryError
          error={customerQuery.error}
          fallback="現在、請求情報を読み込めません。もう一度お試しください。"
          onRetry={() => void customerQuery.refetch()}
          isRetrying={customerQuery.isFetching}
        />
      </div>
    );
  }

  function startUpgradeCheckout() {
    captureClientEvent("billing:checkout_start");
    return customerQuery.attach({
      planId: BASE_PLAN_OFFER.planId,
      redirectMode: "always",
      successUrl: buildCheckoutSuccessUrl(BILLING_ROUTE),
      checkoutSessionParams: BASE_PLAN_OFFER.checkoutSessionParams,
    });
  }

  async function runAction(
    action: BillingAction,
    callback: () => Promise<unknown>,
    fallbackMessage: string,
  ) {
    setError(null);
    setIsPending(true);
    try {
      await callback();
      await customerQuery.refetch();
    } catch (err) {
      setError({
        action,
        message: getStandardErrorMessage(err, fallbackMessage),
      });
    } finally {
      setIsPending(false);
    }
  }

  function actionError(action: BillingAction) {
    return error?.action === action ? (
      <ErrorState message={error.message} />
    ) : null;
  }

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Stripeへ移動しています…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto box-content max-w-7xl space-y-5 px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <PageHeader title="請求・利用状況" />

      {customerQuery.isError ? (
        <QueryError
          error={customerQuery.error}
          fallback="請求情報を更新できませんでした"
          onRetry={() => void customerQuery.refetch()}
          isRetrying={customerQuery.isFetching}
        />
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {/* Subscription card */}
        <Card>
          <CardContent className="flex h-full flex-col justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold tabular-nums">
                ${totalRemaining.toFixed(2)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  remaining
                </span>
              </div>
              {!isFreePlan ? (
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    月間 ${monthlyRemaining.toFixed(2)}
                  </span>
                  <span>&middot;</span>
                  <span className="tabular-nums">
                    追加購入 ${topUpRemaining.toFixed(2)}
                  </span>
                </div>
              ) : null}
              {isOutOfCredits ? (
                <p className="mt-2 text-xs text-destructive">
                  クレジットをすべて使用しました。{" "}
                  {isFreePlan
                    ? "続行するにはプランをアップグレードしてください。"
                    : "続行するには下からクレジットを追加購入してください。"}
                </p>
              ) : isLowCredits ? (
                <p className="mt-2 text-xs text-amber-600">
                  クレジットの残高が少なくなっています。{" "}
                  {isFreePlan
                    ? `アップグレードすると月額$${BASE_PLAN_OFFER.monthlyCreditsUsd}相当のクレジットを利用できます。`
                    : "下からクレジットを追加購入できます。"}
                </p>
              ) : null}
            </div>

            <div className="text-sm">
              <span className="font-medium">プラン</span>{" "}
              <span className="text-muted-foreground">
                {paidPlan?.name ?? "無料プラン"}
              </span>
              {paidPlan ? (
                <span className="text-muted-foreground">
                  {" "}
                  &middot; ${paidPlan.monthlyCreditsUsd.toFixed(2)}{" "}
                  相当の利用クレジット／月
                </span>
              ) : null}
            </div>

            {!canManageBilling ? (
              <p className="border-t border-border pt-3 text-sm text-muted-foreground">
                プラン変更とクレジット購入は組織の所有者だけが行えます。追加が必要な場合は所有者へ依頼してください。
              </p>
            ) : isFreePlan ? (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium">
                    {BASE_PLAN_OFFER.name}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    ${BASE_PLAN_OFFER.priceUsd}/月
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {[
                    "OpenSEOのすべての機能を利用可能",
                    monthlyCreditsFeature(BASE_PLAN_OFFER),
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-xs text-muted-foreground"
                    >
                      <span className="mt-[1px] shrink-0 text-muted-foreground/60">
                        &mdash;
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() =>
                    void runAction(
                      "plan",
                      startUpgradeCheckout,
                      "決済を開始できませんでした。もう一度お試しください。",
                    )
                  }
                >
                  プランをアップグレード
                </Button>
                {actionError("plan")}
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() =>
                    void runAction(
                      "plan",
                      () =>
                        customerQuery.openCustomerPortal({
                          returnUrl: window.location.href,
                        }),
                      "請求ポータルを開けませんでした。もう一度お試しください。",
                    )
                  }
                >
                  サブスクリプションを管理
                </Button>
                {actionError("plan")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buy credits card — paid plan only, owner-only */}
        {!isFreePlan && canManageBilling ? (
          <Card>
            <CardHeader>
              <CardTitle>クレジットを購入</CardTitle>
              <CardDescription>
                追加購入したクレジットに有効期限はなく、月間クレジットを使い切った後に使用されます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field data-invalid={showTopUpError}>
                <InputGroup>
                  <InputGroupAddon>$</InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    min={10}
                    max={99}
                    step={1}
                    inputMode="numeric"
                    aria-label="追加購入額（USD）"
                    aria-invalid={showTopUpError}
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                  />
                </InputGroup>
                {showTopUpError ? (
                  <FieldError>$10～$99の範囲で入力してください。</FieldError>
                ) : null}
              </Field>

              <Button
                variant="secondary"
                className="w-full"
                disabled={!isValidTopUp}
                onClick={() =>
                  void runAction(
                    "topUp",
                    () =>
                      customerQuery.attach({
                        planId: AUTUMN_SEO_DATA_TOP_UP_PLAN_ID,
                        redirectMode: "always",
                        successUrl: window.location.href,
                        checkoutSessionParams: AUTUMN_CHECKOUT_SESSION_PARAMS,
                        featureQuantities: [
                          {
                            featureId: AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
                            quantity: Math.round(
                              parsedTopUpAmount *
                                AUTUMN_SEO_DATA_CREDITS_PER_USD,
                            ),
                          },
                        ],
                      }),
                    "決済を開始できませんでした。もう一度お試しください。",
                  )
                }
              >
                クレジットを購入
              </Button>
              {actionError("topUp")}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <BillingUsageChart />

      <BillingFeatureBreakdown />

      <p className="text-xs text-muted-foreground">
        決済にはStripeを利用しています。
      </p>
    </div>
  );
}
