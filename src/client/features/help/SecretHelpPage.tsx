import type { ReactNode } from "react";
import { CopyButton } from "@/client/components/CopyButton";
import { PageHeader } from "@/client/components/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Separator } from "@/client/components/ui/separator";

export const helpLinkClassName =
  "font-medium text-primary underline underline-offset-4";

/** A terminal command with a copy button. */
export function CommandBlock({ command }: { command: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted p-3">
      <pre className="min-w-0 flex-1 overflow-x-auto text-xs">
        <code>{command}</code>
      </pre>
      <CopyButton
        value={command}
        successMessage="コマンドをコピーしました"
        label="コマンドをコピー"
        variant="ghost"
        size="icon-xs"
      />
    </div>
  );
}

/** Self-hosting instructions for setting one secret. */
export function SecretHelpPage({
  title,
  intro,
  secretName,
  steps,
  dashboardPasteStep,
  terminalPromptHint,
}: {
  title: string;
  intro: ReactNode;
  secretName: string;
  /** The `<li>` items of the "Steps" card. */
  steps: ReactNode;
  dashboardPasteStep: ReactNode;
  terminalPromptHint: ReactNode;
}) {
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader title={title} description={intro} />

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>手順</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-3 pl-5">{steps}</ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Cloudflare Workers（ダッシュボード）</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Cloudflareで <code>Compute</code> -&gt;{" "}
                <code>Workers &amp; Pages</code> へ移動し、OpenSEO
                Workerを開きます。
              </li>
              <li>
                開く <code>設定</code>.
              </li>
              <li>
                次へ移動します： <code>Variables &amp; Secrets</code>{" "}
                を開き、次の名前で新しいシークレットを追加します：{" "}
                <code>{secretName}</code>.
              </li>
              <li>{dashboardPasteStep}</li>
            </ol>

            <Separator />

            <div>
              <p>
                または、ターミナルから次のコマンドで同じシークレットを設定します：
              </p>
              <CommandBlock command={`npx wrangler secret put ${secretName}`} />
            </div>
            <p className="text-muted-foreground">{terminalPromptHint}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
