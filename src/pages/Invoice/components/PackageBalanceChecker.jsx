import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authPost = async (url, body) => {
  const r = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}`}, body:JSON.stringify(body) });
  const j = await r.json(); return j.data ?? j;
};
const authGet = async (url) => {
  const r = await fetch(url, { headers:{ Authorization:`Bearer ${TOKEN()}` } });
  const j = await r.json(); return j.data ?? j;
};
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const fmtDate = (d) => { if (!d) return "Never"; const [y,m,day] = new Date(d).toISOString().split("T")[0].split("-"); return `${day}/${m}/${y}`; };

// ── PackageBalanceChecker ────────────────────────────────────────────────────
// Opens after "Check Package Balance" is clicked.
// For each service line in the invoice, checks if customer has a matching package.
// Shows results, lets user pick which service to redeem via package.
const PackageBalanceChecker = ({ customer, items = [], onRedeem, onClose }) => {
  const [results,  setResults]  = useState([]);  // [{ serviceCode, serviceName, packageInfo }]
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  const custId     = customer?.custId || customer?.custid || "";
  const centerCode = getUser().centerCode || "";

  useEffect(() => {
    if (!custId || !centerCode) { setLoading(false); return; }
    (async () => {
      // Only check service-type items — products are consumed at purchase, never redeemable
      // Exclude: explicit product type, OR code starting with PRO- (product code pattern)
      const serviceItems = items.filter(i => {
        if (i._redeemed) return false;
        const code = i.code || i.servicecode || i.itemCode || "";
        const type = (i.type || i.itemType || "").toLowerCase();
        if (type === 'product') return false;          // explicit product type
        if (code.toUpperCase().startsWith('PRO-')) return false; // product code pattern
        if (type === 'package') return false;          // packages not redeemable this way
        return true; // service or unknown — check it
      });

      // Dedupe by service code so the same CheckBalance isn't requested twice
      const seen = new Set();
      const uniqueItems = serviceItems.filter(item => {
        const code = (item.code || item.servicecode || item.itemCode || "").toUpperCase();
        if (!code || seen.has(code)) return false;
        seen.add(code);
        return true;
      });

      if (uniqueItems.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const checks = await Promise.all(
        uniqueItems.map(async (item) => {
          const code = item.code || item.servicecode || item.itemCode || "";
          if (!code) return null;
          try {
            const res = await authPost(`${API_BASE_URL}/api/Package/CheckBalance`, {
              custId, serviceCode: code,
            });
            return {
              serviceCode: code,
              serviceName: item.name || item.itemName || "",
              packageInfo: res.found ? res : null,
            };
          } catch { return null; }
        })
      );
      setResults(checks.filter(Boolean));
      setLoading(false);
    })();
  }, [custId, centerCode]);

  const available = results.filter(r => r.packageInfo);
  const none      = results.filter(r => !r.packageInfo);

  return (
    <div className="popouter" style={{ display:"flex", zIndex:9999 }}>
      <div className="popovrly" onClick={onClose} />
      <div className="popin" style={{ maxWidth:620, width:"95%" }}>
        <div className="popuphdr">
          Check Available Package Balance
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />
          </span>
        </div>
        <div className="popfrm">
          {loading ? (
            <div style={{ textAlign:"center", padding:30, color:"#64748b" }}>Checking balances…</div>
          ) : available.length === 0 ? (
            <div style={{ textAlign:"center", padding:30 }}>
              <div style={{ fontSize:32, marginBottom:10 }}></div>
              <p style={{ color:"#64748b", fontSize:14 }}>No package balance available for any service in this invoice.</p>
              <p style={{ color:"#94a3b8", fontSize:12 }}>Normal payment will apply for all services.</p>
              <button className="seclnk" onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              <p style={{ fontSize:13, color:"#334b71", marginBottom:16, fontWeight:600 }}>
                ✓ Package balance found for {available.length} service{available.length>1?"s":""}. Select one to apply:
              </p>

              {/* Available */}
              {available.map((r, idx) => (
                <div key={idx} onClick={() => setSelected(selected?.serviceCode === r.serviceCode ? null : r)}
                  style={{
                    border: `2px solid ${selected?.serviceCode === r.serviceCode ? "#334b71" : "#e2e8f0"}`,
                    borderRadius:12, padding:"14px 16px", marginBottom:10, cursor:"pointer",
                    background: selected?.serviceCode === r.serviceCode ? "#f0f4fa" : "#fff",
                    transition:"all .15s",
                  }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1e293b", marginBottom:4 }}>{r.serviceName}</div>
                      <div style={{ fontSize:12, color:"#64748b" }}>Service: {r.serviceCode}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ background:"#e6f4ef", whiteSpace:"nowrap", color:"#2e7d5e", border:"1px solid #b3d9cc", borderRadius:999, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                        Balance: {r.packageInfo.balanceQty}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #f1f5f9", display:"flex", gap:20, fontSize:12, color:"#64748b" }}>
                    <span><strong style={{ color:"#334b71" }}>{r.packageInfo.packageCode}</strong> — {r.packageInfo.packageName}</span>
                    <span>Invoice: {r.packageInfo.purchaseInvoiceNum}</span>
                    <span>Purchased: {fmtDate(r.packageInfo.purchaseDate)}</span>
                  </div>
                </div>
              ))}

              {/* No balance */}
              {none.length > 0 && (
                <div style={{ marginTop:12, padding:"10px 14px", background:"#f8fafc", borderRadius:8, fontSize:12, color:"#94a3b8" }}>
                  <strong>No package balance</strong> for: {none.map(r => r.serviceName).join(", ")} — normal payment applies.
                </div>
              )}

              <div className="btnbar" style={{ marginTop:20 }}>
                <button className="pribtnblue" disabled={!selected}
                  style={{ opacity: selected ? 1 : .5, cursor: selected ? "pointer" : "not-allowed" }}
                  onClick={() => selected && onRedeem({
                    packageInfo: {
                      ...selected.packageInfo,
                      serviceCode: selected.serviceCode,
                      serviceName: selected.serviceName,
                    },
                    serviceCode: selected.serviceCode,
                  })}>
                  Apply Package Redemption
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

export default PackageBalanceChecker;