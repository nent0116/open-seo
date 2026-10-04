import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { z } from "zod";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import type { searchPerformanceInputSchema } from "@/types/schemas/search-performance";

const MATCH_ITEMS = [
  { value: "contains", label: "含む" },
  { value: "equals", label: "完全一致" },
];

export type TextFilters = Pick<
  z.infer<typeof searchPerformanceInputSchema>,
  "pageFilter" | "queryFilter"
>;

export function SearchPerformanceTextFilters({
  value,
  activeFilterCount,
  onApply,
  onReset,
}: {
  value: TextFilters;
  activeFilterCount: number;
  onApply: (filters: TextFilters) => void;
  onReset: () => void;
}) {
  const [page, setPage] = useState(value.pageFilter?.expression ?? "");
  const [query, setQuery] = useState(value.queryFilter?.expression ?? "");
  const [pageOperator, setPageOperator] = useState<"contains" | "equals">(
    value.pageFilter?.operator ?? "contains",
  );
  const [queryOperator, setQueryOperator] = useState<"contains" | "equals">(
    value.queryFilter?.operator ?? "contains",
  );
  const dirtyCount =
    Number(
      page.trim() !== (value.pageFilter?.expression ?? "") ||
        pageOperator !== (value.pageFilter?.operator ?? "contains"),
    ) +
    Number(
      query.trim() !== (value.queryFilter?.expression ?? "") ||
        queryOperator !== (value.queryFilter?.operator ?? "contains"),
    );
  const cancel = () => {
    setPage(value.pageFilter?.expression ?? "");
    setQuery(value.queryFilter?.expression ?? "");
    setPageOperator(value.pageFilter?.operator ?? "contains");
    setQueryOperator(value.queryFilter?.operator ?? "contains");
  };
  return (
    <form
      id="search-performance-filters"
      className="space-y-3 border-b border-border bg-muted/20 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        setPage(page.trim());
        setQuery(query.trim());
        if (!page.trim()) setPageOperator("contains");
        if (!query.trim()) setQueryOperator("contains");
        onApply({
          pageFilter: page.trim()
            ? { operator: pageOperator, expression: page.trim() }
            : undefined,
          queryFilter: query.trim()
            ? { operator: queryOperator, expression: query.trim() }
            : undefined,
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">表の結果を絞り込む</p>
          {activeFilterCount > 0 ? (
            <Badge size="sm">適用中 {activeFilterCount}件</Badge>
          ) : null}
          {dirtyCount > 0 ? (
            <Badge variant="warning" size="sm">
              {dirtyCount} unapplied
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={activeFilterCount === 0 && dirtyCount === 0}
          onClick={() => {
            setPage("");
            setQuery("");
            setPageOperator("contains");
            setQueryOperator("contains");
            onReset();
          }}
        >
          <RotateCcw data-icon="inline-start" />
          すべて解除
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            ページURL
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              items={MATCH_ITEMS}
              value={pageOperator}
              onValueChange={(operator) =>
                setPageOperator(operator === "equals" ? "equals" : "contains")
              }
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-44 sm:shrink-0"
                aria-label="ページの一致条件"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATCH_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-7 w-full min-w-0 sm:flex-1"
              aria-label="ページURLで絞り込む"
              value={page}
              maxLength={4096}
              onChange={(event) => setPage(event.target.value)}
              placeholder="URLまたはサブフォルダ"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            検索文
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              items={MATCH_ITEMS}
              value={queryOperator}
              onValueChange={(operator) =>
                setQueryOperator(operator === "equals" ? "equals" : "contains")
              }
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-44 sm:shrink-0"
                aria-label="検索語句の一致条件"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATCH_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-7 w-full min-w-0 sm:flex-1"
              aria-label="検索語句で絞り込む"
              value={query}
              maxLength={4096}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="検索語句"
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        すべての条件に一致する結果を表示します。「含む」は大文字・小文字を区別せず、サブフォルダを含む任意の位置に一致します。「完全一致」は大文字・小文字を区別してURLまたは検索語句全体を比較します。
      </p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancel}
          disabled={dirtyCount === 0}
        >
          キャンセル
        </Button>
        <Button size="sm" type="submit" disabled={dirtyCount === 0}>
          絞り込みを適用
          {dirtyCount > 0 ? (
            <Badge variant="secondary" size="sm" className="ml-1">
              {dirtyCount}
            </Badge>
          ) : null}
        </Button>
      </div>
    </form>
  );
}
