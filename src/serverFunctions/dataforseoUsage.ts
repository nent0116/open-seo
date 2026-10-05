import { createServerFn } from "@tanstack/react-start";
import { DataforseoUsageService } from "@/server/features/dataforseo/services/DataforseoUsageService";
import { AppError } from "@/server/lib/errors";
import {
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getDataforseoAccountUsage = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async () => {
    if (await isHostedServerAuthMode()) {
      throw new AppError("FORBIDDEN");
    }
    if (!(await getOptionalEnvValue("DATAFORSEO_API_KEY"))) {
      return { configured: false as const, usage: null };
    }

    return {
      configured: true as const,
      usage: await DataforseoUsageService.getAccountUsage(),
    };
  });
