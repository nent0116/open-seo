import { useIsMutating, useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import {
  CrawlerAccessForm,
  crawlerCredentialsQueryKey,
  saveCrawlerCredentialMutationKey,
} from "@/client/features/crawler-access/CrawlerAccessForm";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import { extractHostname } from "@/client/features/audit/shared";
import { startAudit } from "@/serverFunctions/audit";
import { listCrawlerCredentials } from "@/serverFunctions/crawlerAccess";
import {
  SHOPIFY_CRAWLER_ACCESS_DOC_URL,
  isCrawlerAccessExpired,
} from "@/shared/crawler-access";

/**
 * Shown instead of the generic crawl warnings when a Shopify storefront
 * throttled or refused the crawl. Shopify's own fix is a crawler-access
 * signature the merchant creates in admin, so the report asks for it here.
 *
 * The setup steps only show while the domain has no usable signature. Once
 * one is saved they collapse to a single line with the re-run button.
 */
export function ShopifyCrawlWarning({
  projectId,
  audit,
}: {
  projectId: string;
  audit: AuditResultsData["audit"];
}) {
  const navigate = useNavigate();
  const host = extractHostname(audit.startUrl);
  const usedCredentialId = audit.config.crawlerCredentialId;

  const credentialsQuery = useQuery({
    queryKey: crawlerCredentialsQueryKey,
    queryFn: () => listCrawlerCredentials(),
  });
  // A recorded credential id names the signature this crawl used, whatever
  // else is stored for the host on another project. If that one has expired
  // since (possibly mid-crawl), expiry is the explanation. Without a recorded
  // id, an expired row for the host is why the crawl went out unsigned.
  const expiredCredential = credentialsQuery.data?.find(
    (credential) =>
      (usedCredentialId
        ? credential.id === usedCredentialId
        : credential.host === host) &&
      isCrawlerAccessExpired(credential.expiresAt),
  );
  // Several projects can hold a live signature for this host; the one this
  // crawl used decides whether the crawl was signed.
  const liveCredentials = (credentialsQuery.data ?? []).filter(
    (credential) =>
      credential.host === host && !isCrawlerAccessExpired(credential.expiresAt),
  );
  const liveCredential =
    liveCredentials.find((credential) => credential.id === usedCredentialId) ??
    liveCredentials[0];
  // A re-run started mid-save would resolve the old signature, or none.
  const isSaving =
    useIsMutating({ mutationKey: saveCrawlerCredentialMutationKey }) > 0;

  const rerunMutation = useMutation({
    mutationFn: () =>
      startAudit({
        data: {
          projectId,
          startUrl: audit.startUrl,
          maxPages: audit.config.maxPages,
          lighthouseStrategy: audit.config.lighthouseStrategy,
          renderJavaScript: audit.config.renderJavaScript,
        },
      }),
    onSuccess: (result) => {
      void navigate({
        to: "/p/$projectId/audit",
        params: { projectId },
        search: { auditId: result.auditId, tab: "issues" },
      });
    },
  });

  const rerunButton = (
    <Button
      variant="outline"
      size="sm"
      pending={rerunMutation.isPending}
      disabled={isSaving}
      onClick={() => rerunMutation.mutate()}
    >
      {rerunMutation.isPending ? "開始しています…" : "監査を再実行"}
    </Button>
  );

  // Until the list loads we can't tell which state applies; don't flash the
  // setup steps at someone who already has a signature.
  if (credentialsQuery.isPending) return null;

  if (liveCredential) {
    const signedAndStillLimited = liveCredential.id === usedCredentialId;
    return (
      <Alert variant={signedAndStillLimited ? "warning" : "success"}>
        {signedAndStillLimited ? <ShieldAlert /> : <ShieldCheck />}
        <AlertDescription className="text-foreground">
          {signedAndStillLimited ? (
            <>
              署名を使用しましたが、Shopifyによってクロールが制限されました。署名の対象が{" "}
              <span className="font-mono">{host}</span>
              であることを確認するには、次の画面でもう一度貼り付けてください：{" "}
              <Link
                to="/p/$projectId/settings/integrations"
                params={{ projectId }}
              >
                プロジェクト設定
              </Link>
              。正しい場合もShopifyがこのストアを制限しています。時間をおくか、ページ数を減らして監査を再実行してください。
            </>
          ) : (
            <>
              クローラーアクセスを保存しました：{" "}
              <span className="font-mono">{host}</span>
              。使用するには監査を再実行してください。
            </>
          )}
        </AlertDescription>
        <div className="col-start-2 mt-2">{rerunButton}</div>
      </Alert>
    );
  }

  return (
    <Alert variant="warning">
      <ShieldAlert />
      <div className="min-w-0 space-y-3">
        {expiredCredential?.expiresAt ? (
          <>
            <AlertTitle>このストアのShopify署名は期限切れです。</AlertTitle>
            <p className="text-muted-foreground">
              有効期限：{" "}
              {new Date(expiredCredential.expiresAt).toLocaleDateString(
                "ja-JP",
              )}
              。それ以降のリクエストは未署名となり、Shopifyによって制限されました。署名は更新できません。Shopify管理画面で新しい署名を作成し、下に貼り付けて保存済みの値を置き換えてください。
            </p>
          </>
        ) : (
          <>
            <AlertTitle>Shopifyによってクロールが制限されました。</AlertTitle>
            <p className="text-muted-foreground">
              Shopifyは未承認のクローラーを制限するため、このレポートの一部が欠けています。ストア所有者であれば、約1分でOpenSEOを承認できます。
            </p>
          </>
        )}

        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            Shopify管理画面で「オンラインストア」→「各種設定」→「クローラーアクセス」を開き、「署名を作成」をクリックします。
          </li>
          <li>
            ドメイン <span className="font-mono">{host}</span>{" "}
            と有効期限（最長3か月）を選びます。
          </li>
          <li>2つの値を下に貼り付けます。</li>
        </ol>

        {/* Keyed by host: the report stays mounted when the audit changes. */}
        <CrawlerAccessForm
          key={host}
          projectId={projectId}
          initialHost={host}
          lockHost
        />

        <div className="flex flex-wrap items-center gap-4">
          {rerunButton}
          <a
            className="text-primary underline underline-offset-3"
            href={SHOPIFY_CRAWLER_ACCESS_DOC_URL}
            target="_blank"
            rel="noreferrer"
          >
            Shopifyのクローラーアクセスガイド
          </a>
        </div>
      </div>
    </Alert>
  );
}
