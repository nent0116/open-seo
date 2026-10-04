import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from "@/client/components/form/useAppForm";
import { saveCrawlerCredential } from "@/serverFunctions/crawlerAccess";
import {
  isCrawlerAccessExpired,
  parseSignatureExpiry,
} from "@/shared/crawler-access";

export const crawlerCredentialsQueryKey = ["crawler-credentials"];
export const saveCrawlerCredentialMutationKey = ["save-crawler-credential"];

const signatureSchema = z.object({
  host: z.string().trim().min(1, "ドメインを入力してください。"),
  signatureInput: z
    .string()
    .trim()
    .min(1, "Signature-Inputを入力してください。")
    .refine(
      (value) => !isCrawlerAccessExpired(parseSignatureExpiry(value)),
      "この署名は期限切れです。Shopify管理画面で新しい署名を作成してください。",
    ),
  signature: z.string().trim().min(1, "Signatureを入力してください。"),
});

/**
 * The two values a merchant copies out of Shopify admin. `Signature-Agent` is
 * a constant we add ourselves, so it is not asked for here.
 */
export function CrawlerAccessForm({
  projectId,
  initialHost,
  lockHost = false,
  onSaved,
}: {
  /** The project (website) the signature is stored on. */
  projectId: string;
  initialHost: string;
  lockHost?: boolean;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationKey: saveCrawlerCredentialMutationKey,
    mutationFn: (values: z.infer<typeof signatureSchema>) =>
      saveCrawlerCredential({
        data: { projectId, ...values },
      }),
    onSuccess: async (result) => {
      if ("problem" in result) return;
      await queryClient.invalidateQueries({
        queryKey: crawlerCredentialsQueryKey,
      });
      toast.success(
        `${result.credential.host}のクローラーアクセスを保存しました`,
      );
      onSaved?.();
    },
  });

  const form = useAppForm({
    defaultValues: { host: initialHost, signatureInput: "", signature: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signatureSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await saveMutation.mutateAsync(value);
      if ("problem" in result) {
        const { problem } = result;
        formApi.setErrorMap({
          onSubmit: {
            fields: {
              signatureInput:
                problem.reason === "wrong_domain"
                  ? `この署名は${problem.host}ではなく${problem.signedHost}用に作成されています。Shopify管理画面で${problem.host}用の署名を作成してください。`
                  : `Shopifyは${problem.host}に対してこの署名を受け付けません。${problem.host}用に作成した署名であることと、両方の値を省略せずコピーしたことを確認してください。`,
            },
          },
        });
        return;
      }
      formApi.reset({ ...value, signatureInput: "", signature: "" });
    },
  });

  return (
    <form.AppForm>
      <form.Form className="space-y-3">
        {!lockHost ? (
          <form.AppField name="host">
            {(field) => (
              <field.TextField
                label="ドメイン"
                placeholder="store.example.com"
                className="font-mono"
                required
              />
            )}
          </form.AppField>
        ) : null}
        <form.AppField name="signatureInput">
          {(field) => (
            <field.TextField
              label="Signature-Input"
              type="password"
              autoComplete="off"
              data-ph-mask
              className="font-mono"
              placeholder="sig1=(...);expires=..."
              required
            />
          )}
        </form.AppField>
        <form.AppField name="signature">
          {(field) => (
            <field.TextField
              label="Signature"
              description="ShopifyにはSignature-Agentの値も表示されますが、貼り付ける必要はありません。OpenSEOが各リクエストと一緒に送信します。"
              type="password"
              autoComplete="off"
              data-ph-mask
              className="font-mono"
              placeholder="sig1=:...:"
              required
            />
          )}
        </form.AppField>
        <form.SubmitButton disabled={!projectId}>署名を保存</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
