import type { BillingUsage } from "@/server/billing/usage";
import { QueryState } from "@/client/components/QueryState";
import { Skeleton } from "@/client/components/ui/skeleton";
import { BillingUsageSection } from "@/client/features/billing/BillingUsageSection";
import { useBillingUsage } from "@/client/features/billing/useBillingUsage";

const BILLING_FEATURE_LABELS_JA: Record<string, string> = {
  "Keyword Research": "キーワード調査",
  "Domain Overview": "ドメイン概要",
  Backlinks: "被リンク",
  "Site Audit": "サイト監査",
  "Rank Tracking": "順位計測",
  "AI Citations": "AI引用",
  "AI Prompt Responses": "AIプロンプト回答",
  "AI Search": "AI検索",
  "Local SEO": "ローカルSEO",
  Onboarding: "初期設定",
  "SAM Agent": "SAMエージェント",
  Other: "その他",
};

export function BillingFeatureBreakdown() {
  const usageQuery = useBillingUsage();

  return (
    <BillingUsageSection title="機能別の使用量">
      <QueryState
        query={usageQuery}
        errorFallback="Failed to load usage"
        loading={
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        }
      >
        {(usage) => <BreakdownRows rows={usage.features} />}
      </QueryState>
    </BillingUsageSection>
  );
}

function BreakdownRows({ rows }: { rows: BillingUsage["features"] }) {
  const total = rows.reduce((sum, row) => sum + row.usd, 0);

  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        使用履歴はまだありません
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span>{BILLING_FEATURE_LABELS_JA[row.label] ?? row.label}</span>
            <span className="tabular-nums text-muted-foreground">
              ${row.usd.toFixed(2)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[#7c3aed]"
              style={{ width: `${(row.usd / total) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
