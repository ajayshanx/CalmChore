"use client";

import { useActionState, useMemo, useState } from "react";
import { updateFamilyTimezone } from "./actions";

const initialState: { error?: string; success?: boolean } = {};

// A short, reliable fallback for browsers/environments without
// Intl.supportedValuesOf — most users will get the full IANA list instead.
const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function TimezoneForm({ timezone }: { timezone: string }) {
  const [state, formAction, pending] = useActionState(updateFamilyTimezone, initialState);
  const [value, setValue] = useState(timezone);

  const options = useMemo(() => {
    type IntlWithSupportedValues = typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    const intl = Intl as IntlWithSupportedValues;
    const zones = intl.supportedValuesOf ? intl.supportedValuesOf("timeZone") : FALLBACK_TIMEZONES;
    return zones.includes(timezone) ? zones : [timezone, ...zones];
  }, [timezone]);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <label className="text-sm font-medium text-calm-text/50" htmlFor="timezone">
        Family timezone
      </label>
      <select
        id="timezone"
        name="timezone"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm"
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || value === timezone}
        className="rounded-lg border border-calm-green/30 px-3 py-1.5 text-sm font-medium text-calm-green disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-calm-green">Saved.</p>}
    </form>
  );
}
