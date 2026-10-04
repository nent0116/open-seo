import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { FileDown, Plus, Sheet, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Button } from "@/client/components/ui/button";
import { DataTable, useDataTable } from "@/client/components/table/DataTable";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { removeTrackingKeywords } from "@/serverFunctions/rank-tracking";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import { useRankTrackingColumns } from "./RankTrackingColumns";
import { exportRankTracking } from "./RankTrackingTableParts";
import {
  KeywordTrendModal,
  type KeywordTrendTarget,
} from "./KeywordTrendModal";
import type { SelectionAnchor } from "@/client/components/table/tableSelection";

export function RankTrackingTable({
  totalCount,
  rows,
  showDesktop,
  showMobile,
  sorting,
  onSortingChange,
  domain,
  configId,
  projectId,
  locationCode,
  locationName,
  serpDepth,
  onAddKeywords,
  onClearFilters,
}: {
  totalCount: number;
  rows: RankTrackingRow[];
  showDesktop: boolean;
  showMobile: boolean;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  domain: string;
  configId: string;
  projectId: string;
  locationCode: number;
  locationName?: string | null;
  serpDepth: number;
  onAddKeywords: () => void;
  onClearFilters: () => void;
}) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [trendTarget, setTrendTarget] = useState<KeywordTrendTarget | null>(
    null,
  );
  const selectAnchorRef = useRef<SelectionAnchor | null>(null);

  const handleKeywordClick = useCallback(
    (row: RankTrackingRow) =>
      setTrendTarget({
        trackingKeywordId: row.trackingKeywordId,
        keyword: row.keyword,
      }),
    [],
  );

  const columns = useRankTrackingColumns({
    showDesktop,
    showMobile,
    domain,
    selectAnchorRef,
    onKeywordClick: handleKeywordClick,
    locationName,
  });

  const table = useDataTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: (updater) =>
      onSortingChange(
        typeof updater === "function" ? updater(sorting) : updater,
      ),
    // The URL has no value for "unsorted", so a column stays sorted.
    enableSortingRemoval: false,
    withSorting: true,
    getRowId: (row) => row.trackingKeywordId,
    enableRowSelection: true,
  });

  // Only includes rows that are in the current data (respects parent filtering)
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedRankRows = selectedRows.map((row) => row.original);

  const exportSelection = (format: "csv" | "sheets") =>
    exportRankTracking({
      format,
      rows: selectedRankRows,
      showDesktop,
      showMobile,
      domain,
      locationName,
      scope: "selection",
    });

  const removeMutation = useMutation({
    mutationFn: (keywordIds: string[]) =>
      removeTrackingKeywords({ data: { projectId, configId, keywordIds } }),
    onSuccess: (result) => {
      table.resetRowSelection();
      setShowConfirm(false);
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingResults", projectId, configId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingCostEstimate", projectId, configId],
      });
      toast.success(`${result.removed}件のキーワードを削除しました`);
    },
  });

  return (
    <>
      <TableBulkActionBar
        selectedCount={selectedCount}
        onClear={() => table.resetRowSelection()}
        actions={
          <div className="flex items-center px-1.5">
            <TableBulkActionButton
              icon={<Trash2 className="size-3.5" />}
              onClick={() => setShowConfirm(true)}
              variant="danger"
            >
              削除
            </TableBulkActionButton>
            <TableBulkExportMenu
              actions={[
                {
                  label: "Google スプレッドシートへ出力",
                  icon: <Sheet className="size-4" />,
                  onClick: () => exportSelection("sheets"),
                },
                {
                  label: "CSVで出力",
                  icon: <FileDown className="size-4" />,
                  onClick: () => exportSelection("csv"),
                },
              ]}
            />
          </div>
        }
      />

      {showConfirm && (
        <ConfirmDialog
          title="キーワードを削除しますか？"
          confirmLabel={`${selectedCount}件のキーワードを削除`}
          destructive
          pending={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(selectedRows.map((r) => r.id))}
          onClose={() => setShowConfirm(false)}
        >
          次の{selectedCount}件のキーワードの計測を停止します
          。過去の順位データは保持されますが、表には表示されません。
        </ConfirmDialog>
      )}

      {trendTarget && (
        <KeywordTrendModal
          target={trendTarget}
          projectId={projectId}
          configId={configId}
          domain={domain}
          locationCode={locationCode}
          locationName={locationName ?? undefined}
          serpDepth={serpDepth}
          onClose={() => setTrendTarget(null)}
        />
      )}

      <DataTable
        table={table}
        isFiltered={totalCount > 0}
        onClearFilters={onClearFilters}
        empty={{
          title: "キーワードはまだありません",
          description: "このドメインで計測したいキーワードを追加してください。",
          action: (
            <Button size="sm" onClick={onAddKeywords}>
              <Plus data-icon="inline-start" />
              キーワードを追加
            </Button>
          ),
        }}
        footer={
          rows.length > 0 ? (
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              全{totalCount}件中{rows.length}件のキーワード
            </p>
          ) : null
        }
      />
    </>
  );
}
