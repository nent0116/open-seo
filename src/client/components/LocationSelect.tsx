import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/client/components/ui/combobox";
import { useMemo } from "react";
import { formatJapaneseCountryName } from "@/shared/country-labels-ja";
import {
  getIsoCountryCode,
  LOCATION_OPTIONS,
} from "@/shared/keyword-locations";

type SourceLocationOption = (typeof LOCATION_OPTIONS)[number];
type LocationOption = SourceLocationOption & { originalLabel: string };

type Props = {
  value: number;
  onChange: (locationCode: number) => void;
  /** Defaults to the full country list. Pass a subset (e.g. Labs-only). */
  options?: readonly SourceLocationOption[];
  /** Width utilities for the field. Defaults to full width. */
  className?: string;
};

function matches(option: LocationOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    option.label.toLowerCase().includes(needle) ||
    option.originalLabel.toLowerCase().includes(needle) ||
    option.shortLabel.toLowerCase().includes(needle)
  );
}

/** Searchable country picker: type to filter the country list. */
export function LocationSelect({
  value,
  onChange,
  options = LOCATION_OPTIONS,
  className = "w-full",
}: Props) {
  const localizedOptions = useMemo<LocationOption[]>(
    () =>
      options.map((option) => ({
        ...option,
        originalLabel: option.label,
        label: formatJapaneseCountryName(getIsoCountryCode(option.code)),
      })),
    [options],
  );
  const selected =
    localizedOptions.find((option) => option.code === value) ?? null;

  return (
    <Combobox
      items={localizedOptions}
      value={selected}
      itemToStringLabel={(option) => option.label}
      autoHighlight
      filter={matches}
      onValueChange={(option) => {
        if (option) onChange(option.code);
      }}
    >
      <ComboboxInput
        className={className}
        placeholder="国を選択"
        aria-label="国"
      />
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
