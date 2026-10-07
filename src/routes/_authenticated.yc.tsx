import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Tag } from "lucide-react";
import { QueryError } from "@/client/components/QueryState";
import { StatusScreen } from "@/client/components/StatusScreen";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  billingAccountQueryOptions,
  prefetchBillingAccount,
} from "@/client/features/billing/billingAccountQuery";
import { PlanPageAccountMenu } from "@/client/features/billing/PlanPageAccountMenu";
import { PlanOfferCard } from "@/client/features/billing/PlanOfferCard";
import {
  YC_PLAN_OFFER,
  monthlyCreditsFeature,
} from "@/client/features/billing/plan-offers";
import { openPlanCheckout } from "@/client/features/billing/checkout";
import { useCanManageBilling } from "@/client/features/team/organizationQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { BILLING_ROUTE } from "@/shared/billing";
import { SUPPORT_EMAIL } from "@/client/lib/support";

const PLAN_FEATURES = [
  "キーワード調査、被リンク、順位計測、サイト監査",
  "Claude、Cursor、ChatGPT向けのMCPサーバーとエージェントスキル",
  "Google Search Console連携",
  monthlyCreditsFeature(YC_PLAN_OFFER),
];

export const Route = createFileRoute("/_authenticated/yc")({
  // The loader fills the module-scoped query client, so keep it out of server
  // requests: one worker isolate must not cache another account's billing.
  ssr: false,
  beforeLoad: () => {
    if (!isHostedClientAuthMode()) {
      throw notFound();
    }
  },
  // Start the billing read alongside the session check, not after it.
  loader: () => prefetchBillingAccount(),
  component: YcPlanPage,
});

function YcPlanPage() {
  const { data: session } = useSession();
  const [isAttaching, setIsAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountQuery = useQuery(billingAccountQueryOptions());
  const account = accountQuery.data;

  // Checkout is owner-only; other members are pointed at their organization
  // owner instead of a button that would 403.
  const canManageBilling = useCanManageBilling();

  const isPaid = account?.planStatus === "paid";
  const isOnYcPlan = account?.paidPlanId === YC_PLAN_OFFER.planId;

  // A failed refetch keeps the loaded page; only a failed first read stops.
  if (accountQuery.isError && !account) {
    return (
      <StatusScreen logo title="請求機能を利用できません" size="sm">
        <QueryError
          cause={accountQuery.error}
          fallback="現在、請求状況を確認できません。もう一度お試しください。"
          onRetry={() => void accountQuery.refetch()}
          isRetrying={accountQuery.isFetching}
        />
      </StatusScreen>
    );
  }

  async function handleSubscribe() {
    setError(null);
    setIsAttaching(true);

    try {
      // Existing subscribers switching plans land on Billing so they can see
      // the new plan; new subscribers go into the app.
      await openPlanCheckout(
        YC_PLAN_OFFER.planId,
        isPaid ? BILLING_ROUTE : "/",
      );
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

  return (
    <div className="w-full max-w-sm space-y-6">
      <PlanPageAccountMenu email={session?.user?.email} />

      <div className="text-center space-y-3">
        <img
          src="/transparent-logo.png"
          alt="OpenSEO"
          className="mx-auto size-10 rounded-lg"
        />
        <h1 className="text-xl font-semibold">YC創業者向けOpenSEO</h1>
        <p className="text-sm text-muted-foreground">
          本格的にSEOへ取り組むチーム向けの大容量月間クレジットプランです。YC特典で初月は無料になります。
        </p>
      </div>

      <PlanOfferCard offer={YC_PLAN_OFFER} features={PLAN_FEATURES}>
        <div className="flex gap-2.5 rounded-md bg-muted p-3 text-sm">
          <Tag className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              プロモーションコードをお忘れなく。
            </span>{" "}
            決済画面の「Add promotion
            code」にYC特典のコードを入力すると、初月が無料になります。
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!account ? (
          // The offer is static; only the button depends on the current plan.
          <Skeleton className="h-9 w-full" />
        ) : isOnYcPlan ? (
          <p className="text-sm text-muted-foreground">
            現在利用中のプラン：{YC_PLAN_OFFER.name}。{" "}
            <Link
              to={BILLING_ROUTE}
              className="underline underline-offset-2 hover:text-foreground"
            >
              請求画面で管理
            </Link>
            。
          </p>
        ) : canManageBilling ? (
          <div className="space-y-2">
            <Button
              className="w-full"
              variant="secondary"
              pending={isAttaching}
              onClick={() => void handleSubscribe()}
            >
              {isAttaching
                ? "移動しています…"
                : isPaid
                  ? `${YC_PLAN_OFFER.name}へ切り替える`
                  : `${YC_PLAN_OFFER.name}を申し込む`}
            </Button>
            {isPaid ? (
              <p className="text-center text-xs text-muted-foreground">
                現在のサブスクリプションから切り替わります。
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            プランを変更できるのは組織の所有者だけです。この組織を次のプランへ変更するよう依頼してください：{" "}
            {YC_PLAN_OFFER.name}。
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
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="size-3.5 rotate-180" />
          アプリへ戻る
        </Link>
      </div>
    </div>
  );
}
