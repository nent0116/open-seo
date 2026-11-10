import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CsvValue } from "@/client/lib/csv";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { exportRows, type ExportFormat } from "@/client/lib/exportRows";

type DomainExportOptions<T> = {
  fetchPage: (page: number) => Promise<{ rows: T[]; hasMore: boolean }>;
  toTable: (rows: T[]) => { headers: string[]; rows: CsvValue[][] };
  filename: string;
};

export async function exportDomainRows<T>(
  options: DomainExportOptions<T>,
  format: ExportFormat,
) {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const result = await options.fetchPage(page);
    rows.push(...result.rows);
    if (!result.hasMore) break;
  }

  // Only prepare the export after every page succeeds; never export partial data.
  const exportInput = {
    format,
    feature: "domain_overview",
    ...options.toTable(rows),
    records: rows,
    filename: options.filename,
  };

  if (rows.length > 0 && (format === "copy-json" || format === "sheets")) {
    // Clipboard access needs a fresh user gesture after the paginated requests.
    toast("コピーの準備ができました", {
      description: `${options.filename}（${rows.length.toLocaleString("ja-JP")}件）`,
      duration: Infinity,
      closeButton: true,
      action: {
        label: format === "sheets" ? "コピーして続ける" : "JSONをコピー",
        onClick: () => void exportRows(exportInput),
      },
    });
    return;
  }

  await exportRows(exportInput);
}

export function useDomainExport<T>(options: DomainExportOptions<T>) {
  return useMutation({
    mutationFn: (format: ExportFormat) => exportDomainRows(options, format),
    retry: false,
    onError: (error) => {
      toast.error(getStandardErrorMessage(error, "出力できませんでした"));
    },
  });
}
