import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";

export function RankTrackingChangesAlert() {
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription className="text-foreground">
        <p>
          <span className="font-medium">
            順位計測で一部の結果を再確認するようになりました。
          </span>{" "}
          9月以降、Googleから順位計測ツールに返される検索結果が不完全になる場合があります。{" "}
          <a
            href="https://openseo.so/blogs/rank-tracking-changes"
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
