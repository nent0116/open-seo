import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import {
  devicesCount,
  KEYWORDS_PER_BATCH,
  SECONDS_PER_BATCH,
} from "@/shared/rank-tracking";

export function CheckConfirmModal({
  keywordCount,
  devices,
  costUsd,
  isPending,
  onRunNow,
  onCancel,
}: {
  keywordCount: number;
  devices: RankTrackingConfig["devices"];
  /** Server estimate; it prices each keyword's text (operators cost 5x). */
  costUsd: number | undefined;
  isPending: boolean;
  onRunNow: () => void;
  onCancel: () => void;
}) {
  const dc = devicesCount(devices);
  const totalChecks = keywordCount * dc;
  const liveTime =
    Math.ceil(totalChecks / KEYWORDS_PER_BATCH) * SECONDS_PER_BATCH;

  const eta = liveTime < 60 ? `${liveTime}秒` : `${Math.ceil(liveTime / 60)}分`;

  return (
    <ConfirmDialog
      title={`${keywordCount}件のキーワードをチェックしますか？`}
      confirmLabel="今すぐ実行"
      pending={isPending}
      onConfirm={onRunNow}
      onClose={onCancel}
    >
      {keywordCount}キーワード × {dc}デバイス = {totalChecks}
      回の検索結果チェック。結果取得まで約{eta}です。
      {costUsd != null ? (
        <>
          {" "}
          推定費用：{" "}
          <span className="font-mono font-semibold text-foreground">
            ${costUsd.toFixed(2)}
          </span>
          。
        </>
      ) : null}
    </ConfirmDialog>
  );
}
