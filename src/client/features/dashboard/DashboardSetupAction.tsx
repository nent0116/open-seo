import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAgentSetupPrompt } from "@/client/features/ai-mcp/agentSetupPrompt";
import {
  AgentSetupPanel,
  AGENT_SETUP_DESCRIPTION,
} from "@/client/features/ai-mcp/AgentSetupPanel";
import { CopyButton } from "@/client/components/CopyButton";
import { CreateProjectModal } from "@/client/features/projects/CreateProjectModal";
import { InviteTeammateModal } from "@/client/features/team/InviteTeammateModal";
import { PermissionHint } from "@/client/components/PermissionHint";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { hasOrgPermission } from "@/lib/org-permissions";
import { markDashboardStepClicked } from "@/serverFunctions/dashboard";
import type {
  DashboardClickStep,
  DashboardSetupStep,
} from "@/types/schemas/dashboard";
import { parseResearchTarget } from "@/shared/researchScope";

const projectPrompt = `OpenSEOを使って、以下のWebサイトごとに個別のプロジェクトを設定してください。最初に既存のプロジェクト一覧を確認し、一致するものがあれば再利用して重複を避けてください。各サイトに国と言語を設定し、不足している情報があれば質問してください。

この一覧を自分のWebサイトに置き換えてください：
- プロジェクト名 — Webサイト — 国 — 言語`;

export function DashboardSetupAction({
  step,
  projectId,
  domain,
  onComplete,
}: {
  step: DashboardSetupStep;
  projectId: string;
  domain: string | null;
  onComplete: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const org = useQuery(organizationContextQueryOptions());
  // Click-through steps: record the milestone, then open the page with the
  // user's input already applied so the research runs on arrival.
  const clickThrough = useMutation({
    mutationFn: (input: { step: DashboardClickStep; value: string }) =>
      markDashboardStepClicked({ data: { projectId, step: input.step } }),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: ["dashboardActivation", projectId],
      });
      onComplete();
      if (input.step === "competitor")
        void navigate({
          to: "/p/$projectId/domain",
          params: { projectId },
          search: { domain: input.value },
        });
      else
        void navigate({
          to: "/p/$projectId/keywords",
          params: { projectId },
          search: { q: input.value },
        });
    },
  });
  if (step === "competitor")
    return (
      <StepInputForm
        description="競合ドメインを調べ、上位表示されているトピックやリンク元サイトを確認します。"
        label="競合サイト"
        placeholder="competitor.com"
        submitLabel="競合を調査"
        validate={validateDomain}
        pending={clickThrough.isPending}
        onSubmit={(value) =>
          clickThrough.mutate({
            step: "competitor",
            value: parseDomain(value),
          })
        }
      />
    );
  if (step === "keywords")
    return (
      <StepInputForm
        description="商品やサービスを表すキーワードを1つ入力すると、関連キーワードの検索ボリュームと難易度を確認できます。"
        label="起点キーワード"
        placeholder="例：ランニングシューズ"
        submitLabel="キーワード候補を探す"
        validate={(value) =>
          value.trim() ? undefined : "起点となるキーワードを入力してください"
        }
        pending={clickThrough.isPending}
        onSubmit={(value) =>
          clickThrough.mutate({ step: "keywords", value: value.trim() })
        }
      />
    );
  if (step === "audit")
    return (
      <StepInputForm
        description="サイトをクロールし、リンク切れ、タグの不足、検索エンジンが登録できないページを検出します。開始前にクロール規模を調整できます。"
        label="サイトURL"
        placeholder="https://example.com"
        defaultValue={domain ? `https://${domain}` : ""}
        submitLabel="監査を設定"
        validate={validateDomain}
        pending={false}
        onSubmit={(value) => {
          onComplete();
          void navigate({
            to: "/p/$projectId/audit",
            params: { projectId },
            search: { url: value.trim() },
          });
        }}
      />
    );
  if (step === "mcp")
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {AGENT_SETUP_DESCRIPTION}
        </p>
        <AgentSetupPanel
          prompt={getAgentSetupPrompt(
            typeof window === "undefined"
              ? "https://app.openseo.so"
              : window.location.origin,
          )}
          onCopy={() =>
            captureClientEvent("onboarding:setup_prompt_copy", {
              source: "dashboard",
            })
          }
        />
      </div>
    );

  const canManage =
    org.data &&
    hasOrgPermission(
      org.data.role,
      step === "project" ? { project: ["create"] } : { invitation: ["create"] },
    );
  if (!canManage)
    return org.isPending ? (
      <p className="text-sm text-muted-foreground">
        ワークスペースの権限を確認しています…
      </p>
    ) : org.isError ? (
      <p className="text-sm text-muted-foreground">
        {getStandardErrorMessage(org.error)}
      </p>
    ) : (
      <PermissionHint action="この手順の対応" />
    );
  if (step === "project")
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          サイトごとに調査、順位、連携情報をプロジェクトへ分けて管理できます。サイドバーのプロジェクト切替から、いつでも新しいプロジェクトを作成できます。
        </p>
        <Button onClick={() => setShowModal(true)}>
          別のプロジェクトを作成
        </Button>
        <Collapsible className="rounded-lg border border-border p-4">
          <CollapsibleTrigger className="cursor-pointer text-sm font-medium">
            複数サイトの一覧がある場合は、AIエージェントに設定を任せられます。
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              <Link
                to="/ai"
                className="text-primary underline-offset-4 hover:underline"
              >
                AIエージェントを連携
              </Link>
              し、サイト一覧と一緒にこのプロンプトを貼り付けてください。
            </p>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-muted-foreground">
              {projectPrompt}
            </pre>
            <CopyButton
              value={projectPrompt}
              label="プロジェクト作成用プロンプトをコピー"
              successMessage="プロジェクト作成用プロンプトをコピーしました"
            />
          </CollapsibleContent>
        </Collapsible>
        {showModal && (
          <CreateProjectModal onClose={() => setShowModal(false)} />
        )}
      </div>
    );
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        メンバーをワークスペースへ招待し、プロジェクト、調査、結果を共有できます。
      </p>
      <Button onClick={() => setShowModal(true)}>メンバーを招待</Button>
      {showModal && (
        <InviteTeammateModal
          onClose={() => setShowModal(false)}
          onInvited={() => {
            void queryClient.invalidateQueries({
              queryKey: ["organization-team"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["dashboardActivation"],
            });
          }}
        />
      )}
    </div>
  );
}

