import { fetchUserData, type DataforseoUserData } from "./appendix";
import { AppError } from "@/server/lib/errors";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";

const USAGE_CACHE_MS = 60_000;
const RECENT_RESERVATION_MS = 90_000;

type DataforseoUsageWindow = {
  period: string;
  total: number;
};

type DataforseoSafetyLimits = {
  dailySpendUsd: number | null;
  requestsPerMinute: number | null;
};

type DataforseoUsageSnapshot = {
  balanceUsd: number | null;
  depositedUsd: number | null;
  timezone: string | null;
  fetchedAt: string;
  spend: {
    day: DataforseoUsageWindow;
    minute: DataforseoUsageWindow;
  };
  requests: {
    day: DataforseoUsageWindow;
    minute: DataforseoUsageWindow;
  };
  safetyLimits: DataforseoSafetyLimits;
};

type CachedUsage = {
  expiresAt: number;
  snapshot: DataforseoUsageSnapshot;
};

type Reservation = {
  at: number;
  estimatedCostUsd: number;
  requests: number;
};

let cachedUsage: CachedUsage | null = null;
let usageRequest: Promise<DataforseoUsageSnapshot> | null = null;
let reservations: Reservation[] = [];

async function getDataforseoSafetyLimits(): Promise<DataforseoSafetyLimits> {
  const [dailySpend, requestsPerMinute] = await Promise.all([
    getOptionalEnvValue("DATAFORSEO_DAILY_SPEND_LIMIT_USD"),
    getOptionalEnvValue("DATAFORSEO_REQUESTS_PER_MINUTE_LIMIT"),
  ]);

  return {
    dailySpendUsd: parseOptionalLimit(
      "DATAFORSEO_DAILY_SPEND_LIMIT_USD",
      dailySpend,
      false,
    ),
    requestsPerMinute: parseOptionalLimit(
      "DATAFORSEO_REQUESTS_PER_MINUTE_LIMIT",
      requestsPerMinute,
      true,
    ),
  };
}

export async function getDataforseoUsageSnapshot(): Promise<DataforseoUsageSnapshot> {
  const now = Date.now();
  if (cachedUsage && cachedUsage.expiresAt > now) return cachedUsage.snapshot;
  if (usageRequest) return usageRequest;

  usageRequest = loadUsageSnapshot();
  try {
    const snapshot = await usageRequest;
    cachedUsage = { snapshot, expiresAt: now + USAGE_CACHE_MS };
    return snapshot;
  } finally {
    usageRequest = null;
  }
}

/**
 * Secondary safety ceiling before paid provider calls. DataForSEO's own
 * account limits remain the authoritative hard stop; these operator-defined
 * limits fail closed and catch accidental loops before another paid request is
 * dispatched. Recent local reservations cover the provider statistics lag.
 */
export async function enforceDataforseoSafetyLimits(input: {
  estimatedCostUsd: number;
  requests: number;
}): Promise<void> {
  const limits = await getDataforseoSafetyLimits();
  if (limits.dailySpendUsd === null && limits.requestsPerMinute === null)
    return;

  const snapshot = await getDataforseoUsageSnapshot();
  const now = Date.now();
  reservations = reservations.filter(
    (reservation) => now - reservation.at < RECENT_RESERVATION_MS,
  );

  const recentlyReservedCost = reservations.reduce(
    (sum, reservation) => sum + reservation.estimatedCostUsd,
    0,
  );
  const recentlyReservedRequests = reservations.reduce(
    (sum, reservation) => sum + reservation.requests,
    0,
  );

  if (
    limits.dailySpendUsd !== null &&
    snapshot.spend.day.total + recentlyReservedCost + input.estimatedCostUsd >
      limits.dailySpendUsd
  ) {
    throw new AppError(
      "DATAFORSEO_USAGE_LIMIT_EXCEEDED",
      "DataForSEO daily spend safety limit exceeded",
      {
        limitUsd: String(limits.dailySpendUsd),
        spentUsd: String(snapshot.spend.day.total),
      },
    );
  }

  if (
    limits.requestsPerMinute !== null &&
    snapshot.requests.minute.total + recentlyReservedRequests + input.requests >
      limits.requestsPerMinute
  ) {
    throw new AppError(
      "DATAFORSEO_USAGE_LIMIT_EXCEEDED",
      "DataForSEO requests-per-minute safety limit exceeded",
      {
        limit: String(limits.requestsPerMinute),
        used: String(snapshot.requests.minute.total),
      },
    );
  }

  reservations.push({
    at: now,
    estimatedCostUsd: input.estimatedCostUsd,
    requests: input.requests,
  });
}

async function loadUsageSnapshot(): Promise<DataforseoUsageSnapshot> {
  const [account, safetyLimits] = await Promise.all([
    fetchUserData(),
    getDataforseoSafetyLimits(),
  ]);
  if (!account) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "DataForSEO returned no account usage data",
    );
  }

  return buildUsageSnapshot(account, safetyLimits, new Date());
}

function buildUsageSnapshot(
  account: DataforseoUserData,
  safetyLimits: DataforseoSafetyLimits,
  fetchedAt: Date,
): DataforseoUsageSnapshot {
  return {
    balanceUsd: finiteNumber(account.money?.balance),
    depositedUsd: finiteNumber(account.money?.total),
    timezone: account.timezone ?? null,
    fetchedAt: fetchedAt.toISOString(),
    spend: {
      day: buildWindow(account.money?.statistics?.day),
      minute: buildWindow(account.money?.statistics?.minute),
    },
    requests: {
      day: buildWindow(account.rates?.statistics?.day),
      minute: buildWindow(account.rates?.statistics?.minute),
    },
    safetyLimits,
  };
}

function buildWindow(
  statistics: Record<string, unknown> | null | undefined,
): DataforseoUsageWindow {
  const period = statistics?.value;
  const total = readTotal(statistics);
  if (typeof period !== "string" || total === null) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "DataForSEO returned incomplete account usage statistics",
    );
  }

  return {
    period,
    total,
  };
}

function readTotal(
  values: Record<string, unknown> | null | undefined,
): number | null {
  const total = finiteNumber(values?.total);
  if (total !== null) return total;
  if (!values) return null;

  const totals = Object.entries(values).flatMap(([key, value]) => {
    const number = finiteNumber(value);
    return key.startsWith("total_") && number !== null ? [number] : [];
  });
  return totals.length > 0
    ? totals.reduce((sum, value) => sum + value, 0)
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseOptionalLimit(
  name: string,
  value: string | undefined,
  integer: boolean,
): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    parsed <= 0 ||
    (integer && !Number.isInteger(parsed))
  ) {
    throw new Error(
      `${name} must be a positive${integer ? " integer" : " number"}`,
    );
  }
  return parsed;
}
