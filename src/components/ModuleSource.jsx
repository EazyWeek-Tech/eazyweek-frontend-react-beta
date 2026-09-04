import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate } from "react-router-dom";

/* ---- configuration ---- */
const MODULE_SOURCE_PATH = "/api/Settings/Centre/ModuleSource";
const NO_ACCESS_MESSAGE = "You do not have access to this module in Eazyweek";
const OWN_MODE = "OWN";
const TOAST_MS = 3200;
const STYLE_ID = "ez-source-toast-styles";

/* ---- fallback while the lookup endpoint is being wired ---- */
const USE_FALLBACK_MODES = true;

const CENTRE_ALIASES = {
  MAXIME: "MXM",
};

const FALLBACK_MODES = {
   BRIGHT: { INVOICE: "INTEGRATION", APPOINTMENT: "INTEGRATION" },
  LNS: { INVOICE: "INTEGRATION", APPOINTMENT: "INTEGRATION" },
  MXM: { INVOICE: "INTEGRATION", APPOINTMENT: "INTEGRATION" },
  INFENI: { INVOICE: "INTEGRATION", APPOINTMENT: "INTEGRATION" },
  SILK: { INVOICE: "INTEGRATION", APPOINTMENT: "INTEGRATION" },
  LNRB: { INVOICE: "OWN", APPOINTMENT: "OWN" }, 
};

const canonicalCentre = (value) => {
  const key = String(value ?? "").trim().toUpperCase();
  return CENTRE_ALIASES[key] || key;
};

const CENTRE_CODE_KEYS = [
  "centreCode",
  "centerCode",
  "CenterCode",
  "CENTERCODE",
  "topCode",
  "TopCode",
  "centre",
  "center",
];

const TOKEN_KEYS = ["ssoToken", "token", "accessToken", "jwt"];

const TOAST_CSS = `
/* ==== module source toast ==== */
.ez-source-toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 12px 16px;
  border-radius: 10px;
  background: #05224c;
  color: #fff;
  font-family: "Inter", system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.35;
  box-shadow: 0 12px 30px rgba(5, 34, 76, 0.28);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 12px);
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.ez-source-toast.is-shown {
  opacity: 1;
  transform: translate(-50%, 0);
}
.ez-source-toast .bx {
  flex: 0 0 auto;
  font-size: 17px;
  color: #dd7766;
}

@media (prefers-reduced-motion: reduce) {
  .ez-source-toast { transition-duration: 0.01ms !important; }
}
`;

const useStyleEffect =
  typeof React.useInsertionEffect === "function" ? React.useInsertionEffect : useEffect;

const useToastStyles = () => {
  useStyleEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement("style");
    tag.id = STYLE_ID;
    tag.appendChild(document.createTextNode(TOAST_CSS));
    document.head.appendChild(tag);
  }, []);
};

/* ---- storage + payload helpers ---- */
const readStorage = (key) => {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage?.getItem(key) || window.localStorage?.getItem(key) || "";
  } catch {
    return "";
  }
};

export const resolveCentreCode = (currentUser, explicit) => {
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  for (const key of CENTRE_CODE_KEYS) {
    const value = currentUser?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const key of CENTRE_CODE_KEYS) {
    const value = readStorage(key);
    if (value.trim()) return value.trim();
  }
  return "";
};

const resolveToken = (currentUser, explicit) => {
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const fromUser = currentUser?.token || currentUser?.accessToken;
  if (typeof fromUser === "string" && fromUser.trim()) return fromUser.trim();
  for (const key of TOKEN_KEYS) {
    const value = readStorage(key);
    if (value.trim()) return value.trim();
  }
  return "";
};

export const normaliseSourceModes = (payload) => {
  const out = {};
  if (!payload) return out;

  const rows = Array.isArray(payload) ? payload : payload.data || payload.modules;
  if (Array.isArray(rows)) {
    rows.forEach((row) => {
      const code = row?.moduleCode ?? row?.MODULECODE ?? row?.module;
      const mode = row?.sourceMode ?? row?.SOURCEMODE ?? row?.mode;
      if (code) out[String(code).trim().toUpperCase()] = String(mode ?? "").trim().toUpperCase();
    });
    return out;
  }

  if (typeof payload === "object") {
    Object.keys(payload).forEach((code) => {
      const mode = payload[code];
      if (typeof mode === "string") out[code.trim().toUpperCase()] = mode.trim().toUpperCase();
    });
  }
  return out;
};

