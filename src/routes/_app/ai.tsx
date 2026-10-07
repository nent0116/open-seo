import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { PageHeader } from "@/client/components/PageHeader";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { getAuthMode } from "@/lib/auth-mode";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  agentUpdatePrompt,
  getAgentSetupPrompt,
} from "@/client/features/ai-mcp/agentSetupPrompt";
import { CopyButton } from "@/client/components/CopyButton";
import { AgentList } from "@/client/features/ai-mcp/AgentList";

const DOCS_URL = "https://openseo.so/docs/agent-setup";
const COACH_DOCS_URL = "https://openseo.so/docs/skills/seo-coach";
const LINK_CLASS =
  "text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground";
const MUTED_LINK_CLASS =
  "inline-flex items-center gap-1 text-sm text-muted-foreground underline decoration-foreground/25 underline-offset-4 hover:text-foreground";
const SKILLS = [
  ["seo-coach", "現在の状況を整理し、次に取り組む施策を提案します。"],
  [
    "seo-project-setup",
    "目標、競合、重要ページを共有コンテキストとして保存します。",
  ],
  [
    "seo-audit",
    "今週取り組む施策を1つに絞った、1ページのサイト監査を作成します。",
  ],
  [
    "ai-visibility-audit",
    "AIの回答に引用されるための優先的な改善点を見つけます。",
  ],
  [
    "ai-prompt-research",
    "市場についてChatGPTで尋ねられる内容と、引用されるサイトを調べます。",
  ],
  ["keyword-research", "いくつかのテーマからキーワード機会を見つけます。"],
  [
    "keyword-clustering",
    "キーワードを検索意図ごとに分類し、対応するページを整理します。",
  ],
  ["competitive-landscape", "市場で優位な競合と、その理由を整理します。"],
  [
    "competitor-analysis",
    "競合1社のキーワード、コンテンツ、被リンクを分析します。",
  ],
  ["link-prospecting", "被リンク候補を見つけ、依頼文の下書きを作成します。"],
  [
    "local-seo",
    "GoogleビジネスプロフィールとGoogleマップでの露出を監査します。",
  ],
  ["seo-report", "上記の結果をレポートページへ保存します。"],
];

const aiSearchSchema = z.object({
  // Active tab. Omitted for the default "setup" tab.
  tab: z.enum(["skills"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_app/ai")({
  validateSearch: aiSearchSchema,
  component: AiPage,
});

function AiPage() {
  const { tab = "setup" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const origin = window.location.origin;
  const mcpUrl = `${origin}/mcp`;
  const prompt = getAgentSetupPrompt(origin);

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="AIエージェント設定"
          description="OpenSEOは、普段お使いのAIエージェントから利用すると最大限に活用できます。一度設定すれば、あとは自由に依頼できます。"
        />

        <Tabs
          value={tab}
          onValueChange={(value) =>
            void navigate({
              search: { tab: value === "skills" ? "skills" : undefined },
              replace: true,
            })
          }
          className="mt-8"
        >
          <TabsList variant="line">
            <TabsTrigger value="setup">AIエージェントを設定</TabsTrigger>
            <TabsTrigger value="skills">スキル</TabsTrigger>
          </TabsList>
          <TabsContent value="setup">
            <div className="mt-6 space-y-5">
              <Card size="lg">
                <CardHeader>
                  <CardTitle>
                    <h2>AIエージェントを設定</h2>
                  </CardTitle>
                  <CardDescription>
                    セットアップ用プロンプトをAIエージェントへ貼り付け、OpenSEOの連携とSEOスキルのインストールを行います。手動操作が必要な場合はエージェントが案内します。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AgentList />
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <CopyButton
                      variant="default"
                      size="lg"
                      value={prompt}
                      label="セットアップ用プロンプトをコピー"
                      successMessage="セットアップ用プロンプトをコピーしました"
                      onCopy={() => captureClientEvent("mcp:setup_prompt_copy")}
                    />
                    <a
                      href={`${DOCS_URL}#set-up-your-agent`}
                      target="_blank"
                      rel="noreferrer"
                      className={MUTED_LINK_CLASS}
                    >
                      セットアップ手順
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  </div>
                </CardContent>
                <CardFooter className="text-muted-foreground">
                  <p>
                    連携後、AIエージェントに次のスキルを使うよう依頼できます：{" "}
                    <a
                      href={COACH_DOCS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_CLASS}
                    >
                      SEOコーチ
                    </a>{" "}
                    。次に取り組む施策の選定を支援します。
                  </p>
                </CardFooter>
              </Card>

              <Card size="lg">
                <CardHeader>
                  <CardTitle>
                    <h2>スキルを更新</h2>
                  </CardTitle>
                  <CardDescription>
                    すでに連携済みの場合は、更新用プロンプトをAIエージェントへ貼り付けてください。接続設定と個別の編集内容を保持したまま、OpenSEOスキルを最新版へ更新できます。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <CopyButton
                    variant="default"
                    size="lg"
                    value={agentUpdatePrompt}
                    label="更新用プロンプトをコピー"
                    successMessage="更新用プロンプトをコピーしました"
                    onCopy={() => captureClientEvent("mcp:update_prompt_copy")}
                  />
                  <a
                    href={`${DOCS_URL}#update-your-skills`}
                    target="_blank"
                    rel="noreferrer"
                    className={MUTED_LINK_CLASS}
                  >
                    更新手順
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </CardContent>
              </Card>
            </div>

            {getAuthMode(import.meta.env.AUTH_MODE) === "cloudflare_access" ? (
              <Alert variant="warning" className="mt-8">
                <ShieldAlert />
                <AlertDescription>
                  この環境はCloudflare
                  Accessで保護されています。AccessアプリケーションでManaged
                  OAuthを有効にするまで、MCPクライアントは接続できません。{" "}
                  <a
                    href="https://openseo.so/docs/self-hosting/cloudflare#connect-the-mcp-server-through-cloudflare-access"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium"
                  >
                    セットアップガイド
                  </a>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
              <span>
                この環境のMCPサーバーURL：{" "}
                <code className="font-mono text-foreground/80">{mcpUrl}</code>
              </span>
              <CopyButton
                value={mcpUrl}
                successMessage="MCP URLをコピーしました"
                onCopy={() => captureClientEvent("mcp:setup_url_copy")}
              />
            </div>
          </TabsContent>
          <TabsContent value="skills">
            <section className="mt-6">
              <p className="text-sm text-muted-foreground">
                セットアップ用プロンプトで次のスキルがインストールされます。簡単な回答ではなく完全なレポートが必要なときは、名前を指定して実行してください。
              </p>
              <ul className="mt-5 space-y-3 text-sm sm:space-y-2">
                {SKILLS.map(([name, blurb]) => (
                  <li
                    key={name}
                    className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
                  >
                    <a
                      href={`https://openseo.so/docs/skills/${name}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`shrink-0 font-mono text-[13px] sm:w-48 ${LINK_CLASS}`}
                    >
                      /{name}
                    </a>
                    <span className="text-muted-foreground">{blurb}</span>
                  </li>
                ))}
              </ul>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
