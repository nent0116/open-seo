import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { everyAppAccountQueryOptions } from "@/client/features/every-app/everyAppAccountQueries";
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
import { ArrowUpRight, Info } from "lucide-react";
import { getClientAuthMode } from "@/lib/auth-mode";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  agentUpdatePrompt,
  getAgentSetupPrompt,
} from "@/client/features/ai-mcp/agentSetupPrompt";
import { CopyButton } from "@/client/components/CopyButton";
import { AgentList } from "@/client/features/ai-mcp/AgentList";
import { pageHead } from "@/client/lib/pageHead";

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
  head: () => pageHead("AIエージェント設定"),
  validateSearch: aiSearchSchema,
  component: AiPage,
});

const everyApp = getClientAuthMode() === "everyapp";

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
            {everyApp ? (
              <EveryAppAgentSetup />
            ) : (
              <>
                <div className="mt-6 space-y-5">
                  <Card size="lg">
                    <CardHeader>
                      <CardTitle>
                        <h2>AIエージェントを設定</h2>
                      </CardTitle>
                      <CardDescription>
                        Paste the setup prompt into your agent to connect
                        OpenSEO and install its SEO skills. It will guide you
                        through any manual steps.
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
                          onCopy={() =>
                            captureClientEvent("mcp:setup_prompt_copy")
                          }
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
                        Already connected? Paste the update prompt into your
                        agent to get the latest OpenSEO skills while preserving
                        your connection settings and personal edits.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <CopyButton
                        variant="default"
                        size="lg"
                        value={agentUpdatePrompt}
                        label="更新用プロンプトをコピー"
                        successMessage="更新用プロンプトをコピーしました"
                        onCopy={() =>
                          captureClientEvent("mcp:update_prompt_copy")
                        }
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

                {getClientAuthMode() === "cloudflare_access" ? (
                  <Alert className="mt-8">
                    <Info />
                    <AlertDescription>
                      This instance is behind Cloudflare Access, so MCP clients
                      connect through Managed OAuth on your Access application.
                      If a client gets a login page instead of connecting, check
                      that Managed OAuth is on.{" "}
                      <a
                        href="https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE_OPERATIONS.md#through-cloudflare-access"
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
                    <code className="font-mono text-foreground/80">
                      {mcpUrl}
                    </code>
                  </span>
                  <CopyButton
                    value={mcpUrl}
                    successMessage="MCP URLをコピーしました"
                    onCopy={() => captureClientEvent("mcp:setup_url_copy")}
                  />
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="skills">
            <section className="mt-6">
              <p className="text-sm text-muted-foreground">
                {everyApp
                  ? "Install them with npx skills add every-app/open-seo."
                  : "The setup prompt installs these."}{" "}
                Run one by name when you want a full report instead of a quick
                answer.
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

const EVERY_APP_SKILLS_COMMAND = "npx skills add every-app/open-seo";

/**
 * Behind Every App the agent connects to the gateway's MCP address, which
 * covers every app on it; OpenSEO serves no MCP of its own here. The skills
 * install on their own.
 */
function EveryAppAgentSetup() {
  const gatewayUrl = useQuery(everyAppAccountQueryOptions()).data?.gatewayUrl;
  return (
    <div className="mt-6 space-y-5">
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>Connect your agent to Every App</h2>
          </CardTitle>
          <CardDescription>
            Every App has one address for your agent, and it covers OpenSEO and
            your other apps. Connect it once.
          </CardDescription>
        </CardHeader>
        {gatewayUrl ? (
          <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <code className="font-mono text-sm">{gatewayUrl}/mcp</code>
            <CopyButton
              value={`${gatewayUrl}/mcp`}
              successMessage="MCP URLをコピーしました"
            />
          </CardContent>
        ) : null}
      </Card>

      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>Install the SEO skills</h2>
          </CardTitle>
          <CardDescription>
            Run this in a terminal to add OpenSEO's skills to your agent. They
            use OpenSEO through your Every App connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <code className="font-mono text-sm">{EVERY_APP_SKILLS_COMMAND}</code>
          <CopyButton
            value={EVERY_APP_SKILLS_COMMAND}
            successMessage="コマンドをコピーしました"
          />
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
    </div>
  );
}
