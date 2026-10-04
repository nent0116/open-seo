import {
  Bot,
  ClipboardCheck,
  FolderPlus,
  Globe,
  Lightbulb,
  Users,
} from "lucide-react";
import type { DashboardActivation } from "@/server/features/dashboard/services/DashboardService";
import type { DashboardSetupStep } from "@/types/schemas/dashboard";

export const setupSteps: {
  id: DashboardSetupStep;
  label: string;
  detail: string;
  icon: typeof Globe;
}[] = [
  {
    id: "competitor",
    label: "競合を調査",
    detail: "参考にすべきトピックやリンクを見つけます。",
    icon: Globe,
  },
  {
    id: "keywords",
    label: "キーワード候補を探す",
    detail: "1つのキーワードから、実際に検索されている語句を調べます。",
    icon: Lightbulb,
  },
  {
    id: "audit",
    label: "サイトを監査",
    detail:
      "リンク切れ、タグ不足、インデックス登録の問題をクロールで検出します。",
    icon: ClipboardCheck,
  },
  {
    id: "mcp",
    label: "AIエージェントを連携",
    detail: "Claudeなど、普段お使いのAIエージェントからOpenSEOを利用します。",
    icon: Bot,
  },
  {
    id: "team",
    label: "メンバーを招待",
    detail: "共同作業するメンバーを招待します。ひとりのままでも利用できます。",
    icon: Users,
  },
  {
    id: "project",
    label: "複数のサイトを運用していますか？",
    detail:
      "別のプロジェクトを作成するか、AIエージェントにサイト一覧を設定してもらいます。",
    icon: FolderPlus,
  },
];

export function getStepStatus(
  activation: DashboardActivation,
  step: DashboardSetupStep,
): "done" | "skipped" | "todo" {
  const completed: Record<DashboardSetupStep, boolean> = {
    competitor: activation.competitorClickedAt !== null,
    keywords: activation.keywordsClickedAt !== null,
    audit: activation.hasAudit,
    mcp:
      activation.mcp.authorizedAt !== null ||
      activation.mcp.firstToolCallAt !== null,
    team: activation.hasTeammate,
    project: activation.hasMultipleProjects,
  };
  if (completed[step]) return "done";
  // Preserve previous MCP dismissals without treating them as authorization.
  if (
    activation.dismissedSteps.includes(step) ||
    (step === "mcp" && activation.mcp.cardDismissedAt !== null)
  )
    return "skipped";
  return "todo";
}
