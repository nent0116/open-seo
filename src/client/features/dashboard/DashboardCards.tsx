import { GoogleSearchConsoleLogo } from "@/client/features/integrations/GoogleProductLogos";
import { startAudit } from "@/serverFunctions/audit";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { Globe, LoaderCircle, ScanSearch } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { Progress } from "@/client/components/ui/progress";
import { Button } from "@/client/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "lucide-react";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { SeverityBadge } from "@/client/features/audit/shared";
import { AUDIT_ISSUE_TYPES } from "@/shared/audit-issues";

import {
  formatCount,
  formatCtr,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import { DateRangeSelect } from "@/client/features/search-performance/SearchPerformanceSelects";
import {
  cardMetaClass,
  cardTableClass,
  formatDay,
  moreDetailsClass,
} from "@/client/features/dashboard/cardParts";
import {
  MetricRow,
  MetricsSkeleton,
  TrendChart,
} from "@/client/features/dashboard/DashboardMetrics";
import { percentChange } from "@/client/components/MetricsTable";
import type { ChartConfig } from "@/client/components/ui/chart";
import type { SearchPerformanceDateRange } from "@/types/schemas/search-performance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import type { DashboardAuditSummary } from "@/server/features/dashboard/services/DashboardService";

// Plain string-keyed view of the registry: issue types from the DB are not
// statically guaranteed to be registry keys.
const issueTitles: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(AUDIT_ISSUE_TYPES).map(([key, value]) => [key, value.title]),
);

