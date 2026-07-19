import React, { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL } from "../../../config";
// Place this file at src/pages/Invoice/AdvancePayment.jsx (sibling of index.jsx).
import CustomerSearch from "./CustomerSearch";

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const getCenterCode = () => {
  try {
    const s = localStorage.getItem("user") || sessionStorage.getItem("user");
    return s ? JSON.parse(s).centerCode : "";
  } catch { return ""; }
};

const PAYMENT_MODES = [
  "Cash", "Credit Card", "Debit Card", "Bank Transfer", "Online Payment Gateway", "Cheque",
];

// Which extra fields a method needs (mirrors backend FRD §3.3 validation).
const refLabel = (mode) => {
  const m = (mode || "").toLowerCase().replace(/\s+/g, "");
  if (m === "cheque")                 return "Cheque Number";
  if (m === "banktransfer")           return "Bank Reference Number";
  if (m === "onlinepaymentgateway")   return "Gateway Transaction ID";
  if (m === "creditcard" || m === "debitcard") return "POS Terminal Reference";
  return "";  // Cash
};
const needsBank = (mode) => (mode || "").toLowerCase().replace(/\s+/g, "") === "cheque";

const money = (n) => `SAR ${(Number(n) || 0).toFixed(2)}`;
const round2 = (n) => parseFloat((Number(n) || 0).toFixed(2));
const todayISO = () => new Date().toISOString().slice(0, 10);

const blankRow = () => ({ paymentMode: "Cash", paidAmount: "", reference: "", bankName: "" });

