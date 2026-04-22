import { useState, useEffect, useMemo } from "react";

/**
 * Fetches country dial codes from RestCountries API.
 * Replaces the local countriesDial.json file entirely.
 *
 * Returns:
 *   dialOptions  — [{ value: "+966", label: "+966", isoCode: "SA", countryName: "Saudi Arabia" }]
 *   loading      — bool
 */
export const useDialCodes = () => {
  const [raw,     setRaw]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,idd,cca2",
          { cache: "force-cache" }   // cache the response — it rarely changes
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

  const dialOptions = useMemo(() => {
    return raw
      .map((c) => {
        const root     = c.idd?.root ?? "";
        const suffixes = c.idd?.suffixes ?? [];
        // Single suffix → full dial code (e.g. +966); multiple → just root (e.g. +1 for US)
        const dialCode = suffixes.length === 1
          ? `${root}${suffixes[0]}`
          : root;
        return {
          value:       dialCode,
          label:       dialCode,
          isoCode:     c.cca2 ?? "",
          countryName: c.name?.common ?? "",
        };
      })
      .filter((c) => c.value && c.value !== "+")
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  }, [raw]);

  // Quick set for validation
  const validDialCodes = useMemo(
    () => new Set(dialOptions.map((o) => o.value)),
    [dialOptions]
  );

  // Lookup ISO code from dial code (for libphonenumber-js)
  const isoFromDialCode = (dialCode) => {
    const found = dialOptions.find((o) => o.value === dialCode);
    return found?.isoCode ?? "";
  };

  return { dialOptions, validDialCodes, isoFromDialCode, loading };
};