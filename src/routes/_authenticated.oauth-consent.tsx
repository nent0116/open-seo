import { createFileRoute } from "@tanstack/react-router";
import { Check, Database, KeyRound, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { captureClientEvent } from "@/client/lib/posthog";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

export const Route = createFileRoute("/_authenticated/oauth-consent")({
  component: OAuthConsentPage,
});

const SCOPES = [
  {
    icon: Database,
    label: "OpenSEOのデータを読み取る",
    description: "プロジェクト、キーワードレポート、監査結果。",
  },
  {
    icon: KeyRound,
    label: "MCPから代理で操作する",
    description: "ツールを実行し、結果を組織へ保存します。",
  },
];

function OAuthConsentPage() {
  const { data: session } = useSession();
  const [pendingAction, setPendingAction] = useState<
    "authorize" | "cancel" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureClientEvent("mcp:consent_viewed");
  }, []);

  async function respond(accept: boolean) {
    setError(null);
    setPendingAction(accept ? "authorize" : "cancel");
    if (!accept) {
      captureClientEvent("mcp:consent_denied");
    }

    try {
      const response = await fetch("/api/oauth/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accept,
          query: window.location.search,
        }),
      });
      const data: {
        redirectTo?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        setError(data.error ?? "認証を完了できませんでした。");
      } else if (data.redirectTo) {
        window.location.assign(data.redirectTo);
        return;
      } else {
        setError("認証応答にリダイレクトURLが含まれていません。");
      }
    } catch {
      setError("OpenSEOへ接続できませんでした。再試行してください。");
    }
    setPendingAction(null);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center text-center">
        <img
          src="/transparent-logo.png"
          alt="OpenSEO"
          className="size-10 rounded-lg"
        />
        <CardTitle className="mt-5 text-xl">
          <h1>MCPアクセスを許可</h1>
        </CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          MCPクライアントがOpenSEOワークスペースへのアクセスを要求しています。
        </p>
      </CardHeader>
      <CardContent>
        {/* _authenticated only renders this page with a signed-in user. */}
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
          <div className="flex size-7 items-center justify-center rounded-full bg-muted">
            <User className="size-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">ログイン中：</div>
            <div className="font-medium">{session?.user.email}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            許可される操作：
          </div>
          <ul className="mt-3 space-y-3">
            {SCOPES.map((scope) => (
              <li key={scope.label} className="flex gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium">{scope.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {scope.description}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-8 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            pending={pendingAction === "cancel"}
            disabled={pendingAction !== null}
            onClick={() => void respond(false)}
          >
            {pendingAction === "cancel"
              ? "キャンセルしています…"
              : "キャンセル"}
          </Button>
          <Button
            type="button"
            className="flex-1"
            pending={pendingAction === "authorize"}
            disabled={pendingAction !== null}
            onClick={() => void respond(true)}
          >
            {pendingAction === "authorize" ? "許可しています…" : "許可"}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          アクセス権は設定からいつでも取り消せます。
        </p>
      </CardContent>
    </Card>
  );
}
