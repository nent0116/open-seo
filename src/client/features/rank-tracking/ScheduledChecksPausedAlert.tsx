import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { SCHEDULED_RANK_CHECKS_PAUSED } from "@/shared/rank-tracking-pause";

export function ScheduledChecksPausedAlert() {
  if (!SCHEDULED_RANK_CHECKS_PAUSED || !isHostedClientAuthMode()) return null;

  return (
    <Alert variant="warning">
      <AlertTriangle />
      <AlertDescription className="text-foreground">
        <p>
          <span className="font-medium">
            順位の定期チェックを一時停止しています。
          </span>{" "}
          Google検索の仕様変更により、検索結果の取得が不安定になっています。安定した取得方法が整うまで定期チェックを一時停止しています。ご不便をおかけします。
        </p>
      </AlertDescription>
    </Alert>
  );
}
