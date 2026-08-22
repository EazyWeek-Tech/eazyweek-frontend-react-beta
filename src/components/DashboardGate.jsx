/* ============================================================================
   DashboardGate.jsx — binds the Security "Dashboard" section (DASH.* View
   permissions) to the dashboard pages. Resolved via /api/Security/me/permissions;
   super-roles (Admin / Product Team) always pass.

   Usage on a dashboard page:
     import DashboardGate, { DASHBOARD_VIEW, useDashboardAccess } from "../components/DashboardGate";
     return (
       <DashboardGate code={DASHBOARD_VIEW.OPPORTUNITY}>
         ...existing page...
       </DashboardGate>
     );
   ========================================================================== */
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config"; /* ---- adjust to this file's depth ---- */

/* ---- permission codes (must match SecActivity.ActivityCode) ---- */
export const DASHBOARD_VIEW = {
  /* ---- main dashboard blocks (Dashboard section) ---- */
  FINANCIAL: "DASH.FINANCIAL_VIEW",
  CENTRE_PERFORMANCE: "DASH.CENTRE_PERFORMANCE_VIEW",
  GROWTH_KPIS: "DASH.GROWTH_KPIS_VIEW",
  LTR_FUNNEL: "DASH.LTR_FUNNEL_VIEW",
  LEADS_BY_SOURCE: "DASH.LEADS_BY_SOURCE_VIEW",
  CAMPAIGNS: "DASH.CAMPAIGNS_VIEW",
  LOYALTY: "DASH.LOYALTY_VIEW",
  CASE_OPS: "DASH.CASE_OPS_VIEW",
  /* ---- module dashboards (Dashboard subsection per module) ---- */
  OPPORTUNITY_DASHBOARD: "OPP.DASHBOARD_VIEW",
  APPOINTMENT_DASHBOARD: "APPT.DASHBOARD_VIEW",
  INVOICE_DASHBOARD: "INV.DASHBOARD_VIEW",
  AUDIT_DASHBOARD: "AUD.DASHBOARD_VIEW",
  EINVOICE_DASHBOARD: "EINV.DASHBOARD_VIEW",
};

/* ---- session helpers ---- */
function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    ""
  );
}
function getActiveCentre() {
  let u = {};
  try {
    u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null") || {};
  } catch {
    u = {};
  }
  return (
    u.centerCode ||
    u.CENTERCODE ||
    u.centreCode ||
    localStorage.getItem("centerCode") ||
    localStorage.getItem("activeCentre") ||
    ""
  );
}

/* ---- resolution cache (60s, matches the backend resolver TTL) ---- */
const TTL_MS = 60 * 1000;
let cached = null;
let cachedAt = 0;
let inflight = null;

async function fetchPermissions() {
  const centre = getActiveCentre();
  const res = await fetch(
    `${API_BASE_URL}/api/Security/me/permissions?centre=${encodeURIComponent(centre)}`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok || !json || !json.data) {
    return {
      isSuper: false,
      codes: new Set(),
      error: (json && json.message) || "Could not resolve your permissions.",
    };
  }
  return {
    isSuper: !!json.data.isSuper,
    codes: new Set(json.data.codes || []),
    error: "",
  };
}

export function resolveDashboardAccess() {
  if (cached && Date.now() - cachedAt < TTL_MS) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetchPermissions()
    .then((value) => {
      cached = value;
      cachedAt = Date.now();
      return value;
    })
    .catch(() => {
      const value = { isSuper: false, codes: new Set(), error: "Could not resolve your permissions." };
      cached = value;
      cachedAt = Date.now();
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateDashboardAccess() {
  cached = null;
  cachedAt = 0;
}

/* ---- hook ---- */
export function useDashboardAccess(code) {
  const [state, setState] = useState({
    loading: true,
    allowed: false,
    isSuper: false,
    codes: new Set(),
    error: "",
  });

  useEffect(() => {
    let alive = true;
    resolveDashboardAccess().then((p) => {
      if (!alive) return;
      setState({
        loading: false,
        allowed: p.isSuper || (code ? p.codes.has(code) : true),
        isSuper: p.isSuper,
        codes: p.codes,
        error: p.error,
      });
    });
    return () => {
      alive = false;
    };
  }, [code]);

  const has = (c) => state.isSuper || state.codes.has(c);
  return { ...state, has };
}

/* ---- gate component ---- */
const C = {
  navyDk: "#2b3f73",
  coral: "#cc6b5c",
  bg: "#f4f7fb",
  card: "#ffffff",
  line: "#e5ebf3",
  sub: "#6e7b8f",
};

export default function DashboardGate({ code, title = "This dashboard is restricted", children }) {
  const { loading, allowed, error } = useDashboardAccess(code);

  if (loading) {
    return (
      <div
        style={{
          fontFamily: "Lato, system-ui, sans-serif",
          minHeight: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.sub,
          fontSize: 13,
        }}
      >
        Checking access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div style={{ fontFamily: "Lato, system-ui, sans-serif", background: C.bg, minHeight: "100%" }}>
        <div
          style={{
            maxWidth: 480,
            margin: "80px auto",
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 14,
            padding: "36px 28px",
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 6px", color: C.navyDk }}>{title}</h2>
          <p style={{ color: C.sub, margin: 0 }}>
            You need the Dashboard view permission for this section. Ask an administrator to grant
            it from Role Master &amp; Security.
          </p>
          {error && <p style={{ color: C.coral, fontSize: 12.5, marginTop: 10 }}>{error}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}