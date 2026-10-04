import { useState } from "react";
import { MoreHorizontal, Play, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";

function ItemText({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <span className="flex flex-col">
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </span>
  );
}

export function MoreMenu({
  onCheckNow,
  checkBusy,
  onRefreshMetrics,
  metricsRefreshing,
  trackedKeywordCount,
  hasData,
}: {
  onCheckNow: () => void;
  checkBusy: boolean;
  onRefreshMetrics: () => void;
  metricsRefreshing: boolean;
  trackedKeywordCount: number;
  hasData: boolean;
}) {
  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="その他の操作"
              title="その他の操作"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={onCheckNow} disabled={checkBusy}>
            <Play />
            <ItemText
              label={checkBusy ? "確認しています…" : "順位を確認"}
              description="現在のGoogle掲載順位を取得"
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmingRefresh(true)}
            disabled={metricsRefreshing || !hasData}
          >
            <RefreshCw className={metricsRefreshing ? "animate-spin" : ""} />
            <ItemText
              label={
                metricsRefreshing ? "更新しています…" : "キーワード指標を更新"
              }
              description="検索ボリューム、難易度、クリック単価を更新（順位は更新しません）"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
          計測中の全{trackedKeywordCount}
          件について、検索ボリューム、難易度、クリック単価を再取得します。キーワードごとにクレジットを使用します。順位は変わりません。
        </ConfirmDialog>
      ) : null}
    </>
  );
}
