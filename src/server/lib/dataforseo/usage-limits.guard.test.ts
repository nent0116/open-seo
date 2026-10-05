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

import { enforceDataforseoSafetyLimits } from "./usage-limits";

describe("enforceDataforseoSafetyLimits", () => {
  beforeEach(() => {
    envValues.clear();
    fetchUserDataMock.mockResolvedValue({
      money: {
        statistics: {
          day: { value: "2026-10-05", total_serp: 0.9 },
          minute: { value: "2026-10-05 09:30", total_serp: 0.01 },
        },
      },
      rates: {
        statistics: {
          day: { value: "2026-10-05", total_serp: 100 },
          minute: { value: "2026-10-05 09:30", total_serp: 10 },
        },
      },
    });
  });

  it("blocks a paid call before it would exceed the daily spend limit", async () => {
    envValues.set("DATAFORSEO_DAILY_SPEND_LIMIT_USD", "1");

    await expect(
      enforceDataforseoSafetyLimits({ estimatedCostUsd: 0.2, requests: 1 }),
    ).rejects.toMatchObject({ code: "DATAFORSEO_USAGE_LIMIT_EXCEEDED" });
  });

  it("blocks a batch after the requests-per-minute limit is reached", async () => {
    envValues.set("DATAFORSEO_REQUESTS_PER_MINUTE_LIMIT", "10");

    await expect(
      enforceDataforseoSafetyLimits({ estimatedCostUsd: 0.01, requests: 2 }),
    ).rejects.toMatchObject({ code: "DATAFORSEO_USAGE_LIMIT_EXCEEDED" });
  });
});
