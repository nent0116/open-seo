import { FREE_MAX_AUDIT_PAGES } from "@/shared/audit-limits";
import { isErrorCode, type ErrorCode } from "@/shared/error-codes";

const STANDARD_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "ログインしてから、もう一度お試しください。",
  AUTH_CONFIG_MISSING:
    "OpenSEOの認証が設定されていません。READMEの手順に従ってCloudflare Accessを設定してください。",
  PAYMENT_REQUIRED:
    "OpenSEOを利用するには、有効なホスト版サブスクリプションが必要です。",
  INSUFFICIENT_CREDITS:
    "クレジットが不足しています。続行するにはクレジットを追加するか、プランをアップグレードしてください。",
  FORBIDDEN: "このリソースへのアクセス権がありません。",
  NOT_FOUND: "指定されたリソースが見つかりませんでした。",
  AUDIT_CAPACITY_REACHED:
    "アカウントで同時に保存できる監査数の上限に達しました。新しい監査を始めるには、プロジェクトから古い監査を削除してください。",
  AUDIT_PAGE_LIMIT_EXCEEDED: `無料プランの監査は${FREE_MAX_AUDIT_PAGES}ページまでです。より大規模な監査を実行するにはアップグレードしてください。`,
  AUDIT_ALREADY_RUNNING:
    "同時に実行できる監査数の上限に達しました。いずれかの完了を待つか、削除してから新しい監査を開始してください。",
  VALIDATION_ERROR: "入力内容を確認して、もう一度お試しください。",
  UNKNOWN_LOCATION:
    "指定された市区町村または地域が見つかりませんでした。一覧から選択するか、入力を消して国全体を検索してください。",
  CRAWL_TARGET_BLOCKED:
    "このクロール対象はセキュリティポリシーによりブロックされています。",
  BACKLINKS_BILLING_ISSUE:
    "連携中のDataForSEOアカウントで、請求または残高の問題が発生しています。",
  AI_SEARCH_BILLING_ISSUE:
    "連携中のDataForSEOアカウントで、請求または残高の問題が発生しています。",
  AI_VISIBILITY_ERROR:
    "AI検索での表示状況を確認できませんでした。追跡設定を確認し、もう一度お試しください。",
  DATAFORSEO_AUTH_FAILED:
    "DataForSEOがAPIキーを拒否しました。DATAFORSEO_API_KEYにDataForSEOの「ログイン名:パスワード」をBase64エンコードした値が設定されているか確認してください。",
  DATAFORSEO_USAGE_LIMIT_EXCEEDED:
    "DataForSEOの安全上限に達したため、API呼び出しを停止しました。設定画面で利用状況と上限を確認してください。",
  RATE_LIMITED:
    "リクエストが多すぎます。時間をおいて、もう一度お試しください。",
  UPSTREAM_UNAVAILABLE:
    "データ提供元を一時的に利用できません。時間をおいて再試行してください。",
  CONFLICT: "このリクエストは既存のデータと競合しています。",
  INTERNAL_ERROR:
    "予期しないエラーが発生しました。サーバーログを確認して、もう一度お試しください。",
};

export function getStandardErrorMessage(
  error: unknown,
  fallback: string = STANDARD_MESSAGES.INTERNAL_ERROR,
): string {
  if (!(error instanceof Error)) return fallback;
  if (isErrorCode(error.message)) return STANDARD_MESSAGES[error.message];
  if (error.message) return error.message;
  return fallback;
}

export function getErrorCode(error: unknown): ErrorCode | null {
  if (!(error instanceof Error)) return null;
  return isErrorCode(error.message) ? error.message : null;
}