const AdvancePayment = ({ initialCustomer = null, onClose = null }) => {
  const [customer,   setCustomer]   = useState(initialCustomer);
  const [searchMode, setSearchMode] = useState(!(initialCustomer && initialCustomer.custId));
  const [amount,     setAmount]     = useState("");
  const [collDate,   setCollDate]   = useState(todayISO());
  const [remarks,    setRemarks]    = useState("");
  const [payments,   setPayments]   = useState([blankRow()]);

  const [preview,    setPreview]    = useState(null);     // { base, vat, vatRatePct, isTaxable, expiryDate, capExceeded, customerStatus }
  const [previewing, setPreviewing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);     // { msg, type }
  const [done,       setDone]       = useState(null);     // success payload

  const debounceRef = useRef(null);

  const showToast = (msg, type = "error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4500); };

  // ── Live preview when customer + amount are present ─────────────────────────
  const runPreview = useCallback(async (custId, amt) => {
    const centerCode = getCenterCode();
    if (!centerCode || !custId || !(Number(amt) > 0)) { setPreview(null); return; }
    try {
      setPreviewing(true);
      const res = await fetch(`${API_BASE_URL}/api/Advance/Preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({ centerCode, custId, totalAmount: round2(amt) }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json.success ?? true)) setPreview(json.data || json);
      else { setPreview(null); }
    } catch { setPreview(null); }
    finally { setPreviewing(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (customer?.custId && Number(amount) > 0) runPreview(customer.custId, amount);
      else setPreview(null);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [customer, amount, runPreview]);

  // ── Payment row helpers ─────────────────────────────────────────────────────
  const setRow = (i, patch) => setPayments((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setPayments((p) => [...p, blankRow()]);
  const removeRow = (i) => setPayments((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  const paySum    = round2(payments.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0));
  const total     = round2(amount);
  const remaining = round2(total - paySum);
  const sumMatches = total > 0 && paySum === total;

  // ── Validate before enabling Collect ────────────────────────────────────────
  const paymentsValid = payments.every((p) => {
    if (!(Number(p.paidAmount) > 0)) return false;
    const m = (p.paymentMode || "").toLowerCase().replace(/\s+/g, "");
    if (m === "cheque")  return !!p.reference.trim() && !!p.bankName.trim();
    if (refLabel(p.paymentMode)) return !!p.reference.trim();
    return true;
  });
  const canCollect = !!customer?.custId && total > 0 && sumMatches && paymentsValid && !saving;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleCollect = async () => {
    if (!canCollect) return;
    const centerCode = getCenterCode();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Advance/Create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({
          centerCode, custId: customer.custId, totalAmount: total,
          collectionDate: collDate, remarks,
          payments: payments.map((p, i) => ({
            lineNo: i + 1, paymentMode: p.paymentMode, paymentName: p.paymentMode,
            paidAmount: round2(p.paidAmount), reference: p.reference.trim(), bankName: p.bankName.trim(),
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json.success ?? true)) setDone(json.data || json);
      else showToast(json.message || "Failed to collect advance.");
    } catch (e) { showToast(`Network error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const resetAll = () => {
    setCustomer(null); setAmount(""); setCollDate(todayISO()); setRemarks("");
    setPayments([blankRow()]); setPreview(null); setDone(null);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, textAlign: "center", maxWidth: 460, margin: "40px auto" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#071D49" }}>Advance Collected</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#334b71", margin: "10px 0" }}>{done.advanceNum}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "left", margin: "16px 0", fontSize: 13 }}>
            <Stat label="Customer" value={customer?.fullName || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || customer?.custId || "—"} />
            <Stat label="Centre" value={getCenterCode() || "—"} />
            <Stat label="Total Paid" value={money(done.total)} />
            <Stat label="Base" value={money(done.base)} />
            <Stat label={`VAT (${done.vatRatePct}%)`} value={money(done.vat)} />
            <Stat label="Nationality" value={done.customerStatus} />
            <Stat label="Payment Method" value={[...new Set(payments.map(p => p.paymentMode).filter(Boolean))].join(", ") || "—"} />
            <Stat label="Collection Date" value={new Date(collDate).toLocaleDateString()} />
            {done.expiryDate && <Stat label="Valid Until" value={new Date(done.expiryDate).toLocaleDateString()} />}
            {remarks && <Stat label="Remarks" value={remarks} />}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", textAlign: "left", margin: "0 0 14px", lineHeight: 1.5 }}>
            This advance is redeemable against future invoices at {getCenterCode() || "the centre"}, subject to centre policy and the validity date above.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button style={S.btnPrimary} onClick={resetAll}>+ New Advance</button>
            {onClose && <button style={S.btnGhost} onClick={onClose}>Done</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.headerRow}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#071D49" }}>Customer Advance Payment</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Collect a prepaid balance. VAT is posted at collection.</div>
        </div>
        {onClose && (
          <button onClick={onClose} title="Close"
            style={{ border: "none", background: "transparent", fontSize: 22, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Customer */}
      <div style={S.card}>
        {!searchMode && customer?.custId ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#334b71" }}>
                {customer.fullName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.custId}
              </div>
              {customer.status && (
                <span className={`nstatus ${String(customer.status).toLowerCase()}`} style={{ fontWeight: "bold" }}>
                  {customer.status}
                </span>
              )}
              {customer.mobile && <span style={{ fontSize: 12, color: "#64748b" }}>📱 {customer.mobile}</span>}
            </div>
            <button style={S.btnGhost} onClick={() => { setCustomer(null); setSearchMode(true); setPreview(null); }}>
              Change customer
            </button>
          </div>
        ) : (
          <CustomerSearch onCustomerSelect={(c) => { setCustomer(c); if (c?.custId) setSearchMode(false); }} />
        )}
      </div>

      {customer?.custId && (
        <>
          {/* Amount + preview */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Advance Amount</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label style={S.label}>Amount (VAT-inclusive) *</label>
                <input type="number" min={0} step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={S.input} />
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <label style={S.label}>Collection Date *</label>
                <input type="date" value={collDate} onChange={(e) => setCollDate(e.target.value)} style={S.input} />
              </div>
            </div>

            {previewing && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Calculating VAT…</div>}
            {preview && !previewing && (
              <div style={{ marginTop: 14, padding: 12, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
                  <Stat label="Base" value={money(preview.base)} />
                  <Stat label={`VAT (${preview.vatRatePct}%)`} value={money(preview.vat)} />
                  <Stat label="Total" value={money(preview.total ?? total)} />
                  <Stat label="Customer" value={preview.customerStatus} />
                  {!preview.isTaxable && <Stat label="Tax" value="Non-taxable" />}
                  {preview.expiryDate && <Stat label="Expires" value={new Date(preview.expiryDate).toLocaleDateString()} />}
                </div>
                {preview.capExceeded && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px" }}>
                     This exceeds the maximum advance cap of {money(preview.maxCap)}.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payments */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={S.sectionTitle}>Payment Methods</div>
              <button style={S.btnGhost} onClick={addRow}>+ Add Method</button>
            </div>

            {payments.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr auto", gap: 10, alignItems: "end", marginBottom: 10 }}>
                <div>
                  <label style={S.label}>Method</label>
                  <select value={p.paymentMode} onChange={(e) => setRow(i, { paymentMode: e.target.value, reference: "", bankName: "" })} style={S.input}>
                    {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Amount</label>
                  <input type="number" min={0} step="0.01" value={p.paidAmount}
                    onChange={(e) => setRow(i, { paidAmount: e.target.value })} placeholder="0.00" style={S.input} />
                </div>
                <div>
                  {refLabel(p.paymentMode) ? (
                    <>
                      <label style={S.label}>{refLabel(p.paymentMode)} *</label>
                      <input value={p.reference} onChange={(e) => setRow(i, { reference: e.target.value })} style={S.input} />
                      {needsBank(p.paymentMode) && (
                        <input value={p.bankName} onChange={(e) => setRow(i, { bankName: e.target.value })}
                          placeholder="Bank Name *" style={{ ...S.input, marginTop: 6 }} />
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "#94a3b8", paddingBottom: 8 }}>No extra fields</div>
                  )}
                </div>
                <button onClick={() => removeRow(i)} disabled={payments.length === 1}
                  title="Remove" style={{ ...S.btnGhost, color: payments.length === 1 ? "#cbd5e1" : "#cc6b5c", borderColor: "#e5e7eb", padding: "0 12px", height: 38 }}>✕</button>
              </div>
            ))}

            {/* Running total */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 20, marginTop: 6, fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>Paid: <b style={{ color: "#334b71" }}>{money(paySum)}</b></span>
              <span style={{ color: "#64748b" }}>Advance: <b style={{ color: "#334b71" }}>{money(total)}</b></span>
              <span style={{ color: remaining === 0 ? "#166534" : "#b45309" }}>
                {remaining === 0 ? "✓ Balanced" : `Difference: ${money(remaining)}`}
              </span>
            </div>
          </div>

          {/* Remarks + submit */}
          <div style={S.card}>
            <label style={S.label}>Remarks</label>
            <input value={remarks} maxLength={255} onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Advance for upcoming hair treatment package" style={S.input} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button style={S.btnGhost} onClick={resetAll}>Cancel</button>
              <button style={{ ...S.btnPrimary, opacity: canCollect ? 1 : 0.5, cursor: canCollect ? "pointer" : "not-allowed" }}
                disabled={!canCollect} onClick={handleCollect}>
                {saving ? "Collecting…" : "Collect Advance"}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 2000, padding: "12px 16px", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, background: toast.type === "error" ? "#cc6b5c" : "#166534", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: "#334b71" }}>{value || "—"}</div>
  </div>
);

const S = {
  page: { padding: 20, maxWidth: 900, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionTitle: { fontWeight: 800, fontSize: 14, color: "#071D49", marginBottom: 12 },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #ced4da", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#fff", fontFamily: "inherit" },
  btnPrimary: { height: 38, padding: "0 18px", borderRadius: 8, border: "none", background: "#334b71", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGhost: { height: 34, padding: "0 14px", borderRadius: 8, border: "1.5px solid #d0d9e8", background: "#fff", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
};

export default AdvancePayment;