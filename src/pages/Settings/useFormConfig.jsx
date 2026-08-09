import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN()}`,
});

/* ---- shared cache ---- */

const TTL_MS = 60 * 1000;
const cache = new Map();

const centreCode = () => {
  try {
    const user = JSON.parse(
      localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
    );
    return String(
      user?.centerCode || user?.CenterCode || user?.center_code || user?.CENTERCODE || ""
    ).trim();
  } catch {
    return "";
  }
};

const keyFor = (formCode) => `${formCode}|${centreCode()}`;

export const clearFormConfigCache = (formCode) => {
  if (!formCode) return cache.clear();
  for (const k of cache.keys()) {
    if (k.startsWith(`${formCode}|`)) cache.delete(k);
  }
};

const fetchConfig = (formCode) =>
  fetch(`${API_BASE_URL}/api/FormConfig/Config/${encodeURIComponent(formCode)}`, {
    headers: authHeaders(),
  })
    .then((res) => res.json().catch(() => ({})))
    .then((json) => {
      const data = json?.data ?? null;
      return data && Array.isArray(data.fields) ? data : null;
    });

/* The in-flight promise is cached, not just the result, so two components
   mounting in the same tick share one request instead of racing. A failed
   request is evicted immediately — otherwise one network blip would pin every
   form to fallback labels for the whole TTL. */
const getConfig = (formCode) => {
  const key = keyFor(formCode);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;

  const promise = fetchConfig(formCode).catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
};

/* ---- blank test ---- */

const valueOf = (field, source) => {
  const src = source || {};
  const keys = [field.payloadKey, field.key, ...(field.aliases || [])];
  for (const k of keys) {
    if (k && Object.prototype.hasOwnProperty.call(src, k)) return src[k];
  }
  return undefined;
};

const isBlank = (field, value) => {
  const v = value === null || value === undefined ? "" : String(value).trim();
  const empties = (field && field.emptyValues) || [""];
  return empties.some((e) => v === e);
};

/* ---- hook ---- */

export function useFormConfig(formCode) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seqRef = useRef(0);

  const load = useCallback(async (opts = {}) => {
    if (opts.force) clearFormConfigCache(formCode);
    if (!formCode) {
      setConfig(null);
      setLoading(false);
      return;
    }
    const seq = ++seqRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await getConfig(formCode);
      if (seq !== seqRef.current) return;
      setConfig(data);
    } catch (err) {
      if (seq !== seqRef.current) return;
      console.error("[useFormConfig] load failed:", err?.message || err);
      setError("Could not load the form configuration.");
      setConfig(null);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [formCode]);

  useEffect(() => {
    load();
  }, [load]);

  const byKey = useMemo(() => {
    const map = new Map();
    (config?.fields || []).forEach((f) => map.set(f.key, f));
    return map;
  }, [config]);

  const field = useCallback((key) => byKey.get(key) || null, [byKey]);

  const labelOf = useCallback(
    (key, fallback = "") => {
      const f = byKey.get(key);
      return (f && f.label) || fallback;
    },
    [byKey]
  );

  const isMandatory = useCallback(
    (key) => {
      const f = byKey.get(key);
      return f ? !!f.mandatory : false;
    },
    [byKey]
  );

  const isVisible = useCallback(
    (key) => {
      const f = byKey.get(key);
      return f ? !!f.visible : true;
    },
    [byKey]
  );

  const validate = useCallback(
    (values) => {
      const source = values || {};
      const missing = (config?.fields || [])
        .filter((f) => f.mandatory && f.visible && !f.readOnly)
        .filter((f) => isBlank(f, valueOf(f, source)))
        .map((f) => ({ key: f.key, label: f.label }));

      if (missing.length === 0) return { ok: true, missing: [], message: "" };

      return {
        ok: false,
        missing,
        message: `Please complete the required field${
          missing.length > 1 ? "s" : ""
        }: ${missing.map((m) => m.label).join(", ")}.`,
      };
    },
    [config]
  );

  return {
    config,
    fields: config?.fields || [],
    loading,
    error,
    reload: load,
    field,
    labelOf,
    isMandatory,
    isVisible,
    validate,
  };
}

export default useFormConfig;