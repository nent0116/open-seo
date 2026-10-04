import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthMethodChooser,
  authInputClassName,
  authSubmitClassName,
  authRedirectSearchSchema,
  useAuthPageState,
} from "@/client/features/auth/AuthPage";
import { useGoogleAuth } from "@/client/features/auth/useGoogleAuth";
import { getFormError } from "@/client/lib/forms";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient } from "@/lib/auth-client";
import {
  getSignInSearch,
  getVerifyEmailSearch,
  toAuthCallbackURL,
} from "@/lib/auth-redirect";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email("有効なメールアドレスを入力してください。"),
  password: z.string().min(1, "パスワードを入力してください。"),
});

export const Route = createFileRoute("/_auth/sign-in")({
  validateSearch: authRedirectSearchSchema,
  component: SignInPage,
});

function SignInPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { redirectTo, oauthQuery, isHostedMode } = useAuthPageState(
    search.redirect,
  );
  const [showEmailForm, setShowEmailForm] = useState(false);
  const google = useGoogleAuth({ redirectTo });

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const email = value.email.trim();
        captureClientEvent("auth:sign_in_submit", {
          redirect_to: redirectTo,
        });

        const result = await authClient.signIn.email({
          email,
          password: value.password,
          callbackURL: toAuthCallbackURL(redirectTo),
          ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
        });

        if (!result.error) {
          captureClientEvent("auth:sign_in_success", {
            redirect_to: redirectTo,
          });
          return;
        }

        if (result.error.status === 403) {
          captureClientEvent("auth:sign_in_block_unverified", {
            redirect_to: redirectTo,
          });
          // Email not verified yet: send them to the verification page (which
          // shows "check your inbox" + resend) instead of leaving them on a
          // sign-in form that will keep rejecting them.
          void navigate({
            to: "/verify-email",
            search: getVerifyEmailSearch(email, redirectTo),
          });
          return;
        }

        formApi.setErrorMap({
          onSubmit: {
            form: "ログインできませんでした。入力内容をご確認ください。",
            fields: {},
          },
        });
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: "現在ログインできません。もう一度お試しください。",
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageCard
      title="ログイン"
      footer={
        isHostedMode ? (
          <div
            className={
              showEmailForm
                ? "flex w-full justify-between text-sm text-foreground/50"
                : "w-full text-sm text-foreground/50"
            }
          >
            {showEmailForm ? (
              <Link
                to="/forgot-password"
                search={getSignInSearch(redirectTo)}
                className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
              >
                パスワードをお忘れですか？
              </Link>
            ) : null}
            <Link
              to="/sign-up"
              search={getSignInSearch(redirectTo)}
              className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
            >
              アカウントを作成
            </Link>
          </div>
        ) : null
      }
    >
      {!showEmailForm ? (
        <>
          <AuthMethodChooser
            googleLabel="Googleで続行"
            disabled={!isHostedMode}
            isBusy={google.isStarting}
            onContinueWithGoogle={() => {
              void google.start();
            }}
            onContinueWithEmail={() => {
              setShowEmailForm(true);
              google.clearError();
            }}
          />
          {google.error ? (
            <p className="text-sm text-destructive">{google.error}</p>
          ) : null}
        </>
      ) : (
        <form.AppForm>
          <form.Form className="space-y-4">
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="メールアドレス"
                  hideLabel
                  className={authInputClassName}
                  type="email"
                  placeholder="メールアドレスを入力"
                  autoComplete="email"
                  required
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label="パスワード"
                  hideLabel
                  className={authInputClassName}
                  type="password"
                  placeholder="パスワードを入力"
                  autoComplete="current-password"
                  required
                />
              )}
            </form.AppField>

            <form.Subscribe
              selector={(state) => ({
                submitError: state.errorMap.onSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ submitError, isSubmitting }) => {
                const errorMessage = getFormError(submitError);
                return (
                  <>
                    {errorMessage ? (
                      <p className="text-sm text-destructive">{errorMessage}</p>
                    ) : null}
                    <Button
                      type="submit"
                      variant="secondary"
                      className={authSubmitClassName}
                      pending={isSubmitting}
                    >
                      {isSubmitting ? "ログインしています…" : "ログイン"}
                    </Button>
                  </>
                );
              }}
            </form.Subscribe>
          </form.Form>
        </form.AppForm>
      )}
    </AuthPageCard>
  );
}
