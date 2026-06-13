import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config";
import FormFillModal from "../../Appointment/FormFillModal";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json(); return j.data ?? j;
};

const fmt = (d) => d
  ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })
  : "—";


// ─── Image Compare Modal ───────────────────────────────────────────────────────
const ImageCompare = ({ images, onClose }) => {
  const [selected,  setSelected]  = useState([]);
  const [comparing, setComparing] = useState(false);

  const toggleSelect = (img) => {
    setSelected(prev => {
      if (prev.find(i => i.imageId === img.imageId))
        return prev.filter(i => i.imageId !== img.imageId);
      if (prev.length >= 2) return prev;
      return [...prev, img];
    });
  };

  const left  = selected[0] || null;
  const right = selected[1] || null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:24, maxWidth:960, width:"95%",
        maxHeight:"90vh", overflow:"auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:16, color:"#071D49" }}>🔍 Image Comparison</div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#94a3b8" }}>×</button>
        </div>

        {/* Side-by-side panel */}
        {comparing && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            {[left, right].map((img, idx) => (
              <div key={idx}>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>
                  {idx === 0 ? "IMAGE 1" : "IMAGE 2"}
                </div>
                {img ? (
                  <>
                    <img src={img.imageUrl} alt={img.imageType}
                      style={{ width:"100%", borderRadius:10, border:"1px solid #e7ecf4",
                        maxHeight:360, objectFit:"contain", background:"#f8fafc" }} />
                    <div style={{ marginTop:8, fontSize:11, color:"#64748b" }}>
                      <div><strong>Type:</strong> {img.imageType}</div>
                      <div><strong>Service:</strong> {img.serviceName || "—"}</div>
                      <div><strong>Date captured:</strong> {fmt(img.capturedAt)}</div>
                      <div><strong>Appointment ref:</strong> {img.appointmentId || "—"}</div>
                    </div>
                  </>
                ) : (
                  <div style={{ height:200, border:"2px dashed #e7ecf4", borderRadius:10,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#94a3b8", fontSize:13 }}>No image selected</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Gallery */}
        <div style={{ fontWeight:700, fontSize:12, color:"#94a3b8", marginBottom:8 }}>
          {comparing
            ? "COMPARISON VIEW"
            : `SELECT 2 IMAGES TO COMPARE (${selected.length}/2 selected)`}
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {images.map(img => {
            const isSelected = !!selected.find(i => i.imageId === img.imageId);
            const selIdx     = selected.findIndex(i => i.imageId === img.imageId);
            const isDisabled = selected.length === 2 && !isSelected;
            return (
              <div key={img.imageId}
                onClick={() => !isDisabled && toggleSelect(img)}
                style={{ cursor: isDisabled ? "not-allowed" : "pointer", position:"relative", width:110 }}>
                <img src={img.imageUrl} alt={img.imageType}
                  style={{ width:100, height:100, objectFit:"cover", borderRadius:8,
                    border:`3px solid ${isSelected ? "#334b71" : "#e7ecf4"}`,
                    opacity: isDisabled ? 0.4 : 1 }} />
                {isSelected && (
                  <span style={{ position:"absolute", top:4, right:8, background:"#334b71",
                    color:"#fff", borderRadius:"50%", width:20, height:20,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:700 }}>
                    {selIdx + 1}
                  </span>
                )}
                <div style={{ fontSize:9, marginTop:4, color:"#334b71", fontWeight:700,
                  textAlign:"center", lineHeight:1.4 }}>
                  {img.imageType}
                  <div style={{ color:"#94a3b8" }}>{fmt(img.capturedAt)}</div>
                  <div style={{ color:"#94a3b8", fontSize:8 }}>
                    {img.serviceName || "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          {!comparing ? (
            <button
              disabled={selected.length !== 2}
              onClick={() => setComparing(true)}
              style={{ background: selected.length === 2 ? "#2e7d5e" : "#94a3b8",
                color:"#fff", border:"none", borderRadius:8, padding:"9px 20px",
                fontWeight:700, fontSize:13,
                cursor: selected.length === 2 ? "pointer" : "not-allowed" }}>
              {selected.length === 2
                ? "▶ Compare"
                : `Select ${2 - selected.length} more image${2 - selected.length !== 1 ? "s" : ""}`}
            </button>
          ) : (
            <button onClick={() => { setComparing(false); setSelected([]); }}
              style={{ background:"#f1f5f9", border:"none", borderRadius:8,
                padding:"9px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              ← Back to Gallery
            </button>
          )}
          <button onClick={onClose}
            style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:8,
              padding:"9px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Submission Viewer Modal ───────────────────────────────────────────────────
const SubmissionViewer = ({ submissionId, onClose, autoPrint = false }) => {
  const [data,    setData]    = useState(null);
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

  // C360-005: auto-print after content finishes loading
  useEffect(() => {
    if (autoPrint && !loading && formDef) {
      // Small frame delay so React flushes the render before print dialog opens
      const id = requestAnimationFrame(() => window.print());
      return () => cancelAnimationFrame(id);
    }
  }, [autoPrint, loading, formDef]);

  const renderValue = (comp, val) => {
    if (val === undefined || val === null || val === "") return <span style={{ color:"#94a3b8" }}>—</span>;
    if (typeof val === "object" && val.url) return <img src={val.url} alt="upload" style={{ maxWidth:200, borderRadius:8 }} />;
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "string" && val.startsWith("data:image"))
      return <img src={val} alt="signature" style={{ maxWidth:200, border:"1px solid #e7ecf4", borderRadius:8 }} />;
    return String(val);
  };

  const doPrint = () => window.print();

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:24, maxWidth:640,
        width:"95%", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:16, flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:"#071D49" }}>{data?.formName || "Form"}</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
              Submitted: {fmt(data?.submittedAt)} · By: {data?.filledByName || "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#94a3b8" }}>×</button>
        </div>

        {/* Print area */}
        <div className="emr-print-area" style={{ flex:1, overflowY:"auto" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading…</div>
          ) : (
            <div>
              {(formDef?.components || []).map(comp => {
                const val   = data?.responseData?.[comp.componentId];
                if (["logo","content","macro"].includes(comp.componentType)) return null;
                const isSig = comp.componentType === "signature";
                return (
                  <div key={comp.componentId}
                    className={`emr-print-field ${isSig ? "emr-print-sig" : ""}`}
                    style={{ marginBottom:14, paddingBottom:14, borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:4 }}>
                      {comp.label}
                      {comp.isMandatory && <span style={{ color:"#b91c1c", marginLeft:2 }}>*</span>}
                    </div>
                    <div style={{ fontSize:13, color:"#10223f" }}>{renderValue(comp, val)}</div>
                  </div>
                );
              })}
              {!formDef?.components?.length && (
                <div style={{ color:"#94a3b8", fontSize:13 }}>No components found for this form.</div>
              )}
              <div className="emr-print-footer">
                Submitted by: {data?.filledByName || "—"} &nbsp;|&nbsp;
                Date: {fmt(data?.submittedAt)} &nbsp;|&nbsp;
                Form: {data?.formName}
              </div>
            </div>
          )}
        </div>

        <div className="emr-no-print" style={{ flexShrink:0, paddingTop:12, borderTop:"1px solid #f1f5f9",
          display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button onClick={doPrint}
            style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
              padding:"9px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
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
  const custId       = searchParams.get("custid")   || "";
  const customerName = searchParams.get("fullname") || "Customer";

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [err,         setErr]         = useState("");
  const [activeTab,   setActiveTab]   = useState("submissions");
  const [viewSub,     setViewSub]     = useState(null);   // submissionId to view
  const [printSub,    setPrintSub]    = useState(null);   // submissionId to print (auto-prints on open)
  const [showCompare, setShowCompare] = useState(false);

  // Edit / Fill Customer Form state
  const [editingForm,         setEditingForm]         = useState(null); // { recId, formCode, prefill }
  const [editCentreCode,      setEditCentreCode]      = useState("");
  const [customerFormTemplates, setCustomerFormTemplates] = useState(null); // null=not loaded
  const [templatePicker,      setTemplatePicker]      = useState(false);

  useEffect(() => {
    if (!custId) { setErr("Missing custid in URL."); setLoading(false); return; }
    const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    setEditCentreCode(user.centerCode || "");

    Promise.all([
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`),
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Images`),
    ]).then(([forms, images]) => {
      setData({ forms, images: Array.isArray(images) ? images : [] });
    }).catch(() => setErr("Failed to load EMR data."))
    .finally(() => setLoading(false));
  }, [custId]);

  // Load Customer-type form templates when customer tab is opened
  useEffect(() => {
    if (activeTab !== "customer" || customerFormTemplates !== null) return;
    authGet(`${API_BASE_URL}/api/EMR/Forms/Active?formType=Customer`)
      .then(d => setCustomerFormTemplates(Array.isArray(d) ? d : []))
      .catch(() => setCustomerFormTemplates([]));
  }, [activeTab]);

  const reload = () => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    Promise.all([
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`),
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Images`),
    ]).then(([forms, images]) => {
      setData({ forms, images: Array.isArray(images) ? images : [] });
    }).finally(() => setLoading(false));
  };

  // ── Shared table styles ──
  const thStyle = {
    padding:"9px 12px", fontWeight:700, fontSize:11, color:"#64748b",
    textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"2px solid #e7ecf4",
    textAlign:"left", background:"#f8fafc",
  };
  const tdStyle = {
    padding:"12px", fontSize:13, borderBottom:"1px solid #f1f5f9",
    verticalAlign:"middle", color:"#10223f",
  };

  const ActionBtn = ({ label, onClick, variant = "primary" }) => {
    const bg = variant === "print"  ? "#334b71"
             : variant === "edit"   ? "#BA7517"
             : "#334b71";
    return (
      <button onClick={onClick}
        style={{ background:bg, color:"#fff", border:"none", borderRadius:7,
          padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer",
          marginRight:4, whiteSpace:"nowrap" }}>
        {label}
      </button>
    );
  };

  return (
    <div style={{ padding:20, fontFamily:"Lato,sans-serif", maxWidth:1100 }}>
      <style>{`
        .emr-tab { padding:9px 18px; border:none; border-radius:8px; font-weight:700; font-size:13px;
          cursor:pointer; transition:all .15s; margin-right:6px; }
        .emr-tab.active { background:#334b71; color:#fff; }
        .emr-tab:not(.active) { background:#f1f5f9; color:#64748b; }
        .emr-card { background:#fff; border:1px solid #e7ecf4; border-radius:12px;
          overflow:hidden; margin-top:14px; }
        .emr-tbl { width:100%; border-collapse:collapse; }
        .emr-badge { border-radius:999px; padding:2px 9px; font-size:11px; font-weight:700; }
        @media print {
          body * { visibility: hidden; }
          .emr-print-area, .emr-print-area * { visibility: visible; }
          .emr-print-area { position: absolute; top: 0; left: 0; width: 100%; padding: 24px; }
          .emr-no-print { display: none !important; }
          .emr-print-field { margin-bottom: 12px; page-break-inside: avoid; }
          .emr-print-sig img { max-width: 200px; border: 1px solid #ccc; }
          .emr-print-footer { margin-top: 32px; font-size: 11px; color: #64748b;
            border-top: 1px solid #e5e7eb; padding-top: 8px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:20, color:"#071D49" }}>📋 EMR Forms</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{customerName}</div>
        </div>
        {(data?.images?.length || 0) > 1 && (
          <button
            style={{ background:"#2e7d5e", color:"#fff", border:"none", borderRadius:8,
              padding:"9px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}
            onClick={() => setShowCompare(true)}>
            🔍 Compare Images
          </button>
        )}
      </div>

      {/* Tabs */}
      <div>
        <button className={`emr-tab ${activeTab==="submissions"?"active":""}`}
          onClick={() => setActiveTab("submissions")}>
          📝 Submitted Forms ({(data?.forms?.submissions||[]).filter(s => s.formType === "Consent/Treatment").length || 0})
        </button>
        <button className={`emr-tab ${activeTab==="customer"?"active":""}`}
          onClick={() => setActiveTab("customer")}>
          👤 Customer Form ({data?.forms?.customerForms?.length || 0})
        </button>
        <button className={`emr-tab ${activeTab==="images"?"active":""}`}
          onClick={() => setActiveTab("images")}>
          🖼 Images ({data?.images?.length || 0})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading EMR records…</div>
      ) : err ? (
        <div style={{ padding:20, color:"#b91c1c", background:"#fdf3f3", borderRadius:8 }}>{err}</div>
      ) : (
        <>
          {/* ── Submissions Tab — Consent + Treatment forms ── */}
          {activeTab === "submissions" && (
            <div className="emr-card">
              {!(data?.forms?.submissions||[]).filter(s => s.formType === "Consent/Treatment").length ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
                  No consent/treatment forms submitted yet.
                </div>
              ) : (
                <table className="emr-tbl">
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Service</th>
                      <th style={thStyle}>Form Name</th>
                      <th style={thStyle}>Form Type</th>
                      <th style={thStyle}>Filled By</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.forms.submissions.filter(s => s.formType === "Consent/Treatment").map(s => {
                      const typeStyle = s.formType === "Consent/Treatment"
                        ? { background:"#e9edf5", color:"#334b71" }
                        : { background:"#e6f4ef", color:"#2e7d5e" };
                      return (
                        <tr key={s.submissionId}>
                          <td style={tdStyle}>{fmt(s.submittedAt)}</td>
                          <td style={tdStyle}>{s.serviceName || "—"}</td>
                          <td style={{ ...tdStyle, fontWeight:600 }}>{s.formName}</td>
                          <td style={tdStyle}>
                            <span className="emr-badge" style={typeStyle}>{s.formType}</span>
                          </td>
                          <td style={tdStyle}>
  {s.filledByName || s.filledBy || "—"}
</td>
                          <td style={tdStyle}>
                            <ActionBtn label="View"  onClick={() => setViewSub(s.submissionId)} />
                            <ActionBtn label="🖨 Print" variant="print"
                              onClick={() => setPrintSub(s.submissionId)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Customer Form Tab ── */}
          {activeTab === "customer" && (
            <div className="emr-card">
              {/* Header row with Fill button */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 16px", borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#071D49" }}>
                  Customer Medical History
                </div>
                <button
                  onClick={() => {
                    if (!customerFormTemplates) return;
                    if (customerFormTemplates.length === 0) {
                      alert("No active Customer-type forms found. Please create one in the Form Builder first.");
                      return;
                    }
                    if (customerFormTemplates.length === 1) {
                      // Only one template — open it directly
                      const tpl = customerFormTemplates[0];
                      const latest = data?.forms?.customerForms?.find(cf => cf.isLatest);
                      setEditingForm({
                        recId:     latest?.recId    || null,
                        formCode:  tpl.formCode,
                        isNew:     !latest,
                      });
                    } else {
                      // Multiple templates — show picker
                      setTemplatePicker(true);
                    }
                  }}
                  style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
                    padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  {data?.forms?.customerForms?.length ? "✏ Edit / Update" : "+ Fill Customer Form"}
                </button>
              </div>

              {!data?.forms?.customerForms?.length ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
                  No customer form submitted yet. Click "+ Fill Customer Form" to add one.
                </div>
              ) : (
                <table className="emr-tbl">
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Service</th>
                      <th style={thStyle}>Form Name</th>
                      <th style={thStyle}>Form Type</th>
                      <th style={thStyle}>Filled By</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.forms.customerForms.map(cf => (
                      <tr key={cf.recId}>
                        <td style={tdStyle}>
                          {fmt(cf.submittedAt)}
                          {/* Version badges — satisfy R19: edits show as separate rows with dates */}
                          <div style={{ display:"flex", gap:4, marginTop:4 }}>
                            <span className="emr-badge" style={{ background:"#f1f5f9", color:"#64748b" }}>
                              v{cf.version}
                            </span>
                            {cf.isLatest && (
                              <span className="emr-badge" style={{ background:"#dcfce7", color:"#166534" }}>
                                Latest
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color:"#94a3b8" }}>N/A</td>
                        <td style={{ ...tdStyle, fontWeight:600 }}>
                          {cf.formName || "Customer Form"}
                        </td>
                        <td style={tdStyle}>
                          <span className="emr-badge" style={{ background:"#e6f4ef", color:"#2e7d5e" }}>
                            Customer
                          </span>
                        </td>
                        <td style={tdStyle}>
                          
                         {cf.filledByName || cf.filledBy || "—"}
                        </td>
                        <td style={tdStyle}>
                          <ActionBtn label="View"  onClick={() => setViewSub(cf.recId)} />
                          <ActionBtn label="🖨 Print" variant="print"
                            onClick={() => setPrintSub(cf.recId)} />
                          {/* Edit only allowed on latest version — FRD Rule 17 */}
                          {cf.isLatest && (
                            <ActionBtn label="Edit" variant="edit"
                              onClick={() => setEditingForm({ recId: cf.recId, formCode: cf.formCode })} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
                      <div style={{ marginTop:6, fontSize:11, color:"#334b71", fontWeight:700 }}>{img.imageType}</div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>{img.serviceName || "—"}</div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>{fmt(img.capturedAt)}</div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>Appt: {img.appointmentId?.slice(-6) || "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Submission Viewer — View mode */}
      {viewSub && <SubmissionViewer submissionId={viewSub} onClose={() => setViewSub(null)} />}

      {/* Submission Viewer — Print mode (auto-prints after load) */}
      {printSub && (
        <SubmissionViewer
          submissionId={printSub}
          autoPrint={true}
          onClose={() => setPrintSub(null)}
        />
      )}

      {/* Image Compare */}
      {showCompare && (data?.images?.length || 0) > 0 && (
        <ImageCompare images={data.images} onClose={() => setShowCompare(false)} />
      )}

      {/* Template picker — shown when multiple Customer-type forms exist */}
      {templatePicker && customerFormTemplates && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:28, maxWidth:480,
            width:"95%", boxShadow:"0 8px 32px rgba(0,0,0,.18)" }}>
            <div style={{ fontWeight:800, fontSize:16, color:"#071D49", marginBottom:6 }}>
              Select Customer Form
            </div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
              Multiple customer form templates are available. Choose one to fill.
            </div>
            {customerFormTemplates.map(tpl => {
              const latest = data?.forms?.customerForms?.find(cf => cf.isLatest && cf.formCode === tpl.formCode);
              return (
                <div key={tpl.formCode}
                  onClick={() => {
                    setTemplatePicker(false);
                    setEditingForm({
                      recId:    latest?.recId || null,
                      formCode: tpl.formCode,
                      isNew:    !latest,
                    });
                  }}
                  style={{ border:"1px solid #e7ecf4", borderRadius:10, padding:"14px 16px",
                    marginBottom:10, cursor:"pointer", display:"flex", justifyContent:"space-between",
                    alignItems:"center", transition:"background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="#f0f4fa"}
                  onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#334b71" }}>{tpl.formName}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{tpl.formCode}</div>
                  </div>
                  <div style={{ fontSize:12, color:"#334b71", fontWeight:600 }}>
                    {latest ? "✏ Edit / Update" : "+ Fill"} →
                  </div>
                </div>
              );
            })}
            <button onClick={() => setTemplatePicker(false)}
              style={{ marginTop:8, width:"100%", padding:"10px", border:"1px solid #e7ecf4",
                borderRadius:8, background:"#fff", fontSize:13, cursor:"pointer", color:"#64748b" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fill / Edit Customer Form — opens FormFillModal */}
      {editingForm && (
        <FormFillModal
          key={editingForm.recId || ("new-" + editingForm.formCode)}
          appointmentId={null}
          serviceCode={null}
          custId={custId}
          centerCode={editCentreCode}
          whenToFill={null}
          isCustomerFormEdit={true}
          existingRecId={editingForm.isNew ? null : editingForm.recId}
          formCodeOverride={editingForm.formCode}
          onComplete={() => {
            setEditingForm(null);
            reload();
          }}
          onClose={() => setEditingForm(null)}
        />
      )}
    </div>
  );
};

export default CustomerFormHistory;