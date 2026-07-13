// ============================================================================
// usePermissions.jsx — front-end permission layer for EazyWeek
// UX model (per Marina): buttons stay VISIBLE. On click, if the user's role
// lacks the right, we DON'T run the action — we show a toast:
//   "Your role does not have this right. Contact Admin/Product Team"
// Security is still enforced server-side (403); this is the friendly layer.
//
// Wire once at the app root:  <PermissionProvider><App/></PermissionProvider>
// Then either:
//   const { guard } = usePermissions();
//   <button onClick={() => guard("CASE.CREATE", openCreateCaseForm)}>Create Case</button>
// or the convenience button:
//   <PermissionButton code="CASE.CREATE" onClick={openCreateCaseForm}>Create Case</PermissionButton>
//
// ── INTEGRATION SHIM (match your app, same 3 as RoleMaster.jsx) ──────────────
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../config";

// Use the app-wide backend base (absolute on beta/prod; relative-via-proxy in
// dev). A hardcoded "/api" only worked through the Vite dev proxy — on a built
// static site it hit the frontend host and returned index.html.
const API_BASE = `${API_BASE_URL}/api`;
function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken") || "";
}
function getActiveCentre() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null") || {};
    return u.centerCode || u.CENTERCODE || u.centreCode ||
           localStorage.getItem("centerCode") || localStorage.getItem("activeCentre") || "";
  } catch { return ""; }
}
// ============================================================================

const DENIED_MSG = "Your role does not have this right. Contact Admin/Product Team";
const C = { coral: "#cc6b5c", navyDk: "#071D49" };

const PermCtx = createContext(null);

export function PermissionProvider({ children }) {
  const [state, setState] = useState({ isSuper: false, codes: new Set(), loading: true });
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const load = useCallback(async () => {
    try {
      const centre = getActiveCentre();
      const res = await fetch(`${API_BASE}/Security/me/permissions?centre=${encodeURIComponent(centre)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setState({ isSuper: !!json.data.isSuper, codes: new Set(json.data.codes || []), loading: false });
      } else {
        setState({ isSuper: false, codes: new Set(), loading: false });
      }
    } catch {
      setState({ isSuper: false, codes: new Set(), loading: false });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = useCallback((msg) => {
    setToast(msg || DENIED_MSG);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // has("CODE") or has(["A","B"]) — array means "any of". Super-roles always pass.
  const has = useCallback((codeOrCodes) => {
    if (state.isSuper) return true;
    const codes = Array.isArray(codeOrCodes) ? codeOrCodes : [codeOrCodes];
    return codes.some((c) => state.codes.has(c));
  }, [state]);

  // guard(code, action) → runs action if permitted, else shows the denial toast.
  const guard = useCallback((codeOrCodes, action, deniedMsg) => {
    if (has(codeOrCodes)) { if (typeof action === "function") action(); return true; }
    notify(deniedMsg);
    return false;
  }, [has, notify]);

  const value = { isSuper: state.isSuper, loading: state.loading, has, can: has, guard, notifyDenied: notify, refresh: load };

  return (
    <PermCtx.Provider value={value}>
      {children}
      {toast && <PermToast message={toast} onClose={() => setToast(null)} />}
    </PermCtx.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermCtx);
  if (!ctx) throw new Error("usePermissions must be used inside <PermissionProvider>");
  return ctx;
}

// Visible-always button that guards its own click.
export function PermissionButton({ code, onClick, children, deniedMessage, style, ...rest }) {
  const { guard } = usePermissions();
  return (
    <button {...rest} style={style} onClick={(e) => guard(code, () => onClick && onClick(e), deniedMessage)}>
      {children}
    </button>
  );
}

function PermToast({ message, onClose }) {
  return (
    <div
      onClick={onClose}
      role="alert"
      style={{
        position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
        background: C.coral, color: "#fff", padding: "12px 20px", borderRadius: 10,
        fontFamily: "Lato, system-ui, sans-serif", fontSize: 14, fontWeight: 700,
        boxShadow: "0 10px 30px rgba(7,29,73,.28)", maxWidth: "90vw", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
      }}
    >
      <span style={{ fontSize: 16 }}></span>
      <span>{message}</span>
    </div>
  );
}

export { DENIED_MSG };