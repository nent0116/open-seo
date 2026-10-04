/**
 * Plain-language copy for Google OAuth failures, shared by the connect-surface
 * inline alert (GoogleLinkErrorAlert) and the /auth-error fallback page.
 * `code` is the `error` query param on the redirect: Google's own error code
 * (access_denied), or one set by googleOAuth.ts / Better Auth.
 *
 * `providerLabel` ("Search Console" / "Google Analytics") is set when the
 * failure came from a connect flow; without it the copy reads as a Google
 * sign-in failure.
 */
export function googleAuthErrorCopy(
  code: string,
  providerLabel?: string,
): { title: string; description: string } {
  const what = providerLabel ? `${providerLabel}との連携` : "Googleログイン";

  switch (code) {
    case "state_mismatch":
      return {
        title: `${what}を完了できませんでした`,
        description:
          "操作が期限切れになったか中断されました。1つのブラウザタブで再試行し、10分以内にGoogleの手順を完了してください。繰り返し発生する場合は、このサイトのCookieがブラウザで許可されているか確認してください。",
      };
    case "access_denied":
      return {
        title: `${what}がキャンセルされました`,
        description:
          "Googleの権限画面が閉じられたか、許可されませんでした。準備ができたら再試行してください。",
      };
    case "connection_save_failed":
      return {
        title: `${what}を完了できませんでした`,
        description:
          "連携を保存できませんでした。再試行し、失敗が続く場合はサポートへお問い合わせください。",
      };
    default:
      return {
        title: `${what}を完了できませんでした`,
        description:
          "Googleとの通信中に問題が発生しました。再試行し、失敗が続く場合はサポートへお問い合わせください。",
      };
  }
}
