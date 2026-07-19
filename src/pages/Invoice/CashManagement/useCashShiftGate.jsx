// src/pages/Invoice/CashManagement/useCashShiftGate.jsx
//
// Reusable gate that enforces the FRD invoice-blocking rule on the frontend:
//   "Any transaction related to invoice cannot start unless the user has
//    performed Start of the Day for that shift."
//
// Usage in the invoice "New" flow (e.g. Invoice index / list "New Invoice" button):
//
//   import { useCashShiftGate, CashShiftBlockingPopup } from "./CashManagement/useCashShiftGate";
//   ...
//   const gate = useCashShiftGate();          // { canInvoice, checking, ensureCanInvoice, popup, closePopup }
//   ...
//   const onNewInvoice = async () => {
//     const ok = await gate.ensureCanInvoice();   // shows the pop-up itself if blocked
//     if (ok) navigate("/invoice/new");           // your real create route
//   };
//   ...
//   <CashShiftBlockingPopup gate={gate} cashManagementPath="/invoice/cash-management" />
//
// The pop-up matches CM-BUS-004/005/006: title "Complete Start of the Day /
// Centre Opening Activity", buttons "Ok" and "Proceed to Start of the Day".

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as appConfig from "../../../config";

const API_ROOT = (
  appConfig.API_BASE ||
  appConfig.API_BASE_URL ||
  appConfig.default ||
  ""
).replace(/\/$/, "");
// Backend routes mount under /api (app.use("/api", cashRoutes)). The config
// export is the bare host, so append /api here — same as the loyalty/security pages.
const API_BASE = `${API_ROOT}/api`;

const token = () => {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("ssoToken") ||
      ""
    );
  } catch {
    return "";
  }
};

async function fetchStatus() {
  const res = await fetch(`${API_BASE}/CashManagement/Status`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.success === false)) {
    throw new Error((json && json.message) || `Request failed (${res.status})`);
  }
  return json ? json.data : null;
}

export function useCashShiftGate() {
  const [checking, setChecking] = useState(false);
  const [popup, setPopup] = useState(false);
  const [pendingEod, setPendingEod] = useState(null);
  const [lastState, setLastState] = useState(null);

  // Returns true if invoicing is allowed; otherwise opens the blocking pop-up.
  const ensureCanInvoice = useCallback(async () => {
    setChecking(true);
    try {
      const s = await fetchStatus();
      setLastState(s ? s.state : null);
      const ok = !!(s && s.canInvoice);
      if (!ok) {
        setPendingEod(s && s.pendingEod ? s.pendingEod : null);
        setPopup(true);
      }
      return ok;
    } catch {
      // Fail safe: block invoicing if we can't confirm an open shift.
      setPendingEod(null);
      setPopup(true);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  const closePopup = useCallback(() => setPopup(false), []);

  return { checking, popup, pendingEod, lastState, ensureCanInvoice, closePopup };
}

const C = {
  navy: "#334b71",
  navyDk: "#071D49",
  coral: "#cc6b5c",
  slate: "#8da0b8",
  line: "#e3e8ef",
  sub: "#6b7890",
  white: "#ffffff",
};
const FONT = "'Lato', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

export function CashShiftBlockingPopup({ gate, cashManagementPath = "/invoice/cash-management" }) {
  const navigate = useNavigate();
  if (!gate || !gate.popup) return null;

  const pending = gate.pendingEod;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,29,73,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: FONT,
      }}
    >
      <div style={{ width: 440, maxWidth: "92vw", background: C.white, borderRadius: 14, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.navyDk, marginBottom: 10 }}>
          Complete Start of the Day / Centre Opening Activity
        </div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.5, marginBottom: 20 }}>
          {pending ? (
            <>
              A previous working day&rsquo;s End of the Day is still pending. Please complete the End of the Day, then start a new
              day before creating an invoice.
            </>
          ) : (
            <>You must complete Start of the Day for the current shift before creating an invoice.</>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            type="button"
            onClick={gate.closePopup}
            style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${C.line}`, background: "#fff", color: C.navy, fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Ok
          </button>
          <button
            type="button"
            onClick={() => {
              gate.closePopup();
              // Land on Cash Management; EOD first if a prior day is pending, else SOD.
              navigate(cashManagementPath, { state: { initialTab: pending ? "eod" : "sod" } });
            }}
            style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${C.navy}`, background: C.navy, color: "#fff", fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            {pending ? "Proceed to End of the Day" : "Proceed to Start of the Day"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default useCashShiftGate;