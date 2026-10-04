import { useMemo } from "react";
import {
  createColumnHelper,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  DataTable,
  makeSelectionColumn,
  type DataTableFrameProps,
  useDataTable,
  useSelectionAnchor,
} from "@/client/components/table/DataTable";
import { ExternalUrlCell } from "@/client/components/table/url";
import { ScoreBadge } from "@/client/components/table/ScoreBadge";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import {
  domainSortColumn,
  formatNumber,
  formatRounded,
} from "@/client/features/domain/utils";
import type {
  DomainSortMode,
  KeywordRow,
  SortOrder,
} from "@/client/features/domain/types";

type Props = DataTableFrameProps & {
  domain: string;
  rows: KeywordRow[];
  selectedKeywords: Set<string>;
  visibleKeywords: string[];
  sortMode: DomainSortMode;
  currentSortOrder: SortOrder;
  onSortClick: (sort: DomainSortMode) => void;
  onToggleKeyword: (keyword: string) => void;
};

const keywordColumnHelper = createColumnHelper<KeywordRow>();

export function DomainKeywordsTable({
  domain,
  rows,
  selectedKeywords,
  visibleKeywords,
  sortMode,
  currentSortOrder,
  onSortClick,
  onToggleKeyword,
  ...frame
}: Props) {
  const selectAnchorRef = useSelectionAnchor();
  const rowSelection = useMemo<RowSelectionState>(
    () =>
      Object.fromEntries(
        [...selectedKeywords].map((keyword) => [keyword, true]),
      ) as RowSelectionState,
    [selectedKeywords],
  );
  const columns = useMemo<ColumnDef<KeywordRow>[]>(
    () => [
      makeSelectionColumn<KeywordRow>(selectAnchorRef),
      keywordColumnHelper.accessor("keyword", {
        header: () => "キーワード",
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      keywordColumnHelper.accessor("position", {
        header: () => (
          <SortableHeader
            label="順位"
            column={domainSortColumn(
              sortMode === "rank",
              currentSortOrder,
              () => onSortClick("rank"),
            )}
          />
        ),
        cell: ({ getValue }) => getValue() ?? "-",
      }),
      keywordColumnHelper.accessor("searchVolume", {
        header: () => (
          <SortableHeader
            label="検索ボリューム"
            column={domainSortColumn(
              sortMode === "volume",
              currentSortOrder,
              () => onSortClick("volume"),
            )}
          />
        ),
        cell: ({ getValue }) => formatNumber(getValue()),
      }),
      keywordColumnHelper.accessor("traffic", {
        header: () => (
          <SortableHeader
            label="トラフィック"
            column={domainSortColumn(
              sortMode === "traffic",
              currentSortOrder,
              () => onSortClick("traffic"),
            )}
          />
        ),
        cell: ({ getValue }) => formatRounded(getValue()),
      }),
      keywordColumnHelper.accessor("cpc", {
        header: () => (
          <SortableHeader
            label="CPC"
            helpText="米ドル建てのクリック単価です。"
            column={domainSortColumn(sortMode === "cpc", currentSortOrder, () =>
              onSortClick("cpc"),
            )}
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : `$${value.toFixed(2)}`;
        },
      }),
      keywordColumnHelper.display({
        id: "url",
        header: () => "URL",
        cell: ({ row }) => (
          <ExternalUrlCell
            value={row.original.url || row.original.relativeUrl}
            label={row.original.relativeUrl ?? row.original.url ?? ""}
            baseDomain={domain}
          />
        ),
        meta: {
          cellClassName: "max-w-[260px] truncate",
        },
      }),
      keywordColumnHelper.accessor("keywordDifficulty", {
        header: () => (
          <SortableHeader
            label="スコア"
            helpText="自然検索の上位表示難易度（0～100）です。数値が高いほどGoogleの上位10件に入るのが難しくなります。"
            column={domainSortColumn(
              sortMode === "score",
              currentSortOrder,
              () => onSortClick("score"),
            )}
          />
        ),
        cell: ({ getValue }) => <ScoreBadge value={getValue()} />,
      }),
    ],
    [currentSortOrder, domain, onSortClick, selectAnchorRef, sortMode],
  );
  const table = useDataTable({
    data: rows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      const selected = Object.entries(next)
        .filter(([, value]) => value)
        .map(([keyword]) => keyword);
      for (const keyword of visibleKeywords) {
        const shouldBeSelected = selected.includes(keyword);
        if (selectedKeywords.has(keyword) !== shouldBeSelected) {
          onToggleKeyword(keyword);
        }
      }
    },
    getRowId: (row) => row.keyword,
    enableRowSelection: true,
  });
  return (
    <DataTable
      table={table}
      empty={{ title: "この検索に一致するキーワードはありません。" }}
      {...frame}
    />
  );
}
