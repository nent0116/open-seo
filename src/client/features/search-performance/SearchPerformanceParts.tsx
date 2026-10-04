import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  useDataTable,
  useSelectionAnchor,
} from "@/client/components/table/DataTable";
import {
  TableBulkActionBar,
  TableBulkActionButton,
} from "@/client/components/table/TableBulkActionBar";
import { TablePagination } from "@/client/components/table/TablePagination";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import {
  buildDimensionColumns,
  buildStrikingColumns,
  formatCount,
  formatCtr,
  formatPosition,
  type Report,
  type SearchPerformanceTableRow,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { normalizeExportValue, type CsvValue } from "@/client/lib/csv";
import { exportRows } from "@/client/lib/exportRows";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  SEARCH_PERFORMANCE_PAGE_SIZES,
  type SearchPerformanceTableDimension,
} from "@/types/schemas/search-performance";
import { saveKeywords } from "@/serverFunctions/keywords";

export type ExportTarget = "csv" | "sheets";

type ExportTable = { filename: string; headers: string[]; rows: CsvValue[][] };

function strikingExportTable(report: Report): ExportTable {
  const stamp = `${report.range.startDate}-to-${report.range.endDate}`;
  return {
    filename: `search-performance-striking-distance-${stamp}`,
    headers: ["検索語句", "ページ", "表示回数", "クリック数", "掲載順位"],
    rows: report.strikingDistance.map((row) => [
      row.query,
      row.page,
      row.impressions,
      row.clicks,
      row.position,
    ]),
  };
}

function dimensionExportTable(
  dimension: SearchPerformanceTableDimension,
  rows: SearchPerformanceTableRow[],
  stamp: string,
): ExportTable {
  const isPage = dimension === "page";
  return {
    filename: `search-performance-${isPage ? "pages" : "queries"}-${stamp}`,
    headers: [
      isPage ? "ページ" : "検索語句",
      "クリック数",
      "表示回数",
      "CTR",
      "掲載順位",
    ],
    rows: rows.map((row) => [
      row.key,
      row.clicks,
      row.impressions,
      row.ctr,
      row.position,
    ]),
  };
}

function runExport(table: ExportTable, target: ExportTarget): Promise<void> {
  return exportRows({
    format: target,
    feature: "search_performance",
    ...table,
  });
}

export function exportStriking(
  report: Report,
  target: ExportTarget,
): Promise<void> {
  return runExport(strikingExportTable(report), target);
}

/** Export the full queries/pages dataset (fetched separately, not the visible
 *  page) so pagination never truncates a download. */
export function exportDimensionRows(
  dimension: SearchPerformanceTableDimension,
  rows: SearchPerformanceTableRow[],
  range: Report["range"],
  target: ExportTarget,
): Promise<void> {
  const stamp = `${range.startDate}-to-${range.endDate}`;
  return runExport(dimensionExportTable(dimension, rows, stamp), target);
}

type Delta = { text: string; improved: boolean } | null;

function percentDelta(current: number, previous: number): Delta {
  if (previous <= 0) return null;
  const change = (current - previous) / previous;
  const pct = (change * 100).toFixed(1);
  return { text: `${change >= 0 ? "+" : ""}${pct}%`, improved: change >= 0 };
}

/** Position falls as rankings improve, so the delta is inverted. */
function positionDelta(current: number, previous: number): Delta {
  if (previous <= 0 || current <= 0) return null;
  const change = previous - current;
  return {
    text: `${change >= 0 ? "+" : ""}${change.toFixed(1)}`,
    improved: change >= 0,
  };
}

export function TotalsCards({ report }: { report: Report }) {
  const { totals, prevTotals, range } = report;
  const deltaTitle = `比較期間：${range.prevStartDate}～${range.prevEndDate}`;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <TotalCard
        label="クリック数"
        value={formatCount(totals.clicks)}
        delta={percentDelta(totals.clicks, prevTotals.clicks)}
        deltaTitle={deltaTitle}
      />
      <TotalCard
        label="表示回数"
        value={formatCount(totals.impressions)}
        delta={percentDelta(totals.impressions, prevTotals.impressions)}
        deltaTitle={deltaTitle}
      />
      <TotalCard
        label="CTR"
        value={formatCtr(totals.ctr)}
        delta={percentDelta(totals.ctr, prevTotals.ctr)}
        deltaTitle={deltaTitle}
      />
      <TotalCard
        label="平均掲載順位"
        value={formatPosition(totals.position)}
        delta={positionDelta(totals.position, prevTotals.position)}
        deltaTitle={deltaTitle}
      />
    </div>
  );
}