/* ---- context ----
   The default keeps every module open, so a tree rendered without the
   provider behaves exactly as it did before. */
const ModuleSourceContext = createContext({
  modes: {},
  centreCode: "",
  ready: true,
  isLocked: () => false,
  notifyLocked: () => {},
});

export const useModuleSource = () => useContext(ModuleSourceContext);

export const ModuleSourceProvider = ({
  currentUser,
  centreCode,
  moduleSource,
  apiBase = "",
  authToken,
  children,
}) => {
  useToastStyles();

  const [modes, setModes] = useState(() => normaliseSourceModes(moduleSource));
  const [ready, setReady] = useState(() => !!moduleSource);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const centre = useMemo(
    () => resolveCentreCode(currentUser, centreCode),
    [currentUser, centreCode]
  );
  const token = useMemo(() => resolveToken(currentUser, authToken), [currentUser, authToken]);

  useEffect(() => {
    if (moduleSource) {
      setModes(normaliseSourceModes(moduleSource));
      setReady(true);
      return undefined;
    }
    if (!centre) {
      console.warn("[ModuleSource] no centre code resolved — all modules left open");
      setModes({});
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    setReady(false);

    const url = `${apiBase || ""}${MODULE_SOURCE_PATH}/${encodeURIComponent(centre)}`;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    const applyFallback = (reason) => {
      const key = canonicalCentre(centre);
      const fallback = USE_FALLBACK_MODES ? FALLBACK_MODES[key] : null;
      console.warn(
        `[ModuleSource] ${reason} — ${fallback ? `using built-in modes for ${key}` : "all modules left open"}`
      );
      setModes(fallback ? { ...fallback } : {});
      setReady(true);
    };

    fetch(url, { headers, credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body) => {
        if (cancelled) return;
        const next = normaliseSourceModes(body?.data ?? body);
        if (!Object.keys(next).length) {
          applyFallback(`no rows returned for "${centre}"`);
          return;
        }
        setModes(next);
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        applyFallback(`lookup failed for ${url} (${err.message})`);
      });

    return () => {
      cancelled = true;
    };
  }, [centre, moduleSource, apiBase, token]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const notifyLocked = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast(message || NO_ACCESS_MESSAGE);
    toastTimer.current = setTimeout(() => setToast(""), TOAST_MS);
  }, []);

  /* A module is locked when this centre has a row for it that is not OWN.
     No row, no centre, or a failed lookup leaves the module open. */
  const isLocked = useCallback(
    (moduleCode) => {
      const mode = modes[String(moduleCode ?? "").trim().toUpperCase()];
      return !!mode && mode !== OWN_MODE;
    },
    [modes]
  );

  const value = useMemo(
    () => ({ modes, centreCode: centre, ready, isLocked, notifyLocked }),
    [modes, centre, ready, isLocked, notifyLocked]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__ezModuleSource = { centre, canonical: canonicalCentre(centre), modes, ready };
    }
  }, [centre, modes, ready]);

  return (
    <ModuleSourceContext.Provider value={value}>
      {children}
      <div
        className={`ez-source-toast ${toast ? "is-shown" : ""}`}
        role="status"
        aria-live="polite"
      >
        <i className="bx bx-info-circle" />
        <span>{toast}</span>
      </div>
    </ModuleSourceContext.Provider>
  );
};

/* ---- route gate ---- */
export const SourceGate = ({ module, redirectTo = "/dashboard", children }) => {
  const { ready, isLocked, notifyLocked } = useModuleSource();
  const locked = ready && isLocked(module);
  const announced = useRef(false);

  useEffect(() => {
    if (locked && !announced.current) {
      announced.current = true;
      notifyLocked();
    }
    if (!locked) announced.current = false;
  }, [locked, notifyLocked]);

  if (!ready) return null;
  if (locked) return <Navigate to={redirectTo} replace />;
  return children;
};

export { NO_ACCESS_MESSAGE };
export default ModuleSourceProvider;