import { useState } from "react";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient } from "@/lib/auth-client";
import { toAuthCallbackURL } from "@/lib/auth-redirect";

export function useGoogleAuth({
  redirectTo,
  postSignupRedirect,
}: {
  redirectTo: string;
  postSignupRedirect?: string;
}) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignUp = postSignupRedirect !== undefined;

  async function start() {
    setError(null);
    setIsStarting(true);
    try {
      captureClientEvent(
        isSignUp ? "auth:sign_up_google_start" : "auth:sign_in_google_start",
        { redirect_to: redirectTo },
      );
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: toAuthCallbackURL(redirectTo),
        ...(isSignUp
          ? {
              newUserCallbackURL: toAuthCallbackURL(postSignupRedirect),
              requestSignUp: true,
            }
          : {}),
      });
      if (!result.error) return;
      setError(fallbackMessage);
    } catch {
      setError(fallbackMessage);
    }
    setIsStarting(false);
  }

  const fallbackMessage = isSignUp
    ? "現在、Googleで登録できません。もう一度お試しください。"
    : "現在、Googleでログインできません。もう一度お試しください。";

  return { isStarting, error, start, clearError: () => setError(null) };
}
