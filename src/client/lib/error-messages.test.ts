import { describe, expect, it } from "vitest";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

describe("getStandardErrorMessage", () => {
  it("maps known error codes to standard copy", () => {
    expect(getStandardErrorMessage(new Error("PAYMENT_REQUIRED"))).toBe(
      "OpenSEOを利用するには、有効なホスト版サブスクリプションが必要です。",
    );
  });

  it("returns custom messages when the error is not a shared code", () => {
    expect(
      getStandardErrorMessage(new Error("Something failed: try again")),
    ).toBe("Something failed: try again");
  });
});
