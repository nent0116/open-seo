import { createFileRoute } from "@tanstack/react-router";
import { CopyButton } from "@/client/components/CopyButton";
import { PageHeader } from "@/client/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { SUPPORT_EMAIL } from "@/client/lib/support";

const DISCORD_URL = "https://discord.gg/c9uGs3cFXr";
const GITHUB_URL = "https://github.com/every-app/open-seo";

export const Route = createFileRoute("/_app/support")({
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            ヘルプ・コミュニティ
          </p>
          <PageHeader
            title="ご意見をお聞かせください"
            description="皆さまのご意見をお待ちしています。OpenSEOをより良くするため、使い方や改善のご要望をぜひお聞かせください。"
          />
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>メールアドレス</h2>
              </CardTitle>
              <CardDescription>
                アイデア、問題、質問、フィードバックを直接送信できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CopyButton
                value={SUPPORT_EMAIL}
                label={SUPPORT_EMAIL}
                successMessage="メールアドレスをコピーしました"
                size="sm"
              />
            </CardContent>
          </Card>

          <SupportLinkCard
            href={DISCORD_URL}
            title="Discord"
            description="コミュニティで質問、アイデアの共有、情報交換ができます。"
            cta="Discordに参加"
          />

          <SupportLinkCard
            href={`${GITHUB_URL}/issues`}
            title="GitHub Issues"
            description="GitHubで不具合の報告や機能要望を送信できます。"
            cta="Issueを作成"
          />
        </div>
      </div>
    </div>
  );
}

function SupportLinkCard({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block">
      <Card className="transition-colors group-hover:border-foreground/20">
        <CardHeader>
          <CardTitle>
            <h2>{title}</h2>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="font-medium">
          {cta} <span aria-hidden="true">&rarr;</span>
        </CardContent>
      </Card>
    </a>
  );
}