function validateDomain(value: string) {
  const parsed = parseResearchTarget(value);
  return parsed.ok ? undefined : parsed.message;
}

function parseDomain(value: string) {
  const parsed = parseResearchTarget(value);
  return parsed.ok ? parsed.target.hostname : value.trim();
}

function StepInputForm({
  description,
  label,
  placeholder,
  defaultValue = "",
  submitLabel,
  validate,
  pending,
  onSubmit,
}: {
  description: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  submitLabel: string;
  validate: (value: string) => string | undefined;
  pending: boolean;
  onSubmit: (value: string) => void;
}) {
  const form = useForm({
    defaultValues: { value: defaultValue },
    onSubmit: ({ value }) => onSubmit(value.value),
  });
  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <form.Field
        name="value"
        validators={{
          // Stay quiet while the user is still typing; validate on submit, and
          // keep validating live after the first attempt.
          onChange: ({ value, fieldApi }) =>
            fieldApi.form.state.submissionAttempts > 0
              ? validate(value)
              : undefined,
        }}
      >
        {(field) => (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{label}</span>
            <Input
              type="text"
              maxLength={255}
              placeholder={placeholder}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-12 px-4 md:text-base"
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-xs text-destructive">
                {field.state.meta.errors.join(", ")}
              </span>
            )}
          </label>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button type="submit" size="lg" disabled={!canSubmit || pending}>
            {submitLabel}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
