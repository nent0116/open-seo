import { z } from "zod";
import { dataforseoGet } from "@/server/lib/dataforseo/core";
import { AppError } from "@/server/lib/errors";
import {
  assertOk,
  type DataforseoTaskLike,
} from "@/server/lib/dataforseo/envelope";

/**
 * Account snapshot from the free GET /v3/appendix/user_data. Every field is
 * optional on the wire; `money.statistics.day` / `.minute` group spend by
 * function under `total_<function>` keys, so those stay untyped records.
 */
const usageWindowsSchema = z.looseObject({
  day: z.record(z.string(), z.unknown()).nullish(),
  minute: z.record(z.string(), z.unknown()).nullish(),
});

const dataforseoUserDataSchema = z.looseObject({
  login: z.string().nullish(),
  timezone: z.string().nullish(),
  rates: z
    .looseObject({
      limits: usageWindowsSchema.nullish(),
      statistics: usageWindowsSchema.nullish(),
    })
    .nullish(),
  money: z
    .looseObject({
      total: z.number().nullish(),
      balance: z.number().nullish(),
      limits: usageWindowsSchema.nullish(),
      statistics: usageWindowsSchema.nullish(),
    })
    .nullish(),
});

export type DataforseoUserData = z.infer<typeof dataforseoUserDataSchema>;

/**
 * Reads account spend + balance from DataForSEO's free GET
 * /v3/appendix/user_data. This is the standard, non-billable way to inspect
 * cost — unlike the other billing scripts, it does NOT make a live billable
 * call to observe spend, so there is nothing to meter and it is deliberately
 * NOT wired through meterDataforseoCall / client.ts.
 *
 * The result carries `money.total` (lifetime deposited), `money.balance`
 * (remaining), and `money.statistics.day` / `.minute` — spend grouped by
 * function (serp, keywords_data, backlinks, dataforseo_labs, on_page,
 * business_data, …) for the rolling day / minute window.
 */
export async function fetchUserData(): Promise<DataforseoUserData | undefined> {
  const response = await dataforseoGet<
    DataforseoTaskLike & { result?: DataforseoUserData[] }
  >("/v3/appendix/user_data");

  // Validates top-level + task status; the call is free so there is no billing
  // envelope to build.
  const task = assertOk(response);

  const rawResult = task.result?.[0];
  if (rawResult === undefined) return undefined;

  const result = dataforseoUserDataSchema.safeParse(rawResult);
  if (!result.success) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "DataForSEO returned invalid account usage data",
    );
  }

  return result.data;
}
