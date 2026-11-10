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
  skipLabel: string;
}[] = [
  {
    id: "competitor",
    label: "競合を調査",
    detail: "参考にすべきトピックやリンクを見つけます。",
    icon: Globe,
    skipLabel: "Skip for now",
  },
  {
    id: "keywords",
    label: "キーワード候補を探す",
    detail: "1つのキーワードから、実際に検索されている語句を調べます。",
    icon: Lightbulb,
    skipLabel: "Skip for now",
  },
  {
    id: "audit",
    label: "サイトを監査",
    detail:
      "リンク切れ、タグ不足、インデックス登録の問題をクロールで検出します。",
    icon: ClipboardCheck,
    skipLabel: "Skip for now",
  },
  {
    id: "mcp",
    label: "AIエージェントを連携",
    detail: "Claudeなど、普段お使いのAIエージェントからOpenSEOを利用します。",
    icon: Bot,
    skipLabel: "Skip for now",
  },
  {
    id: "team",
    label: "メンバーを招待",
    detail: "共同作業するメンバーを招待します。ひとりのままでも利用できます。",
    icon: Users,
    skipLabel: "Skip",
  },
  {
    id: "project",
    label: "複数のサイトを運用していますか？",
    detail:
      "別のプロジェクトを作成するか、AIエージェントにサイト一覧を設定してもらいます。",
    icon: FolderPlus,
    skipLabel: "I only need one project",
  },
];

export function getStepStatus(
  activation: DashboardActivation,
  step: DashboardSetupStep,
): "done" | "skipped" | "todo" {
  const completed: Record<DashboardSetupStep, boolean> = {
    competitor: activation.competitorResearchedAt !== null,
    keywords: activation.keywordsResearchedAt !== null,
    audit: activation.hasAudit,
    mcp:
      activation.mcp.authorizedAt !== null ||
      activation.mcp.firstToolCallAt !== null,
    team: activation.hasTeammate,
    project: activation.hasMultipleProjects,
  };
  if (completed[step]) return "done";
  if (!activation.dismissedSteps.includes(step)) return "todo";
  return completeWhenSkipped.has(step) ? "done" : "skipped";
}

// Skipping these marks them complete, so they never wait in "saved for later".
const completeWhenSkipped = new Set<DashboardSetupStep>(["team", "project"]);
