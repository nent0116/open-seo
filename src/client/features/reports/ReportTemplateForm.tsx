import { revalidateLogic } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { captureClientEvent } from "@/client/lib/posthog";
import { saveReportTemplate } from "@/serverFunctions/reportTemplates";
import type { ReportTemplate } from "@/types/schemas/report-templates";

// One form for create and edit. Shape only, as at every other boundary: the
// caps come back from the service with their copy and show in a toast.
const formSchema = z.object({
  name: z.string().trim().min(1, "テンプレート名を入力してください。"),
  description: z
    .string()
    .trim()
    .min(1, "このテンプレートを使用する場面を1行で入力してください。"),
  instructions: z
    .string()
    .trim()
    .min(1, "レポートの対象読者と構成を入力してください。"),
});

const INSTRUCTIONS_PLACEHOLDER = `対象読者：クライアントのマーケティング責任者（技術者向けではない）
構成：現状 / 今月行ったこと / 変化 / 次に期待できること
文体：平易で自信のある表現。SEO用語には説明を添える。感嘆符は使わない。
署名：Acme SEO
アクセントカラー：#1C4ED8`;

export function ReportTemplateForm({
  projectId,
  template,
  onClose,
  onSaved,
}: {
  projectId: string;
  /** The template being edited, or undefined when creating one. */
  template?: ReportTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const saveMutation = useMutation({
    // A refusal (duplicate name, the cap) comes back as `{ ok: false }` rather
    // than an error, because thrown errors reach the client stripped to their
    // code. Rethrowing it here lets the mutation cache toast its message.
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const result = await saveReportTemplate({
        data: { projectId, templateId: template?.id, ...values },
      });
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      captureClientEvent("report_template:saved", {
        project_id: projectId,
        is_update: !result.created,
        source: "app",
      });
      toast.success(
        result.created
          ? "テンプレートを作成しました"
          : "テンプレートを保存しました",
      );
      onSaved();
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      instructions: template?.instructions ?? "",
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: ({ value }) => saveMutation.mutateAsync(value),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saveMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
        <form.AppForm>
          <form.Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {template ? "テンプレートを編集" : "新しいテンプレート"}
              </DialogTitle>
            </DialogHeader>

            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label="名前"
                  placeholder="月次クライアント報告"
                  required
                />
              )}
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.TextField
                  label="説明"
                  description="使用する場面を1行で説明します。AIエージェントが選択時に参照します。"
                  placeholder="継続契約のクライアントへ送る月次報告。"
                  required
                />
              )}
            </form.AppField>

            <form.AppField name="instructions">
              {(field) => (
                <field.TextareaField
                  label="作成指示"
                  description="プロジェクト全体の文章トーンは「プロジェクト情報」›「文章の設定」で管理します。"
                  className="h-56 font-mono leading-relaxed md:text-xs"
                  placeholder={INSTRUCTIONS_PLACEHOLDER}
                  required
                />
              )}
            </form.AppField>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saveMutation.isPending}
              >
                キャンセル
              </Button>
              <form.SubmitButton>
                {template ? "変更を保存" : "テンプレートを作成"}
              </form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
