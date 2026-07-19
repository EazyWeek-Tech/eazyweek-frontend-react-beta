import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const fmt   = (n) => Number(n||0).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtDate = (d) => {
  if (!d) return "";
  const [y,m,day] = new Date(d).toISOString().split("T")[0].split("-");
  return `${day}/${m}/${y}`;
};

// ── CreditNoteRedemption modal ────────────────────────────────────────────────
// Opens when user selects "Credit Note" as payment method in invoice
// SR-067/068/069/070/071/072/079/080
const CreditNoteRedemption = ({ custId, invoiceTotal, onApply, onClose }) => {
  const [creditNotes, setCreditNotes] = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [amount,      setAmount]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!custId) { setLoading(false); return; }
    fetch(`${API_BASE_URL}/api/SalesReturn/AvailableCreditNotes/${custId}`, {
      headers: { Authorization: `Bearer ${TOKEN()}` }
    })
      .then(r => r.json())
      .then(j => setCreditNotes(Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : []))
      .catch(() => setCreditNotes([]))
      .finally(() => setLoading(false));
  }, [custId]);

  const handleApply = () => {
    setError("");
    if (!selected) { setError("Please select a Credit Note."); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0)
      { setError("Please enter a valid redemption amount."); return; }
    if (amt > selected.balance)
      { setError(`CR Note ${selected.creditNoteNum} remaining balance (SAR ${fmt(selected.balance)}) is less than requested amount (SAR ${fmt(amt)}).`); return; }
    if (amt > invoiceTotal)
      { setError(`Redemption amount cannot exceed invoice total (SAR ${fmt(invoiceTotal)}).`); return; }
    onApply({ creditNoteNum: selected.creditNoteNum, recId: selected.recId, amount: amt, balance: selected.balance });
  };

  const maxApply = selected ? Math.min(selected.balance, invoiceTotal) : 0;

  return (
    <div className="popouter" style={{ display:"flex", zIndex:9999 }}>
      <div className="popovrly" onClick={onClose} />
      <div className="popin" style={{ maxWidth:560, width:"95%" }}>
        <div className="popuphdr">
          Apply Credit Note
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>
        <div className="popfrm">
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#334b71" }}>
            Invoice Total: <strong>SAR {fmt(invoiceTotal)}</strong>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:20, color:"#64748b" }}>Loading credit notes…</div>
          ) : creditNotes.length === 0 ? (
            <div style={{ textAlign:"center", padding:20 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
              <p style={{ color:"#64748b", fontSize:14 }}>No valid Credit Notes available for this customer.</p>
              <p style={{ color:"#94a3b8", fontSize:12 }}>Credit Notes may be expired or fully redeemed.</p>
              <button className="seclnk" onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              <p style={{ fontSize:13, fontWeight:600, color:"#334b71", marginBottom:12 }}>
                Select a Credit Note to apply:
              </p>

              {creditNotes.map((cn, idx) => (
                <div key={idx} onClick={() => { setSelected(cn); setAmount(String(Math.min(cn.balance, invoiceTotal))); setError(""); }}
                  style={{
                    border: `2px solid ${selected?.creditNoteNum === cn.creditNoteNum ? "#334b71" : "#e2e8f0"}`,
                    borderRadius:10, padding:"12px 16px", marginBottom:10, cursor:"pointer",
                    background: selected?.creditNoteNum === cn.creditNoteNum ? "#f0f4fa" : "#fff",
                    transition:"all .15s",
                  }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#334b71" }}>{cn.creditNoteNum}</div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                        Issued: {fmtDate(cn.issueDate)} · Expires: {fmtDate(cn.expiryDate)}
                      </div>
                      <div style={{ fontSize:12, color:"#64748b" }}>
                        Original Invoice: {cn.originalInvoice}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, color:"#64748b" }}>Available Balance</div>
                      <div style={{ fontWeight:800, fontSize:18, color:"#2e7d5e" }}>SAR {fmt(cn.balance)}</div>
                    </div>
                  </div>
                </div>
              ))}

              {selected && (
                <div style={{ marginTop:14, padding:"14px 16px", background:"#e6f4ef", borderRadius:10, border:"1px solid #b3d9cc" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#2e7d5e", marginBottom:8 }}>
                    Redemption Amount for {selected.creditNoteNum}
                    <span style={{ fontWeight:400, color:"#64748b", marginLeft:8 }}>
                      (max SAR {fmt(maxApply)})
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <input type="number" min={0.01} max={maxApply} step={0.01}
                      value={amount} onChange={e => { setAmount(e.target.value); setError(""); }}
                      style={{ flex:1, height:40, padding:"0 12px", border:"1.5px solid #b3d9cc", borderRadius:8, fontSize:15, fontWeight:700 }} />
                    <button onClick={() => setAmount(String(maxApply))}
                      style={{ height:40, padding:"0 14px", background:"#334b71", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      Apply Max
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ marginTop:10, padding:"8px 12px", background:"#fdf3f3", border:"1px solid #f0c4c0", borderRadius:8, color:"#b91c1c", fontSize:13 }}>
                   {error}
                </div>
              )}

              <div className="btnbar" style={{ marginTop:18 }}>
                <button className="pribtnblue" onClick={handleApply} disabled={!selected}>
                  Apply Credit Note
                </button>
                <button className="seclnk" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditNoteRedemption;