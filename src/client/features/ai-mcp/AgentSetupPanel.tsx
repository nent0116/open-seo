import { Package } from "lucide-react";
import { CopyButton } from "@/client/components/CopyButton";

export const AGENT_SETUP_DESCRIPTION =
  "このプロンプトをAIエージェントに貼り付けると、OpenSEOが自動で設定されます。";

export function AgentSetupPanel({
  prompt,
  onCopy,
}: {
  prompt: string;
  onCopy?: () => void;
}) {
  return (
    <>
      <div className="rounded-xl border border-border bg-background/25 p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
            <Package className="size-5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-sm font-medium">OpenSEOプラグイン</p>
            <p className="mt-1 text-xs text-muted-foreground">
              MCP接続＋SEOスキル
            </p>
          </div>
        </div>
        <CopyButton
          variant="default"
          size="lg"
          className="w-full"
          value={prompt}
          label="セットアップ用プロンプトをコピー"
          successMessage="セットアップ用プロンプトをコピーしました"
          onCopy={onCopy}
        />
      </div>
      <div className="mt-4 text-center">
        <a
          href="https://openseo.so/docs/agent-setup"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground underline decoration-muted-foreground/25 underline-offset-4 hover:text-foreground"
        >
          手動セットアップ
        </a>
      </div>
    </>
  );
}
