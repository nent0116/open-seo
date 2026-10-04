import { Link } from "@tanstack/react-router";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { AppBanner } from "@/client/layout/AppBanner";
import { dataforseoHelpLinkOptions } from "@/client/navigation/items";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";

function SeoApiStatusBanners({
  shouldShowSeoApiWarning,
  seoApiKeyStatusError,
}: {
  shouldShowSeoApiWarning: boolean;
  seoApiKeyStatusError: boolean;
}) {
  const icon = <AlertTriangle className="size-4 shrink-0" />;
  const helpLink = (
    <Link
      {...dataforseoHelpLinkOptions}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      ヘルプページ
    </Link>
  );
  return (
    <>
      {shouldShowSeoApiWarning ? (
        <AppBanner variant="warning" icon={icon}>
          設定が必要です。OpenSEOの機能を利用するにはDataForSEO
          APIキーを追加してください。簡単な手順は{helpLink}で確認できます。
        </AppBanner>
      ) : null}

      {seoApiKeyStatusError ? (
        <AppBanner variant="info" icon={icon}>
          DataForSEOの設定を確認できませんでした。機能が動作しない場合は、
          {helpLink}で設定手順を確認してください。
        </AppBanner>
      ) : null}
    </>
  );
}

function MissingSeoSetupModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <div className="rounded-full bg-warning/20 p-2 text-warning">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-2">
            <DialogTitle>簡単な初期設定</DialogTitle>
            <DialogDescription>
              DataForSEO APIキーを追加してOpenSEOの利用を開始します。
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            閉じる
          </Button>
          <Button
            nativeButton={false}
            render={<Link {...dataforseoHelpLinkOptions} onClick={onClose} />}
          >
            セットアップガイドを開く
            <ExternalLink className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { MissingSeoSetupModal, SeoApiStatusBanners };
