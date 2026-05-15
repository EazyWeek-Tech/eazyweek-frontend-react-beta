import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet  = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const json = await res.json();
  return json.data ?? json;
};
const authPost = async (url, body) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json.data ?? json;
};

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return "";
  const s = typeof d === "string" ? d : new Date(d).toISOString();
  const [y, m, day] = s.split("T")[0].split("-");
  return `${day}/${m}/${y}`;
};

// ── STEP 1 — Recall Invoice button (trigger) is in InvoiceForm, renders modal ──
// ── STEP 2 — Search popup ────────────────────────────────────────────────────
const RecallInvoiceModal = ({ onSelect, onClose, custId }) => {
  const [searchBy,    setSearchBy]    = useState("invoiceNo");
  const [searchValue, setSearchValue] = useState("");
  const [results,     setResults]     = useState([]);
  const [returnedSet, setReturnedSet]  = useState(new Set());
  const [loading,     setLoading]     = useState(false);

  // Default: customer's invoices if custId provided, else 10 most recent
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let data;
        if (custId) {
          data = await authGet(
            `${API_BASE_URL}/api/SalesReturn/SearchInvoices?searchBy=customerNo&searchValue=${encodeURIComponent(custId)}`
          );
        } else {
          data = await authGet(`${API_BASE_URL}/api/SalesReturn/RecentInvoices`);
        }
        const arr = Array.isArray(data) ? data : [];
        setResults(arr);
        // Also fetch return invoices to know which originals are already returned
        try {
          const allData = await authGet(
            `${API_BASE_URL}/api/SalesReturn/SearchInvoices?searchBy=customerNo&searchValue=${encodeURIComponent(custId || "")}&includeReturns=true`
          );
          const returned = new Set(
            (Array.isArray(allData) ? allData : [])
              .filter(i => i.transType === "Return")
              .map(i => i.appointmentId || "")
              .filter(Boolean)
          );
          setReturnedSet(returned);
        } catch { /* non-critical */ }
      } catch { setResults([]); }
      finally { setLoading(false); }
    })();
  }, [custId]);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    setLoading(true);
    try {
      const data = await authGet(
        `${API_BASE_URL}/api/SalesReturn/SearchInvoices?searchBy=${searchBy}&searchValue=${encodeURIComponent(searchValue)}`
      );
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="popouter" style={{ display: "flex", zIndex: 9999 }}>
      <div className="popovrly" onClick={onClose} />
      <div className="popin" style={{ maxWidth: 800, width: "95%" }}>
        <div className="popuphdr">
          Recall Invoice
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>
        <div className="popfrm">
          {/* Search bar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              {["invoiceNo", "customerNo"].map(k => (
                <button key={k} onClick={() => setSearchBy(k)}
                  style={{ padding: "8px 16px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                    background: searchBy === k ? "#334b71" : "#f8fafc",
                    color: searchBy === k ? "#fff" : "#334b71" }}>
                  {k === "invoiceNo" ? "Invoice No." : "Customer No."}
                </button>
              ))}
            </div>
            <input type="text" placeholder={`Search by ${searchBy === "invoiceNo" ? "invoice number" : "customer no / ID"}…`}
              value={searchValue} onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, height: 40, padding: "0 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14 }} />
            <button onClick={handleSearch}
              style={{ height: 40, padding: "0 20px", background: "#334b71", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
              Search
            </button>
          </div>

          {/* Results grid */}
          {loading ? <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>Loading…</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {["Date", "Invoice No.", "Customer Name", "Cust ID", "Cust No.", "Total", "Action"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}>No invoices found.</td></tr>
                  ) : results.map((inv, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px" }}>{fmtDate(inv.invoiceDate)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#334b71" }}>{inv.invoiceNum}</td>
                      <td style={{ padding: "10px 12px" }}>{inv.fullName}</td>
                      <td style={{ padding: "10px 12px" }}>{inv.custId}</td>
                      <td style={{ padding: "10px 12px" }}>{inv.custNo}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(inv.sumTotal)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ display: "inline-flex", gap: 8 }}>
                          <button onClick={() => onSelect(inv, "view")}
                            style={{ padding: "4px 12px", border: "1px solid #334b71", borderRadius: 6, background: "#fff", color: "#334b71", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                            View
                          </button>
                          {returnedSet.has(inv.invoiceNum) ? (
                            <span style={{ padding:"4px 10px", fontSize:11, fontWeight:700, color:"#b91c1c", background:"#fde8e8", border:"1px solid #f0c4c0", borderRadius:6 }}>
                              Returned
                            </span>
                          ) : (
                            <button onClick={() => onSelect(inv, "return")}
                              style={{ padding: "4px 12px", border: "none", borderRadius: 6, background: "#334b71", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                              Return
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── STEP 4 — Return Item Selection ───────────────────────────────────────────
const ReturnItemSelection = ({ invoiceNum, onNext, onCancel }) => {
  const [data,        setData]        = useState(null);
  const [reasons,     setReasons]     = useState([]);
  const [selected,    setSelected]    = useState({});   // lineNo → { qtyReturned, amtReturned }
  const [reason,      setReason]      = useState("");
  const [errors,      setErrors]      = useState({});
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      authGet(`${API_BASE_URL}/api/SalesReturn/InvoiceLines/${encodeURIComponent(invoiceNum)}`),
      authGet(`${API_BASE_URL}/api/SalesReturn/ReturnReasons`),
    ]).then(([inv, rsns]) => {
      setData(inv);
      setReasons(Array.isArray(rsns) ? rsns : []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [invoiceNum]);

  const toggle = (lineNo) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[lineNo]) delete next[lineNo];
      else next[lineNo] = { qtyReturned: "", amtReturned: "" };
      return next;
    });
  };

  const update = (lineNo, field, val) => {
    setSelected(prev => ({ ...prev, [lineNo]: { ...prev[lineNo], [field]: val } }));
    setErrors(prev => { const e = { ...prev }; delete e[`${lineNo}_${field}`]; return e; });
  };

  const validate = () => {
    const errs = {};
    if (!reason) errs.reason = "Please select a reason for return.";
    const checkedLines = Object.keys(selected).map(Number);
    if (!checkedLines.length) errs.lines = "Please select at least one item to return.";
    checkedLines.forEach(lineNo => {
      const line = data.lines.find(l => l.lineNo === lineNo);
      const { qtyReturned, amtReturned } = selected[lineNo];
      const qtyNum = parseInt(qtyReturned);
    if (!qtyReturned || qtyReturned === "")
        errs[`${lineNo}_qtyReturned`] = "Qty to Return is required.";
    else if (String(qtyReturned).includes("."))
        errs[`${lineNo}_qtyReturned`] = "Whole numbers only — decimal values not allowed.";
    else if (isNaN(qtyNum) || qtyNum < 1)
        errs[`${lineNo}_qtyReturned`] = "Qty to Return must be at least 1.";
      else if (parseInt(qtyReturned) > line.availableQty)
        errs[`${lineNo}_qtyReturned`] = `Max ${line.availableQty}`;
      else if (!Number.isInteger(Number(qtyReturned)))
        errs[`${lineNo}_qtyReturned`] = "Whole numbers only.";
      if (!amtReturned || isNaN(amtReturned) || parseFloat(amtReturned) <= 0)
        errs[`${lineNo}_amtReturned`] = "Enter valid amount.";
      else if (parseFloat(amtReturned) > line.availableAmt)
        errs[`${lineNo}_amtReturned`] = `Max ${line.availableAmt.toFixed(2)}`;
      else if (parseFloat(amtReturned) < 0)
        errs[`${lineNo}_amtReturned`] = "Cannot be negative.";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    // SR-037: check all lines are disabled (fully returned)
    const allReturned = data.lines.every(l => l.availableQty <= 0);
    if (allReturned) { setErrors({ lines: "All items on this invoice have already been returned." }); return; }

    const returnLines = Object.keys(selected).map(lineNo => {
      const line = data.lines.find(l => l.lineNo === Number(lineNo));
      return {
        lineNo:       Number(lineNo),
        itemCode:     line.itemCode,
        itemName:     line.itemName,
        itemType:     line.itemType,
        qtyReturned:  parseInt(selected[lineNo].qtyReturned),
        amtReturned:  parseFloat(selected[lineNo].amtReturned),
        salesAmount:  parseFloat(selected[lineNo].amtReturned), // simplified
        taxAmount:    0,
      };
    });
    const totalReturn = returnLines.reduce((s, l) => s + l.amtReturned, 0);
    onNext({ returnLines, totalReturn, reasonCode: reason, invoiceData: data });
  };

  if (loading) return <div className="popfrm" style={{ textAlign: "center", padding: 40 }}>Loading invoice…</div>;
  if (!data)   return <div className="popfrm" style={{ textAlign: "center", padding: 40, color: "red" }}>Failed to load invoice.</div>;

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
        <strong>{data.invoiceNum}</strong> · {fmtDate(data.invoiceDate)} · {data.fullName} · Total: <strong>SAR {fmt(data.sumTotal)}</strong>
      </div>
      <h4 style={{ marginBottom: 10, fontSize: 14, color: "#334b71" }}>Select the item/service to be returned</h4>
      {errors.lines && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>⚠ {errors.lines}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              {["", "No", "Item ID", "Item", "Qty", "Amt Paid", "Qty to Return", "Amt to Return"].map(h => (
                <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.lines.map(line => {
              const isChecked = !!selected[line.lineNo];
              const alreadyReturned = line.availableQty <= 0;
              return (
                <tr key={line.lineNo} style={{ borderBottom: "1px solid #f1f5f9", opacity: alreadyReturned ? 0.5 : 1, background: alreadyReturned ? "#fdf3f3" : undefined }}>
                  <td style={{ padding: "9px 10px" }}>
                    {alreadyReturned
                      ? <span style={{ fontSize:11, fontWeight:700, color:"#b91c1c", background:"#fde8e8", borderRadius:4, padding:"2px 7px" }}>Returned</span>
                      : <input type="checkbox" checked={isChecked} disabled={false}
                          onChange={() => toggle(line.lineNo)} />
                    }
                  </td>
                  <td style={{ padding: "9px 10px" }}>{line.lineNo}</td>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: "#334b71" }}>{line.itemCode}</td>
                  <td style={{ padding: "9px 10px" }}>{line.itemName}</td>
                  <td style={{ padding: "9px 10px" }}>{line.qty}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right" }}>{fmt(line.amtPaid)}</td>
                  <td style={{ padding: "9px 10px" }}>
                    {isChecked ? (
                      <>
                        <input type="number" min={1} max={line.availableQty} step={1}
                          value={selected[line.lineNo]?.qtyReturned || ""}
                          onChange={e => update(line.lineNo, "qtyReturned", e.target.value)}
                          style={{ width: 70, padding: "4px 6px", border: `1.5px solid ${errors[`${line.lineNo}_qtyReturned`] ? "#b91c1c" : "#e2e8f0"}`, borderRadius: 6, fontSize: 13 }} />
                        {errors[`${line.lineNo}_qtyReturned`] && <div style={{ color: "#b91c1c", fontSize: 11 }}>{errors[`${line.lineNo}_qtyReturned`]}</div>}
                      </>
                    ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    {isChecked ? (
                      <>
                        <input type="number" min={0.01} max={line.availableAmt} step={0.01}
                          value={selected[line.lineNo]?.amtReturned || ""}
                          onChange={e => update(line.lineNo, "amtReturned", e.target.value)}
                          style={{ width: 100, padding: "4px 6px", border: `1.5px solid ${errors[`${line.lineNo}_amtReturned`] ? "#b91c1c" : "#e2e8f0"}`, borderRadius: 6, fontSize: 13 }} />
                        {errors[`${line.lineNo}_amtReturned`] && <div style={{ color: "#b91c1c", fontSize: 11 }}>{errors[`${line.lineNo}_amtReturned`]}</div>}
                      </>
                    ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reason */}
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ fontWeight: 700, fontSize: 13, color: "#334b71" }}>Reason for Return: <span style={{ color: "#b91c1c" }}>*</span></label>
        <select value={reason} onChange={e => { setReason(e.target.value); setErrors(p => { const e={...p}; delete e.reason; return e; }); }}
          style={{ height: 38, padding: "0 12px", border: `1.5px solid ${errors.reason ? "#b91c1c" : "#e2e8f0"}`, borderRadius: 8, fontSize: 13, minWidth: 200 }}>
          <option value="">Select reason…</option>
          {reasons.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
        </select>
        {errors.reason && <span style={{ color: "#b91c1c", fontSize: 12 }}>{errors.reason}</span>}
      </div>

      <div className="btnbar" style={{ marginTop: 20 }}>
        <button className="pribtnblue" onClick={handleNext}>Next →</button>
        <button className="seclnk" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

// ── STEP 5 — Refund Payment Method ───────────────────────────────────────────
const RefundPaymentMethod = ({ totalReturn, onFinalize, onBack, onCancel, loading }) => {
  const METHODS = ["Cash", "Card", "Bank Transfer", "Cheque", "Credit Note"];
  const [amounts, setAmounts] = useState({});
  const [error,   setError]   = useState("");

  const entered     = METHODS.reduce((s, m) => s + (parseFloat(amounts[m]) || 0), 0);
  const remaining   = parseFloat((totalReturn - entered).toFixed(2));
  const isBalanced  = Math.abs(remaining) < 0.01;

  const handleFinalize = () => {
    if (!isBalanced) {
      if (entered < totalReturn)
        setError(`Total entered (SAR ${fmt(entered)}) is short by SAR ${fmt(totalReturn - entered)}. Must equal Amount to Return (SAR ${fmt(totalReturn)}).`);
      else
        setError(`Total entered (SAR ${fmt(entered)}) exceeds Amount to Return (SAR ${fmt(totalReturn)}) by SAR ${fmt(entered - totalReturn)}.`);
      return;
    }
    const methods = METHODS.filter(m => parseFloat(amounts[m]) > 0).map(m => ({ method: m, amount: parseFloat(amounts[m]) }));
    if (!methods.length) { setError("Please enter refund amount in at least one payment method."); return; }
    onFinalize(methods);
  };

  return (
    <div>
      <div style={{ background: "#e6f4ef", border: "1px solid #b3d9cc", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: "#2e7d5e", fontSize: 15 }}>Total Amount to Return</span>
        <span style={{ fontWeight: 800, fontSize: 22, color: "#2e7d5e" }}>SAR {fmt(totalReturn)}</span>
      </div>
      <h4 style={{ marginBottom: 14, fontSize: 14, color: "#334b71" }}>Select the payment method for refund</h4>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Payment Method</th>
            <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Amount (SAR)</th>
          </tr>
        </thead>
        <tbody>
          {METHODS.map(m => (
            <tr key={m} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{m}</td>
              <td style={{ padding: "10px 14px", textAlign: "right" }}>
                <input type="number" min={0} step={0.01} placeholder="0.00"
                  value={amounts[m] || ""}
                  onChange={e => { setAmounts(p => ({ ...p, [m]: e.target.value })); setError(""); }}
                  style={{ width: 130, padding: "6px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, textAlign: "right" }} />
              </td>
            </tr>
          ))}
          <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
            <td style={{ padding: "12px 14px", color: isBalanced ? "#2e7d5e" : "#b91c1c" }}>Total Entered</td>
            <td style={{ padding: "12px 14px", textAlign: "right", color: isBalanced ? "#2e7d5e" : "#b91c1c", fontSize: 16 }}>SAR {fmt(entered)}</td>
          </tr>
          {!isBalanced && entered > 0 && (
            <tr>
              <td colSpan={2} style={{ padding: "6px 14px", color: "#b91c1c", fontSize: 12 }}>
                {remaining > 0 ? `Still ${fmt(remaining)} short` : `${fmt(Math.abs(remaining))} over the return amount`}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {error && <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>⚠ {error}</div>}

      <div className="btnbar" style={{ marginTop: 20 }}>
        <button className="pribtnblue" onClick={handleFinalize} disabled={!isBalanced || loading}
          style={{ opacity: (!isBalanced || loading) ? 0.6 : 1, cursor: (!isBalanced || loading) ? "not-allowed" : "pointer" }}>
          {loading ? "Processing…" : "Finalize Return"}
        </button>
        <button className="seclnk" onClick={onBack}>← Back</button>
        <button className="seclnk" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

// ── STEP 6 — Success screen ───────────────────────────────────────────────────
const ReturnSuccess = ({ returnInvoiceNum, creditNoteNum, onClose, returnData, selectedInv }) => {
  const [printing, setPrinting] = useState(false);

  const handlePrintCreditNote = () => {
    if (!creditNoteNum) return;
    const issueDate  = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const fmt = (d) => d.toLocaleDateString("en-GB"); // DD/MM/YYYY
    const totalReturn = returnData?.totalReturn || 0;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>Credit Note — ${creditNoteNum}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
        .cn-box { border: 2px solid #92400e; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }
        .cn-header { text-align: center; margin-bottom: 24px; }
        .cn-title { font-size: 28px; font-weight: 800; color: #92400e; letter-spacing: 1px; }
        .cn-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
        .cn-num { font-size: 18px; font-weight: 700; color: #334b71; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        td:first-child { color: #64748b; font-weight: 600; width: 45%; }
        td:last-child { font-weight: 700; }
        .cn-value { text-align: center; margin: 24px 0; }
        .cn-amount { font-size: 40px; font-weight: 800; color: #92400e; }
        .cn-currency { font-size: 18px; color: #92400e; }
        .cn-footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .cn-validity { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 16px; text-align: center; font-size: 13px; color: #92400e; font-weight: 600; margin-top: 16px; }
      </style>
    </head><body>
      <div class="cn-box">
        <div class="cn-header">
          <div class="cn-title">CREDIT NOTE</div>
          <div class="cn-sub">Eazyweek Clinic Management</div>
        </div>

        <div class="cn-num">${creditNoteNum}</div>

        <table>
          <tr><td>Issued To</td><td>${selectedInv?.fullName || ""}</td></tr>
          <tr><td>Customer ID</td><td>${selectedInv?.custId || ""}</td></tr>
          <tr><td>Issue Date</td><td>${fmt(issueDate)}</td></tr>
          <tr><td>Expiry Date</td><td>${fmt(expiryDate)}</td></tr>
          <tr><td>Original Invoice</td><td>${selectedInv?.invoiceNum || ""}</td></tr>
          <tr><td>Return Invoice</td><td>${returnInvoiceNum || ""}</td></tr>
        </table>

        <div class="cn-value">
          <div style="font-size:13px;color:#64748b;margin-bottom:6px">Credit Note Value</div>
          <span class="cn-currency">SAR </span>
          <span class="cn-amount">${Number(totalReturn).toFixed(2)}</span>
        </div>

        <div class="cn-validity">
          ⏱ Valid until ${fmt(expiryDate)} · Redeemable against future purchases
        </div>

        <div class="cn-footer">
          This credit note is non-transferable and subject to clinic terms and conditions.
        </div>
      </div>
    </body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const handlePrint = async () => {
    if (!returnInvoiceNum) return;
    setPrinting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Invoice/GetInvoiceDetails/${encodeURIComponent(returnInvoiceNum)}`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      const inv  = json.data ?? json;
      const header   = inv.headerJson?.[0] || {};
      const lines    = inv.linesJson    || [];
      const payments = inv.paymentJson  || [];

      const itemRows = lines.map((item, idx) => `
        <tr>
          <td style="border:1px solid #000;padding:6px">${idx+1}</td>
          <td style="border:1px solid #000;padding:6px">${item.itemName}</td>
          <td style="border:1px solid #000;padding:6px">${item.quantity ?? 1}</td>
          <td style="border:1px solid #000;padding:6px">-${Math.abs(item.salesAmount ?? 0).toFixed(2)}</td>
          <td style="border:1px solid #000;padding:6px">-${Math.abs(item.taxamount  ?? 0).toFixed(2)}</td>
          <td style="border:1px solid #000;padding:6px">-${Math.abs(item.finalAmount ?? 0).toFixed(2)}</td>
        </tr>`).join("");

      const payRows = payments.map((p, idx) => `
        <tr>
          <td style="border:1px solid #000;padding:6px">${idx+1}</td>
          <td style="border:1px solid #000;padding:6px">${p.paymentName}</td>
          <td style="border:1px solid #000;padding:6px">-${Math.abs(p.paidAmount ?? 0).toFixed(2)}</td>
        </tr>`).join("");

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <title>Sales Return — ${returnInvoiceNum}</title>
        <style>body{font-family:Arial,sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin:12px 0}</style>
      </head><body>
        <h2 style="text-align:center;color:#7f1d1d">Sales Return</h2>
        <p><strong>Return Invoice No:</strong> ${returnInvoiceNum}</p>
        <p><strong>Original Invoice No:</strong> ${selectedInv?.invoiceNum || ""}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${header.firstName || ""} ${header.lastName || ""} &nbsp; <strong>Mobile:</strong> ${header.mobileNumber || ""}</p>
        <h3>Returned Items</h3>
        <table>
          <thead><tr>
            <th style="border:1px solid #000;padding:6px">No</th>
            <th style="border:1px solid #000;padding:6px">Item</th>
            <th style="border:1px solid #000;padding:6px">Qty</th>
            <th style="border:1px solid #000;padding:6px">Price</th>
            <th style="border:1px solid #000;padding:6px">Tax</th>
            <th style="border:1px solid #000;padding:6px">Total</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <h3>Refund Method</h3>
        <table>
          <thead><tr>
            <th style="border:1px solid #000;padding:6px">No</th>
            <th style="border:1px solid #000;padding:6px">Method</th>
            <th style="border:1px solid #000;padding:6px">Amount</th>
          </tr></thead>
          <tbody>${payRows}</tbody>
        </table>
        <div style="text-align:right;margin-top:12px;font-weight:bold">
          Total Refunded: -${Math.abs(header.sumTotal ?? 0).toFixed(2)} SAR
        </div>
      </body></html>`;

      const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (e) {
      alert("Failed to load invoice for printing: " + e.message);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "30px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <h3 style={{ color: "#2e7d5e", marginBottom: 8 }}>Sales Return Processed</h3>
      <div style={{ background: "#e6f4ef", borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "inline-block", minWidth: 260 }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Return Invoice</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#334b71" }}>{returnInvoiceNum || "—"}</div>
      </div>
      {creditNoteNum && (
        <div style={{ background: "#fef3c7", borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "inline-block", minWidth: 260, marginLeft: 12 }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Credit Note</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#92400e" }}>{creditNoteNum}</div>
        </div>
      )}
      <div className="btnbar" style={{ justifyContent: "center", marginTop: 20 }}>
        <button className="pribtnblue" onClick={handlePrint} disabled={printing}>
          {printing ? "Loading…" : "🖨 Print Return Invoice"}
        </button>
        {creditNoteNum && (
          <button className="pribtnblue" onClick={handlePrintCreditNote}
            style={{ background: "#92400e" }}>
            🖨 Print Credit Note
          </button>
        )}
        <button className="seclnk" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

// ── Main SalesReturn component — renders Recall Invoice button + modal flow ──
const SalesReturn = ({ onClose, custId }) => {
  const [step,         setStep]         = useState("search");   // search | items | refund | done
  const [selectedInv,  setSelectedInv]  = useState(null);
  const [returnData,   setReturnData]   = useState(null);
  const [result,       setResult]       = useState(null);
  const [processing,   setProcessing]   = useState(false);
  const [error,        setError]        = useState("");

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); }
    catch { return {}; }
  };

  const handleSelect = (inv, action) => {
    if (action === "view") {
      window.open(`/invoice-details/${inv.invoiceNum}`, "_blank");
      return;
    }
    setSelectedInv(inv);
    setStep("items");
  };

  const handleItemsNext = (data) => {
    setReturnData(data);
    setStep("refund");
  };

  const handleFinalize = async (refundMethods) => {
    setProcessing(true); setError("");
    try {
      const user = getUser();
      const payload = {
        originalInvoiceNum: selectedInv.invoiceNum,
        custId:             selectedInv.custId,
        centerCode:         user.centerCode || "",
        createdBy:          user.userId || user.employeeCode || "",
        returnLines:        returnData.returnLines,
        refundMethods,
        reasonCode:         returnData.reasonCode,
        invoiceDate:        new Date().toISOString(),
      };
      const res = await authPost(`${API_BASE_URL}/api/SalesReturn/Process`, payload);
      setResult(res);
      setStep("done");
    } catch (e) { setError(e.message || "Failed to process return."); }
    finally { setProcessing(false); }
  };

  const title = { search: "Recall Invoice", items: "Select Items to Return", refund: "Select Refund Method", done: "Return Complete" }[step];

  return (
    <div className="popouter" style={{ display: "flex", zIndex: 9999 }}>
      <div className="popovrly" onClick={step === "done" ? onClose : undefined} />
      <div className="popin" style={{ maxWidth: step === "search" ? 820 : 700, width: "95%", maxHeight: "90vh", overflow: "auto" }}>
        <div className="popuphdr">
          {step !== "search" && step !== "done" && (
            <span style={{ marginRight: 8, cursor: "pointer", fontSize: 16 }} onClick={() => setStep(step === "refund" ? "items" : "search")}>←</span>
          )}
          {title}
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>
        <div className="popfrm">
          {error && <div style={{ background: "#fdf3f3", border: "1px solid #f0c4c0", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", marginBottom: 12, fontSize: 13 }}>⚠ {error}</div>}

          {step === "search" && (
            <RecallInvoiceModal onSelect={handleSelect} onClose={onClose} custId={custId} />
          )}
          {step === "items" && selectedInv && (
            <ReturnItemSelection
              invoiceNum={selectedInv.invoiceNum}
              onNext={handleItemsNext}
              onCancel={onClose}
            />
          )}
          {step === "refund" && returnData && (
            <RefundPaymentMethod
              totalReturn={returnData.totalReturn}
              onFinalize={handleFinalize}
              onBack={() => setStep("items")}
              onCancel={onClose}
              loading={processing}
            />
          )}
          {step === "done" && result && (
            <ReturnSuccess
              returnInvoiceNum={result.returnInvoiceNum}
              creditNoteNum={result.creditNoteNum}
              onClose={onClose}
              selectedInv={selectedInv}
              returnData={returnData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReturn;