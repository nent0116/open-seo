import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { downloadFile } from "@/client/lib/download";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import { exportRows, type ExportFormat } from "./exportRows";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/client/lib/download", () => ({ downloadFile: vi.fn() }));
vi.mock("@/client/lib/exportToSheets", () => ({
  exportTableToSheets: vi.fn(),
}));
vi.mock("@/client/lib/posthog", () => ({ captureClientEvent: vi.fn() }));

const writeText = vi.fn();

describe("exportRows", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { clipboard: { writeText } });
  });

  it.each<ExportFormat>(["csv", "excel", "json", "copy-json", "sheets"])(
    "refuses to export zero rows as %s",
    async (format) => {
      await exportRows({
        format,
        feature: "test",
        headers: ["Keyword"],
        rows: [],
        filename: "empty",
      });

      expect(toast.error).toHaveBeenCalledWith("出力するデータがありません");
      expect(downloadFile).not.toHaveBeenCalled();
      expect(exportTableToSheets).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      expect(captureClientEvent).not.toHaveBeenCalled();
    },
  );

  it.each(["csv", "excel"] as const)(
    "downloads %s with a UTF-8 BOM for Japanese text",
    async (format) => {
      await exportRows({
        format,
        feature: "domain_overview",
        headers: ["キーワード"],
        rows: [["日本語の検索"]],
        filename: "openseo.so-keywords",
      });

      expect(downloadFile).toHaveBeenCalledWith(
        '\uFEFF"キーワード"\n"日本語の検索"',
        `openseo.so-keywords.${format === "excel" ? "xls" : "csv"}`,
        "text/csv",
      );
      expect(captureClientEvent).toHaveBeenCalledWith("data:export", {
        source_feature: "domain_overview",
        format,
        result_count: 1,
      });
    },
  );
});
