import { AlertTriangle } from "lucide-react";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";

export function GoogleOAuthSetupWarning({
  integrationName,
  docsUrl,
}: {
  integrationName: string;
  docsUrl: string;
}) {
  return (
    <Alert variant="warning">
      <AlertTriangle className="size-4" />
      <AlertTitle>Google OAuthクライアントが設定されていません</AlertTitle>
      <AlertDescription>
        <p>
          {integrationName}
          と連携する前に、このOpenSEO環境へGoogleクライアントIDとシークレットを設定してください。
        </p>
        <SafeExternalLink
          url={docsUrl}
          label="セットアップガイドを開く"
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
        />
      </AlertDescription>
    </Alert>
  );
}
