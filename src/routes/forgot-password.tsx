import { Link, createFileRoute } from "@tanstack/react-router";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
} from "@/client/features/auth/AuthPage";
import { getFormError } from "@/client/lib/forms";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("有効なメールアドレスを入力してください。"),
});

export const Route = createFileRoute("/forgot-password")({
  validateSearch: authRedirectSearchSchema,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();

  const form = useAppForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const redirectUrl = new URL("/reset-password", window.location.origin);
        if (redirectTo !== "/")
          redirectUrl.searchParams.set("redirect", redirectTo);
        const result = await authClient.requestPasswordReset({
          email: value.email.trim(),
          redirectTo: redirectUrl.toString(),
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form: "再設定メールを送信できませんでした。",
              fields: {},
            },
          });
          return;
        }
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: "現在、再設定メールを送信できません。もう一度お試しください。",
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageShell>
      <form.Subscribe
        selector={(state) => ({
          isSuccess: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submittedEmail: state.values.email,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isSuccess, submittedEmail, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);

          return (
            <AuthPageCard
              title={
                isSuccess
                  ? "メールをご確認ください"
                  : "パスワードをお忘れですか？"
              }
              helperText={
                isSuccess
                  ? undefined
                  : isHostedMode
                    ? "メールアドレスを入力すると、パスワード再設定用のリンクをお送りします。"
                    : "現在、パスワードの再設定を利用できません。"
              }
              footer={
                <p className="text-sm">
                  <Link
                    to="/sign-in"
                    search={getSignInSearch(redirectTo)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ログインへ戻る
                  </Link>
                </p>
              }
            >
              {isSuccess ? (
                <Alert variant="success">
                  <AlertDescription>
                    次のメールアドレスのアカウントが存在する場合：{" "}
                    {submittedEmail}。まもなくパスワード再設定の案内が届きます。
                  </AlertDescription>
                </Alert>
              ) : (
                <form.AppForm>
                  <form.Form className="space-y-4">
                    <form.AppField name="email">
                      {(field) => (
                        <field.TextField
                          label="メールアドレス"
                          type="email"
                          placeholder="メールアドレスを入力"
                          autoComplete="email"
                          disabled={!isHostedMode}
                          required
                        />
                      )}
                    </form.AppField>

                    {errorMessage ? (
                      <Alert variant="destructive">
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button
                      type="submit"
                      variant="secondary"
                      className="w-full"
                      pending={isSubmitting}
                      disabled={!isHostedMode}
                    >
                      {isSubmitting ? "送信しています…" : "再設定リンクを送信"}
                    </Button>
                  </form.Form>
                </form.AppForm>
              )}
            </AuthPageCard>
          );
        }}
      </form.Subscribe>
    </AuthPageShell>
  );
}
