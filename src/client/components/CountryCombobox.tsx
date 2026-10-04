import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/client/components/ui/combobox";
import {
  getIsoCountryCode,
  LOCATION_OPTIONS,
} from "@/shared/keyword-locations";
import { formatJapaneseCountryName } from "@/shared/country-labels-ja";

type SourceLocationOption = (typeof LOCATION_OPTIONS)[number];
type LocationOption = SourceLocationOption & { originalLabel: string };

const LOCALIZED_LOCATION_OPTIONS: LocationOption[] = LOCATION_OPTIONS.map(
  (option) => ({
    ...option,
    originalLabel: option.label,
    label: formatJapaneseCountryName(getIsoCountryCode(option.code)),
  }),
);

// Matches the start of the name or of any word in it, so "uni" finds United
// States, not Tunisia, and "united states" still finds United States.
function matchesCountry(option: LocationOption, query: string) {
  const needle = query.trim().toLowerCase();
  const label = option.originalLabel.toLowerCase();
  const localizedLabel = option.label.toLowerCase();
  return (
    localizedLabel.includes(needle) ||
    label.startsWith(needle) ||
    label.split(/[\s-]+/).some((word) => word.startsWith(needle)) ||
    option.shortLabel.toLowerCase().startsWith(needle)
  );
}

/** A searchable country picker. `value` is a DataForSEO location code. */
export function CountryCombobox({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number;
  onChange: (locationCode: number) => void;
}) {
  const country =
    LOCALIZED_LOCATION_OPTIONS.find((option) => option.code === value) ?? null;

  return (
    <Combobox
      items={LOCALIZED_LOCATION_OPTIONS}
      value={country}
      itemToStringLabel={(option) => option.label}
      autoHighlight
      filter={matchesCountry}
      onValueChange={(option) => {
        if (option) onChange(option.code);
      }}
    >
      <ComboboxInput id={id} className="w-full" placeholder="国を検索" />
      <ComboboxContent>
        <ComboboxEmpty>一致する国がありません。</ComboboxEmpty>
        <ComboboxList>
          {(option: LocationOption) => (
            <ComboboxItem key={option.code} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
