import { useMemo } from "react";
import {
  createColumnHelper,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
  DataTable,
  makeSelectionColumn,
  useDataTable,
  useSelectionAnchor,
} from "@/client/components/table/DataTable";
import {
  IntentBadge,
  type SortDir,
  type SortField,
} from "@/client/features/keywords/components";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { ScoreBadge } from "@/client/components/table/ScoreBadge";
import { formatNumber } from "@/client/features/keywords/utils";
import type { KeywordResearchDisplayRow } from "@/client/features/keywords/groupSharedVolumeRows";
import type { KeywordResearchRow } from "@/types/keywords";

type Props = {
  filteredRows: KeywordResearchDisplayRow[];
  overviewKeyword: KeywordResearchRow | null;
  selectedRows: Set<string>;
  setSelectedRows: (rows: Set<string>) => void;
  sortDir: SortDir;
  sortField: SortField;
  toggleSort: (field: SortField) => void;
  isFiltered: boolean;
  resetFilters: () => void;
  handleRowClick: (row: KeywordResearchRow) => void;
  toolbar: ReactNode;
  footer: ReactNode;
};

const keywordColumnHelper = createColumnHelper<KeywordResearchDisplayRow>();

export function KeywordResearchTable({
  filteredRows,
  overviewKeyword,
  selectedRows,
  setSelectedRows,
  sortDir,
  sortField,
  toggleSort,
  isFiltered,
  resetFilters,
  handleRowClick,
  toolbar,
  footer,
}: Props) {
  const selectAnchorRef = useSelectionAnchor();
  const rowSelection = useMemo<RowSelectionState>(
    () =>
      Object.fromEntries(
        [...selectedRows].map((keyword) => [keyword, true]),
      ) as RowSelectionState,
    [selectedRows],
  );
  const columns = useMemo<ColumnDef<KeywordResearchDisplayRow>[]>(() => {
    // The controller sorts the rows, so each header reads and sets its sort.
    const sortColumn = (field: SortField) => ({
      getIsSorted: () => (field === sortField ? sortDir : false),
      getToggleSortingHandler: () => () => toggleSort(field),
    });
    return [
      makeSelectionColumn<KeywordResearchDisplayRow>(selectAnchorRef),
      keywordColumnHelper.accessor("keyword", {
        header: () => (
          <SortableHeader
            column={sortColumn("keyword")}
            label="キーワード"
            className="min-w-48 md:min-w-0"
          />
        ),
        cell: ({ row }) => (
          <div
            className={`min-w-48 md:min-w-0 ${row.original.parentKeyword ? "pl-4" : ""}`}
          >
            <span
              className={`block whitespace-normal break-words capitalize md:truncate ${row.original.parentKeyword ? "font-normal" : "font-medium"}`}
              title={
                row.original.parentKeyword
                  ? `${row.original.keyword}：${row.original.parentKeyword}と同じ検索ボリュームが報告されています。共有ボリュームは重複する場合があります。`
                  : row.original.keyword
              }
            >
              {row.original.keyword}
            </span>
          </div>
        ),
        // From md, the keyword column takes the free width and truncates, so
        // the metric columns stay in view.
        meta: {
          headerClassName: "min-w-48 md:w-full md:max-w-0 md:min-w-0",
          cellClassName: "min-w-48 md:w-full md:max-w-0 md:min-w-0",
        },
      }),
      keywordColumnHelper.accessor("searchVolume", {
        header: () => (
          <SortableHeader
            column={sortColumn("searchVolume")}
            label="検索ボリューム"
            align="right"
          />
        ),
        cell: ({ row, getValue }) =>
          row.original.parentKeyword ? null : formatNumber(getValue()),
        meta: {
          headerClassName: "text-right",
          cellClassName:
            "whitespace-nowrap text-right tabular-nums text-muted-foreground",
        },
      }),
      keywordColumnHelper.accessor("cpc", {
        header: () => (
          <SortableHeader
            column={sortColumn("cpc")}
            label="CPC"
            helpText="米ドル建てのクリック単価です。"
            align="right"
          />
        ),
        cell: ({ row, getValue }) => {
          if (row.original.parentKeyword) return null;
          const value = getValue();
          return value == null ? "-" : value.toFixed(2);
        },
        meta: {
          headerClassName: "text-right",
          cellClassName:
            "whitespace-nowrap text-right tabular-nums text-muted-foreground",
        },
      }),
      keywordColumnHelper.accessor("competition", {
        header: () => (
          <SortableHeader
            column={sortColumn("competition")}
            label="競合度"
            helpText="Google広告における有料検索の競合度（0～1）です。数値が高いほど入札する広告主が多いことを示します。"
            align="right"
          />
        ),
        cell: ({ row, getValue }) => {
          if (row.original.parentKeyword) return null;
          const value = getValue();
          return value == null ? "-" : value.toFixed(2);
        },
        meta: {
          headerClassName: "text-right",
          cellClassName:
            "whitespace-nowrap text-right tabular-nums text-muted-foreground",
        },
      }),
      keywordColumnHelper.accessor("keywordDifficulty", {
        header: () => (
          <SortableHeader
            column={sortColumn("keywordDifficulty")}
            label="スコア"
            helpText="自然検索の上位表示難易度（0～100）です。数値が高いほどGoogleの上位10件に入るのが難しくなります。"
            align="right"
          />
        ),
        cell: ({ getValue }) => <ScoreBadge value={getValue()} />,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      }),
      keywordColumnHelper.accessor("intent", {
        header: "検索意図",
        cell: ({ getValue }) => <IntentBadge intent={getValue()} />,
        meta: {
          headerClassName: "text-center",
          cellClassName: "whitespace-nowrap text-center",
        },
      }),
    ];
  }, [selectAnchorRef, sortDir, sortField, toggleSort]);
  const table = useDataTable({
    data: filteredRows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setSelectedRows(
        new Set(
          Object.entries(next)
            .filter(([, selected]) => selected)
            .map(([keyword]) => keyword),
        ),
      );
    },
    getRowId: (row) => row.keyword,
    enableRowSelection: true,
  });

  return (
    <DataTable
      table={table}
      toolbar={toolbar}
      footer={footer}
      empty={{ title: "キーワードがありません" }}
      isFiltered={isFiltered}
      onClearFilters={resetFilters}
      onRowClick={(row) => handleRowClick(row.original)}
      activeRowId={overviewKeyword?.keyword}
    />
  );
}
