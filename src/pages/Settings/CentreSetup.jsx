import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser  = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const authGet  = async (url) => { const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authDelete = async (url) => {
  const r = await fetch(url, { method:"DELETE", headers:{ Authorization:`Bearer ${TOKEN()}` } });
  return r.json();
};
const authPost = async (url, body) => { const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };

const TABS = ["General","Address","Contact","Logo","Tax","Numbering","Setup","Advance"];

const TAX_TYPES = {
  "Saudi Arabia": ["VAT Number","CR Number","Zakat Registration Number"],
  "UAE":          ["TRN","Trade License Number","Corporate Tax Registration Number"],
  "India":        ["PAN","GSTIN","TAN","CIN","IEC","Professional Tax Registration Number"],
  "Bahrain":      ["VAT Account Number","CR Number"],
  "Oman":         ["VAT Registration Number","CR Number"],
  "Qatar":        ["Commercial Registration Number","Tax Card Number"],
  "Kuwait":       ["Tax Number","Commercial License Number"],
  "Singapore":    ["UEN","GST Registration Number","TIN"],
};

// FRD §3.5: tax Type values follow the country linked to the entity currency.
const CURRENCY_TO_COUNTRY = {
  SAR: "Saudi Arabia", AED: "UAE", INR: "India", BHD: "Bahrain",
  OMR: "Oman", QAR: "Qatar", KWD: "Kuwait", SGD: "Singapore",
};

const Toggle = ({ value, onChange, label, sub }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"14px 0", borderBottom:"1px solid #f1f5f9" }}>
    <div>
      <div style={{ fontSize:13, fontWeight:600, color:"#334b71" }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
    </div>
    <div style={{ width:44, height:24, borderRadius:24, background:value?"#334b71":"#d3dbe8", position:"relative", cursor:"pointer", flexShrink:0 }}
      onClick={onChange}>
      <div style={{ width:18, height:18, background:"#fff", borderRadius:"50%", position:"absolute", top:3, left:value?23:3, transition:"all .2s", boxShadow:"0 1px 3px rgba(0,0,0,.25)" }} />
    </div>
  </div>
);


// ── FormField — module-level so React never remounts it on parent re-render ──
// IMPORTANT: Never define input components inside another component's render.
// Defining them inside causes React to see a new component type on every render,
// unmounting the input and losing focus after each keystroke.
function FormField({ label, value, onChange, placeholder, required, type }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b",
        textTransform:"uppercase", letterSpacing:".04em", marginBottom:4 }}>
        {label}{required && " *"}
      </label>
      <input
        type={type || "text"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ width:"100%", padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:6,
          fontSize:13, fontFamily:"Lato,sans-serif", outline:"none", boxSizing:"border-box" }} />
    </div>
  );
}