const gscChartConfig = {
  clicks: { label: "クリック数", color: "var(--chart-1)" },
  impressions: { label: "表示回数", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function GscCard({
  projectId,
  connected,
  siteUrl,
}: {
  projectId: string;
  connected: boolean;
  siteUrl: string | null;
}) {
  const [dateRange, setDateRange] =
    useState<SearchPerformanceDateRange>("last_28_days");
  const reportQuery = useQuery({
    queryKey: ["dashboardGscReport", projectId, siteUrl, dateRange],
    queryFn: () =>
      getSearchPerformanceReport({ data: { projectId, dateRange } }),
    enabled: connected,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });
  const report = reportQuery.data;

  // Not connected (or a dead grant discovered by the report call): the
  // connection card sells and runs the whole flow itself.
  if (!connected || (report && !report.connected)) {
    return (
      <div id="connect-gsc">
        <GoogleConnectionCard provider="gsc" projectId={projectId} prominent />
      </div>
    );
  }

  return (
    <CardShell
      title="GSC"
      icon={<GoogleSearchConsoleLogo className="size-5" />}
      titleInfo={
        <DateRangeSelect
          value={dateRange}
          onChange={setDateRange}
          triggerClassName="border-transparent bg-transparent pl-2 pr-1.5 font-normal text-muted-foreground hover:bg-foreground/5"
        />
      }
      action={
        <Link
          to="/p/$projectId/search-performance"
          params={{ projectId }}
          search={{ range: dateRange }}
          className={moreDetailsClass}
        >
          View GSC insights
        </Link>
      }
    >
      {reportQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          Search
          Consoleのデータを読み込めませんでした。時間をおいて再試行してください。
        </p>
      ) : !report ? (
        <MetricsSkeleton />
      ) : (
        <div
          className={`flex flex-1 flex-col gap-4 transition-opacity ${reportQuery.isPlaceholderData ? "opacity-50" : ""}`}
        >
          <MetricRow
            metrics={[
              {
                label: "クリック数",
                value: formatCount(report.totals.clicks),
                change: percentChange(
                  report.totals.clicks,
                  report.prevTotals.clicks,
                ),
                dotClass: "bg-chart-1",
              },
              {
                label: "表示回数",
                value: formatCount(report.totals.impressions),
                change: percentChange(
                  report.totals.impressions,
                  report.prevTotals.impressions,
                ),
                dotClass: "bg-chart-2",
              },
              {
                label: "クリック率",
                value: formatCtr(report.totals.ctr),
                change: null,
              },
              {
                label: "平均掲載順位",
                value: formatPosition(report.totals.position),
                change: null,
              },
            ]}
          />
          {report.totals.impressions > 0 ? (
            <TrendChart config={gscChartConfig} data={report.trend} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No search data for this period yet.
            </p>
          )}
        </div>
      )}
    </CardShell>
  );
}

const siteHealthIcon = <Globe className="size-5" />;

export function AuditHealthCard({
  projectId,
  audit,
  domain,
}: {
  projectId: string;
  audit: DashboardAuditSummary | null;
  domain: string | null;
}) {
  const queryClient = useQueryClient();
  const scan = useMutation({
    mutationFn: () =>
      startAudit({
        data: {
          projectId,
          startUrl: `https://${domain}`,
          maxPages: 50,
          renderJavaScript: true,
        },
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["dashboardOverview", projectId],
      }),
    meta: { errorToast: false },
  });
  if (!audit)
    return (
      <CardShell title="サイトの状態" icon={siteHealthIcon}>
        <EmptyState
          variant="plain"
          icon={ScanSearch}
          title="Find what's holding your website back"
          description="Scan up to 50 pages for broken links, missing titles and pages Google can't index."
          action={
            <>
              {domain ? (
                <Button disabled={scan.isPending} onClick={() => scan.mutate()}>
                  {scan.isPending ? "監査を開始しています…" : "サイトを監査"}
                </Button>
              ) : (
                <Button
                  nativeButton={false}
                  render={
                    <Link to="/p/$projectId/settings" params={{ projectId }} />
                  }
                >
                  ウェブサイトを登録
                </Button>
              )}
              {scan.isError && (
                <QueryError
                  error={scan.error}
                  fallback="監査を開始できませんでした"
                />
              )}
            </>
          }
        />
      </CardShell>
    );

  if (audit.status === "running") {
    const isLighthouse = audit.currentPhase === "lighthouse";
    const isFinalizing = audit.currentPhase === "finalizing";
    const checked = isLighthouse
      ? audit.lighthouseCompleted + audit.lighthouseFailed
      : audit.pagesCrawled;
    const total = isLighthouse ? audit.lighthouseTotal : audit.pagesTotal;
    // A running crawl has at most a partial issue list, and an empty one is
    // not the same as a healthy site, so show progress instead.
    return (
      <CardShell
        title="サイトの状態"
        icon={siteHealthIcon}
        action={
          <Link
            to="/p/$projectId/audit"
            params={{ projectId }}
            search={{ auditId: audit.id }}
            className={moreDetailsClass}
          >
            進行状況を確認
          </Link>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
          <h3 className="font-medium">
            {isLighthouse
              ? "Lighthouseを実行しています"
              : isFinalizing
                ? "結果を準備しています"
                : audit.currentPhase === "discovery"
                  ? "監査するページを検出しています"
                  : "サイトを監査しています"}
          </h3>
          {!isFinalizing && (
            <Progress
              className="w-full max-w-xs"
              value={checked}
              max={total || 1}
              aria-label={
                isLighthouse ? "Lighthouseのチェック" : "クロール済みページ"
              }
            />
          )}
          <p className="text-sm text-muted-foreground tabular-nums">
            {isLighthouse
              ? `${checked} of ${total} checks${audit.lighthouseFailed > 0 ? ` (${audit.lighthouseFailed} failed)` : ""}`
              : isFinalizing
                ? `${audit.pagesCrawled}ページをクロールしました。レポートを仕上げています。`
                : `${checked} of up to ${total} pages crawled`}
          </p>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell
      title="サイトの状態"
      icon={siteHealthIcon}
      titleInfo={
        audit.status === "completed" ? (
          <span className={cardMetaClass}>
            {audit.pagesCrawled} ページ確認済み・ {formatDay(audit.startedAt)}
          </span>
        ) : null
      }
      action={
        <Link
          to="/p/$projectId/audit"
          params={{ projectId }}
          search={{ auditId: audit.id, tab: "issues" }}
          className={moreDetailsClass}
        >
          問題を確認
        </Link>
      }
    >
      {audit.status === "failed" && (
        <p className="mb-4 text-sm text-destructive">
          前回の監査は完了しませんでした。結果を確認するか、もう一度実行してください。
        </p>
      )}
      {audit.topIssues.length === 0 ? (
        audit.status === "completed" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-success" />
            問題は見つかりませんでした。サイトは良好な状態です。
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            問題を確認するには、もう一度監査を実行してください。
          </p>
        )
      ) : (
        <Table className={cardTableClass}>
          <TableHeader>
            <TableRow>
              <TableHead>問題</TableHead>
              <TableHead>重要度</TableHead>
              <TableHead className="text-right">影響するページ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.topIssues.map((issue) => (
              <TableRow key={issue.issueType}>
                <TableCell>
                  {issueTitles[issue.issueType] ?? issue.issueType}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={issue.severity}>
                    {issue.severity === "critical"
                      ? "重大"
                      : issue.severity === "warning"
                        ? "警告"
                        : "情報"}
                  </SeverityBadge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {issue.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardShell>
  );
}
