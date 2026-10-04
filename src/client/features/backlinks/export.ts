import type { CsvValue } from "@/client/lib/csv";
import type {
  BacklinksSearchState,
  BacklinksTabRows,
} from "./backlinksPageTypes";
import type { DomainRatings } from "./useAhrefsDomainRatings";

/**
 * Builds the export table for the active tab. When `domainRatings` is loaded
 * (the user clicked "Ahrefs DR"), an Ahrefs DR column is included for the
 * Backlinks and Referring Domains tabs, matching the on-screen table.
 */
export function buildBacklinksTabExport(args: {
  tab: BacklinksSearchState["tab"];
  rows: BacklinksTabRows;
  domainRatings?: DomainRatings | null;
}): { headers: string[]; rows: CsvValue[][] } {
  const { tab, rows, domainRatings } = args;
  const ratingFor = (domain: string | null | undefined): CsvValue => {
    if (!domainRatings || !domain) return null;
    return domainRatings[domain.replace(/^www\./, "")] ?? null;
  };

  if (tab === "backlinks") {
    return {
      headers: [
        "ドメイン",
        "リンク元URL",
        "リンク先URL",
        "アンカーテキスト",
        "種類",
        "Dofollow",
        "rel属性",
        "ドメインランク",
        ...(domainRatings ? ["Ahrefs DR"] : []),
        "リンク元ページランク",
        "リンク先ランク",
        "スパムスコア",
        "初回検出日",
        "最終検出日",
        "消失",
        "リンク切れ",
        "リンク数",
      ],
      rows: rows.backlinks.map((row) => [
        row.domainFrom,
        row.urlFrom,
        row.urlTo,
        row.anchor,
        row.itemType,
        row.isDofollow,
        row.relAttributes.join(", "),
        row.domainFromRank,
        ...(domainRatings ? [ratingFor(row.domainFrom)] : []),
        row.pageFromRank,
        row.rank,
        row.spamScore,
        row.firstSeen,
        row.lastSeen,
        row.isLost,
        row.isBroken,
        row.linksCount,
      ]),
    };
  }

  if (tab === "domains") {
    return {
      headers: [
        "ドメイン",
        "被リンク",
        "参照元ページ",
        "ランク",
        ...(domainRatings ? ["Ahrefs DR"] : []),
        "スパムスコア",
        "初回検出日",
        "リンク切れの被リンク",
        "リンク切れのページ",
      ],
      rows: rows.referringDomains.map((row) => [
        row.domain,
        row.backlinks,
        row.referringPages,
        row.rank,
        ...(domainRatings ? [ratingFor(row.domain)] : []),
        row.spamScore,
        row.firstSeen,
        row.brokenBacklinks,
        row.brokenPages,
      ]),
    };
  }

  return {
    headers: [
      "ページ",
      "被リンク",
      "参照元ドメイン",
      "ランク",
      "リンク切れの被リンク",
    ],
    rows: rows.topPages.map((row) => [
      row.page,
      row.backlinks,
      row.referringDomains,
      row.rank,
      row.brokenBacklinks,
    ]),
  };
}

export function buildBacklinksTabFilename(
  tab: BacklinksSearchState["tab"],
  target: string,
) {
  const tabPrefix =
    tab === "backlinks"
      ? "backlinks"
      : tab === "domains"
        ? "referring-domains"
        : "top-pages";
  const normalizedTarget = target
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `backlinks-${tabPrefix}${normalizedTarget ? `-${normalizedTarget}` : ""}`;
}