function TotalCard({
  label,
  value,
  delta,
  deltaTitle,
}: {
  label: string;
  value: string;
  delta: Delta;
  deltaTitle: string;
}) {
  return (
    <Card className="gap-0 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {delta ? (
          <span
            className={`text-xs ${delta.improved ? "text-success" : "text-destructive"}`}
            title={deltaTitle}
          >
            {delta.text}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function DimensionTable({
  rows,
  keyLabel,
  isFiltered,
  isPastEnd,
  onClearFilters,
  onFirstPage,
}: {
  rows: SearchPerformanceTableRow[];
  keyLabel: string;
  isFiltered: boolean;
  isPastEnd: boolean;
  onClearFilters: () => void;
  onFirstPage: () => void;
}) {
  const columns = useMemo(() => buildDimensionColumns(keyLabel), [keyLabel]);
  const table = useDataTable({
    data: rows,
    columns,
    withSorting: true,
    initialState: { sorting: [{ id: "clicks", desc: true }] },
  });
  return (
    <DataTable
      table={table}
      isFiltered={isFiltered && !isPastEnd}
      onClearFilters={onClearFilters}
      empty={
        isPastEnd
          ? {
              title: "このページにデータはありません",
              description: "結果の最終ページを超えています。",
              action: (
                <Button variant="outline" size="sm" onClick={onFirstPage}>
                  最初のページへ
                </Button>
              ),
            }
          : {
              title: "Search Consoleのデータがまだありません",
              description:
                "Search Consoleのデータが表示されるまで数日かかる場合があります。",
            }
      }
    />
  );
}

export function StrikingDistanceTable({
  projectId,
  rows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isFiltered,
  onClearFilters,
}: {
  projectId: string;
  rows: Report["strikingDistance"];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isFiltered: boolean;
  onClearFilters: () => void;
}) {
  const queryClient = useQueryClient();
  const anchorRef = useSelectionAnchor();
  const [rowSelection, setRowSelection] = useState({});
  const columns = useMemo(() => buildStrikingColumns(anchorRef), [anchorRef]);
  const table = useDataTable({
    data: rows,
    columns,
    withSorting: true,
    withPagination: true,
    enableRowSelection: true,
    state: { rowSelection, pagination: { pageIndex: page - 1, pageSize } },
    onRowSelectionChange: setRowSelection,
    // The server collapses each query to its top page, so queries are unique.
    getRowId: (row) => row.query,
    initialState: {
      sorting: [{ id: "impressions", desc: true }],
    },
  });
  const isPastEnd = page > 1 && table.getRowModel().rows.length === 0;

  const selectedQueries = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.query);

  const copyKeywords = async () => {
    try {
      // Sanitize against spreadsheet formula injection: GSC query strings are
      // untrusted and may begin with =, +, -, @, etc. See @/client/lib/csv.
      const text = selectedQueries
        .map((query) => normalizeExportValue(query))
        .join("\n");
      await navigator.clipboard.writeText(text);
      toast.success(`${selectedQueries.length}件のキーワードをコピーしました`);
    } catch {
      toast.error("クリップボードにコピーできませんでした");
    }
  };

  const save = useMutation({
    mutationFn: (keywords: string[]) =>
      saveKeywords({ data: { projectId, keywords } }),
    onSuccess: (_result, keywords) => {
      captureClientEvent("keyword:save", {
        source_feature: "search_performance",
        keyword_count: keywords.length,
      });
      void queryClient.invalidateQueries({
        queryKey: ["savedKeywords", projectId],
      });
      toast.success(`${keywords.length}件のキーワードを保存しました`);
      setRowSelection({});
    },
  });

  return (
    <>
      <div className="p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          掲載順位が5～20位の検索語句を表示回数順に表示します。対象ページを改善し、上位表示を目指しましょう。
        </p>
        <DataTable
          table={table}
          isFiltered={isFiltered && !isPastEnd}
          onClearFilters={onClearFilters}
          empty={
            isPastEnd
              ? {
                  title: "このページにデータはありません",
                  description: "結果の最終ページを超えています。",
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(1)}
                    >
                      最初のページへ
                    </Button>
                  ),
                }
              : {
                  title: "上位表示まであと一歩の検索語句はありません",
                  description:
                    "掲載順位が5～20位の検索語句がここに表示されます。",
                }
          }
        />
      </div>
      {!isPastEnd && rows.length > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          pageSizes={SEARCH_PERFORMANCE_PAGE_SIZES}
          totalCount={rows.length}
          hasNextPage={table.getCanNextPage()}
          isLoading={false}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
      <TableBulkActionBar
        selectedCount={selectedQueries.length}
        selectedLabel="件の検索語句を選択中"
        onClear={() => setRowSelection({})}
        actions={
          <div className="flex items-center gap-1 px-1.5">
            <TableBulkActionButton
              icon={<Copy className="size-3.5" />}
              onClick={() => void copyKeywords()}
            >
              キーワードをコピー
            </TableBulkActionButton>
            <TableBulkActionButton
              icon={
                save.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )
              }
              onClick={() => save.mutate(selectedQueries)}
              disabled={save.isPending}
            >
              キーワードとして保存
            </TableBulkActionButton>
          </div>
        }
      />
    </>
  );
}
