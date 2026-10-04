import { ShieldAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import type { AuditResultsData } from "@/client/features/audit/results/types";

/** Report notices about JavaScript: app shells, and pages a render missed. */
export function RenderingWarnings({ data }: { data: AuditResultsData }) {
  const rendered = data.audit.config.renderJavaScript;
  const hasShells = data.issues.some(
    (issue) => issue.issueType === "javascript-rendering-suspected",
  );
  const unreadCount = data.pages.filter(
    (page) => page.fetchClass === "error",
  ).length;

  return (
    <>
      {hasShells && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>
            一部のページは、コンテンツ表示にJavaScriptが必要な可能性があります。
          </AlertTitle>
          <AlertDescription>
            {rendered
              ? "レンダリング後も読み込みが完了しなかったため、確認できませんでした。"
              : "「JavaScriptを実行」を有効にして監査を再実行してください。"}
          </AlertDescription>
        </Alert>
      )}

      {rendered && unreadCount > 0 && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>読み込めなかったページ：{unreadCount}件</AlertTitle>
          <AlertDescription>
            確認するには「ページ」を開き、クロール結果を「失敗」で絞り込んでください。
          </AlertDescription>
        </Alert>
      )}

      {rendered && (
        <p className="text-sm text-muted-foreground">
          この監査ではJavaScriptレンダリングが有効でした。
        </p>
      )}
    </>
  );
}
