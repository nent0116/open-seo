import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import { Switch } from "@/client/components/ui/switch";
import {
  updatePrivacyChoices,
  usePrivacyChoices,
} from "@/client/components/PrivacyChoices";
import { WizardFooter } from "@/client/features/onboarding/WizardFooter";
import { useSession } from "@/lib/auth-client";
import { setProductUpdatesOptIn } from "@/serverFunctions/product-updates";
import type { PrivacyChoices } from "@/shared/privacy-choices";
import { PRIVACY_URL } from "@/shared/terms";

/** Onboarding step for usage analytics and product-update emails. Each switch
 *  starts from the current choice, which is the region default until the user
 *  picks. Continue saves both. */
export function AnalyticsOnboardingStep({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const choices = usePrivacyChoices();
  const { data: session, refetch } = useSession();
  // Unset until the user flips a switch.
  const [analytics, setAnalytics] = React.useState<boolean>();
  const [productUpdates, setProductUpdates] = React.useState<boolean>();

  const save = useMutation({
    // The email choice is only sent when the switch was flipped: signup
    // already applied the region default.
    mutationFn: async (next: {
      privacy: PrivacyChoices;
      productUpdates: boolean | undefined;
    }) => {
      await Promise.all([
        updatePrivacyChoices(next.privacy, true),
        next.productUpdates === undefined
          ? null
          : setProductUpdatesOptIn({ data: { optIn: next.productUpdates } }),
      ]);
      // The session is served from a signed cookie cache, so bypass it for
      // Settings to show the saved email choice.
      await refetch({ query: { disableCookieCache: true } });
    },
    // A failed email sync shouldn't trap anyone in onboarding.
    onError: () =>
      toast.error(
        "メール配信の設定を保存できませんでした。「設定」から変更できます。",
      ),
    onSettled: onNext,
  });

  if (!choices) return null;
  const analyticsOn = analytics ?? choices.analytics;
  const productUpdatesOn =
    productUpdates ?? session?.user.productUpdatesOptIn === true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          OpenSEOの改善に協力する
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          設定はいつでも変更できます。詳しくは以下をご確認ください：{" "}
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            プライバシーポリシー
          </a>
          .
        </p>
      </div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">利用状況データ</p>
          <p className="mt-1 text-sm text-muted-foreground">
            OpenSEOの改善のため、利用状況データとセッションリプレイを共有します。
          </p>
        </div>
        <Switch
          checked={analyticsOn}
          onCheckedChange={setAnalytics}
          aria-label="利用状況データを共有"
        />
      </div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">製品アップデート</p>
          <p className="mt-1 text-sm text-muted-foreground">
            新機能や活用のヒントを不定期にメールでお届けします。いつでも配信を停止できます。
          </p>
        </div>
        <Switch
          checked={productUpdatesOn}
          onCheckedChange={setProductUpdates}
          aria-label="製品アップデートのメールを受け取る"
        />
      </div>
      <WizardFooter
        onBack={onBack}
        continueAction={
          <Button
            type="button"
            className="font-semibold"
            pending={save.isPending}
            onClick={() =>
              save.mutate({
                privacy: { ...choices, analytics: analyticsOn },
                productUpdates,
              })
            }
          >
            続ける
            <ArrowRight className="size-4" />
          </Button>
        }
      />
    </div>
  );
}
