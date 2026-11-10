import { NoObjectGeneratedError } from "ai";
import { AppError } from "@/server/lib/errors";

const OUTPUT_RETRIES = 2;

// The model occasionally ends with text that isn't valid JSON. One deadline
// covers every attempt so retries stay inside the research-setup step.
export async function retryInvalidOutput<T>(
  generate: (abortSignal: AbortSignal) => Promise<T>,
) {
  const abortSignal = AbortSignal.timeout(120_000);
  for (let attempt = 0; ; attempt++) {
    try {
      return await generate(abortSignal);
    } catch (error) {
      // The deadline aborts mid-request with a bare TimeoutError.
      if (abortSignal.aborted)
        throw new AppError(
          "INTERNAL_ERROR",
          "Website research took too long. Please try again.",
        );
      if (
        attempt === OUTPUT_RETRIES ||
        !NoObjectGeneratedError.isInstance(error)
      )
        throw error;
    }
  }
}
