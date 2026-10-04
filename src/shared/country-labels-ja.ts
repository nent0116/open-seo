const JAPANESE_COUNTRY_NAMES = new Intl.DisplayNames(["ja"], {
  type: "region",
});

export function formatJapaneseCountryName(isoCode: string): string {
  const normalizedCode = isoCode.toUpperCase();
  return JAPANESE_COUNTRY_NAMES.of(normalizedCode) ?? normalizedCode;
}
