import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import { AppBanner } from "@/client/layout/AppBanner";
import { useSession } from "@/lib/auth-client";
import { acceptTermsUpdate } from "@/serverFunctions/terms";
import {
  CURRENT_TERMS_EFFECTIVE_DATE,
  CURRENT_TERMS_VERSION,
  PRIVACY_URL,
  TERMS_URL,
} from "@/shared/terms";

// Asks existing users to affirmatively accept updated Terms. It never blocks
// the app: a user who doesn't accept stays on their prior agreement.
export function TermsUpdateBanner() {
  const { data: session, refetch } = useSession();
  const acceptMutation = useMutation({
    mutationFn: () => acceptTermsUpdate(),
    // The session is served from a signed cookie cache, so bypass it to pick
    // up the new acceptance and hide the banner.
    onSuccess: () => refetch({ query: { disableCookieCache: true } }),
    onError: () => toast.error("同意を記録できませんでした。"),
  });

  if (!session || session.user.termsAcceptedVersion === CURRENT_TERMS_VERSION) {
    return null;
  }

  return (
    <AppBanner variant="info">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          以下の内容を更新しました：{" "}
          <a href={TERMS_URL} target="_blank" rel="noreferrer">
            利用規約
          </a>{" "}
          および{" "}
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
            プライバシーポリシー
          </a>{" "}
          （適用日： {CURRENT_TERMS_EFFECTIVE_DATE}
          ）。内容を確認し、同意してください。
        </span>
        <Button
          size="sm"
          pending={acceptMutation.isPending}
          onClick={() => acceptMutation.mutate()}
        >
          同意する
        </Button>
      </div>
    </AppBanner>
  );
}
