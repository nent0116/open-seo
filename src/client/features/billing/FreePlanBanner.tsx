import { Link } from "@tanstack/react-router";
import { AppBanner } from "@/client/layout/AppBanner";
import { BASE_PLAN_OFFER } from "@/client/features/billing/plan-offers";
import { useCreditBalance } from "@/client/features/billing/useCreditBalance";
import { useCanManageBilling } from "@/client/features/team/organizationQueries";
import { BILLING_ROUTE, SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanBanner() {
  const { accountQuery, isFreePlan, isOutOfCredits, isLowCredits, refillDate } =
    useCreditBalance();
  const canManageBilling = useCanManageBilling();

  if (!accountQuery.data) {
    return null;
  }

  // Only the owner can change the plan or buy credits, so a link would lead
  // everyone else to a page where they can't act.
  if (!canManageBilling && (isOutOfCredits || isLowCredits)) {
    return (
      <AppBanner variant={isOutOfCredits ? "destructive" : "warning"}>
        {isOutOfCredits
          ? "組織のクレジットをすべて使用しました。"
          : "組織のクレジット残高が少なくなっています。"}{" "}
        追加が必要な場合は組織の所有者へ依頼してください。
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
