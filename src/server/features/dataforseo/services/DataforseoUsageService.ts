import { getDataforseoUsageSnapshot } from "@/server/lib/dataforseo/usage-limits";

export const DataforseoUsageService = {
  getAccountUsage: getDataforseoUsageSnapshot,
};
