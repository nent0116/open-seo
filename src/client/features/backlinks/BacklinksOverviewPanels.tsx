import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { RESEARCH_SCOPE_LABELS } from "@/shared/researchScope";
import { HelpLabel } from "@/client/components/HelpLabel";
import {
  BacklinksNewLostChart,
  BacklinksTrendChart,
} from "./BacklinksPageCharts";
import type { BacklinksOverviewData } from "./backlinksPageTypes";
import { formatRelativeTimestamp } from "./backlinksPageUtils";

type SummaryStat = { label: string; value: string; description: string };

const SCOPE_NOTES: Partial<Record<BacklinksOverviewData["scope"], string>> = {
  exact_url:
    "このページだけを対象に被リンクを表示しています。サイト全体の結果を表示するには、対象範囲を「ドメイン」または「サブドメイン」に切り替えてください。推移グラフにもいずれかの指定が必要です。",
  subfolder:
    "このサブフォルダ内への被リンクを表示しています。件数は絞り込み後の被リンク合計です。評価、推移、参照ドメインの内訳を表示するには、対象範囲を「ドメイン」または「サブドメイン」にしてください。",
};

export function BacklinksScopeAlert({
  scope,
}: {
  scope: BacklinksOverviewData["scope"];
}) {
  const note = SCOPE_NOTES[scope];
  if (!note) return null;
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription className="text-foreground">{note}</AlertDescription>
    </Alert>
  );
}

/** The header and overview sections at the top of the results card. */
export function BacklinksOverviewPanels({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  return (
    <>
      <div className="px-4 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold break-all">
            {data.displayTarget}
          </h2>
          <Badge variant="outline">{RESEARCH_SCOPE_LABELS[data.scope]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          更新日時 {formatRelativeTimestamp(data.fetchedAt)}{" "}
          ・概要の指標は、表の絞り込み前の対象全体を集計しています
          {/* history/live can't exclude subdomains, so say so rather than
              imply the charts match the domain-scoped totals. */}
          {data.scope === "domain" ? (
            <> ・トレンドにはサブドメインを含みます</>
          ) : null}
        </p>
      </div>
      <div className="px-4 pb-4">
        <OverviewGrid data={data} summaryStats={summaryStats} />
      </div>
    </>
  );
}

function OverviewGrid({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  // Trend charts need history/live, which only takes a whole hostname.
  const domainScope = data.scope === "domain" || data.scope === "subdomains";

  return (
    <div
      className={`grid grid-cols-1 gap-3 ${domainScope ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}
    >
      <div
        className={`rounded-lg border border-border p-3 ${domainScope ? "md:col-span-2 xl:col-span-1" : ""}`}
      >
        <div
          className={`grid grid-cols-2 gap-x-6 gap-y-5 xl:gap-y-6 ${domainScope ? "" : "md:grid-cols-4"}`}
        >
          {summaryStats.map((item) => (
            <div key={item.label}>
              <div className="text-xs tracking-wide text-muted-foreground uppercase">
                <HelpLabel label={item.label} helpText={item.description} />
              </div>
              <p className="text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      {domainScope ? (
        <>
          <TrendPanel
            title="被リンクの推移"
            description="過去1年間の被リンクと参照ドメインの推移"
          >
            <BacklinksTrendChart data={data.trends} />
          </TrendPanel>
          <TrendPanel title="新規と消失" description="被リンクの獲得と消失">
            <BacklinksNewLostChart data={data.newLostTrends} />
          </TrendPanel>
        </>
      ) : null}
    </div>
  );
}

function TrendPanel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
