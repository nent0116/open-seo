import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Switch } from "@/client/components/ui/switch";
import {
  clampMaxPagesInput,
  MIN_PAGES,
} from "@/client/features/audit/launch/types";
import type { useLaunchController } from "@/client/features/audit/launch/useLaunchController";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { RENDERED_MAX_AUDIT_PAGES } from "@/shared/audit-limits";
import { renderingEstimateText } from "@/shared/audit-rendering";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

type Props = {
  launchForm: ReturnType<typeof useLaunchController>["launchForm"];
  commitMaxPagesInput: () => number;
  maxPagesLimit: number;
  paidMaxPagesLimit: number;
  canRenderJavaScript?: boolean;
};

export function LaunchFormCard({
  commitMaxPagesInput,
  launchForm,
  maxPagesLimit,
  paidMaxPagesLimit,
  canRenderJavaScript,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>新しい監査を開始</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void launchForm.handleSubmit();
          }}
        >
          <launchForm.Field name="url">
            {(field) => {
              const urlError = getFieldError(field.state.meta.errors);

              return (
                <Input
                  className="lg:col-span-9"
                  aria-label="サイトURL"
                  aria-invalid={urlError ? true : undefined}
                  placeholder="https://example.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    if (launchForm.state.errorMap.onSubmit) {
                      launchForm.setErrorMap({ onSubmit: undefined });
                    }
                  }}
                />
              );
            }}
          </launchForm.Field>

          <launchForm.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                className="w-full lg:col-span-3"
                pending={isSubmitting}
              >
                {isSubmitting ? "開始しています…" : "監査を開始"}
              </Button>
            )}
          </launchForm.Subscribe>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-12 lg:items-start">
            <LaunchOptions
              launchForm={launchForm}
              commitMaxPagesInput={commitMaxPagesInput}
              maxPagesLimit={maxPagesLimit}
              paidMaxPagesLimit={paidMaxPagesLimit}
            />
            <div className="space-y-4">
              <LighthouseOptions launchForm={launchForm} />
              <RenderingOptions
                launchForm={launchForm}
                maxPagesLimit={maxPagesLimit}
                canRenderJavaScript={canRenderJavaScript}
              />
            </div>
          </div>
        </form>

        <LaunchErrors launchForm={launchForm} />
      </CardContent>
    </Card>
  );
}

function LaunchOptions({
  launchForm,
  commitMaxPagesInput,
  maxPagesLimit,
  paidMaxPagesLimit,
}: Props) {
  return (
    <Field className="rounded-lg border border-border p-3">
      <FieldLabel htmlFor="audit-max-pages">最大ページ数</FieldLabel>
      <launchForm.Field name="maxPagesInput">
        {(field) => (
          <Input
            id="audit-max-pages"
            type="number"
            min={MIN_PAGES}
            max={maxPagesLimit}
            className="w-28"
            value={field.state.value}
            onChange={(event) => {
              const next = event.target.value;
              if (!/^\d*$/.test(next)) return;
              field.handleChange(next);
              if (launchForm.state.errorMap.onSubmit) {
                launchForm.setErrorMap({ onSubmit: undefined });
              }
            }}
            onBlur={commitMaxPagesInput}
          />
        )}
      </launchForm.Field>
      <FieldDescription>
        {MIN_PAGES}～{maxPagesLimit.toLocaleString("ja-JP")}
        の範囲で入力してください。
        {maxPagesLimit === RENDERED_MAX_AUDIT_PAGES
          ? "JavaScriptをレンダリングする監査では、このページ数が上限です。"
          : null}
        {maxPagesLimit < paidMaxPagesLimit ? (
          <>
            {" "}
            <Link to={SUBSCRIBE_ROUTE} search={{ upgrade: true }}>
              アップグレード
            </Link>{" "}
            すると最大{paidMaxPagesLimit.toLocaleString("ja-JP")}
            ページまでクロールできます。
          </>
        ) : null}
      </FieldDescription>
    </Field>
  );
}

function LighthouseOptions({ launchForm }: Pick<Props, "launchForm">) {
  return (
    <Field className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <launchForm.Field name="runLighthouse">
          {(field) => (
            <Switch
              id="audit-run-lighthouse"
              checked={Boolean(field.state.value)}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          )}
        </launchForm.Field>
        <FieldLabel
          htmlFor="audit-run-lighthouse"
          title="Lighthouseでページの性能を測定し、問題を検出します。"
        >
          Lighthouseを含める
        </FieldLabel>
      </div>

      <launchForm.Subscribe
        selector={(snapshot) => snapshot.values.runLighthouse}
      >
        {(runLighthouse) =>
          runLighthouse ? (
            <FieldDescription>
              重複したテンプレートのページを除き、代表的な20ページを監査します。
            </FieldDescription>
          ) : null
        }
      </launchForm.Subscribe>
    </Field>
  );
}

function RenderingOptions({
  launchForm,
  maxPagesLimit,
  canRenderJavaScript,
}: Pick<Props, "launchForm" | "maxPagesLimit" | "canRenderJavaScript">) {
  return (
    <Field className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <launchForm.Field name="renderJavaScript">
          {(field) => (
            <Switch
              id="audit-render-javascript"
              checked={field.state.value}
              disabled={canRenderJavaScript !== true}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          )}
        </launchForm.Field>
        <FieldLabel
          htmlFor="audit-render-javascript"
          title="監査前に各ページをブラウザで読み込みます。処理時間が長くなります。"
        >
          JavaScriptを実行
        </FieldLabel>
      </div>

      {isHostedClientAuthMode() && (
        <launchForm.Subscribe
          selector={(state) => ({
            renderJavaScript: state.values.renderJavaScript,
            maxPagesInput: state.values.maxPagesInput,
          })}
        >
          {({ renderJavaScript, maxPagesInput }) =>
            renderJavaScript ? (
              <FieldDescription>
                {renderingEstimateText(
                  clampMaxPagesInput(maxPagesInput, maxPagesLimit),
                )}
              </FieldDescription>
            ) : null
          }
        </launchForm.Subscribe>
      )}
      {canRenderJavaScript === false && (
        <FieldDescription>
          この環境にはブラウザがないため、レンダリングにはContext.dev
          APIキーが必要です。 <code>CONTEXT_API_KEY</code>
          を設定し、OpenSEOを再起動してからこのページを再読み込みしてください。{" "}
          <a
            href="https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE_OPERATIONS.md#render-javascript-in-site-audits"
            target="_blank"
            rel="noreferrer"
          >
            セットアップガイド
          </a>
        </FieldDescription>
      )}
    </Field>
  );
}

function LaunchErrors({ launchForm }: Pick<Props, "launchForm">) {
  return (
    <div className="space-y-2">
      <launchForm.Field name="url">
        {(field) => {
          const urlError = getFieldError(field.state.meta.errors);

          return urlError ? <FieldError>{urlError}</FieldError> : null;
        }}
      </launchForm.Field>

      <launchForm.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(submitError) => {
          const errorMessage = getFormError(submitError);

          return errorMessage ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{errorMessage}</AlertTitle>
            </Alert>
          ) : null;
        }}
      </launchForm.Subscribe>
    </div>
  );
}
