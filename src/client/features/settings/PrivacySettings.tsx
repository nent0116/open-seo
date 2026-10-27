import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionHeader } from "@/client/components/PageHeader";
import {
  updatePrivacyChoices,
  usePrivacyChoices,
} from "@/client/components/PrivacyChoices";
import { Switch } from "@/client/components/ui/switch";
import { useSession } from "@/lib/auth-client";
import { setProductUpdatesOptIn } from "@/serverFunctions/product-updates";

export function PrivacySettings() {
  const choices = usePrivacyChoices();
  const { data: session, refetch } = useSession();
  const productUpdates = useMutation({
    mutationFn: (optIn: boolean) => setProductUpdatesOptIn({ data: { optIn } }),
    // The session is served from a signed cookie cache, so bypass it to pick
    // up the saved choice.
    onSuccess: () => refetch({ query: { disableCookieCache: true } }),
    onError: () => toast.error("メール配信の設定を保存できませんでした。"),
  });
  if (!choices || !session) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="プライバシーとメール配信" />
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">利用状況データ</p>
          <p className="mt-1 text-sm text-muted-foreground">
            OpenSEOの改善のため、利用状況データとセッションリプレイを共有します。
          </p>
        </div>
        <Switch
          checked={choices.analytics}
          onCheckedChange={(analytics) =>
            void updatePrivacyChoices({ ...choices, analytics }, true)
          }
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
          checked={
            productUpdates.isPending
              ? productUpdates.variables
              : session.user.productUpdatesOptIn === true
          }
          disabled={productUpdates.isPending}
          onCheckedChange={(optIn) => productUpdates.mutate(optIn)}
          aria-label="製品アップデートのメールを受け取る"
        />
      </div>
    </section>
  );
}
