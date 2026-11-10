import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AppBanner } from "@/client/layout/AppBanner";
import { BASE_PLAN_OFFER } from "@/client/features/billing/plan-offers";
import { useCreditBalance } from "@/client/features/billing/useCreditBalance";
import { captureClientEvent } from "@/client/lib/posthog";
import { useCanManageBilling } from "@/client/features/team/organizationQueries";
import { BILLING_ROUTE, SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanBanner() {
  const {
    accountQuery,
    isFreePlan,
    isOutOfCredits,
    isLowCredits,
    refillDate,
    autoReload,
    autoReloadState,
    isPausedByBudget,
  } = useCreditBalance();
  const canManageBilling = useCanManageBilling();
  const showsOutOfCredits = Boolean(accountQuery.data) && isOutOfCredits;

  useEffect(() => {
    if (showsOutOfCredits)
      captureClientEvent("billing:out_of_credits_shown", { surface: "banner" });
  }, [showsOutOfCredits]);

  if (!accountQuery.data) {
    return null;
  }

  // Credits may be in the balance, but the budget holds them back; buying
  // more would not help, only raising it does.
  if (isPausedByBudget && autoReload) {
    const until = refillDate
      ? ` until ${refillDate}の補充をお待ちください`
      : "";
    return (
      <AppBanner variant="warning">
        {canManageBilling ? (
          <>
            You&rsquo;ve hit your ${autoReload.monthlyLimitUsd} monthly
            auto-reload budget, so credits are paused{until}.{" "}
            <Link
              to={BILLING_ROUTE}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Raise your budget
            </Link>{" "}
            to keep going.
          </>
        ) : (
          <>
            Your organization hit its monthly auto-reload budget, so credits are
            paused{until}. Ask the owner to raise it.
          </>
        )}
      </AppBanner>
    );
  }

  // Out of credits with auto-reload on and working means Autumn is charging
  // the card right now; a "buy more" notice would have them pay twice.
  if (!isFreePlan && isOutOfCredits && autoReloadState === "on" && autoReload) {
    return (
      <AppBanner variant="info">
        You&rsquo;re out of credits. Auto-reload is adding $
        {autoReload.amountUsd} now.
      </AppBanner>
    );
  }

  // Only the owner can change the plan or buy credits, so a link would lead
  // everyone else to a page where they can't act.
  if (!canManageBilling && (isOutOfCredits || isLowCredits)) {
    return (
      <AppBanner variant={isOutOfCredits ? "destructive" : "warning"}>
        {isOutOfCredits
          ? autoReloadState === "card_failed"
            ? "Your organization is out of credits and its card was declined."
            : "組織のクレジットをすべて使用しました。"
          : "組織のクレジット残高が少なくなっています。"}{" "}
        Ask your organization owner to{" "}
        {autoReloadState === "card_failed" ? "update it" : "add more"}.
      </AppBanner>
    );
  }

  const creditsActionLink = isFreePlan ? (
    <Link
      to={SUBSCRIBE_ROUTE}
      search={{ upgrade: true }}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      プランをアップグレード
    </Link>
  ) : (
    <Link
      to={BILLING_ROUTE}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      クレジットを追加購入
    </Link>
  );

  if (isOutOfCredits) {
    return (
      <AppBanner variant="destructive">
        {isFreePlan ? (
          <>
            無料クレジットをすべて使用しました。{creditsActionLink}すると毎月$
            {BASE_PLAN_OFFER.monthlyCreditsUsd}相当のクレジットを利用できます。
          </>
        ) : autoReloadState === "card_failed" ? (
          <>
            You&rsquo;re out of credits and auto-reload couldn&rsquo;t charge
            your card.{" "}
            <Link
              to={BILLING_ROUTE}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Update your card
            </Link>{" "}
            to keep going.
          </>
        ) : autoReloadState === "failed" ? (
          <>
            You&rsquo;re out of credits and auto-reload couldn&rsquo;t buy more.{" "}
            {creditsActionLink} to keep going.
          </>
        ) : (
          <>
            今月のクレジットをすべて使用しました。{creditsActionLink}して
            利用を続けてください
            {refillDate ? `。または、${refillDate}の補充をお待ちください` : ""}.
          </>
        )}
      </AppBanner>
    );
  }

  if (isLowCredits) {
    return (
      <AppBanner variant="warning">
        クレジットの残高が少なくなっています。{creditsActionLink}
        してOpenSEOを引き続き利用できます。
      </AppBanner>
    );
  }

  if (isFreePlan) {
    return (
      <AppBanner variant="info">
        OpenSEOをご利用いただきありがとうございます。
        <Link
          to={SUBSCRIBE_ROUTE}
          search={{ upgrade: true }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          いつでもアップグレードできます
        </Link>
        。または、
        <Link
          to="/support"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          ご不明点はお問い合わせください
        </Link>
        。
      </AppBanner>
    );
  }

  return null;
}
