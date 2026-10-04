import type { CsvValue } from "@/client/lib/csv";
import type { CategoryTab, LighthouseIssue } from "./types";

const ISSUE_HEADERS = [
  "カテゴリ",
  "重要度",
  "スコア",
  "タイトル",
  "表示値",
  "説明",
  "影響（ミリ秒）",
  "影響（バイト）",
  "影響項目数",
];

function issuesToRows(issues: LighthouseIssue[]): CsvValue[][] {
  return issues.map((issue) => [
    issue.category,
    issue.severity,
    issue.score ?? "",
    issue.title,
    issue.displayValue ?? "",
    issue.description ?? "",
    issue.impactMs ?? "",
    issue.impactBytes ?? "",
    issue.items.length,
  ]);
}

export function issuesToTable(issues: LighthouseIssue[]) {
  return { headers: ISSUE_HEADERS, rows: issuesToRows(issues) };
}

export function categoryLabel(category: CategoryTab) {
  const labels: Record<CategoryTab, string> = {
    all: "すべて",
    performance: "パフォーマンス",
    accessibility: "アクセシビリティ",
    "best-practices": "ベストプラクティス",
    seo: "SEO",
  };
  return labels[category];
}
