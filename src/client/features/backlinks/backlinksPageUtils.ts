import type { BacklinksTab } from "@/types/schemas/backlinks";
import type { BacklinksOverviewData } from "./backlinksPageTypes";

export const TAB_DESCRIPTIONS: Record<BacklinksTab, string> = {
  backlinks:
    "対象への個別リンクを、リンク元ページ、アンカーテキスト、リンク品質の指標とともに確認します。",
  domains:
    "対象へリンクしている固有ドメインを、個別リンクではなくサイト単位で確認します。",
  pages:
    "対象サイトで被リンクと参照ドメインを多く獲得しているページを確認します。",
};

export function buildSummaryStats(data: BacklinksOverviewData | undefined) {
  if (!data) return [];

  return [
    {
      label: "被リンク",
      value: formatNumber(data.summary.backlinks),
      description: "このサイトまたはページへのリンク総数です。",
    },
    {
      label: "参照ドメイン",
      value: formatNumber(data.summary.referringDomains),
      description: "このサイトまたはページへリンクしている固有ドメインです。",
    },
    {
      label: "参照ページ",
      value: formatNumber(data.summary.referringPages),
      description: "このサイトまたはページへリンクしている固有ページです。",
    },
    {
      label: "ランク",
      value: formatNumber(data.summary.rank),
      description: "DataForSEOによる0～100の評価スコアです。",
    },
    {
      label: "被リンクスパムスコア",
      value: formatDecimal(data.summary.backlinksSpamScore),
      description: "ここへ向けられたリンクの推定スパムリスクです。",
    },
    {
      label: "リンク切れの被リンク",
      value: formatNumber(data.summary.brokenBacklinks),
      description: "ここにあるエラーページへのリンクです。",
    },
    {
      label: "エラーページ",
      value: formatNumber(data.summary.brokenPages),
      description: "被リンクが残っているエラーページです。",
    },
    {
      label: "対象のスパムスコア",
      value: formatDecimal(data.summary.targetSpamScore),
      description: "このサイトまたはページの推定スパムリスクです。",
    },
  ];
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP").format(Math.round(value));
}

export function formatDecimal(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toFixed(value >= 100 ? 0 : 1);
}

export function formatTooltipValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  return "-";
}

export function formatCompactDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ja-JP", {
    month: "short",
    year: "2-digit",
  });
}

export function formatRelativeTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "最近";
  return parsed.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function extractUrlPath(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

const ELLIPSIS = "...";

export function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  if (maxLength <= ELLIPSIS.length)
    return value.slice(0, Math.max(maxLength, 0));
  const sideLength = Math.floor((maxLength - ELLIPSIS.length) / 2);
  if (sideLength <= 0) {
    return `${value.slice(0, maxLength - ELLIPSIS.length)}${ELLIPSIS}`;
  }
  return `${value.slice(0, sideLength)}${ELLIPSIS}${value.slice(-sideLength)}`;
}
