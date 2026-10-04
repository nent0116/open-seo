import type { CsvValue } from "@/client/lib/csv";
import { formatPlatformLabel } from "@/client/features/ai-search/platformLabels";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

type CitationTab = "queries" | "pages";

type PageRow = BrandLookupResult["topPages"][number];
type QueryRow = BrandLookupResult["topQueries"][number];

export function buildBrandLookupExport(
  tab: CitationTab,
  sortedPages: PageRow[],
  sortedQueries: QueryRow[],
): { headers: string[]; rows: CsvValue[][] } {
  if (tab === "pages") {
    return {
      headers: [
        "URL",
        "ドメイン",
        "プラットフォーム",
        "出典での言及数",
        "出典のAI検索ボリューム",
        "取得サンプルのプロンプト例",
      ],
      rows: sortedPages.map((row) => [
        row.url,
        row.domain ?? "",
        formatPlatformLabel(row.platform),
        row.mentions ?? "",
        row.capturedVolume ?? "",
        row.keywords.map((keyword) => keyword.question).join("; "),
      ]),
    };
  }
  return {
    headers: [
      "検索語句",
      "プラットフォーム",
      "AI検索ボリューム",
      "初回検出日",
      "最終検出日",
    ],
    rows: sortedQueries.map((row) => [
      row.question,
      formatPlatformLabel(row.platform),
      row.aiSearchVolume ?? "",
      row.firstSeenAt ?? "",
      row.lastSeenAt ?? "",
    ]),
  };
}

export function brandLookupExportFilename(
  tab: CitationTab,
  resolvedTarget: string,
) {
  const slug = slugify(resolvedTarget);
  return tab === "pages"
    ? `ai-brand-lookup-pages-${slug}`
    : `ai-brand-lookup-queries-${slug}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
