import { Link, createFileRoute } from "@tanstack/react-router";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
} from "@/client/features/auth/AuthPage";
import { passwordSchema } from "@/client/features/auth/passwordSchema";
import { getFormError } from "@/client/lib/forms";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "パスワードが一致しません。",
    path: ["confirmPassword"],
  });

const resetPasswordSearchSchema = authRedirectSearchSchema.extend({
  error: z.string().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

function getResetPasswordErrorMessage(error: string | undefined) {
  switch ((error ?? "").toLowerCase()) {
    case "invalid_token":
      return "この再設定リンクは無効です。新しいリンクをリクエストしてください。";
    case "token_expired":
      return "この再設定リンクは期限切れです。新しいリンクをリクエストしてください。";
    default:
      return error
        ? "この再設定リンクは使用できません。新しいリンクをリクエストして、もう一度お試しください。"
        : null;
  }
}

function getResetPasswordPageCopy({
  isHostedMode,
  isComplete,
  routeError,
  hasToken,
}: {
  isHostedMode: boolean;
  isComplete: boolean;
  routeError: string | null;
  hasToken: boolean;
}) {
  if (!isHostedMode) {
    return {
      title: "パスワードを再設定",
      helperText: "現在、パスワードの再設定を利用できません。",
    };
  }

  if (isComplete) {
    return {
      title: "パスワードを更新しました",
      helperText:
        "パスワードを更新しました。新しいパスワードでログインしてください。",
    };
  }

  if (routeError || !hasToken) {
    return {
      title: "再設定リンクの有効期限が切れています",
      helperText:
        routeError ||
        "この再設定リンクは無効です。新しいリンクをリクエストしてください。",
    };
  }

  return {
    title: "パスワードを再設定",
    helperText: "アカウントの新しいパスワードを入力してください。",
  };
}

function ResetPasswordPage() {
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();
  const routeError = getResetPasswordErrorMessage(search.error);
  const token = search.token;
  const form = useAppForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
    // The form only renders when the URL carries a token.
    onSubmit: async ({ formApi, value }) => {
      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
          token,
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form:
                result.error.code === "INVALID_TOKEN"
                  ? "この再設定リンクは無効です。新しいリンクをリクエストして、もう一度お試しください。"
                  : "パスワードを更新できませんでした。もう一度お試しください。",
              fields: {},
            },
          });
          return;
        }
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: "現在パスワードを更新できません。もう一度お試しください。",
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
          isComplete: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isComplete, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);
          const pageCopy = getResetPasswordPageCopy({
            isHostedMode,
            isComplete,
            routeError,
            hasToken: !!token,
          });

          return (
            <AuthPageCard
              title={pageCopy.title}
              helperText={pageCopy.helperText}
              footer={
                isComplete ? undefined : (
                  <p className="text-sm">
                    <Link
                      to="/sign-in"
                      search={getSignInSearch(redirectTo)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ログイン
                    </Link>
                  </p>
                )
              }
            >
              {!isHostedMode ? null : isComplete ? (
                <Button
                  nativeButton={false}
                  variant="secondary"
                  className="w-full"
                  render={
                    <Link to="/sign-in" search={getSignInSearch(redirectTo)} />
                  }
                >
                  ログインへ進む
                </Button>
              ) : routeError || !token ? (
                <Button
                  nativeButton={false}
                  variant="secondary"
                  className="w-full"
                  render={
                    <Link
                      to="/forgot-password"
                      search={getSignInSearch(redirectTo)}
                    />
                  }
                >
                  新しい再設定リンクを送信
                </Button>
              ) : (
                <form.AppForm>
                  <form.Form className="space-y-4">
                    <form.AppField name="password">
                      {(field) => (
                        <field.TextField
                          label="新しいパスワード"
                          type="password"
                          placeholder="新しいパスワードを入力"
                          autoComplete="new-password"
                          required
                        />
                      )}
                    </form.AppField>
                    <form.AppField name="confirmPassword">
                      {(field) => (
                        <field.TextField
                          label="新しいパスワード（確認）"
                          type="password"
                          placeholder="新しいパスワードを再入力"
                          autoComplete="new-password"
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
                    >
                      {isSubmitting ? "更新しています…" : "パスワードを更新"}
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
