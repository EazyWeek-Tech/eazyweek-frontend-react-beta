import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet  = async (url) => { const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => {
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) });
  return r.json();
};

const PromotionModal = ({ items = [], onApply, onClose }) => {
  const [promotions,  setPromotions]  = useState([]);
  const [selected,    setSelected]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [applying,    setApplying]    = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    authGet(`${API_BASE_URL}/api/Discount/ActivePromotions`)
      .then(data => setPromotions(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load promotions."))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setError("");
  };

  const handleApply = async () => {
    if (!selected.length) { setError("Please select at least one promotion."); return; }
    if (!items.length) { setError("No items are added to the cart."); return; }

    setApplying(true); setError("");
    try {
      const res = await authPost(`${API_BASE_URL}/api/Discount/Apply`, {
        invoiceItems:        items,
        selectedDiscountIds: selected,
      });

      if (!res.success && res.data?.success === false) {
        setError(res.data?.message || res.message || "Promotion cannot be applied.");
        return;
      }

      const data = res.data || res;
      if (data.success === false) { setError(data.message || "Promotion cannot be applied."); return; }

      onApply(data);
    } catch (e) {
      setError("Failed to apply promotion. Please try again.");
    } finally { setApplying(false); }
  };

  const typeColor = (type) => type === "Promotion on Item"
    ? { bg:"#e9edf5", color:"#334b71", border:"#c8d5e8" }
    : { bg:"#e6f4ef", color:"#2e7d5e", border:"#b3d9cc" };

  // Build detail string showing type label + value info
  const getDetail = (p) => {
    const val = p.discountValueType === "Percentage"
      ? `${p.discountValue}% off`
      : p.discountValueType === "Amount"
      ? `SAR ${p.discountValue} off`
      : "";

    if (p.discountType === "simple") {
      return { label: "Simple", desc: val, color: "#334b71", bg: "#e9edf5" };
    }
    if (p.discountType === "threshold") {
      const trigger = p.thresholdType === "Minimum Value"
        ? `Min SAR ${p.thresholdValue}`
        : p.thresholdType === "Minimum Quantity"
        ? `Min Qty ${p.thresholdValue}`
        : "";
      return { label: "Threshold", desc: trigger ? `${trigger} → ${val}` : val, color: "#92400e", bg: "#fef9c3" };
    }
    if (p.discountType === "mix") {
      return { label: "Mix & Match", desc: `${p.mixMatchSlots?.length || 0} item slots`, color: "#5b21b6", bg: "#ede9fe" };
    }
    return { label: p.discountType || "—", desc: val, color: "#475569", bg: "#f1f5f9" };
  };

  return (
    <div className="popouter" style={{ display:"flex", zIndex:9999 }}>
      <div className="popovrly" onClick={onClose} />
      <div className="popin" style={{ maxWidth:660, width:"95%", maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div className="popuphdr">
          Active Promotions
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>

        <div className="popfrm" style={{ overflowY:"auto", flex:1 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:30, color:"#64748b" }}>Loading promotions…</div>
          ) : promotions.length === 0 ? (
            <div style={{ textAlign:"center", padding:30 }}>
              <div style={{ fontSize:36, marginBottom:10 }}>️</div>
              <div style={{ fontWeight:700, fontSize:15, color:"#334b71", marginBottom:6 }}>No Active Promotions</div>
              <div style={{ fontSize:13, color:"#64748b" }}>There are no active promotions available for your centre at this time.</div>
              <button className="seclnk" style={{ marginTop:16 }} onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              <p style={{ fontSize:13, color:"#64748b", marginBottom:14 }}>
                Select one or more promotions to apply to this invoice. Promotions are applied in order: item-level first, then invoice-level.
              </p>

              {/* Promotion table */}
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, marginBottom:16 }}>
                <thead>
                  <tr style={{ background:"#f1f5f9" }}>
                    <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0", width:40 }}></th>
                    <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0" }}>Name</th>
                    <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0" }}>Applies To</th>
                    <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0" }}>Type</th>
                    <th style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:12, color:"#475569", borderBottom:"1px solid #e2e8f0" }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map(p => {
                    const isSelected = selected.includes(p.discountId);
                    const tc   = typeColor(p.promotionType);
                    const det  = getDetail(p);
                    return (
                      <tr key={p.discountId}
                        onClick={() => toggle(p.discountId)}
                        style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer",
                          background: isSelected ? "#f0f4fa" : "#fff",
                          transition:"background .1s" }}>
                        <td style={{ padding:"12px 12px" }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggle(p.discountId)}
                            style={{ width:16, height:16, cursor:"pointer" }} />
                        </td>
                        <td style={{ padding:"12px 12px", fontWeight:700, color:"#334b71" }}>
                          {p.discountName}
                          <div style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginTop:2 }}>{p.discountId}</div>
                        </td>
                        <td style={{ padding:"12px 12px" }}>
                          <span style={{ background:tc.bg, color:tc.color, border:`1px solid ${tc.border}`,
                            borderRadius:999, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                            {p.promotionType}
                          </span>
                        </td>
                        <td style={{ padding:"12px 12px" }}>
                          <span style={{ background:det.bg, color:det.color,
                            borderRadius:999, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                            {det.label}
                          </span>
                        </td>
                        <td style={{ padding:"12px 12px", color:"#475569", fontSize:12 }}>
                          {det.desc || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Selected count */}
              {selected.length > 0 && (
                <div style={{ fontSize:12, color:"#2e7d5e", marginBottom:10 }}>
                  ✓ {selected.length} promotion{selected.length > 1 ? "s" : ""} selected
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ padding:"10px 14px", background:"#fdf3f3", border:"1px solid #f0c4c0",
                  borderRadius:8, color:"#b91c1c", fontSize:13, marginBottom:12 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Buttons */}
              <div className="btnbar">
                <button className="pribtnblue" onClick={handleApply} disabled={applying || !selected.length}
                  style={{ opacity: (!selected.length || applying) ? 0.55 : 1 }}>
                  {applying ? "Applying…" : "Apply"}
                </button>
                <button className="seclnk" onClick={onClose}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;