import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import { ReportTemplateForm } from "@/client/features/reports/ReportTemplateForm";
import { ReportTemplatesList } from "@/client/features/reports/ReportTemplatesList";
import {
  reportsQueryKey,
  reportTemplatesQueryKey,
} from "@/client/features/reports/shared";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  deleteReportTemplate,
  listReportTemplates,
} from "@/serverFunctions/reportTemplates";
import type { ReportTemplate } from "@/types/schemas/report-templates";

export const Route = createFileRoute("/_app/p/$projectId/reports/templates")({
  component: ReportTemplatesPage,
});

function ReportTemplatesPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  // `{}` opens the form for a new template; `{ template }` opens it for an edit.
  const [form, setForm] = useState<{ template?: ReportTemplate } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReportTemplate | null>(
    null,
  );

  const templatesQuery = useQuery({
    queryKey: reportTemplatesQueryKey(projectId),
    queryFn: () => listReportTemplates({ data: { projectId } }),
    staleTime: 0,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: reportTemplatesQueryKey(projectId),
    });
    // The reports list renders the template name in its Type column.
    void queryClient.invalidateQueries({
      queryKey: reportsQueryKey(projectId),
    });
  };

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) =>
      deleteReportTemplate({ data: { projectId, templateId } }),
    onSuccess: (_result, templateId) => {
      captureClientEvent("report_template:deleted", {
        project_id: projectId,
        template_id: templateId,
      });
      toast.success("テンプレートを削除しました");
      setPendingDelete(null);
      invalidate();
    },
  });

  return (
    <div className="overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          backLink={
            <BackLink to="/p/$projectId/reports" params={{ projectId }}>
              レポート
            </BackLink>
          }
          title="レポートテンプレート"
          description="AIエージェントがレポート作成時に参照する再利用可能な指示です。対象読者、構成、文章トーンなどを定めます。"
          actions={
            <Button onClick={() => setForm({})}>
              <Plus data-icon="inline-start" />
              新しいテンプレート
            </Button>
          }
        />

        <QueryState
          query={templatesQuery}
          errorFallback="テンプレートを読み込めませんでした"
        >
          {(data) => (
            <ReportTemplatesList
              templates={data.templates}
              onEdit={(template) => setForm({ template })}
              onDelete={setPendingDelete}
            />
          )}
        </QueryState>
      </div>

      {form ? (
        <ReportTemplateForm
          projectId={projectId}
          template={form.template}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            invalidate();
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={`「${pendingDelete.name}」を削除しますか？`}
          confirmLabel="テンプレートを削除"
          destructive
          pending={deleteMutation.isPending}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
        >
          このテンプレートから作成済みのレポートには影響しません。
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
