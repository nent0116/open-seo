import { beforeEach, describe, expect, it, vi } from "vitest";

const { envValues, fetchUserDataMock } = vi.hoisted(() => ({
  envValues: new Map<string, string>(),
  fetchUserDataMock: vi.fn(),
}));

vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: vi.fn((name: string) => envValues.get(name)),
}));

vi.mock("./appendix", () => ({
  fetchUserData: fetchUserDataMock,
}));

import { getDataforseoUsageSnapshot } from "./usage-limits";

describe("getDataforseoUsageSnapshot", () => {
  beforeEach(() => {
    envValues.clear();
    envValues.set("DATAFORSEO_DAILY_SPEND_LIMIT_USD", "3");
    envValues.set("DATAFORSEO_REQUESTS_PER_MINUTE_LIMIT", "30");
    fetchUserDataMock.mockResolvedValue({
      timezone: "Asia/Tokyo",
      money: {
        balance: 42.5,
        total: 100,
        statistics: {
          day: { value: "2026-10-05", total_serp: 1, total_backlinks: 0.25 },
          minute: { value: "2026-10-05 09:30", total_serp: 0.125 },
        },
      },
      rates: {
        statistics: {
          day: { value: "2026-10-05", total_serp: 100, total_backlinks: 20 },
          minute: { value: "2026-10-05 09:30", total_serp: 4 },
        },
      },
    });
  });

  it("returns normalized usage from the provider wire format", async () => {
    await expect(getDataforseoUsageSnapshot()).resolves.toMatchObject({
      balanceUsd: 42.5,
      depositedUsd: 100,
      timezone: "Asia/Tokyo",
      spend: {
        day: { period: "2026-10-05", total: 1.25 },
        minute: { period: "2026-10-05 09:30", total: 0.125 },
      },
      requests: {
        day: { period: "2026-10-05", total: 120 },
        minute: { period: "2026-10-05 09:30", total: 4 },
      },
      safetyLimits: { dailySpendUsd: 3, requestsPerMinute: 30 },
    });
  });
});
