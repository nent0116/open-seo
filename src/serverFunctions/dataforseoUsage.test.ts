import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAccountUsage, getOptionalEnvValue, isHostedServerAuthMode } =
  vi.hoisted(() => ({
    getAccountUsage: vi.fn(),
    getOptionalEnvValue: vi.fn(),
    isHostedServerAuthMode: vi.fn(),
  }));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    middleware: () => ({ handler: (handler: () => unknown) => handler }),
  }),
}));

vi.mock("@/serverFunctions/middleware", () => ({
  requireAuthenticatedContext: [],
}));

vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue,
  isHostedServerAuthMode,
}));

vi.mock("@/server/lib/dataforseo/usage-limits", () => ({
  getDataforseoUsageSnapshot: getAccountUsage,
}));

import { getDataforseoAccountUsage } from "./dataforseoUsage";

describe("getDataforseoAccountUsage", () => {
  beforeEach(() => {
    isHostedServerAuthMode.mockResolvedValue(false);
    getOptionalEnvValue.mockResolvedValue("configured");
    getAccountUsage.mockResolvedValue({ balanceUsd: 10 });
  });

  it("does not expose the shared provider account to hosted users", async () => {
    isHostedServerAuthMode.mockResolvedValue(true);

    await expect(getDataforseoAccountUsage()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getAccountUsage).not.toHaveBeenCalled();
  });

  it("reports an unconfigured self-host without calling DataForSEO", async () => {
    getOptionalEnvValue.mockResolvedValue(undefined);

    await expect(getDataforseoAccountUsage()).resolves.toEqual({
      configured: false,
      usage: null,
    });
    expect(getAccountUsage).not.toHaveBeenCalled();
  });

  it("returns the self-hosted account usage snapshot", async () => {
    await expect(getDataforseoAccountUsage()).resolves.toEqual({
      configured: true,
      usage: { balanceUsd: 10 },
    });
  });
});
