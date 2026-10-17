import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { useRankRunPolling } from "./useRankRunPolling";

/** Warnings about the latest rank check: stale, failed, or incomplete. */
export function RankRunAlerts({
  run,
}: {
  run: ReturnType<typeof useRankRunPolling>;
}) {
  if (!run) return null;

  if (run.maybeStale) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          この実行は応答していない可能性があり、自動的に終了処理されます。
        </AlertDescription>
      </Alert>
    );
  }

  if (run.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">前回のチェックは失敗しました。</span>{" "}
            {run.errorMessage &&
              getStandardErrorMessage(new Error(run.errorMessage))}
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // A completed run only has an error message when some checks failed.
  if (run.status === "completed" && run.errorMessage) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              前回のチェックは一部未完了です。
            </span>{" "}
            検索データの提供元でエラーが発生したため、一部のキーワードには前回の順位を表示しています。
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
