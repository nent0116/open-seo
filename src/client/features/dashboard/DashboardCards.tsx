import { CardShell } from "@/client/components/CardShell";
import { Button } from "@/client/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { AUDIT_ISSUE_TYPES } from "@/shared/audit-issues";

import {
  formatCount,
  formatCtr,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import {
  EmptyCardBody,
  formatDay,
  moreDetailsClass,
  newLost,
  StatGridSkeleton,
} from "@/client/features/dashboard/cardParts";
import { StatTile } from "@/client/components/StatTile";
import type {
  DashboardAuditSummary,
  DashboardBacklinkSummary,
} from "@/server/features/dashboard/services/DashboardService";

// Plain string-keyed view of the registry: issue types from the DB are not
// statically guaranteed to be registry keys.
const issueTitles: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(AUDIT_ISSUE_TYPES).map(([key, value]) => [key, value.title]),
);

export function GscCard({
  projectId,
  connected,
}: {
  projectId: string;
  connected: boolean;
}) {
  const reportQuery = useQuery({
    queryKey: ["dashboardGscReport", projectId],
    queryFn: () =>
      getSearchPerformanceReport({
        data: { projectId, dateRange: "last_28_days" },
      }),
    enabled: connected,
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
      title="検索パフォーマンス"
      stamp="Google Search Console・過去28日間"
      action={
        <Link
          to="/p/$projectId/search-performance"
          params={{ projectId }}
          className={moreDetailsClass}
        >
          詳細を見る
        </Link>
      }
    >
      {reportQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          Search
          Consoleのデータを読み込めませんでした。時間をおいて再試行してください。
        </p>
      ) : !report ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="クリック数"
            value={formatCount(report.totals.clicks)}
            delta={{
              current: report.totals.clicks,
              previous: report.prevTotals.clicks,
            }}
          />
          <StatTile
            label="表示回数"
            value={formatCount(report.totals.impressions)}
            delta={{
              current: report.totals.impressions,
              previous: report.prevTotals.impressions,
            }}
          />
          <StatTile label="CTR" value={formatCtr(report.totals.ctr)} />
          <StatTile
            label="平均掲載順位"
            value={formatPosition(report.totals.position)}
          />
        </div>
      )}
    </CardShell>
  );
}

export function AuditHealthCard({
  projectId,
  audit,
}: {
  projectId: string;
  audit: DashboardAuditSummary | null;
}) {
  if (!audit) {
    return (
      <CardShell title="サイト監査">
        <EmptyCardBody
          message="サイトをクロールし、リンク切れ、タグの不足、インデックス登録の問題を検出します。"
          cta={
            <Button
              size="lg"
              nativeButton={false}
              render={<Link to="/p/$projectId/audit" params={{ projectId }} />}
            >
              監査を実行
            </Button>
          }
        />
      </CardShell>
    );
  }

  return (
    <CardShell
      title="サイト監査"
      stamp={`サイト監査・${
        audit.status === "completed"
          ? `${audit.pagesCrawled.toLocaleString("ja-JP")}ページをクロール・${formatDay(audit.startedAt)}`
          : audit.status === "running"
            ? "クロール中"
            : "前回のクロールに失敗"
      }`}
      action={
        <Link
          to="/p/$projectId/audit"
          params={{ projectId }}
          className={moreDetailsClass}
        >
          詳細を見る
        </Link>
      }
    >
      {audit.status === "running" ? (
        // A running crawl has at most a partial issue list, and an empty one
        // is not the same as a healthy site.
        <p className="text-sm text-muted-foreground">
          クロールが完了すると、ここに問題が表示されます。
        </p>
      ) : audit.topIssues.length === 0 ? (
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
        <ul className="space-y-2">
          {audit.topIssues.map((issue) => (
            <li
              key={issue.issueType}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    issue.severity === "critical"
                      ? "bg-destructive"
                      : issue.severity === "warning"
                        ? "bg-warning"
                        : "bg-muted-foreground/30"
                  }`}
                />
                <span className="truncate">
                  {issueTitles[issue.issueType] ?? issue.issueType}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {issue.count.toLocaleString("ja-JP")}ページ
              </span>
            </li>
          ))}
          {audit.totalIssueTypes > audit.topIssues.length ? (
            <li className="text-xs text-muted-foreground">
              +{audit.totalIssueTypes - audit.topIssues.length}件の問題
            </li>
          ) : null}
          {/* A failed crawl keeps what it found, as the audit page does. */}
          {audit.status !== "completed" ? (
            <li className="text-xs text-muted-foreground">
              監査が停止するまでにクロールできたページの結果です。
            </li>
          ) : null}
        </ul>
      )}
    </CardShell>
  );
}

export function BacklinkPulseCard({
  projectId,
  backlinks,
  refreshing,
}: {
  projectId: string;
  backlinks: DashboardBacklinkSummary | null;
  refreshing: boolean;
}) {
  if (!backlinks && refreshing) {
    return (
      <CardShell
        title="被リンクの動向"
        stamp="最初のスナップショットを取得しています…"
      >
        <StatGridSkeleton />
      </CardShell>
    );
  }

  if (!backlinks) {
    return (
      <CardShell title="被リンクの動向">
        <p className="text-sm text-muted-foreground">
          ドメインへのリンク状況を自動で記録します。追加設定は不要です。
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell
      title="被リンクの動向"
      stamp={`被リンク・スナップショット ${formatDay(backlinks.capturedAt)}${
        refreshing ? "・更新中…" : ""
      }`}
      action={
        <Link
          to="/p/$projectId/backlinks"
          params={{ projectId }}
          search={{ target: backlinks.domain, scope: "domain" }}
          className={moreDetailsClass}
        >
          詳細を見る
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="参照ドメイン"
          value={
            backlinks.referringDomains === null
              ? "—"
              : backlinks.referringDomains.toLocaleString("ja-JP")
          }
        />
        <StatTile
          label="被リンク"
          value={
            backlinks.backlinks === null
              ? "—"
              : backlinks.backlinks.toLocaleString("ja-JP")
          }
        />
        <StatTile
          label="新規リンク"
          value={`▲ ${newLost(backlinks.newBacklinks)}`}
          tone={
            backlinks.newBacklinks && backlinks.newBacklinks > 0
              ? "success"
              : undefined
          }
        />
        <StatTile
          label="消失リンク"
          value={`▼ ${newLost(backlinks.lostBacklinks)}`}
          tone={
            backlinks.lostBacklinks && backlinks.lostBacklinks > 0
              ? "destructive"
              : undefined
          }
        />
      </div>
    </CardShell>
  );
}
