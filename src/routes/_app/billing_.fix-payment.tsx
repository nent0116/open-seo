import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCustomer } from "autumn-js/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { useQuery } from "@tanstack/react-query";
import {
  organizationContextQueryOptions,
  useCanManageBilling,
} from "@/client/features/team/organizationQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientError, captureClientEvent } from "@/client/lib/posthog";
import { getBillingRouteState } from "@/client/features/billing/route-state";
import { BILLING_ROUTE } from "@/shared/billing";
import { QueryError } from "@/client/components/QueryState";
import { Spinner } from "@/client/components/Spinner";
import { Button } from "@/client/components/ui/button";

const SUPPORT_EMAIL = "ben@openseo.so";

// How long the post-portal "checking" screen polls Autumn before telling the
// user the retry is still pending.
const CHECKING_TIMEOUT_MS = 30_000;

// Linked from the payment-failed email. Deliberately narrower than /billing:
// one problem, one fix. The Stripe portal both saves the new card as the
// default and lets the customer pay the open invoice, so it is the only action.
export const Route = createFileRoute("/_app/billing_/fix-payment")({
  validateSearch: (search: Record<string, unknown>): { returned?: true } => ({
    returned:
      search.returned === true || search.returned === "true" ? true : undefined,
  }),
  beforeLoad: () => {
    if (!isHostedClientAuthMode()) {
      throw notFound();
    }
  },
  component: FixPaymentPage,
});

function FixPaymentPage() {
  const { returned } = Route.useSearch();
  const { data: session, isPending: isSessionPending } = useSession();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingTimedOut, setCheckingTimedOut] = useState(false);
  const viewCaptured = useRef(false);

  const customerQuery = useCustomer({
    queryOptions: { enabled: Boolean(session?.user?.id) },
  });
  const canManageBilling = useCanManageBilling();
  // The hook above reports true while the role loads (a UI choice); the
  // telemetry waits for the real role.
  const roleResolved =
    useQuery(organizationContextQueryOptions()).data !== undefined;

  const routeState = getBillingRouteState({
    hasSession: Boolean(session?.user?.id),
    isSessionPending,
    isCustomerLoading: customerQuery.isLoading,
    isCustomerError: customerQuery.isError,
    hasCustomerData: customerQuery.data != null,
  });
  const isPastDue =
    customerQuery.data?.subscriptions?.some((s) => s.pastDue) ?? false;
  const isChecking =
    Boolean(returned) &&
    routeState === "ready" &&
    isPastDue &&
    !checkingTimedOut;

  // Stripe retries the invoice with the new card and Autumn relays the result
  // a few seconds later; poll until the subscription is no longer past due.
  const { refetch: refetchCustomer } = customerQuery;
  useEffect(() => {
    if (!isChecking) return;
    const interval = setInterval(() => void refetchCustomer(), 2000);
    const timeout = setTimeout(() => {
      setCheckingTimedOut(true);
      // The user did the right thing and we could not confirm it worked.
      // Rare enough that every occurrence is worth a look.
      captureClientError(
        new Error("Subscription still past due after billing portal return"),
        { context: "fix_payment_check_timeout" },
      );
    }, CHECKING_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isChecking, refetchCustomer]);

  // Funnel: viewed -> portal_opened -> returned -> payment_fixed. Each fires
  // once per page load; `returned` is a full navigation back from Stripe.
  useEffect(() => {
    if (routeState !== "ready" || !roleResolved || viewCaptured.current) return;
    viewCaptured.current = true;
    captureClientEvent(
      returned ? "billing:fix_payment_returned" : "billing:fix_payment_viewed",
      { past_due: isPastDue, can_manage_billing: canManageBilling },
    );
  }, [routeState, roleResolved, returned, isPastDue, canManageBilling]);

  useEffect(() => {
    if (returned && routeState === "ready" && !isPastDue) {
      captureClientEvent("billing:payment_fixed");
    }
  }, [returned, routeState, isPastDue]);

  async function openPortal() {
    setError(null);
    setIsOpeningPortal(true);
    captureClientEvent("billing:fix_payment_portal_opened");
    try {
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("returned", "true");
      await customerQuery.openCustomerPortal({ returnUrl: returnUrl.href });
    } catch (err) {
      captureClientError(err, { context: "fix_payment_open_portal" });
      setError(
        getStandardErrorMessage(
          err,
          "請求ポータルを開けませんでした。もう一度お試しください。",
        ),
      );
      setIsOpeningPortal(false);
    }
  }

  if (routeState === "loading") {
    return null;
  }

  if (routeState === "error") {
    return (
      <Page title="請求機能を利用できません">
        <QueryError
          error={customerQuery.error}
          fallback="現在、請求情報を読み込めません。もう一度お試しください。"
          onRetry={() => void customerQuery.refetch()}
          isRetrying={customerQuery.isFetching}
        />
      </Page>
    );
  }

  if (isChecking) {
    return (
      <Page title="お支払い状況を確認しています…">
        <Spinner />
        <p className="text-sm text-muted-foreground">
          更新したカードでStripeが決済を再試行しています。通常は数秒で完了します。
        </p>
      </Page>
    );
  }

  if (!isPastDue) {
    return (
      <Page
        title={returned ? "お支払いが完了しました" : "お支払い状況は正常です"}
      >
        <p className="text-sm text-muted-foreground">
          {returned
            ? "お支払いが完了し、サブスクリプションが再開されました。"
            : "未払いの請求はありません。"}{" "}
          <Link
            to={BILLING_ROUTE}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            請求・利用状況へ戻る
          </Link>
        </p>
      </Page>
    );
  }

  if (!canManageBilling) {
    return (
      <Page title="お支払い方法を修正">
        <p className="text-sm text-muted-foreground">
          この組織の決済を完了できませんでした。カードを更新できるのは組織の所有者だけです。所有者にこのページを開くよう依頼してください。
        </p>
      </Page>
    );
  }

  return (
    <Page
      title={returned ? "未払いの表示が続いています" : "お支払い方法を修正"}
    >
      <p className="text-sm text-muted-foreground">
        {returned
          ? "サブスクリプションはまだ支払期限超過と表示されています。Stripeによる再決済には数分かかる場合があります。新しいカードを追加しても請求書がポータルで未払いの場合は、ポータルから直接お支払いください。"
          : "前回のお支払いを処理できませんでした。カードの有効期限切れや、金融機関による決済拒否が主な原因です。機能はまだ停止されていません。"}
      </p>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold">お支払い方法を更新</p>
        <p className="mt-1 text-sm text-muted-foreground">
          請求ポータルで有効なカードを追加してください。今後の更新時の既定カードとなり、未払い請求も同じ画面で支払えます。
        </p>
        <Button
          size="sm"
          className="mt-3"
          pending={isOpeningPortal}
          onClick={() => void openPortal()}
        >
          {isOpeningPortal ? "Stripeを開いています…" : "請求ポータルを開く"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Page>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto box-content max-w-7xl space-y-5 px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          請求・利用状況
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {children}
      <p className="text-xs text-muted-foreground">
        問題がある場合はメールでお問い合わせください：{SUPPORT_EMAIL}。
      </p>
    </div>
  );
}
