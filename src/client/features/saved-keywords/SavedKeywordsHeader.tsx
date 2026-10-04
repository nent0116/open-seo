import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { ExportMenu } from "@/client/components/ExportMenu";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";

export function SavedKeywordsHeader({
  totalCount,
  exporting,
  metricsRefreshing,
  onExportCsv,
  onExportSheets,
  onRefreshMetrics,
}: {
  totalCount: number;
  exporting: "csv" | "sheets" | null;
  metricsRefreshing: boolean;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onRefreshMetrics: () => void;
}) {
  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  const disabled = totalCount === 0 || exporting != null;

  return (
    <>
      <PageHeader
        title="保存済みキーワード"
        description="調査で見つけたキーワード候補を保存し、タグで整理して、施策に取り組むときに見直せます。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              title="最新の検索ボリューム、難易度、クリック単価を取得"
              disabled={disabled || metricsRefreshing}
              onClick={() => setConfirmingRefresh(true)}
            >
              <RefreshCw
                data-icon="inline-start"
                className={metricsRefreshing ? "animate-spin" : ""}
              />
              {metricsRefreshing ? "更新しています…" : "キーワード指標を更新"}
            </Button>

            <ExportMenu
              actions={["sheets", "csv"]}
              busy={exporting != null}
              disabled={disabled}
              onExport={(action) =>
                action === "sheets" ? onExportSheets() : onExportCsv()
              }
            />
          </>
        }
      />

      {confirmingRefresh ? (
        <ConfirmDialog
          title="キーワード指標を更新しますか？"
          confirmLabel="指標を更新"
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          このプロジェクトで保存したすべてのキーワードについて、最新の検索ボリューム、難易度、クリック単価を取得します。キーワードごとにクレジットを使用します。
        </ConfirmDialog>
      ) : null}
    </>
  );
}
