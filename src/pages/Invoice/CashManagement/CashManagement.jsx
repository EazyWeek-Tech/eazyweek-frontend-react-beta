// src/pages/Invoice/CashManagement/CashManagement.jsx
//
// EazyWeek — Cash Management (sub-module of Invoice)
// 3 tabs: Start of the Day | Bank Drop | End of the Day
// Backend: /api/CashManagement/*  (see cashManagement.routes.js)
//
// Config import is "../../../config" (this file sits 3 levels under src:
// src/pages/Invoice/CashManagement/). It reads the base defensively (API_BASE /
// API_BASE_URL / default) and appends /api, matching the loyalty/security pages.

import { useCallback, useEffect, useMemo, useState } from "react";
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

/* ── C palette / type ────────────────────────────────────────────────────── */
const C = {
  navy: "#334b71",
  navyDk: "#071D49",
  coral: "#cc6b5c",
  gold: "#d4a853",
  slate: "#8da0b8",
  green: "#4a9e8a",
  line: "#e3e8ef",
  bg: "#f6f8fb",
  text: "#2b3648",
  sub: "#6b7890",
  white: "#ffffff",
};
const FONT = "'Lato', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

/* ── helpers ─────────────────────────────────────────────────────────────── */
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

async function apiFetch(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || (json && json.success === false)) {
    const msg = (json && (json.message || json.error)) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json ? json.data : null;
}

const fmtSAR = (v) => {
  const n = Number(v) || 0;
  return `SAR ${n.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtSigned = (v) => {
  const n = Number(v) || 0;
  const s = Math.abs(n).toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "−" : n > 0 ? "+" : ""}${s}`;
};
const todayLabel = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const dateLabel = (d) => {
  if (!d) return todayLabel();
  const dt = new Date(d);
  return isNaN(dt)
    ? String(d)
    : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/* numeric input guard: digits + single dot, no sign, no letters */
const sanitizeAmount = (raw) => {
  let s = String(raw).replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s;
};
const num = (s) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/* ── shared little UI atoms ──────────────────────────────────────────────── */
const Field = ({ label, hint, children, right }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      <label style={{ minWidth: 190, paddingTop: 10, fontWeight: 700, color: C.navy, fontSize: 14 }}>
        {label}
      </label>
      <div style={{ flex: "1 1 240px", minWidth: 220 }}>{children}</div>
      {right ? <div style={{ flex: "1 1 260px", minWidth: 240, color: C.sub, fontSize: 13, paddingTop: 8 }}>{right}</div> : null}
    </div>
    {hint ? <div style={{ marginLeft: 214, marginTop: 4, color: C.sub, fontSize: 12.5 }}>{hint}</div> : null}
  </div>
);

const inputStyle = (readOnly) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  fontFamily: FONT,
  fontSize: 14,
  color: C.text,
  background: readOnly ? "#f1f4f9" : C.white,
  outline: "none",
});

const Btn = ({ kind = "primary", disabled, onClick, children }) => {
  const styles = {
    primary: { background: C.navy, color: "#fff", border: `1px solid ${C.navy}` },
    ghost: { background: "#fff", color: C.navy, border: `1px solid ${C.line}` },
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles[kind],
        padding: "10px 20px",
        borderRadius: 8,
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
};

const Banner = ({ tone = "info", children }) => {
  const tones = {
    info: { bg: "#eef3fb", bd: C.slate, fg: C.navy },
    warn: { bg: "#fdf3ee", bd: C.coral, fg: "#8a3d31" },
    ok: { bg: "#edf7f4", bd: C.green, fg: "#20614f" },
  };
  const t = tones[tone];
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, borderRadius: 10, padding: "12px 16px", fontSize: 13.5, marginBottom: 18 }}>
      {children}
    </div>
  );
};

