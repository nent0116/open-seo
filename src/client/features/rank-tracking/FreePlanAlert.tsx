import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanAlert({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <Alert variant="warning">
      <AlertTriangle />
      <AlertDescription className="text-foreground">
        <p>
          キーワード順位の計測を開始するには、{" "}
          <Link
            to={SUBSCRIBE_ROUTE}
            search={{ upgrade: true }}
            className="font-medium underline underline-offset-3"
          >
            有料プランへアップグレードしてください
          </Link>
          。
        </p>
      </AlertDescription>
    </Alert>
  );
}
