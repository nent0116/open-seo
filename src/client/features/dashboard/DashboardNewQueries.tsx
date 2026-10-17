import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { QueryState } from "@/client/components/QueryState";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/client/components/ui/table";
import { getDashboardEmergingQueries } from "@/serverFunctions/dashboard";
import { Freshness, DashboardInfo } from "./siteTabParts";
import { moreDetailsClass } from "./cardParts";

export function DashboardNewQueries({
  projectId,
  connected,
  siteUrl,
}: {
  projectId: string;
  connected: boolean;
  siteUrl: string | null;
}) {
  const query = useQuery({
    queryKey: ["dashboardEmergingQueries", projectId, siteUrl],
    queryFn: () => getDashboardEmergingQueries({ data: { projectId } }),
    enabled: connected,
    staleTime: 10 * 60_000,
    retry: false,
  });
  if (!connected) return null;
  return (
    <QueryState query={query} errorFallback="Could not load new keywords">
      {(data) =>
        !data.value.connected ? (
          <GoogleConnectionCard
            provider="gsc"
            projectId={projectId}
            prominent
          />
        ) : (
          <CardShell
            title="新規キーワード"
            titleInfo={
              <DashboardInfo label="新規キーワードについて">
                <p>最近Google検索にサイトが表示された検索語句です。</p>
                <p className="mt-2">
                  Search
                  Consoleの直近1週間に確認され、それ以前の4週間には見られなかった検索語句です。
                </p>
              </DashboardInfo>
            }
            action={
              <Link
                to="/p/$projectId"
                params={{ projectId }}
                search={{ tab: "keywords" }}
                className={moreDetailsClass}
              >
                すべて見る →
              </Link>
            }
          >
            <Freshness {...data} />
            {data.value.rows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>キーワード</TableHead>
                    <TableHead>表示回数</TableHead>
                    <TableHead>クリック数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.value.rows.slice(0, 5).map((row) => (
                    <TableRow key={row.query}>
                      <TableCell className="font-medium">{row.query}</TableCell>
                      <TableCell>{row.impressions.toLocaleString()}</TableCell>
                      <TableCell>{row.clicks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                <Search className="size-7 text-muted-foreground" />
                <h3 className="font-medium">
                  {data.value.hasSearchData
                    ? "No new keywords this week"
                    : "No search data yet"}
                </h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {data.value.hasSearchData
                    ? "既存の検索語句でもクリック数が増えている可能性があります。検索パフォーマンスを確認してください。"
                    : "サイトの検索データはまだ報告されていません。Search Consoleで連携したプロパティを確認してください。"}
                </p>
                <Link
                  to="/p/$projectId/search-performance"
                  params={{ projectId }}
                  className="text-sm text-primary hover:underline"
                >
                  検索パフォーマンスの詳細を見る →
                </Link>
              </div>
            )}
          </CardShell>
        )
      }
    </QueryState>
  );
}
