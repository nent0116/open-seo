import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { QueryState } from "@/client/components/QueryState";
import { SectionHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Progress } from "@/client/components/ui/progress";
import { getDataforseoAccountUsage } from "@/serverFunctions/dataforseoUsage";

const usd = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const integer = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 0,
});

export function DataforseoUsageSettings() {
  const query = useQuery({
    queryKey: ["dataforseoAccountUsage"],
    queryFn: () => getDataforseoAccountUsage(),
    staleTime: 30_000,
  });

  return (
    <section className="space-y-3">
      <SectionHeader
        title="DataForSEO利用状況"
        hint="DataForSEOアカウント全体の利用状況です。最大1分キャッシュされます。"
        action={
          <Button
            variant="ghost"
            size="sm"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw
              data-icon="inline-start"
              className={query.isFetching ? "animate-spin" : undefined}
            />
            更新
          </Button>
        }
      />

      <QueryState
        query={query}
        errorFallback="DataForSEOの利用状況を取得できませんでした。"
      >
        {(result) =>
          result.configured && result.usage ? (
            <UsageContent usage={result.usage} />
          ) : (
            <p className="text-sm text-muted-foreground">
              利用状況を確認するには、先に
              <Link
                to="/help/dataforseo-api-key"
                className="mx-1 text-primary underline-offset-4 hover:underline"
              >
                DataForSEO APIキー
              </Link>
              を設定してください。
            </p>
          )
        }
      </QueryState>
    </section>
  );
}

type Usage = Awaited<ReturnType<typeof getDataforseoAccountUsage>> & {
  configured: true;
};

function UsageContent({ usage }: { usage: NonNullable<Usage["usage"]> }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <UsageStat label="残高" value={formatOptionalUsd(usage.balanceUsd)} />
        <UsageStat
          label="本日の支出"
          value={usd.format(usage.spend.day.total)}
          detail={usage.spend.day.period ?? undefined}
        />
        <UsageStat
          label="直近1分のリクエスト"
          value={`${integer.format(usage.requests.minute.total)}件`}
          detail={usage.requests.minute.period ?? undefined}
        />
      </div>

      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <LimitMeter
          label="1日あたりの支出上限"
          value={usage.spend.day.total}
          limit={usage.safetyLimits.dailySpendUsd}
          format={(value) => usd.format(value)}
        />
        <LimitMeter
          label="1分あたりのリクエスト上限"
          value={usage.requests.minute.total}
          limit={usage.safetyLimits.requestsPerMinute}
          format={(value) => `${integer.format(value)}件`}
        />
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          OpenSEO安全上限：支出
          {formatLimit(usage.safetyLimits.dailySpendUsd, (value) =>
            usd.format(value),
          )}
          ／日、 リクエスト
          {formatLimit(
            usage.safetyLimits.requestsPerMinute,
            (value) => `${integer.format(value)}件`,
          )}
          ／分
        </p>
        <p>
          環境変数
          <code className="mx-1 font-mono">
            DATAFORSEO_DAILY_SPEND_LIMIT_USD
          </code>
          と
          <code className="mx-1 font-mono">
            DATAFORSEO_REQUESTS_PER_MINUTE_LIMIT
          </code>
          で安全上限を設定できます。アカウント全体を確実に停止するため、DataForSEO側の上限も併用してください。
        </p>
        {usage.timezone ? <p>集計タイムゾーン：{usage.timezone}</p> : null}
      </div>
    </div>
  );
}

function UsageStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

function LimitMeter({
  label,
  value,
  limit,
  format,
}: {
  label: string;
  value: number;
  limit: number | null;
  format: (value: number) => string;
}) {
  const percent = limit === null ? 0 : Math.min((value / limit) * 100, 100);
  const state =
    limit === null
      ? "上限未設定"
      : value >= limit
        ? "上限に到達"
        : percent >= 80
          ? "上限に近づいています"
          : `${format(value)}／${format(limit)}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{state}</span>
      </div>
      <Progress value={percent} aria-label={`${label}の使用率`} />
    </div>
  );
}

function formatLimit(
  value: number | null,
  format: (value: number) => string,
): string {
  return value === null ? "未設定" : format(value);
}

function formatOptionalUsd(value: number | null): string {
  return value === null ? "取得できません" : usd.format(value);
}
