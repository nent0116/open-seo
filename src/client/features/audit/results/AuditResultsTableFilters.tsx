import {
  DataTableFilterGroup,
  DataTableFilterPanel,
  DataTableFilterToggle,
  DataTableRangeFilter,
  DataTableToolbar,
} from "@/client/components/table/DataTableToolbar";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import type {
  PagesFilters,
  PerformanceFilters,
} from "@/client/features/audit/results/AuditResultsTableFilterLogic";

export function PagesFilterBar({
  filters,
  onChange,
  activeFilterCount,
  onReset,
}: {
  filters: PagesFilters;
  onChange: (filters: PagesFilters) => void;
  activeFilterCount: number;
  onReset: () => void;
}) {
  return (
    <DataTableFilterPanel activeCount={activeFilterCount} onReset={onReset}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <TextFilter
          label="検索"
          value={filters.query}
          placeholder="URL、タイトル、メタ情報"
          onChange={(query) => onChange({ ...filters, query })}
        />
        <SelectFilter
          label="ステータス"
          value={filters.status}
          onChange={(status) => onChange({ ...filters, status })}
          options={[
            ["all", "すべて"],
            ["ok", "2xx"],
            ["redirect", "3xx"],
            ["error", "4xx/5xx"],
            ["missing", "なし"],
          ]}
        />
        <SelectFilter
          label="クロール結果"
          value={filters.fetchClass}
          onChange={(fetchClass) => onChange({ ...filters, fetchClass })}
          options={[
            ["all", "すべて"],
            ["ok", "読取成功"],
            ["error", "失敗"],
            ["blocked", "ブロック"],
            ["rate_limited", "レート制限"],
          ]}
        />
        <SelectFilter
          label="代替テキスト"
          value={filters.missingAlt}
          onChange={(missingAlt) => onChange({ ...filters, missingAlt })}
          options={[
            ["all", "すべて"],
            ["yes", "代替テキストなし"],
            ["no", "代替テキストあり"],
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <RangeFilter
          label="文字数"
          min={filters.minWords}
          max={filters.maxWords}
          onMinChange={(minWords) => onChange({ ...filters, minWords })}
          onMaxChange={(maxWords) => onChange({ ...filters, maxWords })}
        />
        <RangeFilter
          label="速度（ms）"
          min={filters.minResponseMs}
          max={filters.maxResponseMs}
          onMinChange={(minResponseMs) =>
            onChange({ ...filters, minResponseMs })
          }
          onMaxChange={(maxResponseMs) =>
            onChange({ ...filters, maxResponseMs })
          }
        />
      </div>
    </DataTableFilterPanel>
  );
}

export function PerformanceFilterBar({
  filters,
  onChange,
  activeFilterCount,
  onReset,
}: {
  filters: PerformanceFilters;
  onChange: (filters: PerformanceFilters) => void;
  activeFilterCount: number;
  onReset: () => void;
}) {
  return (
    <DataTableFilterPanel activeCount={activeFilterCount} onReset={onReset}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <TextFilter
          label="検索"
          value={filters.query}
          placeholder="URL"
          onChange={(query) => onChange({ ...filters, query })}
        />
        <SelectFilter
          label="デバイス"
          value={filters.device}
          onChange={(device) => onChange({ ...filters, device })}
          options={[
            ["all", "すべて"],
            ["desktop", "パソコン"],
            ["mobile", "モバイル"],
          ]}
        />
        <SelectFilter
          label="ステータス"
          value={filters.status}
          onChange={(status) => onChange({ ...filters, status })}
          options={[
            ["all", "すべて"],
            ["ok", "成功"],
            ["failed", "失敗"],
          ]}
        />
        <TextFilter
          label="最大LCP（秒）"
          value={filters.maxLcpSeconds}
          placeholder="2.5"
          type="number"
          onChange={(maxLcpSeconds) => onChange({ ...filters, maxLcpSeconds })}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <RangeFilter
          label="性能"
          min={filters.minPerf}
          max={filters.maxPerf}
          onMinChange={(minPerf) => onChange({ ...filters, minPerf })}
          onMaxChange={(maxPerf) => onChange({ ...filters, maxPerf })}
        />
        <RangeFilter
          label="SEO"
          min={filters.minSeo}
          max={filters.maxSeo}
          onMinChange={(minSeo) => onChange({ ...filters, minSeo })}
          onMaxChange={(maxSeo) => onChange({ ...filters, maxSeo })}
        />
      </div>
    </DataTableFilterPanel>
  );
}

/** The toolbar above a results table: the filter toggle and the row count. */
export function ResultsTableToolbar({
  showFilters,
  onToggle,
  activeFilterCount,
  resultCount,
  totalCount,
}: {
  showFilters: boolean;
  onToggle: () => void;
  activeFilterCount: number;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <DataTableToolbar
      actions={
        <span className="text-sm tabular-nums text-muted-foreground">
          {resultCount.toLocaleString("ja-JP")}件 / 全
          {totalCount.toLocaleString("ja-JP")}件
        </span>
      }
    >
      <DataTableFilterToggle
        open={showFilters}
        activeCount={activeFilterCount}
        onToggle={onToggle}
      />
    </DataTableToolbar>
  );
}

export function countActiveFilters<TFilters extends Record<string, string>>(
  filters: TFilters,
  emptyFilters: TFilters,
) {
  return Object.keys(filters).reduce((count, key) => {
    const filterKey = key as keyof TFilters;
    return filters[filterKey] !== emptyFilters[filterKey] ? count + 1 : count;
  }, 0);
}

function TextFilter({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
}) {
  return (
    <DataTableFilterGroup label={label}>
      <Input
        aria-label={label}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </DataTableFilterGroup>
  );
}

function RangeFilter({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <DataTableRangeFilter
      label={label}
      min={{ value: min, onChange: (event) => onMinChange(event.target.value) }}
      max={{ value: max, onChange: (event) => onMaxChange(event.target.value) }}
    />
  );
}

function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  const items = options.map(([optionValue, optionLabel]) => ({
    value: optionValue,
    label: optionLabel,
  }));
  return (
    <DataTableFilterGroup label={label}>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DataTableFilterGroup>
  );
}
