import { describe, expect, it, vi } from "vitest";

const fetchUserDataMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: vi.fn((name: string) =>
    name === "DATAFORSEO_DAILY_SPEND_LIMIT_USD" ? "1" : undefined,
  ),
}));

vi.mock("./appendix", () => ({
  fetchUserData: fetchUserDataMock,
}));

import { enforceDataforseoSafetyLimits } from "./usage-limits";

describe("enforceDataforseoSafetyLimits with incomplete provider data", () => {
  it("stops paid calls instead of treating missing statistics as zero", async () => {
    fetchUserDataMock.mockResolvedValue({ money: {}, rates: {} });

    await expect(
      enforceDataforseoSafetyLimits({ estimatedCostUsd: 0.01, requests: 1 }),
    ).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });
});
