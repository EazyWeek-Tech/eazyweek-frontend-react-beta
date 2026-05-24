import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json(); return j.data ?? j;
};
const authPost = async (url, body) => {
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) });
  return r.json();
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";

// ─── Image Compare Modal ───────────────────────────────────────────────────────
const ImageCompare = ({ images, onClose }) => {
  const [left,  setLeft]  = useState(images[0] || null);
  const [right, setRight] = useState(images[1] || null);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:24, maxWidth:900, width:"95%", maxHeight:"90vh", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:16, color:"#071D49" }}>🔍 Image Comparison</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#94a3b8" }}>×</button>
        </div>

        {/* Side-by-side viewer */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
          {[{ val:left, set:setLeft, label:"Left" }, { val:right, set:setRight, label:"Right" }].map(({ val, set, label }) => (
            <div key={label}>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>{label.toUpperCase()}</div>
              <select value={val?.imageId || ""} onChange={e => set(images.find(i => i.imageId === e.target.value) || null)}
                style={{ width:"100%", border:"1px solid #e7ecf4", borderRadius:8, padding:"8px 10px", fontSize:12, marginBottom:8, outline:"none" }}>
                <option value="">Select image…</option>
                {images.map(i => (
                  <option key={i.imageId} value={i.imageId}>
                    {i.imageType} · {i.serviceName || "—"} · {fmt(i.capturedAt)}
                  </option>
                ))}
              </select>
              {val ? (
                <img src={val.imageUrl} alt={val.imageType}
                  style={{ width:"100%", borderRadius:10, border:"1px solid #e7ecf4",
                    maxHeight:360, objectFit:"contain", background:"#f8fafc" }} />
              ) : (
                <div style={{ width:"100%", height:200, border:"2px dashed #e7ecf4", borderRadius:10,
                  display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:13 }}>
                  Select an image
                </div>
              )}
              {val && (
                <div style={{ marginTop:8, fontSize:11, color:"#64748b" }}>
                  <div><strong>Type:</strong> {val.imageType}</div>
                  <div><strong>Service:</strong> {val.serviceName || "—"}</div>
                  <div><strong>Date:</strong> {fmt(val.capturedAt)}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Thumbnails */}
        <div style={{ fontWeight:700, fontSize:12, color:"#94a3b8", marginBottom:8 }}>ALL IMAGES</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {images.map(img => (
            <div key={img.imageId} style={{ cursor:"pointer", position:"relative" }}
              onClick={() => { if (!left || left.imageId === img.imageId) { setLeft(img); } else { setRight(img); } }}>
              <img src={img.imageUrl} alt={img.imageType}
                style={{ width:80, height:80, objectFit:"cover", borderRadius:8,
                  border:`2px solid ${left?.imageId===img.imageId||right?.imageId===img.imageId?"#334b71":"#e7ecf4"}` }} />
              <div style={{ position:"absolute", bottom:2, left:2, right:2, background:"rgba(0,0,0,.55)",
                color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:4, textAlign:"center" }}>
                {img.imageType}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Submission Viewer Modal ───────────────────────────────────────────────────
const SubmissionViewer = ({ submissionId, onClose }) => {
  const [data, setData]       = useState(null);
  const [formDef, setFormDef] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authGet(`${API_BASE_URL}/api/EMR/Submissions/${submissionId}`)
      .then(async (sub) => {
        setData(sub);
        const def = await authGet(`${API_BASE_URL}/api/EMR/Forms/${sub.formCode}`);
        setFormDef(def);
      })
      .finally(() => setLoading(false));
  }, [submissionId]);

  const renderValue = (comp, val) => {
    if (val === undefined || val === null || val === "") return <span style={{ color:"#94a3b8" }}>—</span>;
    if (typeof val === "object" && val.url) return <img src={val.url} alt="upload" style={{ maxWidth:200, borderRadius:8 }} />;
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "string" && val.startsWith("data:image")) return <img src={val} alt="signature" style={{ maxWidth:200, border:"1px solid #e7ecf4", borderRadius:8 }} />;
    return String(val);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:24, maxWidth:640,
        width:"95%", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:"#071D49" }}>{data?.formName || "Form"}</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
              Submitted: {fmt(data?.submittedAt)} · By: {data?.filledByName || "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#94a3b8" }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading…</div>
          ) : (
            <div>
              {(formDef?.components || []).map(comp => {
                const val = data?.responseData?.[comp.componentId];
                if (["logo","content","macro"].includes(comp.componentType)) return null;
                return (
                  <div key={comp.componentId} style={{ marginBottom:14, paddingBottom:14,
                    borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:4 }}>
                      {comp.label}
                      {comp.isMandatory && <span style={{ color:"#b91c1c", marginLeft:2 }}>*</span>}
                    </div>
                    <div style={{ fontSize:13, color:"#10223f" }}>
                      {renderValue(comp, val)}
                    </div>
                  </div>
                );
              })}
              {!formDef?.components?.length && (
                <div style={{ color:"#94a3b8", fontSize:13 }}>No components found for this form.</div>
              )}
            </div>
          )}
        </div>

        <div style={{ flexShrink:0, paddingTop:12, borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end" }}>
          <button onClick={() => window.print()}
            style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
              padding:"9px 18px", fontWeight:700, fontSize:13, cursor:"pointer", marginRight:8 }}>
            🖨 Print
          </button>
          <button onClick={onClose}
            style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:8,
              padding:"9px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main CustomerFormHistory ─────────────────────────────────────────────────
const CustomerFormHistory = () => {
  const [searchParams] = useSearchParams();
  const custId        = searchParams.get("custid")    || "";
  const customerName  = searchParams.get("fullname")  || "Customer";

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [err,          setErr]          = useState("");
  const [activeTab,    setActiveTab]    = useState("submissions");
  const [viewSub,      setViewSub]      = useState(null);
  const [showCompare,  setShowCompare]  = useState(false);

  useEffect(() => {
    if (!custId) { setErr("Missing custid in URL."); setLoading(false); return; }
    const user  = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    const cc    = user.centerCode || "";
    Promise.all([
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`),
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Images`),
    ]).then(([forms, images]) => {
      setData({ forms, images: Array.isArray(images) ? images : [] });
    }).catch(() => setErr("Failed to load EMR data."))
    .finally(() => setLoading(false));
  }, [custId]);

  const typeColor = (t) => t === "Consent/Treatment"
    ? { bg:"#e9edf5", color:"#334b71" } : { bg:"#e6f4ef", color:"#2e7d5e" };

  return (
    <div style={{ padding:20, fontFamily:"Lato,sans-serif", maxWidth:900 }}>
      <style>{`
        .emr-tab { padding:10px 18px; border:none; border-radius:8px; font-weight:700; font-size:13px;
          cursor:pointer; transition:all .15s; margin-right:6px; }
        .emr-tab.active { background:#334b71; color:#fff; }
        .emr-tab:not(.active) { background:#f1f5f9; color:#64748b; }
        .emr-card { background:#fff; border:1px solid #e7ecf4; border-radius:12px; overflow:hidden; margin-top:14px; }
        .emr-row { display:flex; justify-content:space-between; align-items:center;
          padding:12px 16px; border-bottom:1px solid #f1f5f9; }
        .emr-row:last-child { border-bottom:none; }
        .emr-badge { border-radius:999px; padding:2px 9px; font-size:11px; font-weight:700; }
        .view-btn { background:#334b71; color:#fff; border:none; border-radius:7px;
          padding:6px 14px; font-size:12px; font-weight:700; cursor:pointer; }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:20, color:"#071D49" }}>📋 EMR Forms</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{customerName}</div>
        </div>
        {data?.images?.length > 1 && (
          <button className="view-btn" style={{ background:"#2e7d5e" }} onClick={() => setShowCompare(true)}>
            🔍 Compare Images
          </button>
        )}
      </div>

      {/* Tabs */}
      <div>
        <button className={`emr-tab ${activeTab==="submissions"?"active":""}`} onClick={() => setActiveTab("submissions")}>
          📝 Submitted Forms ({data?.forms?.submissions?.length || 0})
        </button>
        <button className={`emr-tab ${activeTab==="customer"?"active":""}`} onClick={() => setActiveTab("customer")}>
          👤 Customer Form ({data?.forms?.customerForms?.length || 0})
        </button>
        <button className={`emr-tab ${activeTab==="images"?"active":""}`} onClick={() => setActiveTab("images")}>
          🖼 Images ({data?.images?.length || 0})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading EMR records…</div>
      ) : err ? (
        <div style={{ padding:20, color:"#b91c1c", background:"#fdf3f3", borderRadius:8 }}>{err}</div>
      ) : (
        <>
          {/* ── Submissions Tab ── */}
          {activeTab === "submissions" && (
            <div className="emr-card">
              <div style={{ padding:"12px 16px", fontWeight:800, fontSize:14, color:"#071D49",
                borderBottom:"1px solid #f1f5f9" }}>Consent & Treatment Forms</div>
              {!data?.forms?.submissions?.length ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
                  No forms submitted yet.
                </div>
              ) : data.forms.submissions.map(s => {
                const tc = typeColor(s.formType);
                return (
                  <div key={s.submissionId} className="emr-row">
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#334b71" }}>{s.formName}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>
                        {fmt(s.submittedAt)}
                        {s.filledByName && ` · ${s.filledByName}`}
                        {s.serviceName && ` · ${s.serviceName}`}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span className="emr-badge" style={{ background:tc.bg, color:tc.color }}>
                        {s.formType}
                      </span>
                      <button className="view-btn" onClick={() => setViewSub(s.submissionId)}>
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Customer Form Tab ── */}
          {activeTab === "customer" && (
            <div className="emr-card">
              <div style={{ padding:"12px 16px", fontWeight:800, fontSize:14, color:"#071D49",
                borderBottom:"1px solid #f1f5f9" }}>
                Customer Intake Form
                <span style={{ marginLeft:8, fontSize:11, fontWeight:400, color:"#94a3b8" }}>
                  (versioned — latest shown first)
                </span>
              </div>
              {!data?.forms?.customerForms?.length ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
                  No customer form submitted yet.
                </div>
              ) : data.forms.customerForms.map(cf => (
                <div key={cf.recId} className="emr-row">
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"#334b71" }}>
                        {cf.formName || "Customer Form"}
                      </span>
                      {cf.isLatest && (
                        <span className="emr-badge" style={{ background:"#dcfce7", color:"#166534" }}>
                          Latest
                        </span>
                      )}
                      <span className="emr-badge" style={{ background:"#f1f5f9", color:"#64748b" }}>
                        v{cf.version}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>
                      {fmt(cf.submittedAt)}
                      {cf.filledBy && ` · ${cf.filledBy}`}
                    </div>
                  </div>
                  <button className="view-btn" onClick={() => setViewSub(cf.recId)}>
                    View
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Images Tab ── */}
          {activeTab === "images" && (
            <div className="emr-card">
              <div style={{ padding:"12px 16px", fontWeight:800, fontSize:14, color:"#071D49",
                borderBottom:"1px solid #f1f5f9" }}>Before / After Images</div>
              {!data?.images?.length ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
                  No images uploaded yet.
                </div>
              ) : (
                <div style={{ padding:16, display:"flex", flexWrap:"wrap", gap:12 }}>
                  {data.images.map(img => (
                    <div key={img.imageId} style={{ width:140 }}>
                      <img src={img.imageUrl} alt={img.imageType}
                        style={{ width:140, height:140, objectFit:"cover", borderRadius:10,
                          border:"1px solid #e7ecf4", cursor:"pointer" }}
                        onClick={() => window.open(img.imageUrl, "_blank")} />
                      <div style={{ marginTop:6, fontSize:11, color:"#334b71", fontWeight:700 }}>
                        {img.imageType}
                      </div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>
                        {img.serviceName || "—"}
                      </div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>
                        {fmt(img.capturedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Submission Viewer */}
      {viewSub && <SubmissionViewer submissionId={viewSub} onClose={() => setViewSub(null)} />}

      {/* Image Compare */}
      {showCompare && data?.images?.length > 0 && (
        <ImageCompare images={data.images} onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
};

export default CustomerFormHistory;