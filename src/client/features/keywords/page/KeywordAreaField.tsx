import { useState } from "react";
import { SerpLocationChip } from "@/client/components/SerpLocationCombobox";
import { usePrewarmSerpLocations } from "@/client/components/usePrewarmSerpLocations";
import { getIsoCountryCode } from "@/shared/keyword-locations";

type Props = {
  locationCode: number;
  value: string | undefined;
  onChange: (locationName: string | undefined) => void;
};

/**
 * Optional city, county, or region inside the selected country. Empty means
 * national volume. The location list is warmed on first focus, so page views
 * that never use the field cost nothing.
 */
export function KeywordAreaField({ locationCode, value, onChange }: Props) {
  const [focused, setFocused] = useState(false);
  const countryCode = getIsoCountryCode(locationCode);
  usePrewarmSerpLocations(countryCode, focused);

  return (
    <div
      className="min-w-0"
      onFocus={() => setFocused(true)}
      title="市区町村や地域を1つ指定して検索ボリュームを取得します。国全体を対象にする場合は空欄にしてください。"
    >
      <SerpLocationChip
        value={value}
        onChange={onChange}
        countryCode={countryCode}
        label="City"
      />
    </div>
  );
}
