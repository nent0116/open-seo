import { Button } from "@/client/components/ui/button";
import { QueryError } from "@/client/components/QueryState";
import type { GooglePickerAccount } from "./GooglePropertyPicker";

export function GscPropertySetupHelp({
  accounts,
  emptyGsc,
  loading,
  error,
  busy,
  linking,
  onRetry,
  onReconnect,
}: {
  accounts: GooglePickerAccount[];
  emptyGsc: boolean;
  loading: boolean;
  error: boolean;
  busy: boolean;
  linking: boolean;
  onRetry: () => void;
  onReconnect: () => void;
}) {
  if (!emptyGsc && !error) return null;

  return (
    <>
      {emptyGsc ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <h2 className="font-semibold">ウェブサイトが見つかりませんでした</h2>
          <p className="break-words text-muted-foreground">
            確認したアカウント：{" "}
            {accounts
              .map(
                (account) =>
                  account.email ??
                  `Googleアカウント・${account.accountId.slice(-6)}`,
              )
              .join(", ")}
          </p>
          <p className="text-muted-foreground">
            サイトをSearch Consoleに登録するか、管理者に
            {accounts.length === 1 ? "このアカウント" : "いずれかのアカウント"}
            へのアクセス権付与を依頼してください。
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Search Consoleを開く ↗
            </a>
            <a
              href="https://openseo.so/blogs/google-search-console-setup"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              設定ガイド
            </a>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        {error ? (
          <QueryError
            fallback="Search Consoleのサイト一覧を読み込めませんでした。"
            onRetry={onRetry}
          />
        ) : null}
        {emptyGsc ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={loading || busy}
            >
              {loading ? "更新しています…" : "更新"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReconnect}
              disabled={loading || busy}
              pending={linking}
            >
              {linking ? "Googleを開いています…" : "別のGoogleアカウントを使用"}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export function EmptyAccountMessage({
  provider,
  filtered,
}: {
  provider: "gsc" | "ga4";
  filtered: boolean;
}) {
  return (
    <>
      {filtered ? (
        "このアカウントに一致するプロパティはありません"
      ) : provider === "gsc" ? (
        <>
          このアカウントにサイトが見つかりませんでした。{" "}
          <a
            href="https://openseo.so/blogs/google-search-console-setup"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            サイトの登録またはアクセス権の取得
          </a>
          を行い、一覧を更新してください。
        </>
      ) : (
        "利用できるプロパティがありません"
      )}
    </>
  );
}

export function hasNoGscWebsites(
  accounts: GooglePickerAccount[],
  loading: boolean,
  error: boolean,
) {
  return (
    !loading &&
    !error &&
    accounts.length > 0 &&
    accounts.every(
      (account) =>
        !account.requiresReconnect &&
        !account.unavailable &&
        account.properties.length === 0,
    )
  );
}
