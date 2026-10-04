import { Copy, FileDown, Sheet, Tags, Trash2 } from "lucide-react";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";

export function SavedKeywordsBulkActionBar({
  selectedCount,
  onCopy,
  onOpenTags,
  onExportCsv,
  onExportSheets,
  onDelete,
  onClear,
  exportingSelection,
}: {
  selectedCount: number;
  onCopy: () => void;
  onOpenTags: () => void;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onDelete: () => void;
  onClear: () => void;
  exportingSelection: boolean;
}) {
  if (selectedCount === 0) return null;

  return (
    <TableBulkActionBar
      selectedCount={selectedCount}
      onClear={onClear}
      actions={
        <>
          <div className="flex items-center gap-0.5 px-1.5">
            <TableBulkActionButton
              icon={<Tags className="size-3.5" />}
              onClick={onOpenTags}
            >
              タグ
            </TableBulkActionButton>

            <TableBulkExportMenu
              busy={exportingSelection}
              actions={[
                {
                  label: "キーワードをコピー",
                  icon: <Copy className="size-4" />,
                  onClick: onCopy,
                },
                {
                  label: "Google スプレッドシートへ出力",
                  icon: <Sheet className="size-4" />,
                  onClick: onExportSheets,
                },
                {
                  label: "CSVで出力",
                  icon: <FileDown className="size-4" />,
                  onClick: onExportCsv,
                },
              ]}
            />
          </div>

          <div className="flex items-center border-l border-border px-1.5">
            <TableBulkActionButton
              icon={<Trash2 className="size-3.5" />}
              onClick={onDelete}
              variant="danger"
            >
              削除
            </TableBulkActionButton>
          </div>
        </>
      }
    />
  );
}