const Toast = ({ toast }) =>
  !toast ? null : (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 60,
        background: toast.type === "error" ? "#8a3d31" : C.green,
        color: "#fff",
        padding: "12px 18px",
        borderRadius: 10,
        fontFamily: FONT,
        fontSize: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,.18)",
        maxWidth: 420,
      }}
    >
      {toast.msg}
    </div>
  );

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CashManagement({ initialTab }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(initialTab || "sod");
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/CashManagement/Status");
      setStatus(data);
      return data;
    } catch (e) {
      notify(e.message || "Failed to load Cash Management status.", "error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    (async () => {
      const data = await loadStatus();
      if (!data || initialTab) return;
      // Sensible default tab per state.
      if (data.state === "PENDING_EOD") setTab("eod");
      else setTab("sod");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = status ? status.state : null;

  const tabs = [
    { key: "sod", label: "Start of the Day" },
    { key: "bank", label: "Bank Drop" },
    { key: "eod", label: "End of the Day" },
  ];

  return (
    <div style={{ fontFamily: FONT, color: C.text, background: C.bg, minHeight: "100%", padding: 24 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.navyDk, margin: "0 0 4px" }}>Cash Management</h1>
        <div style={{ color: C.sub, fontSize: 13, marginBottom: 18 }}>
          Invoice &rsaquo; Cash Management {status ? `· ${status.centerCode}` : ""}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.line}`, marginBottom: 20 }}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={{
                  padding: "11px 18px",
                  border: "none",
                  borderBottom: active ? `3px solid ${C.coral}` : "3px solid transparent",
                  background: "transparent",
                  color: active ? C.navyDk : C.sub,
                  fontFamily: FONT,
                  fontSize: 14.5,
                  fontWeight: active ? 800 : 600,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: 26, boxShadow: "0 1px 3px rgba(16,24,40,.04)" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Loading…</div>
          ) : !status ? (
            <div style={{ padding: 40, textAlign: "center", color: C.sub }}>
              <div style={{ marginBottom: 14 }}>
                Couldn&rsquo;t load Cash Management status. The service may be unavailable.
              </div>
              <button
                type="button"
                onClick={loadStatus}
                style={{
                  padding: "9px 18px",
                  border: `1px solid ${C.navy}`,
                  borderRadius: 8,
                  background: C.navy,
                  color: C.white,
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          ) : tab === "sod" ? (
            <StartOfDayTab status={status} notify={notify} reload={loadStatus} goTo={setTab} />
          ) : tab === "bank" ? (
            <BankDropTab status={status} notify={notify} reload={loadStatus} goTo={setTab} />
          ) : (
            <EndOfDayTab status={status} notify={notify} reload={loadStatus} goTo={setTab} />
          )}
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1 — START OF THE DAY
   ═══════════════════════════════════════════════════════════════════════════ */
function StartOfDayTab({ status, notify, reload, goTo }) {
  const isOpenToday = status.state === "OPEN_TODAY";
  const isPending = status.state === "PENDING_EOD";

  // Editable form state (only used in NEEDS_SOD)
  const [floatStr, setFloatStr] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const suggestedStart = status.suggestedStartingAmount || 0;
  const suggestedFloat = status.suggestedFloat || 0;

  // Prefill float with suggested value once, for NEEDS_SOD.
  useEffect(() => {
    if (status.state === "NEEDS_SOD") setFloatStr(String(suggestedFloat));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.state]);

  const floatVal = num(floatStr);
  const diff = Math.round((floatVal - suggestedFloat) * 100) / 100;
  const hasDiff = diff !== 0;
  const reasonMissing = hasDiff && !reason.trim();

  const reset = () => {
    setFloatStr(String(suggestedFloat));
    setReason("");
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (floatStr !== "" && floatVal < 0) return notify("Float Amount cannot be negative.", "error");
    if (reasonMissing) return notify("Reason is required when Float differs from the suggested amount.", "error");
    setSubmitting(true);
    try {
      await apiFetch("/CashManagement/StartOfDay", {
        method: "POST",
        body: { floatAmount: floatStr === "" ? 0 : floatVal, floatReason: hasDiff ? reason.trim() : "" },
      });
      notify("Start of the Day completed.");
      await reload();
    } catch (e) {
      notify(e.message || "Could not complete Start of the Day.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* Pending prior-day EOD → force close first */
  if (isPending) {
    return (
      <>
        <Banner tone="warn">
          A previous working day&rsquo;s <strong>End of the Day</strong> (for {dateLabel(status.pendingEod?.shiftDate)}) is still
          pending. It must be completed before a new Start of the Day can begin.
        </Banner>
        <Btn onClick={() => goTo("eod")}>Go to End of the Day</Btn>
      </>
    );
  }

  /* Already started today → read-only confirmation panel (completely uneditable) */
  if (isOpenToday) {
    const sod = status.sod || {};
    const showReason = (sod.floatDifference || 0) !== 0;
    return (
      <div>
        <Banner tone="ok">Start of Day Completed for {dateLabel(sod.shiftDate)}.</Banner>
        <ReadonlyRow label="Date" value={dateLabel(sod.shiftDate)} />
        <ReadonlyRow label="Declared Starting Amount" value={fmtSAR(sod.startingAmount)} />
        <ReadonlyRow label="Declared Float Amount" value={fmtSAR(sod.floatDeclared)} />
        {showReason ? (
          <ReadonlyRow label="Reason for Float Delta" value={sod.floatReason || "—"} />
        ) : null}
        <div style={{ marginTop: 18, color: C.sub, fontSize: 12.5 }}>
          This form is locked for the current shift. Record Bank Drops or close the day from the other tabs.
        </div>
      </div>
    );
  }

  /* NEEDS_SOD → editable form */
  return (
    <div>
      <Field label="Date">
        <input style={inputStyle(true)} value={todayLabel()} readOnly tabIndex={-1} />
      </Field>

      <Field
        label="Starting Amount"
        right='This is the amount in cash in your drawer at the start of your day.'
      >
        <input style={inputStyle(true)} value={fmtSAR(suggestedStart)} readOnly tabIndex={-1} />
      </Field>

      <Field
        label="Float Amount"
        hint={`System-suggested from the previous close: ${fmtSAR(suggestedFloat)}. You may increase, decrease, or set to 0.`}
      >
        <input
          style={inputStyle(false)}
          inputMode="decimal"
          value={floatStr}
          placeholder="0.00"
          onChange={(e) => setFloatStr(sanitizeAmount(e.target.value))}
        />
      </Field>

      {hasDiff ? (
        <Field label="Difference">
          <input
            style={{ ...inputStyle(true), color: diff < 0 ? C.coral : C.green, fontWeight: 700 }}
            value={fmtSigned(diff)}
            readOnly
            tabIndex={-1}
          />
        </Field>
      ) : null}

      <Field label="Reason" hint={hasDiff ? "Mandatory because the Float differs from the suggested amount." : undefined}>
        <textarea
          style={{ ...inputStyle(!hasDiff), minHeight: 70, resize: "vertical", borderColor: touched && reasonMissing ? C.coral : C.line }}
          value={reason}
          disabled={!hasDiff}
          placeholder={hasDiff ? "Reason for the float difference" : "Enabled only when there is a difference"}
          onChange={(e) => setReason(e.target.value)}
        />
        {touched && reasonMissing ? (
          <div style={{ color: C.coral, fontSize: 12.5, marginTop: 4 }}>Reason is required.</div>
        ) : null}
      </Field>

      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <Btn onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</Btn>
        <Btn kind="ghost" onClick={reset} disabled={submitting}>Cancel</Btn>
      </div>
    </div>
  );
}

const ReadonlyRow = ({ label, value }) => (
  <div style={{ display: "flex", gap: 24, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
    <div style={{ minWidth: 210, fontWeight: 700, color: C.navy, fontSize: 14 }}>{label}</div>
    <div style={{ fontSize: 14, color: C.text }}>{value}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2 — BANK DROP / CASH DEPOSIT
   ═══════════════════════════════════════════════════════════════════════════ */
function BankDropTab({ status, notify, reload, goTo }) {
  const openToday = status.state === "OPEN_TODAY";
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [bankName, setBankName] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const loadSummary = useCallback(async () => {
    setBusy(true);
    try {
      const data = await apiFetch("/CashManagement/BankDrop/Summary");
      setSummary(data);
    } catch (e) {
      notify(e.message || "Could not load Bank Drop summary.", "error");
    } finally {
      setBusy(false);
    }
  }, [notify]);

  useEffect(() => {
    if (openToday) loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openToday]);

  if (status.state === "NEEDS_SOD") {
    return (
      <>
        <Banner tone="warn">Complete <strong>Start of the Day</strong> before recording a Bank Drop.</Banner>
        <Btn onClick={() => goTo("sod")}>Go to Start of the Day</Btn>
      </>
    );
  }
  if (status.state === "PENDING_EOD") {
    return (
      <>
        <Banner tone="warn">Complete the pending <strong>End of the Day</strong> before recording a Bank Drop.</Banner>
        <Btn onClick={() => goTo("eod")}>Go to End of the Day</Btn>
      </>
    );
  }

  const available = summary ? summary.availableForDrop : 0;
  const amount = num(amountStr);
  const overAvailable = amount > available + 1e-9;

  const reset = () => {
    setAmountStr("");
    setBankName("");
    setReceiptNo("");
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (amountStr === "" || !(amount > 0)) return notify("Bank Drop Amount is required and must be greater than 0.", "error");
    if (overAvailable) return notify(`Amount exceeds the available Till (${fmtSAR(available)}). Float is excluded.`, "error");
    setSubmitting(true);
    try {
      const res = await apiFetch("/CashManagement/BankDrop", {
        method: "POST",
        body: { dropAmount: amount, bankName: bankName.trim(), receiptNo: receiptNo.trim() },
      });
      notify(`Bank Drop recorded. Remaining available: ${fmtSAR(res.remainingAvailable)}.`);
      reset();
      await loadSummary();
    } catch (e) {
      notify(e.message || "Could not record Bank Drop.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Till breakdown */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <Stat label="Starting Amount" value={fmtSAR(summary?.startingAmount)} />
        <Stat label="Cash Sales (this shift)" value={fmtSAR(summary?.cashSales)} />
        <Stat label="Bank Dropped" value={fmtSAR(summary?.dropTotal)} />
        <Stat label="Available for Bank Drop" value={fmtSAR(available)} highlight />
      </div>
      <div style={{ color: C.sub, fontSize: 12.5, marginBottom: 18 }}>
        Available = Starting Amount + Cash Sales − Bank Drops. Float ({fmtSAR(summary?.floatDeclared)}) is excluded.
      </div>

      <Field label="Date">
        <input style={inputStyle(true)} value={todayLabel()} readOnly tabIndex={-1} />
      </Field>

      <Field label="Bank Drop Amount (Cash Deposit)" hint="Mandatory. Cannot exceed the available Till amount.">
        <input
          style={{ ...inputStyle(false), borderColor: touched && (amount <= 0 || overAvailable) ? C.coral : C.line }}
          inputMode="decimal"
          value={amountStr}
          placeholder="0.00"
          onChange={(e) => setAmountStr(sanitizeAmount(e.target.value))}
        />
        {touched && overAvailable ? (
          <div style={{ color: C.coral, fontSize: 12.5, marginTop: 4 }}>Exceeds available Till ({fmtSAR(available)}).</div>
        ) : null}
      </Field>

      <Field label="Bank Name & Branch" hint="Optional.">
        <input style={inputStyle(false)} value={bankName} maxLength={200} onChange={(e) => setBankName(e.target.value)} />
      </Field>

      <Field label="Receipt No." hint="Optional.">
        <input style={inputStyle(false)} value={receiptNo} maxLength={100} onChange={(e) => setReceiptNo(e.target.value)} />
      </Field>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn onClick={submit} disabled={submitting || busy}>{submitting ? "Submitting…" : "Submit"}</Btn>
        <Btn kind="ghost" onClick={reset} disabled={submitting}>Cancel</Btn>
      </div>

      {/* Today's drops */}
      <div style={{ marginTop: 26 }}>
        <div style={{ fontWeight: 800, color: C.navy, marginBottom: 10 }}>Bank Drops — this shift</div>
        {summary && summary.drops && summary.drops.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: C.sub, borderBottom: `1px solid ${C.line}` }}>
                <th style={{ padding: "8px 6px" }}>Amount</th>
                <th style={{ padding: "8px 6px" }}>Bank Name &amp; Branch</th>
                <th style={{ padding: "8px 6px" }}>Receipt No.</th>
                <th style={{ padding: "8px 6px" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {summary.drops.map((d) => (
                <tr key={d.RECID} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td style={{ padding: "8px 6px", fontWeight: 700 }}>{fmtSAR(d.DROPAMOUNT)}</td>
                  <td style={{ padding: "8px 6px" }}>{d.BANKNAME || "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{d.RECEIPTNO || "—"}</td>
                  <td style={{ padding: "8px 6px", color: C.sub }}>
                    {d.DROPDATE ? new Date(d.DROPDATE).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: C.sub, fontSize: 13 }}>No Bank Drops recorded for this shift yet. Bank Drop is optional.</div>
        )}
      </div>
    </div>
  );
}

const Stat = ({ label, value, highlight }) => (
  <div
    style={{
      flex: "1 1 180px",
      minWidth: 160,
      background: highlight ? "#eef3fb" : "#f8fafc",
      border: `1px solid ${highlight ? C.slate : C.line}`,
      borderRadius: 10,
      padding: "12px 14px",
    }}
  >
    <div style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>{label}</div>
    <div style={{ color: C.navyDk, fontSize: 16, fontWeight: 800 }}>{value}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3 — END OF THE DAY
   ═══════════════════════════════════════════════════════════════════════════ */
function EndOfDayTab({ status, notify, reload, goTo }) {
  const hasOpen = status.state === "OPEN_TODAY" || status.state === "PENDING_EOD";
  const [sugg, setSugg] = useState(null);
  const [busy, setBusy] = useState(false);

  const [tenderStr, setTenderStr] = useState("");
  const [tenderReason, setTenderReason] = useState("");
  const [floatStr, setFloatStr] = useState("");
  const [floatReason, setFloatReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [closed, setClosed] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await apiFetch("/CashManagement/EndOfDay/Suggested");
      setSugg(data);
      setTenderStr(String(data.suggestedTender ?? 0));
      setFloatStr(String(data.suggestedFloat ?? 0));
    } catch (e) {
      notify(e.message || "Could not load End of Day figures.", "error");
    } finally {
      setBusy(false);
    }
  }, [notify]);

  useEffect(() => {
    if (hasOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOpen]);

  if (status.state === "NEEDS_SOD" && !closed) {
    return (
      <>
        <Banner tone="info">There is no open shift to close. Complete <strong>Start of the Day</strong> to begin a shift.</Banner>
        <Btn onClick={() => goTo("sod")}>Go to Start of the Day</Btn>
      </>
    );
  }

  if (closed) {
    return (
      <div>
        <Banner tone="ok">Day closed successfully for {dateLabel(closed.shiftDate)}. The shift is now closed.</Banner>
        <ReadonlyRow label="Declared Tender (Cash)" value={fmtSAR(closed.tenderDeclared)} />
        <ReadonlyRow label="Tender Difference" value={fmtSigned(closed.tenderDifference)} />
        <ReadonlyRow label="Declared Float" value={fmtSAR(closed.floatDeclared)} />
        <ReadonlyRow label="Float Difference" value={fmtSigned(closed.floatDifference)} />
        <div style={{ marginTop: 18, color: C.sub, fontSize: 12.5 }}>
          To resume invoicing on the same day, complete a fresh Start of the Day — your Starting Amount will carry forward
          from this close ({fmtSAR(closed.tenderDeclared)}).
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn onClick={() => goTo("sod")}>Start of the Day</Btn>
        </div>
      </div>
    );
  }

  const suggestedTender = sugg ? sugg.suggestedTender : 0;
  const suggestedFloat = sugg ? sugg.suggestedFloat : 0;

  const tender = num(tenderStr);
  const tenderOver = tender > suggestedTender + 1e-9;
  const tenderDiff = Math.round((tender - suggestedTender) * 100) / 100;
  const tenderHasDiff = tenderDiff !== 0;
  const tenderReasonMissing = tenderHasDiff && !tenderReason.trim();

  const floatVal = num(floatStr);
  const floatDiff = Math.round((floatVal - suggestedFloat) * 100) / 100;
  const floatHasDiff = floatDiff !== 0;
  const floatReasonMissing = floatHasDiff && !floatReason.trim();

  const cancel = () => {
    if (!sugg) return;
    setTenderStr(String(sugg.suggestedTender ?? 0));
    setFloatStr(String(sugg.suggestedFloat ?? 0));
    setTenderReason("");
    setFloatReason("");
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (tenderOver) return notify(`Declared Tender cannot exceed the System Suggested Tender (${fmtSAR(suggestedTender)}).`, "error");
    if (tender < 0 || floatVal < 0) return notify("Declared amounts cannot be negative.", "error");
    if (tenderReasonMissing) return notify("Reason is required for the Tender difference.", "error");
    if (floatReasonMissing) return notify("Reason is required for the Float difference.", "error");
    setSubmitting(true);
    try {
      const res = await apiFetch("/CashManagement/EndOfDay", {
        method: "POST",
        body: {
          tenderDeclared: tender,
          tenderReason: tenderHasDiff ? tenderReason.trim() : "",
          floatDeclared: floatStr === "" ? 0 : floatVal,
          floatReason: floatHasDiff ? floatReason.trim() : "",
        },
      });
      notify("Day closed successfully.");
      setClosed(res);
      await reload();
    } catch (e) {
      notify(e.message || "Could not close the day.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {status.state === "PENDING_EOD" ? (
        <Banner tone="warn">
          Closing the pending shift for {dateLabel(sugg?.shiftDate)}. Complete this before starting a new day.
        </Banner>
      ) : null}

      <Field label="Date">
        <input style={inputStyle(true)} value={dateLabel(sugg?.shiftDate)} readOnly tabIndex={-1} />
      </Field>

      {/* Tender (Cash only) */}
      <SectionTitle>Tender Declaration (Tender: Cash)</SectionTitle>
      <TwoCol>
        <Field label="Tender Declaration">
          <input
            style={{ ...inputStyle(false), borderColor: touched && tenderOver ? C.coral : C.line }}
            inputMode="decimal"
            value={tenderStr}
            onChange={(e) => setTenderStr(sanitizeAmount(e.target.value))}
          />
          {touched && tenderOver ? (
            <div style={{ color: C.coral, fontSize: 12.5, marginTop: 4 }}>
              Cannot exceed System Suggested Tender ({fmtSAR(suggestedTender)}).
            </div>
          ) : null}
        </Field>
        <Field label="System Suggested">
          <input style={inputStyle(true)} value={fmtSAR(suggestedTender)} readOnly tabIndex={-1} />
        </Field>
      </TwoCol>
      <div style={{ color: C.sub, fontSize: 12, marginTop: -6, marginBottom: 14, marginLeft: 214 }}>
        System Suggested Tender = Starting Amount ({fmtSAR(sugg?.startingAmount)}) + Cash Sales ({fmtSAR(sugg?.cashSales)}) − Bank
        Drops ({fmtSAR(sugg?.dropTotal)}).
      </div>
      <TwoCol>
        <Field label="Difference">
          <input
            style={{ ...inputStyle(true), color: tenderDiff < 0 ? C.coral : C.green, fontWeight: 700 }}
            value={fmtSigned(tenderDiff)}
            readOnly
            tabIndex={-1}
          />
        </Field>
        <Field label="Reason">
          <input
            style={{ ...inputStyle(!tenderHasDiff), borderColor: touched && tenderReasonMissing ? C.coral : C.line }}
            value={tenderReason}
            disabled={!tenderHasDiff}
            placeholder={tenderHasDiff ? "Reason for tender difference" : "Enabled only when there is a difference"}
            onChange={(e) => setTenderReason(e.target.value)}
          />
        </Field>
      </TwoCol>

      {/* Float */}
      <SectionTitle>Float Declaration</SectionTitle>
      <TwoCol>
        <Field label="Float Declaration">
          <input
            style={inputStyle(false)}
            inputMode="decimal"
            value={floatStr}
            onChange={(e) => setFloatStr(sanitizeAmount(e.target.value))}
          />
        </Field>
        <Field label="System Suggested">
          <input style={inputStyle(true)} value={fmtSAR(suggestedFloat)} readOnly tabIndex={-1} />
        </Field>
      </TwoCol>
      <TwoCol>
        <Field label="Difference">
          <input
            style={{ ...inputStyle(true), color: floatDiff < 0 ? C.coral : floatDiff > 0 ? C.green : C.text, fontWeight: 700 }}
            value={fmtSigned(floatDiff)}
            readOnly
            tabIndex={-1}
          />
        </Field>
        <Field label="Reason">
          <input
            style={{ ...inputStyle(!floatHasDiff), borderColor: touched && floatReasonMissing ? C.coral : C.line }}
            value={floatReason}
            disabled={!floatHasDiff}
            placeholder={floatHasDiff ? "Reason for float difference" : "Enabled only when there is a difference"}
            onChange={(e) => setFloatReason(e.target.value)}
          />
        </Field>
      </TwoCol>

      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <Btn onClick={submit} disabled={submitting || busy}>{submitting ? "Closing…" : "Submit & Close the Day"}</Btn>
        <Btn kind="ghost" onClick={cancel} disabled={submitting}>Cancel</Btn>
      </div>
    </div>
  );
}

const SectionTitle = ({ children }) => (
  <div style={{ fontWeight: 800, color: C.navyDk, fontSize: 15, margin: "18px 0 12px", paddingBottom: 6, borderBottom: `1px solid ${C.line}` }}>
    {children}
  </div>
);
const TwoCol = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>{children}</div>
);