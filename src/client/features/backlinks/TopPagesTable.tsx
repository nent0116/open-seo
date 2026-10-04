import { createColumnHelper } from "@tanstack/react-table";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import {
  DataTable,
  useDataTable,
  type DataTableFrameProps,
} from "@/client/components/table/DataTable";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { HelpLabel } from "@/client/components/HelpLabel";
import type { TopPageRow } from "./backlinksPageTypes";
import type { TopPagesSortField } from "@/types/schemas/backlinks";
import { formatNumber } from "./backlinksPageUtils";

const columnHelper = createColumnHelper<TopPageRow>();

// Column ids map to server-side sort fields; sorting re-queries DataForSEO
// across all pages, not just the loaded page of results.
const columns = [
  columnHelper.accessor("page", {
    id: "page",
    enableSorting: false,
    meta: { cellClassName: "min-w-80" },
    header: () => (
      <HelpLabel
        label="ページ"
        helpText="被リンクを受けている対象サイト内のページです。"
      />
    ),
    cell: ({ getValue }) => {
      const page = getValue();
      return page ? (
        <SafeExternalLink
          url={page}
          label={page}
          className="inline-flex items-center gap-1 break-all underline-offset-4 hover:underline"
        />
      ) : (
        "-"
      );
    },
  }),
  columnHelper.accessor("backlinks", {
    id: "backlinks" satisfies TopPagesSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="被リンク"
        helpText="このページへの被リンクの合計です。"
      />
    ),
    cell: ({ getValue }) => formatNumber(getValue()),
    sortDescFirst: true,
  }),
  columnHelper.accessor("referringDomains", {
    id: "referringDomains" satisfies TopPagesSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="参照ドメイン"
        helpText="このページへリンクしている固有ドメインです。"
      />
    ),
    cell: ({ getValue }) => formatNumber(getValue()),
    sortDescFirst: true,
  }),
  columnHelper.accessor("rank", {
    id: "rank" satisfies TopPagesSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="ランク"
        helpText="対象ページの評価スコアです。"
      />
    ),
    cell: ({ getValue }) => formatNumber(getValue()),
    sortDescFirst: true,
  }),
  columnHelper.accessor("brokenBacklinks", {
    id: "brokenBacklinks" satisfies TopPagesSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="リンク切れの被リンク"
        helpText="現在リンク切れになっている、このページへの被リンクです。"
      />
    ),
    cell: ({ getValue }) => formatNumber(getValue()),
    sortDescFirst: true,
  }),
];

export function TopPagesTable({
  rows,
  sorting,
  onSortingChange,
  ...frame
}: DataTableFrameProps & {
  rows: TopPageRow[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}) {
  const table = useDataTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
  });

  return (
    <DataTable
      table={table}
      empty={{ title: "この対象の上位ページは見つかりませんでした。" }}
      {...frame}
    />
  );
}
