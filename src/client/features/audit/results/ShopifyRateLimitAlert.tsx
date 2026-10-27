import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";

/**
 * Shown when Shopify rate limited an unrendered crawl that carried a crawler
 * signature. Shopify's edge can still throttle Cloudflare Workers then, and a
 * rendered audit reads throttled pages from outside Cloudflare.
 */
export function ShopifyRateLimitAlert({
  projectId,
  startUrl,
}: {
  projectId: string;
  startUrl: string;
}) {
  return (
    <Alert variant="warning">
      <ShieldAlert />
      <AlertTitle>Shopifyドメインの監査中にエラーが発生しました。</AlertTitle>
      <AlertDescription>
        Shopify側のレート制限により、このレポートは不完全です。「JavaScriptをレンダリング」を有効にして、新しい監査を開始してください。
      </AlertDescription>
      <div className="col-start-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link
              to="/p/$projectId/audit"
              params={{ projectId }}
              search={{ url: startUrl }}
            />
          }
        >
          新しい監査を開始
        </Button>
      </div>
    </Alert>
  );
}
