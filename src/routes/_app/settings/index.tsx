import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ApiKeySettings } from "@/client/features/settings/ApiKeySettings";
import { DataforseoUsageSettings } from "@/client/features/settings/DataforseoUsageSettings";
import { SectionHeader } from "@/client/components/PageHeader";
import { ThemePreferenceRadio } from "@/client/components/ThemePreferenceMenuItems";
import { Switch } from "@/client/components/ui/switch";
import { authClient, useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { version } from "../../../../package.json";

export const Route = createFileRoute("/_app/settings/")({
  component: PersonalSettings,
});

function PersonalSettings() {
  const isHosted = isHostedClientAuthMode();
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const analyticsEnabled = session?.user?.analyticsOptedOut !== true;

  async function updateAnalyticsPreference(enabled: boolean) {
    setIsSaving(true);
    try {
      const result = await authClient.updateUser({
        analyticsOptedOut: !enabled,
      });
      if (result.error) {
        toast.error("分析データの設定を更新できませんでした。");
      } else {
        toast.success(
          enabled
            ? "利用状況データの共有を有効にしました"
            : "利用状況データの共有を無効にしました",
        );
      }
    } catch {
      toast.error("分析データの設定を更新できませんでした。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <SectionHeader title="外観" />
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm">テーマ</span>
          <ThemePreferenceRadio />
        </div>
      </section>

      {isHosted ? (
        <>
          <ApiKeySettings />

          <section className="space-y-3">
            <SectionHeader title="利用状況データ" />
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm">OpenSEOの改善に協力する</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  分析データと利用状況データを共有します。
                </p>
              </div>
              <Switch
                checked={analyticsEnabled}
                disabled={isSaving}
                onCheckedChange={(checked) => {
                  void updateAnalyticsPreference(checked);
                }}
                aria-label="製品利用状況の分析を有効化"
              />
            </div>
          </section>
        </>
      ) : (
        <>
          <DataforseoUsageSettings />
          <section className="space-y-3">
            <SectionHeader title="情報" />
            <div className="flex items-center justify-between gap-6">
              <span className="text-sm">バージョン</span>
              <span className="font-mono text-sm text-muted-foreground">
                v{version}
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
