import { Link } from "@tanstack/react-router";
import { AppBanner } from "@/client/layout/AppBanner";
import { useCreditBalance } from "@/client/features/billing/useCreditBalance";
import { BILLING_ROUTE, SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanBanner() {
  const { customerQuery, isFreePlan, isOutOfCredits, isLowCredits } =
    useCreditBalance();

  if (customerQuery.isLoading || !customerQuery.data) {
    return null;
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
        クレジットをすべて使用しました。{creditsActionLink}
        してOpenSEOの利用を続けてください。
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
