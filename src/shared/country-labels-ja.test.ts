import { describe, expect, it } from "vitest";
import {
  LOCATION_OPTIONS,
  getIsoCountryCode,
} from "@/shared/keyword-locations";
import { WEB_SEARCH_COUNTRY_CODES } from "@/shared/prompt-search-countries";
import { formatJapaneseCountryName } from "./country-labels-ja";

describe("formatJapaneseCountryName", () => {
  it("returns Japanese display names", () => {
    expect(formatJapaneseCountryName("JP")).toBe("日本");
    expect(formatJapaneseCountryName("US")).toBe("アメリカ合衆国");
  });

  it("returns Japanese names for every supported country", () => {
    const supportedCodes = new Set([
      ...WEB_SEARCH_COUNTRY_CODES,
      ...LOCATION_OPTIONS.map((option) => getIsoCountryCode(option.code)),
    ]);

    for (const code of supportedCodes) {
      expect(formatJapaneseCountryName(code)).not.toBe(code.toUpperCase());
    }
  });
});
