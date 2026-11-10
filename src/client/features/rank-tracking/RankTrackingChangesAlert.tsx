import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";

export function RankTrackingChangesAlert() {
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription className="text-foreground">
        <p>
          <span className="font-medium">
            Rank tracking now reads every keyword several times.
          </span>{" "}
          9月以降、Googleから順位計測ツールに返される検索結果が不完全になる場合があります。{" "}
          <a
            href="https://openseo.so/blogs/state-of-rank-tracking-november-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            変更内容を見る
          </a>
        </p>
      </AlertDescription>
    </Alert>
  );
}
