import { Link } from "@tanstack/react-router";
import { ShieldAlert, Wrench } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";

export function SamSetupGate({
  errorMessage,
  isRefetching,
  onRetry,
}: {
  errorMessage: string | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  return (
    <GateCard
      icon={Wrench}
      tone="warning"
      title="AI機能を有効化"
      description={
        <>
          <p>
            OpenSEOのアプリ内AIエージェントSAMにはOpenRouter
            APIキーが必要です。OpenRouterでキーを作成し、{" "}
            <code>OPENROUTER_API_KEY</code>{" "}
            環境変数に設定してOpenSEOを再起動し、ここで確認してください。
          </p>
          <p className="text-xs">
            各環境の詳しい手順は次のガイドにあります：{" "}
            <Link
              className="underline underline-offset-2 hover:text-foreground"
              to="/help/openrouter-api-key"
            >
              OpenRouter APIキー設定ガイド
            </Link>
            。
          </p>
        </>
      }
      actions={
        <>
          <Button size="lg" pending={isRefetching} onClick={onRetry}>
            APIキーを確認
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={
              <a
                href="https://openrouter.ai/settings/keys"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            OpenRouterのキー管理を開く
          </Button>
        </>
      }
    >
      {errorMessage ? (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertDescription className="text-foreground">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}
    </GateCard>
  );
}