// ── Create Centre Form — defined OUTSIDE CentreSetup to prevent focus loss ──
// If defined inside CentreSetup, React remounts it on every parent re-render
// causing the input to lose focus after each keystroke.
function CreateCentreForm({ onSaved, onCancel }) {
  const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  const authDelete = async (url) => {
  const r = await fetch(url, { method:"DELETE", headers:{ Authorization:`Bearer ${TOKEN()}` } });
  return r.json();
};
const authPost = async (url, payload) => {
    const r = await fetch(url, {
      method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || "Save failed");
    return j.data ?? j;
  };

  const [form,   setForm]   = useState({ centerCode:"", centreName:"", displayName:"", leCode:"" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleDeleteCentre = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete centre "${selected}"? This can only be done if no data exists in other sections (Address, Contact, Tax etc.).`)) return;
    try {
      const res = await authDelete(`${API_BASE_URL}/api/Settings/Centre/${encodeURIComponent(selected)}`);
      if (res.success === false) { showToast(res.message || "Delete failed.", "error"); return; }
      showToast(`Centre "${selected}" deleted successfully.`, "success");
      setSelected(null); setData(null);
      fetchCentres();
    } catch (e) { showToast(e.message || "Delete failed.", "error"); }
  };

  const handleSave = async () => {
    const errs = [];
    const code = form.centerCode.trim().toUpperCase();
    if (!code)                                  errs.push("Centre Code is required.");
    else if (code.length !== 4)                 errs.push("Centre Code must be exactly 4 characters.");
    else if (!/^[A-Za-z0-9]{4}$/.test(code))   errs.push("Centre Code must be alphanumeric only.");
    if (!form.centreName.trim())                errs.push("Centre Name is required.");
    if (!form.displayName.trim())               errs.push("Display Name is required.");
    if (!form.leCode?.trim())                   errs.push("Legal Entity is required.");
    if (errs.length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveGeneral`, {
        centerCode:  code,
        centreName:  form.centreName.trim(),
        displayName: form.displayName.trim(),
        leCode:      form.leCode.trim(),
      });
      onSaved(code); // already toUpperCase from validation
    } catch (e) { setErrors([e.message]); }
    finally { setSaving(false); }
  };



  return (
    <div style={{ padding:32, maxWidth:520 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <span style={{ fontSize:22 }}></span>
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:"#071D49" }}>Create New Centre</div>
          <div style={{ fontSize:12, color:"#94a3b8" }}>Fill in the details to set up a new centre</div>
        </div>
      </div>
      {errors.length > 0 && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8,
          padding:"10px 14px", marginBottom:16, fontSize:13, color:"#b91c1c" }}>
          {errors.map((e,i) => <div key={i}>• {e}</div>)}
        </div>
      )}
      <FormField label="Centre Code"       value={form.centerCode}  onChange={e => setForm(p => ({...p, centerCode:e.target.value}))}  placeholder="e.g. GLOW (exactly 4 chars)" required />
      <FormField label="Centre Name"       value={form.centreName}  onChange={e => setForm(p => ({...p, centreName:e.target.value}))}  placeholder="e.g. Glow Clinic (max 60 chars)" required />
      <FormField label="Display Name"      value={form.displayName} onChange={e => setForm(p => ({...p, displayName:e.target.value}))} placeholder="e.g. Glow (max 20 chars)" required />
      <FormField label="Legal Entity Code" value={form.leCode}      onChange={e => setForm(p => ({...p, leCode:e.target.value}))}      placeholder="e.g. TEST" />
      <div style={{ display:"flex", gap:10, marginTop:8 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding:"9px 24px", background:"#334b71", color:"#fff", border:"none",
            borderRadius:6, fontWeight:700, fontSize:13, cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : "Create Centre"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"9px 18px", background:"#f4f6fa", color:"#334b71",
            border:"1px solid #e2e8f0", borderRadius:6, fontWeight:600, fontSize:13, cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function CentreSetup() {





  // ── Access rights ─────────────────────────────────────────────────────────
  // isEntityLevel and role come directly from the JWT user object
  // canWrite = Admin role AND at entity level
  const _rights = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s+/g, "");
      const ALLOWED_ROLES = ["admin","productteam"];
      const isAdmin       = ALLOWED_ROLES.includes(role);
      // isEntityLevel MUST come from JWT — no fallback
      // Centre-level admins have isEntityLevel=false and get view-only
      const isEntityLevel = u.isEntityLevel === true;
      const canManage     = isAdmin && isEntityLevel;
      return { isAdmin, isEntityLevel, canCreate: canManage, canEdit: canManage, canDelete: canManage };
    } catch {
      return { isAdmin:false, isEntityLevel:false, canCreate:false, canEdit:false, canDelete:false };
    }
  })();
  const { isAdmin, isEntityLevel, canCreate, canEdit, canDelete } = _rights;

  const [centres,      setCentres]      = useState([]);
  const [selected,     setSelected]     = useState(null); // centerCode
  const [data,         setData]         = useState(null);
  const [activeTab,    setActiveTab]    = useState("General");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);
  const [legalEntities,setLegalEntities]= useState([]);
  const [isCreating,   setIsCreating]   = useState(false);

  // Tab states
  const [addresses,    setAddresses]    = useState([]);
  const [contacts,     setContacts]     = useState([]);
  const [logoUrl,      setLogoUrl]      = useState("");
  const [logoPreview,  setLogoPreview]  = useState("");
  const [taxItems,     setTaxItems]     = useState([]);
  const [numbering,    setNumbering]    = useState({
    prefixCustomer:"CUST-", prefixInvoice:"INV-", prefixReturn:"SR-",
    prefixCreditNote:"CN-", prefixAdvance:"ADV-", prefixGiftCard:"GC-",
  });
  const [setup, setSetup] = useState({
    giftCardValidityDays:365, giftCardMinAmount:1,
    allowMultiPayment:true, allowMultiPractitioner:true,
    allowPkgServiceBilling:true, allowPkgSvcPrdBilling:true,
    returnWindowDays:30,
    allowSalesReturn:true, allowReturnPackages:true, allowReturnServices:true, allowReturnProducts:true,
    roomMandatory:false, equipmentMandatory:false, allowOverbooking:false,
    // Advance Payment config (FRD §3.1)
    advMaxCap:"", advValidityDays:"", advAllowValidityExtension:false,
    advVatRateLocals:"STANDARD", advVatRateExpats:"STANDARD",
    advAllowRedeemProducts:false, advAllowRedeemPackages:false, advAllowRedeemServices:true,
    advTaxableLocals:true, advTaxableExpats:true,
  });
  const [general, setGeneral] = useState({ displayName:"", leCode:"" });
  const fileRef = useRef();

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  // Load centre list + legal entities
  const fetchCentres = async () => {
    try {
      const data = await authGet(`${API_BASE_URL}/api/Settings/Centre/List`);
      setCentres(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    Promise.all([
      authGet(`${API_BASE_URL}/api/Settings/Centre/List`),
      authGet(`${API_BASE_URL}/api/Settings/LegalEntity`),
    ]).then(([cs, le]) => {
      setCentres(Array.isArray(cs) ? cs : []);
      if (le?.leCode) setLegalEntities([le]);
    }).finally(() => setLoading(false));
  }, []);

  // Load centre detail when selected
  useEffect(() => {
    if (!selected) return;
    setData(null); setActiveTab("General");
    authGet(`${API_BASE_URL}/api/Settings/Centre/${encodeURIComponent(selected)}`)
      .then(d => {
        if (!d) return;
        setData(d);
        setGeneral({ displayName: d.displayName || "", leCode: d.leCode || "", vatNumber: d.vatNumber || "", branch: d.branch || "" });
        setAddresses(d.addresses?.length ? d.addresses : []);
        setContacts(d.contacts?.length ? d.contacts : []);
        setLogoUrl(d.logoUrl || ""); setLogoPreview(d.logoUrl || "");
        setTaxItems(d.tax || []);
        if (d.numbering) setNumbering(d.numbering);
        if (d.setup)     setSetup(s => ({
          ...s,
          ...d.setup,
          // keep numeric advance inputs controlled when DB value is null
          advMaxCap:       d.setup.advMaxCap       == null ? "" : d.setup.advMaxCap,
          advValidityDays: d.setup.advValidityDays == null ? "" : d.setup.advValidityDays,
        }));
      });
  }, [selected]);

  const handleDeleteCentre = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete centre "${selected}"? This can only be done if no data exists in other sections (Address, Contact, Tax etc.).`)) return;
    try {
      const res = await authDelete(`${API_BASE_URL}/api/Settings/Centre/${encodeURIComponent(selected)}`);
      if (res.success === false) { showToast(res.message || "Delete failed.", "error"); return; }
      showToast(`Centre "${selected}" deleted successfully.`, "success");
      setSelected(null); setData(null);
      fetchCentres();
    } catch (e) { showToast(e.message || "Delete failed.", "error"); }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const u = getUser();
      const by = u.employeeCode || u.userId || "";
      let res;

      if (activeTab === "General") {
        // Centre Code and Name are read-only; only Legal Entity and Display Name can be updated
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveGeneral`, {
          centerCode:  selected,
          leCode:      general.leCode      || "",
          displayName: general.displayName || "",
        });
      } else if (activeTab === "Address") {
        if (!addresses.length) throw new Error("At least one address is required.");
        if (!addresses.some(a => a.isPrimary === true))
          throw new Error("A primary address is mandatory.");
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveAddresses`, { centerCode: selected, addresses });
      } else if (activeTab === "Contact") {
        if (!contacts.some(c => c.isPrimary && c.contactType === "Phone"))
          throw new Error("A primary phone number is mandatory.");
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveContacts`, { centerCode: selected, contacts });
      } else if (activeTab === "Logo") {
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveLogo`, { centerCode: selected, logoUrl, mimeType:"image/*" });
      } else if (activeTab === "Tax") {
        // FRD §3.5: if Type is selected, Registration Number is mandatory.
        const incomplete = taxItems.findIndex(t => (t.taxType || "").trim() && !(t.regNumber || "").trim());
        if (incomplete !== -1)
          throw new Error(`Registration Number is required for "${taxItems[incomplete].taxType}".`);
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveTax`, { centerCode: selected, taxItems });
      } else if (activeTab === "Numbering") {
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveNumbering`, { centerCode: selected, numbering });
      } else if (activeTab === "Setup" || activeTab === "Advance") {
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveSetup`, { centerCode: selected, setup });
      }

      if (res && !res.success) throw new Error(res.message);
      showToast(res?.message || "Saved successfully.");

      // Auto advance tab
      const idx = TABS.indexOf(activeTab);
      if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const setPrimary = (idx) => setContacts(p => p.map((c, i) => ({ ...c, isPrimary: i === idx })));
  // FRD §3.5: tax country is DERIVED from the entity currency (General tab), not chosen here.
  const _entityLE  = legalEntities.find(le => le.leCode === general.leCode) || legalEntities[0] || {};
  const taxCountry = _entityLE.country || CURRENCY_TO_COUNTRY[_entityLE.currency] || "Saudi Arabia";
  const availableTaxTypes = TAX_TYPES[taxCountry] || [];

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh", color:"#10223f" }}>
      {!canEdit && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          background:"#f0f4fa", border:"1px solid #c8d5e8", color:"#334b71", fontWeight:600 }}>
          👁 View Only — Create, edit and delete actions are restricted to Admin users at entity level.
        </div>
      )}

      <style>{`
        .cs-wrap { max-width:1100px; margin:0 auto; padding:28px 20px 60px; display:grid; grid-template-columns:240px 1fr; gap:20px; }
        .cs-sidebar { background:#fff; border:1px solid #e7ecf4; border-radius:12px; padding:16px; height:fit-content; }
        .cs-sidebar h3 { font-size:13px; font-weight:800; color:#334b71; margin:0 0 12px; }
        .cs-centre-btn { width:100%; text-align:left; padding:10px 12px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; margin-bottom:4px; display:flex; align-items:center; gap:8px; }
        .cs-centre-btn.active { background:#334b71; color:#fff; }
        .cs-centre-btn:not(.active) { background:#f8fafc; color:#334b71; }
        .cs-centre-btn:not(.active):hover { background:#e9edf5; }
        .cs-main { background:#fff; border:1px solid #e7ecf4; border-radius:12px; overflow:hidden; }
        .cs-header { padding:16px 20px; border-bottom:1px solid #e7ecf4; display:flex; justify-content:space-between; align-items:center; }
        .cs-tabs { display:flex; border-bottom:2px solid #e7ecf4; padding:0 20px; }
        .cs-tab { padding:12px 16px; font-weight:700; font-size:12px; cursor:pointer; color:#8da0b8; border-bottom:3px solid transparent; margin-bottom:-2px; }
        .cs-tab.active { color:#334b71; border-bottom-color:#334b71; }
        .cs-body { padding:20px; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .field { display:flex; flex-direction:column; gap:5px; }
        .field label { font-size:12px; font-weight:700; color:#2a3b57; }
        .field input,.field select,.field textarea { border:1px solid #e7ecf4; border-radius:8px; padding:10px 12px; font-size:13px; outline:none; width:100%; box-sizing:border-box; }
        .field input:focus,.field select:focus { border-color:#334b71; }
        .card-inner { border:1px solid #e7ecf4; border-radius:10px; padding:16px; margin-bottom:12px; }
        .save-btn { background:#334b71; color:#fff; border:none; border-radius:10px; padding:10px 22px; font-weight:800; font-size:13px; cursor:pointer; }
        .save-btn:disabled { opacity:0.55; cursor:not-allowed; }
        .add-btn { background:#fff; border:1px solid #e7ecf4; border-radius:8px; padding:7px 14px; font-weight:700; font-size:12px; color:#334b71; cursor:pointer; }
        .del-btn { background:none; border:none; color:#b91c1c; cursor:pointer; font-size:18px; padding:0 4px; }
        .primary-badge { background:#e6f4ef; color:#2e7d5e; border:1px solid #b3d9cc; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:700; }
        @media(max-width:768px){ .cs-wrap{ grid-template-columns:1fr; } }
      `}</style>

      <div className="cs-wrap">
        {/* Sidebar — centre list */}
        <div className="cs-sidebar">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <h3 style={{ margin:0 }}> Centres</h3>
            {canCreate && (
              <button onClick={() => { setSelected(null); setData(null); setIsCreating(true); }}
                style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:6,
                  padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                + New
              </button>
            )}
          </div>
          {loading ? <div style={{ fontSize:12, color:"#94a3b8" }}>Loading…</div> :
            centres.length === 0 ? <div style={{ fontSize:12, color:"#94a3b8" }}>No centres found.</div> :
            centres.map(c => (
              <button key={c.centerCode}
                className={`cs-centre-btn ${selected === c.centerCode ? "active" : ""}`}
                onClick={() => { setSelected(c.centerCode); setIsCreating(false); }}>
                <span></span>
                <div>
                  <div>{c.centreName}</div>
                  <div style={{ fontSize:10, opacity:0.7 }}>{c.centerCode}</div>
                </div>
              </button>
            ))
          }
        </div>

        {/* Main panel */}
        <div className="cs-main">
          {isCreating ? (
            <CreateCentreForm
              onSaved={(code) => {
                setIsCreating(false);
                fetchCentres().then(() => {
                  setSelected(code);
                  setActiveTab("Address"); // auto-open Address tab after creation
                });
              }}
              onCancel={() => setIsCreating(false)}
            />
          ) : !selected ? (
            <div style={{ padding:60, textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:36, marginBottom:12 }}></div>
              <div style={{ fontWeight:700, fontSize:15, color:"#334b71", marginBottom:6 }}>Select a Centre</div>
              <div style={{ fontSize:13 }}>Choose a centre from the left to configure its settings.</div>
            </div>
          ) : !data ? (
            <div style={{ padding:60, textAlign:"center", color:"#64748b" }}>Loading centre details…</div>
          ) : (
            <>
              {/* Header */}
              <div className="cs-header">
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#071D49" }}> {data.centreName}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{data.centerCode} · {data.address}</div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  {canDelete && (
                    <button onClick={handleDeleteCentre}
                      style={{ padding:"9px 16px", background:"#fef2f2", color:"#b91c1c",
                        border:"1px solid #fecaca", borderRadius:10, fontWeight:700,
                        fontSize:13, cursor:"pointer" }}>
                      🗑 Delete Centre
                    </button>
                  )}
                  <button className="save-btn" onClick={handleSave} disabled={saving || !canEdit}>
                    {saving ? "Saving…" : "💾 Save Centre"}
                  </button>
                </div>
              </div>

              {/* Toast */}
              {toast && (
                <div style={{ margin:"0 20px 0", padding:"10px 16px", borderRadius:8, fontWeight:600, fontSize:13,
                  background:toast.type==="error"?"#fdf3f3":"#e6f4ef",
                  border:`1px solid ${toast.type==="error"?"#f0c4c0":"#b3d9cc"}`,
                  color:toast.type==="error"?"#b91c1c":"#2e7d5e" }}>
                  {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
                </div>
              )}

              {/* Tabs */}
              <div className="cs-tabs">
                {TABS.map(t => (
                  <div key={t} className={`cs-tab ${activeTab===t?"active":""}`} onClick={() => setActiveTab(t)}>
                    {t==="General"?"":t==="Address"?"":t==="Contact"?"":t==="Logo"?"":t==="Tax"?"":t==="Numbering"?"#":t==="Setup"?"":""} {t}
                  </div>
                ))}
              </div>

              <div className="cs-body">

                {/* ── GENERAL TAB ── */}
                {activeTab === "General" && (
                  <div className="card-inner">
                    <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}> General Information</div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>Primary identification and operational details of the Centre.</div>
                    <div className="grid-2">
                      <div className="field">
                        <label>Legal Entity Code *</label>
                        <select value={general.leCode} onChange={e => setGeneral(p => ({ ...p, leCode: e.target.value }))}>
                          <option value="">Select Legal Entity…</option>
                          {legalEntities.map(le => <option key={le.leCode} value={le.leCode}>{le.leName} ({le.leCode})</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label>Centre Code *</label>
                        <input value={data.centerCode} readOnly style={{ background:"#f8fafc", color:"#64748b" }}
                          placeholder="e.g., CTR-001" />
                      </div>
                      <div className="field">
                        <label>Name *</label>
                        <input value={data.centreName} readOnly style={{ background:"#f8fafc", color:"#64748b" }}
                          placeholder="Official Centre name" />
                      </div>
                      <div className="field">
                        <label>Display Name</label>
                        <input value={general.displayName} maxLength={20}
                          onChange={e => setGeneral(p => ({ ...p, displayName: e.target.value }))}
                          placeholder="User-friendly name" />
                      </div>
                    </div>
                    <div style={{ marginTop:14, padding:"10px 14px", background:"#f8fafc",
                      border:"1px solid #e7ecf4", borderRadius:8, fontSize:12, color:"#64748b" }}>
                      Each Centre must be linked to a valid Legal Entity. Centre code must be unique within the organization.
                    </div>
                  </div>
                )}

                {/* ── ADDRESS TAB ── */}
                {activeTab === "Address" && (
                  <div className="card-inner">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:14, color:"#071D49" }}> Address Information</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Multiple addresses allowed; one must be marked primary.</div>
                      </div>
                      <button className="add-btn" onClick={() => setAddresses(p => [...p, { description:"", address:"", isPrimary: p.length === 0 }])}>
                        + Add Address
                      </button>
                    </div>
                    {addresses.length === 0 && (
                      <div style={{ textAlign:"center", padding:"30px 0", color:"#94a3b8", fontSize:13 }}>
                        No addresses added yet. Click "+ Add Address" to begin.
                      </div>
                    )}
                    {addresses.map((a, idx) => (
                      <div key={idx} style={{ border:"1px solid #e7ecf4", borderRadius:8, padding:14, marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontWeight:700, fontSize:13 }}>
                            Address #{idx+1} {a.isPrimary && <span className="primary-badge">Primary</span>}
                          </span>
                          <button className="del-btn" onClick={() => setAddresses(p => p.filter((_,i) => i !== idx))}>🗑</button>
                        </div>
                        <div className="field" style={{ marginBottom:10 }}>
                          <label>Description * <span style={{ color:"#94a3b8", fontWeight:400 }}>(max 60 chars)</span></label>
                          <input value={a.description} maxLength={60} placeholder="e.g. Head Office"
                            onChange={e => setAddresses(p => p.map((x,i) => i===idx ? {...x, description:e.target.value} : x))} />
                        </div>
                        <div className="field" style={{ marginBottom:10 }}>
                          <label>Full Address * <span style={{ color:"#94a3b8", fontWeight:400 }}>(max 255 chars)</span></label>
                          <textarea value={a.address} maxLength={255} rows={3} placeholder="Complete address"
                            style={{ border:"1px solid #e7ecf4", borderRadius:8, padding:"10px 12px", fontSize:13,
                              width:"100%", boxSizing:"border-box", resize:"vertical", outline:"none" }}
                            onChange={e => setAddresses(p => p.map((x,i) => i===idx ? {...x, address:e.target.value} : x))} />
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:44, height:24, borderRadius:24,
                            background:a.isPrimary?"#334b71":"#d3dbe8", position:"relative", cursor:"pointer" }}
                            onClick={() => setAddresses(p => p.map((x,i) => ({ ...x, isPrimary: i === idx })))}>
                            <div style={{ width:18, height:18, background:"#fff", borderRadius:"50%",
                              position:"absolute", top:3, left:a.isPrimary?23:3, transition:"all .2s",
                              boxShadow:"0 1px 3px rgba(0,0,0,.25)" }} />
                          </div>
                          <span style={{ fontSize:13, fontWeight:600 }}>Mark as primary address</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── CONTACT TAB ── */}
                {activeTab === "Contact" && (
                  <div className="card-inner">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:14, color:"#071D49" }}> Contact Information</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Primary phone number is mandatory.</div>
                      </div>
                      <button className="add-btn" onClick={() => setContacts(p => [...p, { description:"", contactType:"Phone", contactValue:"", isPrimary:false }])}>
                        + Add Contact
                      </button>
                    </div>
                    {contacts.map((c, idx) => (
                      <div key={idx} style={{ border:"1px solid #e7ecf4", borderRadius:8, padding:14, marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontWeight:700, fontSize:13 }}>
                            Contact #{idx+1} {c.isPrimary && <span className="primary-badge">Primary</span>}
                          </span>
                          <button className="del-btn" onClick={() => setContacts(p => p.filter((_,i)=>i!==idx))}>🗑</button>
                        </div>
                        <div className="grid-2">
                          <div className="field">
                            <label>Description *</label>
                            <input value={c.description} placeholder="e.g. Reception"
                              onChange={e => setContacts(p => p.map((x,i) => i===idx ? {...x, description:e.target.value} : x))} />
                          </div>
                          <div className="field">
                            <label>Type *</label>
                            <select value={c.contactType}
                              onChange={e => setContacts(p => p.map((x,i) => i===idx ? {...x, contactType:e.target.value} : x))}>
                              <option value="Phone">Phone</option>
                              <option value="Email">Email</option>
                            </select>
                          </div>
                          <div className="field" style={{ gridColumn:"1/-1" }}>
                            <label>{c.contactType==="Phone"?"Phone Number *":"Email Address *"}</label>
                            <input value={c.contactValue}
                              placeholder={c.contactType==="Phone"?"+966 11 000 0000":"clinic@example.com"}
                              onChange={e => setContacts(p => p.map((x,i) => i===idx ? {...x, contactValue:e.target.value} : x))} />
                          </div>
                        </div>
                        <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:44, height:24, borderRadius:24, background:c.isPrimary?"#334b71":"#d3dbe8", position:"relative", cursor:"pointer" }}
                            onClick={() => setPrimary(idx)}>
                            <div style={{ width:18, height:18, background:"#fff", borderRadius:"50%", position:"absolute", top:3, left:c.isPrimary?23:3, transition:"all .2s", boxShadow:"0 1px 3px rgba(0,0,0,.25)" }} />
                          </div>
                          <span style={{ fontSize:13, fontWeight:600 }}>Mark as primary</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── LOGO TAB ── */}
                {activeTab === "Logo" && (
                  <div className="card-inner">
                    <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}> Centre Logo</div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>Used on invoices, receipts, reports, and customer communications.</div>
                    <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                      <div style={{ width:80, height:80, border:"1px solid #e7ecf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc", overflow:"hidden" }}>
                        {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                          : <span style={{ fontSize:28, color:"#cbd5e1" }}></span>}
                      </div>
                      <div>
                        <button className="add-btn" onClick={() => fileRef.current?.click()}>⬆ Upload Logo</button>
                        <input type="file" ref={fileRef} accept=".png,.jpg,.jpeg,.svg" style={{ display:"none" }}
                          onChange={e => {
                            const file = e.target.files[0]; if (!file) return;
                            const allowed = ["image/jpeg","image/png","image/gif","image/svg+xml","image/webp"];
                            if (!allowed.includes(file.type)) { showToast("Unsupported format. Upload JPG, PNG, GIF, SVG or WebP.","error"); e.target.value=""; return; }
                            if (file.size > 5*1024*1024) { showToast("File exceeds 5MB limit.","error"); e.target.value=""; return; }
                            const reader = new FileReader();
                            reader.onload = ev => { setLogoPreview(ev.target.result); setLogoUrl(ev.target.result); };
                            reader.readAsDataURL(file);
                          }} />
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>PNG, JPG, or SVG. Recommended square format.</div>
                        {logoPreview && <button className="add-btn" style={{ marginTop:6, color:"#b91c1c", borderColor:"#f0c4c0" }}
                          onClick={() => { setLogoPreview(""); setLogoUrl(""); }}>Remove</button>}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAX TAB ── */}
                {activeTab === "Tax" && (
                  <div className="card-inner">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:14, color:"#071D49" }}> Tax Information</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Statutory registrations. Must comply with local regulations.</div>
                      </div>
                      <button className="add-btn" onClick={() => setTaxItems(p => [...p, { taxType:"", regNumber:"", country:taxCountry }])}>
                        + Add Tax
                      </button>
                    </div>
                    <div className="field" style={{ marginBottom:14, maxWidth:240 }}>
                      <label>Country</label>
                      <input value={taxCountry} readOnly tabIndex={-1}
                        style={{ background:"#f1f5f9", color:"#475569", cursor:"not-allowed" }} />
                      <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>
                        Set automatically from the Legal Entity currency.
                      </div>
                    </div>
                    {taxItems.map((t, idx) => (
                      <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:10, alignItems:"center", marginBottom:10 }}>
                        <select value={t.taxType}
                          onChange={e => setTaxItems(p => p.map((x,i) => i===idx ? {...x, taxType:e.target.value} : x))}>
                          <option value="">Select Type…</option>
                          {availableTaxTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                        </select>
                        <input value={t.regNumber} placeholder="Registration number"
                          onChange={e => setTaxItems(p => p.map((x,i) => i===idx ? {...x, regNumber:e.target.value} : x))} />
                      </div>
                    ))}
                    {taxItems.length === 0 && <div style={{ textAlign:"center", padding:20, color:"#94a3b8", fontSize:13 }}>No tax registrations added.</div>}
                  </div>
                )}

                {/* ── NUMBERING TAB ── */}
                {activeTab === "Numbering" && (
                  <div className="card-inner">
                    <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}># Number Sequence Prefixes</div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>Prefixes used when generating transaction document numbers. Old transactions are not affected when changed.</div>
                    <div className="grid-2">
                      {[
                        { label:"Customer Account *",  key:"prefixCustomer",   ex:"CUST-" },
                        { label:"Sales Invoice *",      key:"prefixInvoice",    ex:"INV-" },
                        { label:"Sales Return *",       key:"prefixReturn",     ex:"SR-" },
                        { label:"Credit Note *",        key:"prefixCreditNote", ex:"CN-" },
                        { label:"Advance Payment *",    key:"prefixAdvance",    ex:"ADV-" },
                        { label:"Gift Card *",          key:"prefixGiftCard",   ex:"GC-" },
                      ].map(({ label, key, ex }) => (
                        <div key={key} className="field">
                          <label>{label}</label>
                          <input value={numbering[key]} placeholder={ex}
                            onChange={e => setNumbering(p => ({ ...p, [key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:14, padding:"10px 14px", background:"#fef3c7", border:"1px solid #fcd34d", borderRadius:8, fontSize:12, color:"#92400e" }}>
                      ⚠ Changing a prefix only affects new transactions. All existing records keep their original numbers.
                    </div>
                  </div>
                )}

                {/* ── SETUP TAB ── */}
                {activeTab === "Setup" && (
                  <>
                    {/* Gift Card */}
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:12 }}>🎁 Gift Card Configurations</div>
                      <div className="grid-2">
                        <div className="field">
                          <label>Validity in days from purchase *</label>
                          <input type="number" min={1} value={setup.giftCardValidityDays}
                            onChange={e => setSetup(p => ({ ...p, giftCardValidityDays: e.target.value }))}
                            placeholder="e.g. 365" />
                        </div>
                        <div className="field">
                          <label>Minimum amount *</label>
                          <input type="number" min={1} value={setup.giftCardMinAmount}
                            onChange={e => setSetup(p => ({ ...p, giftCardMinAmount: e.target.value }))}
                            placeholder="e.g. 100" />
                        </div>
                      </div>
                    </div>

                    {/* Sales */}
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}>💳 Sales Configurations</div>
                      <Toggle value={setup.allowMultiPayment}      onChange={() => setSetup(p=>({...p,allowMultiPayment:!p.allowMultiPayment}))}
                        label="Allow multiple payment methods in a single transaction"
                        sub="Multiple payment methods in a single transaction." />
                      <Toggle value={setup.allowMultiPractitioner} onChange={() => setSetup(p=>({...p,allowMultiPractitioner:!p.allowMultiPractitioner}))}
                        label="Allow multiple practitioners in the same invoice"
                        sub="Link multiple practitioners within one invoice." />
                      <Toggle value={setup.allowPkgServiceBilling} onChange={() => setSetup(p=>({...p,allowPkgServiceBilling:!p.allowPkgServiceBilling}))}
                        label="Allow package and service billing in the same invoice"
                        sub="Mixed billing of packages and services." />
                      <div style={{ opacity: setup.allowPkgServiceBilling ? 1 : 0.4, pointerEvents: setup.allowPkgServiceBilling ? "auto" : "none" }}>
                        <Toggle value={setup.allowPkgSvcPrdBilling} onChange={() => setSetup(p=>({...p,allowPkgSvcPrdBilling:!p.allowPkgSvcPrdBilling}))}
                          label="Allow package, service and product billing in the same invoice"
                          sub="Includes products alongside packages and services. Requires above toggle to be ON." />
                      </div>
                    </div>

                    {/* Sales Return */}
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:12 }}>↩ Sales Return Configurations</div>
                      <Toggle value={setup.allowSalesReturn}
                        onChange={() => setSetup(p => ({
                          ...p,
                          allowSalesReturn: !p.allowSalesReturn,
                          ...(!p.allowSalesReturn ? {} : { allowReturnPackages:false, allowReturnServices:false, allowReturnProducts:false })
                        }))}
                        label="Allow Sales Return" sub="Master toggle — disables all return options when off" />
                      <div style={{ opacity: setup.allowSalesReturn ? 1 : 0.4, pointerEvents: setup.allowSalesReturn ? "auto" : "none", marginTop:12 }}>
                        <div className="field" style={{ marginBottom:16, maxWidth:260 }}>
                          <label>Return validity in days from purchase *</label>
                          <input type="number" min={1} value={setup.returnWindowDays}
                            onChange={e => setSetup(p => ({ ...p, returnWindowDays: e.target.value }))}
                            placeholder="e.g. 30" disabled={!setup.allowSalesReturn} />
                        </div>
                        <Toggle value={setup.allowReturnPackages} onChange={() => setSetup(p=>({...p,allowReturnPackages:!p.allowReturnPackages}))}
                          label="Allow return of packages" sub="" />
                        <Toggle value={setup.allowReturnServices} onChange={() => setSetup(p=>({...p,allowReturnServices:!p.allowReturnServices}))}
                          label="Allow return of services" sub="" />
                        <Toggle value={setup.allowReturnProducts} onChange={() => setSetup(p=>({...p,allowReturnProducts:!p.allowReturnProducts}))}
                          label="Allow return of products" sub="" />
                      </div>
                    </div>

                    {/* Appointment */}
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}>📅 Appointment Configurations</div>
                      <Toggle value={setup.allowOnlineBooking} onChange={() => setSetup(p=>({...p,allowOnlineBooking:!p.allowOnlineBooking}))}
                        label="Allow Online Booking" sub="Customers can book appointments online" />
                      <Toggle value={setup.allowCancellation}
                        onChange={() => setSetup(p => ({
                          ...p, allowCancellation: !p.allowCancellation,
                          ...(!p.allowCancellation ? {} : { cancellationWindowHours: 24 })
                        }))}
                        label="Allow Cancellation" sub="Customers can cancel appointments" />
                      {setup.allowCancellation && (
                        <div className="field" style={{ marginBottom:16, maxWidth:260, marginLeft:16 }}>
                          <label>Cancellation window (hours before appointment)</label>
                          <input type="number" min={0} value={setup.cancellationWindowHours}
                            onChange={e => setSetup(p => ({ ...p, cancellationWindowHours: e.target.value }))}
                            placeholder="e.g. 24" />
                        </div>
                      )}
                      <Toggle value={setup.roomMandatory}      onChange={() => setSetup(p=>({...p,roomMandatory:!p.roomMandatory}))}
                        label="Room selection mandatory for appointment booking" sub="" />
                      <Toggle value={setup.equipmentMandatory} onChange={() => setSetup(p=>({...p,equipmentMandatory:!p.equipmentMandatory}))}
                        label="Equipment selection mandatory for appointment booking" sub="" />
                      <Toggle value={setup.allowOverbooking}   onChange={() => setSetup(p=>({...p,allowOverbooking:!p.allowOverbooking}))}
                        label="Allow overbooking of practitioners in the same time slot" sub="" />
                    </div>
                  </>
                )}

                {/* ── ADVANCE TAB ── */}
                {activeTab === "Advance" && (
                  <>
                    {/* Advance limits & validity */}
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:12 }}>Advance Payment Configurations</div>
                      <div className="grid-2">
                        <div className="field">
                          <label>Maximum Advance Cap</label>
                          <input type="number" min={0} step={1} value={setup.advMaxCap}
                            onChange={e => setSetup(p => ({ ...p, advMaxCap: e.target.value }))}
                            placeholder="Leave blank for no cap" />
                        </div>
                        <div className="field">
                          <label>Validity in days from purchase</label>
                          <input type="number" min={1} step={1} value={setup.advValidityDays}
                            onChange={e => setSetup(p => ({ ...p, advValidityDays: e.target.value }))}
                            placeholder="Leave blank for no expiry" />
                        </div>
                      </div>
                      <Toggle value={setup.advAllowValidityExtension}
                        onChange={() => setSetup(p=>({...p,advAllowValidityExtension:!p.advAllowValidityExtension}))}
                        label="Allow validity to be extended"
                        sub="Expired advances can be extended from the customer profile (Admin only)." />
                    </div>

                    {/* Redemption scope */}
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}>Allow Advance Redemption On</div>
                      <Toggle value={setup.advAllowRedeemServices} onChange={() => setSetup(p=>({...p,advAllowRedeemServices:!p.advAllowRedeemServices}))}
                        label="Services" sub="Advance balance can be redeemed against service invoices." />
                      <Toggle value={setup.advAllowRedeemPackages} onChange={() => setSetup(p=>({...p,advAllowRedeemPackages:!p.advAllowRedeemPackages}))}
                        label="Packages" sub="Advance balance can be redeemed against packages." />
                      <Toggle value={setup.advAllowRedeemProducts} onChange={() => setSetup(p=>({...p,advAllowRedeemProducts:!p.advAllowRedeemProducts}))}
                        label="Products" sub="Advance balance can be redeemed against products." />
                    </div>

                    {/* Tax handling */}
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:12 }}>Tax Handling</div>

                      {/* Locals (Citizen) */}
                      <Toggle value={setup.advTaxableLocals} onChange={() => setSetup(p=>({...p,advTaxableLocals:!p.advTaxableLocals}))}
                        label="Taxable for Locals (Citizen)"
                        sub="Customers whose nationality matches the legal entity country. Off = non-taxable (e.g. security deposit), no VAT entry." />
                      <div className="field" style={{ maxWidth:260, margin:"8px 0 16px",
                        opacity: setup.advTaxableLocals ? 1 : 0.4, pointerEvents: setup.advTaxableLocals ? "auto" : "none" }}>
                        <label>VAT Rate (Locals) *</label>
                        <select value={setup.advVatRateLocals} disabled={!setup.advTaxableLocals}
                          onChange={e => setSetup(p => ({ ...p, advVatRateLocals: e.target.value }))}
                          style={{ width:"100%", padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:6,
                            fontSize:13, fontFamily:"Lato,sans-serif", outline:"none", boxSizing:"border-box", background:"#fff" }}>
                          <option value="STANDARD">Standard (15%)</option>
                          <option value="ZERO">Zero-Rated (0%)</option>
                          <option value="EXEMPT">Exempt</option>
                        </select>
                      </div>

                      {/* Expats */}
                      <Toggle value={setup.advTaxableExpats} onChange={() => setSetup(p=>({...p,advTaxableExpats:!p.advTaxableExpats}))}
                        label="Taxable for Expats"
                        sub="Customers whose nationality differs from the legal entity country. Off = non-taxable, no VAT entry." />
                      <div className="field" style={{ maxWidth:260, margin:"8px 0 0",
                        opacity: setup.advTaxableExpats ? 1 : 0.4, pointerEvents: setup.advTaxableExpats ? "auto" : "none" }}>
                        <label>VAT Rate (Expats) *</label>
                        <select value={setup.advVatRateExpats} disabled={!setup.advTaxableExpats}
                          onChange={e => setSetup(p => ({ ...p, advVatRateExpats: e.target.value }))}
                          style={{ width:"100%", padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:6,
                            fontSize:13, fontFamily:"Lato,sans-serif", outline:"none", boxSizing:"border-box", background:"#fff" }}>
                          <option value="STANDARD">Standard (15%)</option>
                          <option value="ZERO">Zero-Rated (0%)</option>
                          <option value="EXEMPT">Exempt</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Bottom save */}
                <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:16 }}>
                  <button className="save-btn" onClick={handleSave} disabled={saving || !canEdit}>
                    {saving ? "Saving…" : "💾 Save Centre"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}