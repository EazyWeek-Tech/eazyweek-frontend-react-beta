import { useState, useEffect, useMemo } from "react";

/**
 * Fetches country dial codes from RestCountries API.
 * Replaces the local countriesDial.json file entirely.
 *
 * Returns:
 *   dialOptions      — sorted list of { value, label, isoCode, countryName }
 *   validDialCodes   — Set of valid dial code strings
 *   isoFromDialCode  — (dialCode) => isoCode string (e.g. "+966" → "SA")
 *   maxLengthForIso  — (isoCode) => max digits hint (for maxLength on input)
 *   loading          — bool
 */

// Priority map: when multiple countries share a dial code,
// prefer this ISO code (e.g. +1 → US not CA)
const DIAL_PRIORITY = {
  "+1":   "US",
  "+7":   "RU",
  "+44":  "GB",
  "+61":  "AU",
  "+64":  "NZ",
  "+262": "RE",
  "+358": "FI",
  "+590": "GP",
  "+594": "GF",
  "+596": "MQ",
};

// Known max digit lengths per ISO code (national number, excluding dial code)
// libphonenumber validates the exact format, but this drives the input maxLength
// so the field doesn't accept obviously too-long numbers.
const ISO_MAX_LENGTH = {
  SA: 9,   // Saudi Arabia
  IN: 10,  // India
  US: 10,  // USA
  GB: 10,  // UK
  AE: 9,   // UAE
  PK: 10,  // Pakistan
  BD: 10,  // Bangladesh
  PH: 10,  // Philippines
  EG: 10,  // Egypt
  JO: 9,   // Jordan
  KW: 8,   // Kuwait
  BH: 8,   // Bahrain
  QA: 8,   // Qatar
  OM: 8,   // Oman
  LB: 8,   // Lebanon
  SY: 9,   // Syria
  IQ: 10,  // Iraq
  YE: 9,   // Yemen
  MA: 9,   // Morocco
  TN: 8,   // Tunisia
  LY: 9,   // Libya
  DZ: 9,   // Algeria
  CN: 11,  // China
  JP: 10,  // Japan
  KR: 10,  // South Korea
  AU: 9,   // Australia
  CA: 10,  // Canada
  FR: 9,   // France
  DE: 10,  // Germany
  IT: 10,  // Italy
  ES: 9,   // Spain
  RU: 10,  // Russia
  BR: 11,  // Brazil
  NG: 10,  // Nigeria
  ZA: 9,   // South Africa
  KE: 9,   // Kenya
  GH: 9,   // Ghana
  TR: 10,  // Turkey
  IR: 10,  // Iran
  AF: 9,   // Afghanistan
  NP: 10,  // Nepal
  LK: 9,   // Sri Lanka
  MM: 9,   // Myanmar
  TH: 9,   // Thailand
  VN: 9,   // Vietnam
  ID: 11,  // Indonesia
  MY: 9,   // Malaysia
  SG: 8,   // Singapore
};

const DEFAULT_MAX_LENGTH = 12; // fallback for unknown countries

export const useDialCodes = () => {
  const [raw,     setRaw]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,idd,cca2",
          { cache: "force-cache" }
        );
        if (res.ok) setRaw(await res.json());
      } catch (err) {
        console.error("useDialCodes: failed to fetch", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  // Build dial options from RestCountries data
  const dialOptions = useMemo(() => {
    const seen = new Map(); // dialCode → first entry

    const entries = raw
      .map((c) => {
        const root     = c.idd?.root ?? "";
        const suffixes = c.idd?.suffixes ?? [];
        const dialCode = suffixes.length === 1
          ? `${root}${suffixes[0]}`
          : root;
        if (!dialCode || dialCode === "+") return null;
        return {
          value:       dialCode,
          label:       dialCode,
          isoCode:     c.cca2 ?? "",
          countryName: c.name?.common ?? "",
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.countryName.localeCompare(b.countryName));

    // Deduplicate: keep priority country for shared codes,
    // but still show all countries in the dropdown list
    return entries;
  }, [raw]);

  // Quick lookup set for validation
  const validDialCodes = useMemo(
    () => new Set(dialOptions.map((o) => o.value)),
    [dialOptions]
  );

  /**
   * Returns the best ISO code for a dial code.
   * Uses DIAL_PRIORITY for shared codes (e.g. +1 → US).
   * Falls back to first matching country.
   */
  const isoFromDialCode = useMemo(() => {
    // Build a map: dialCode → [isoCode, ...]
    const map = new Map();
    for (const opt of dialOptions) {
      if (!map.has(opt.value)) map.set(opt.value, []);
      map.get(opt.value).push(opt.isoCode);
    }
    return (dialCode) => {
      if (!dialCode) return "";
      // Check priority override first
      if (DIAL_PRIORITY[dialCode]) return DIAL_PRIORITY[dialCode];
      // Otherwise return first match
      return map.get(dialCode)?.[0] ?? "";
    };
  }, [dialOptions]);

  /**
   * Returns the max digit length for a given ISO code.
   * Used to set maxLength on the mobile input.
   * libphonenumber-js still does the real validation.
   */
  const maxLengthForIso = (isoCode) => ISO_MAX_LENGTH[isoCode] ?? DEFAULT_MAX_LENGTH;

  return { dialOptions, validDialCodes, isoFromDialCode, maxLengthForIso, loading };
};