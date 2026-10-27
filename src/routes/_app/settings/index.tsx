import { createFileRoute } from "@tanstack/react-router";
import { ApiKeySettings } from "@/client/features/settings/ApiKeySettings";
import { DataforseoUsageSettings } from "@/client/features/settings/DataforseoUsageSettings";
import { SectionHeader } from "@/client/components/PageHeader";
import { ThemePreferenceRadio } from "@/client/components/ThemePreferenceMenuItems";
import { PrivacySettings } from "@/client/features/settings/PrivacySettings";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { version } from "../../../../package.json";

export const Route = createFileRoute("/_app/settings/")({
  component: PersonalSettings,
});

function PersonalSettings() {
  const isHosted = isHostedClientAuthMode();

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

          <PrivacySettings />
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
