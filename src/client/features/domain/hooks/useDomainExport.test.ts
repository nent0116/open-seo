import { beforeEach, expect, it, vi } from "vitest";
import { downloadFile } from "@/client/lib/download";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { exportDomainRows } from "./useDomainExport";

const { notify, writeText } = vi.hoisted(() => ({
  notify:
    vi.fn<
      (message: string, options: { action: { onClick: () => void } }) => void
    >(),
  writeText: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(notify, { error: vi.fn(), success: vi.fn() }),
}));
vi.mock("@/client/lib/download", () => ({ downloadFile: vi.fn() }));
vi.mock("@/client/lib/posthog", () => ({ captureClientEvent: vi.fn() }));
vi.mock("@/client/lib/exportToSheets", () => ({
  exportTableToSheets: vi.fn(),
}));

beforeEach(() => {
  writeText.mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
});

const toTable = (rows: string[]) => ({
  headers: ["キーワード"],
  rows: rows.map((row) => [row]),
});

it("exports every page in order, including a short page with more results", async () => {
  const pages = [
    { rows: ["日本語", "検索"], hasMore: true },
    { rows: ["比較"], hasMore: true },
    { rows: ["最終ページ"], hasMore: false },
  ];
  await exportDomainRows(
    {
      fetchPage: async (page) => pages[page - 1],
      toTable,
      filename: "example-keywords",
    },
    "csv",
  );

  expect(downloadFile).toHaveBeenCalledExactlyOnceWith(
    '\uFEFF"キーワード"\n"日本語"\n"検索"\n"比較"\n"最終ページ"',
    "example-keywords.csv",
    "text/csv",
  );
});

it("does not download incomplete results when a later page fails", async () => {
  await expect(
    exportDomainRows(
      {
        fetchPage: async (page) => {
          if (page === 2) throw new Error("取得エラー");
          return { rows: ["日本語"], hasMore: true };
        },
        toTable,
        filename: "example-keywords",
      },
      "csv",
    ),
  ).rejects.toThrow("取得エラー");

  expect(downloadFile).not.toHaveBeenCalled();
});

it.each(["copy-json", "sheets"] as const)(
  "waits for a fresh click after fetching all rows for %s",
  async (format) => {
    await exportDomainRows(
      {
        fetchPage: async (page) => ({
          rows: [page === 1 ? "日本語" : "検索"],
          hasMore: page === 1,
        }),
        toTable,
        filename: "example-keywords",
      },
      format,
    );

    expect(writeText).not.toHaveBeenCalled();
    expect(exportTableToSheets).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledOnce();

    notify.mock.calls[0][1].action.onClick();

    if (format === "copy-json") {
      expect(writeText).toHaveBeenCalledExactlyOnceWith(
        '[\n  "日本語",\n  "検索"\n]',
      );
    } else {
      expect(exportTableToSheets).toHaveBeenCalledExactlyOnceWith({
        headers: ["キーワード"],
        rows: [["日本語"], ["検索"]],
        feature: "domain_overview",
      });
    }
  },
);
