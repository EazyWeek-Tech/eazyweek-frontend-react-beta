import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser  = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const authGet  = async (url) => { const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => { const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };

const TABS = ["General","Address","Contact","Logo","Tax","Setup"];
const PURPOSES = ["Head Office","Billing","Shipping","Office Branch"];
const TIMEZONES = [
  "Asia/Riyadh","Asia/Dubai","Asia/Kolkata","Asia/Singapore",
  "Asia/Kuwait","Asia/Bahrain","Asia/Muscat","Asia/Qatar",
  "Europe/London","America/New_York","UTC",
];
const CURRENCIES = ["SAR","AED","INR","SGD","BHD","OMR","QAR","KWD","USD","GBP","EUR"];

export default function LegalEntitySetup() {





  // ── Access Rights ─────────────────────────────────────────────────────────
  // Create / Edit / Delete = Admin or ProductTeam AT ENTITY LEVEL only
  const _rights = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s+/g, "");
      const ALLOWED   = ["admin", "productteam"];
      const isAdmin   = ALLOWED.includes(role);
      const isEntityLevel = u.isEntityLevel === true;
      const canManage = isAdmin && isEntityLevel;
      return { isAdmin, isEntityLevel, canCreate: canManage, canEdit: canManage, canDelete: canManage };
    } catch {
      return { isAdmin:false, isEntityLevel:false, canCreate:false, canEdit:false, canDelete:false };
    }
  })();
  const { isAdmin, isEntityLevel, canCreate, canEdit, canDelete } = _rights;

  const [activeTab,     setActiveTab]     = useState("General");
  const [existing,      setExisting]      = useState(null);   // null = not loaded, false = doesn't exist
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState(null);
  const [errors,        setErrors]        = useState({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [taxTypes,      setTaxTypes]      = useState({});

  // ── General ────────────────────────────────────────────────────────────────
  const [general, setGeneral] = useState({ leCode:"", leName:"", displayName:"", timezone:"", currency:"" });

  // ── Addresses ─────────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState([{ description:"", address:"", purpose:"Head Office", isPrimary:true }]);

  // ── Contacts ──────────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState([{ description:"", contactType:"Phone", contactValue:"", isPrimary:true }]);

  // ── Logo ───────────────────────────────────────────────────────────────────
  const [logoUrl,    setLogoUrl]    = useState("");
  const [logoPreview,setLogoPreview]= useState("");
  const fileRef = useRef();

  // ── Tax ────────────────────────────────────────────────────────────────────
  const [taxItems, setTaxItems] = useState([]);
  const [taxCountry, setTaxCountry] = useState("");

  // ── Setup ──────────────────────────────────────────────────────────────────
  const [setup, setSetup] = useState({
    allowCrossSearch: false, crossSearchMode: "Centre Level",
    allowDuplicateMobile: false, emailOptional: true, allowDuplicateEmail: false,
  });

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  // Load on mount
  useEffect(() => {
    Promise.all([
      authGet(`${API_BASE_URL}/api/Settings/LegalEntity`),
      authGet(`${API_BASE_URL}/api/Settings/LegalEntity/TaxTypes`),
    ]).then(([le, tt]) => {
      setTaxTypes(tt || {});
      if (le && le.leCode) {
        setExisting(le);
        setGeneral({ leCode: le.leCode, leName: le.leName, displayName: le.displayName, timezone: le.timezone, currency: le.currency });
        if (le.addresses?.length) setAddresses(le.addresses);
        if (le.contacts?.length)  setContacts(le.contacts);
        if (le.logoUrl)           { setLogoUrl(le.logoUrl); setLogoPreview(le.logoUrl); }
        if (le.tax?.length)       setTaxItems(le.tax);
        if (le.setup)             setSetup(le.setup);
      } else {
        setExisting(false);
      }
    }).catch(() => setExisting(false))
    .finally(() => setLoading(false));
  }, []);

  // ── General save ───────────────────────────────────────────────────────────
  const handleSaveGeneral = async () => {
    setSaveAttempted(true);
    const e = {};
    if (!general.leCode.trim() || general.leCode.length !== 4) e.leCode = "Must be exactly 4 characters.";
    if (!general.leName.trim())       e.leName      = "Name is required.";
    if (!general.displayName.trim())  e.displayName = "Display Name is required.";
    if (!general.timezone)            e.timezone    = "Time Zone is required.";
    if (!general.currency)            e.currency    = "Currency is required.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const u = getUser();
      const res = await authPost(`${API_BASE_URL}/api/Settings/LegalEntity/Create`, {
        ...general, leCode: general.leCode.trim().toUpperCase(),
        createdBy: u.employeeCode || u.userId || "",
      });
      if (!res.success) throw new Error(res.message);
      const le = await authGet(`${API_BASE_URL}/api/Settings/LegalEntity`);
      setExisting(le);
      showToast(res.message || "Legal Entity created.");
      setActiveTab("Address");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Address save ───────────────────────────────────────────────────────────
  const handleSaveAddresses = async () => {
    setSaveAttempted(true);
    if (!addresses.some(a => a.isPrimary)) { showToast("A primary address is mandatory.", "error"); return; }
    setSaving(true);
    try {
      const res = await authPost(`${API_BASE_URL}/api/Settings/LegalEntity/SaveAddresses`, {
        leCode: existing.leCode, addresses,
      });
      if (!res.success) throw new Error(res.message);
      showToast("Addresses saved."); setActiveTab("Contact");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Contact save ───────────────────────────────────────────────────────────
  const handleSaveContacts = async () => {
    if (!contacts.some(c => c.isPrimary && c.contactType === "Phone")) {
      showToast("A primary phone number is mandatory.", "error"); return;
    }
    setSaving(true);
    try {
      const res = await authPost(`${API_BASE_URL}/api/Settings/LegalEntity/SaveContacts`, {
        leCode: existing.leCode, contacts,
      });
      if (!res.success) throw new Error(res.message);
      showToast("Contacts saved."); setActiveTab("Logo");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Logo save ──────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/jpeg","image/png","image/gif","image/svg+xml","image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("Unsupported file format. Please upload JPG, PNG, GIF, SVG or WebP.", "error");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit. Please upload a smaller image.", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => { setLogoPreview(ev.target.result); setLogoUrl(ev.target.result); };
    reader.readAsDataURL(file);
  };


  const handleSaveLogo = async () => {
    setSaving(true);
    try {
      const res = await authPost(`${API_BASE_URL}/api/Settings/LegalEntity/SaveLogo`, {
        leCode: existing.leCode, logoUrl, mimeType: "image/*",
      });
      if (!res.success) throw new Error(res.message);
      showToast("Logo saved."); setActiveTab("Tax");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Tax save ───────────────────────────────────────────────────────────────
  const handleSaveTax = async () => {
    setSaving(true);
    try {
      const res = await authPost(`${API_BASE_URL}/api/Settings/LegalEntity/SaveTax`, {
        leCode: existing.leCode, taxItems,
      });
      if (!res.success) throw new Error(res.message);
      showToast("Tax registrations saved."); setActiveTab("Setup");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Setup save ─────────────────────────────────────────────────────────────
  const handleSaveSetup = async () => {
    setSaving(true);
    try {
      const res = await authPost(`${API_BASE_URL}/api/Settings/LegalEntity/SaveSetup`, {
        leCode: existing.leCode, setup,
      });
      if (!res.success) throw new Error(res.message);
      showToast("Setup configurations saved.");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleSave = () => {
    const handlers = {
      General: handleSaveGeneral, Address: handleSaveAddresses,
      Contact: handleSaveContacts, Logo: handleSaveLogo,
      Tax: handleSaveTax, Setup: handleSaveSetup,
    };
    handlers[activeTab]?.();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setPrimary = (list, setList, idx) =>
    setList(list.map((item, i) => ({ ...item, isPrimary: i === idx })));

  const availableTaxTypes = taxCountry ? (taxTypes[taxCountry] || []) : Object.values(taxTypes).flat();

  if (loading) return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading Legal Entity…</div>;

  // ── Access Guard ─────────────────────────────────────────────────────────────
  // Block non-admin / non-ProductTeam users from seeing the page at all
  if (!isAdmin) return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      minHeight:"60vh", fontFamily:"Lato,sans-serif", gap:12,
    }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:800, color:"#b91c1c" }}>Access Denied</div>
      <div style={{ fontSize:13, color:"#64748b", textAlign:"center", maxWidth:380 }}>
        You do not have permission to access Legal Entity Setup.<br/>
        This area is restricted to <strong>Admin</strong> and <strong>Product Team</strong> users only.
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh", color:"#10223f" }}>
      {!canEdit && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          background:"#f0f4fa", border:"1px solid #c8d5e8", color:"#334b71", fontWeight:600 }}>
          👁 View Only — Only Admins at entity level can make changes.
        </div>
      )}

      <style>{`
        .le-wrap { max-width:900px; margin:0 auto; padding:28px 20px 60px; }
        .le-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .le-title { font-size:22px; font-weight:800; color:#071D49; }
        .le-sub { font-size:13px; color:#64748b; margin-top:2px; }
        .le-tabs { display:flex; border-bottom:2px solid #e7ecf4; margin-bottom:20px; gap:0; }
        .le-tab { padding:12px 20px; font-weight:700; font-size:13px; cursor:pointer; color:#8da0b8; border-bottom:3px solid transparent; margin-bottom:-2px; transition:all .15s; }
        .le-tab.active { color:#334b71; border-bottom-color:#334b71; }
        .le-tab.disabled { opacity:0.4; cursor:not-allowed; }
        .le-card { background:#fff; border:1px solid #e7ecf4; border-radius:12px; padding:20px; margin-bottom:16px; }
        .le-card h3 { margin:0 0 4px; font-size:15px; font-weight:800; color:#071D49; }
        .le-card p  { margin:0 0 16px; font-size:12px; color:#64748b; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .field { display:flex; flex-direction:column; gap:5px; }
        .field label { font-size:12px; font-weight:700; color:#2a3b57; }
        .field input, .field select, .field textarea {
          border:1px solid #e7ecf4; border-radius:8px; padding:10px 12px; font-size:13px; outline:none; width:100%; box-sizing:border-box;
        }
        .field input:focus, .field select:focus { border-color:#334b71; }
        .field .err { color:#b91c1c; font-size:11px; }
        .field textarea { min-height:80px; resize:vertical; }
        .toggle-row { display:flex; justify-content:space-between; align-items:flex-start; padding:14px 0; border-bottom:1px solid #f1f5f9; }
        .toggle-row:last-child { border-bottom:none; }
        .toggle-label { font-size:13px; font-weight:600; color:#334b71; }
        .toggle-sub { font-size:11px; color:#94a3b8; margin-top:2px; }
        .switch { width:44px; height:24px; border-radius:24px; background:#d3dbe8; position:relative; cursor:pointer; flex-shrink:0; }
        .switch.on { background:#334b71; }
        .knob { width:18px; height:18px; background:#fff; border-radius:50%; position:absolute; top:3px; left:3px; transition:all .2s; box-shadow:0 1px 3px rgba(0,0,0,.25); }
        .switch.on .knob { left:23px; }
        .add-btn { background:#fff; border:1px solid #e7ecf4; border-radius:8px; padding:8px 14px; font-weight:700; font-size:12px; color:#334b71; cursor:pointer; }
        .add-btn:hover { background:#f1f5f9; }
        .del-btn { background:none; border:none; color:#b91c1c; cursor:pointer; font-size:18px; padding:0 4px; line-height:1; }
        .primary-badge { background:#e6f4ef; color:#2e7d5e; border:1px solid #b3d9cc; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:700; }
        .save-btn { background:#334b71; color:#fff; border:none; border-radius:10px; padding:11px 24px; font-weight:800; font-size:13px; cursor:pointer; }
        .save-btn:disabled { opacity:0.55; cursor:not-allowed; }
        @media (max-width:640px) { .grid-2 { grid-template-columns:1fr; } }
      `}</style>

      <div className="le-wrap">
        {/* Header */}
        <div className="le-header">
          <div>
            <div className="le-title">🏢 Legal Entity Setup</div>
            <div className="le-sub">Configure organisation, addresses, contacts &amp; policies</div>
          </div>
          <button className="save-btn" onClick={handleSave} disabled={saving || !canEdit}>
            {saving ? "Saving…" : "💾 Save Entity"}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:8, fontWeight:600, fontSize:13,
            background:toast.type==="error"?"#fdf3f3":"#e6f4ef",
            border:`1px solid ${toast.type==="error"?"#f0c4c0":"#b3d9cc"}`,
            color:toast.type==="error"?"#b91c1c":"#2e7d5e" }}>
            {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="le-tabs">
          {TABS.map(tab => (
            <div key={tab}
              className={`le-tab ${activeTab===tab?"active":""} ${!existing && tab!=="General"?"disabled":""}`}
              onClick={() => (existing || tab==="General") && setActiveTab(tab)}>
              {tab==="General"?"🏢 General":
               tab==="Address"?"📍 Address":
               tab==="Contact"?"📞 Contact":
               tab==="Logo"?"🖼 Logo":
               tab==="Tax"?"🧾 Tax":
               tab==="Setup"?"⚙ Setup":tab}
            </div>
          ))}
        </div>

        {/* ── GENERAL TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "General" && (
          <div className="le-card">
            <h3>General Information</h3>
            <p>Primary details used to uniquely identify and configure the Legal Entity.
              {existing && <span style={{ color:"#f59e0b", marginLeft:6 }}>⚠ General info cannot be modified once created.</span>}
            </p>
            <div className="grid-2">
              <div className="field">
                <label>Code * <span style={{ color:"#94a3b8", fontWeight:400 }}>(exactly 4 characters)</span></label>
                <input value={general.leCode} maxLength={4}
                  onChange={e => !existing && setGeneral(p => ({ ...p, leCode: e.target.value.toUpperCase() }))}
                  readOnly={!!existing}
                  style={{ background:existing?"#f8fafc":"#fff", borderColor: saveAttempted&&errors.leCode?"#b91c1c":undefined }}
                  placeholder="e.g. LE01" />
                {saveAttempted && errors.leCode && <span className="err">{errors.leCode}</span>}
              </div>
              <div className="field">
                <label>Name *</label>
                <input value={general.leName} readOnly={!!existing}
                  onChange={e => !existing && setGeneral(p => ({ ...p, leName: e.target.value }))}
                  style={{ background:existing?"#f8fafc":"#fff", borderColor: saveAttempted&&errors.leName?"#b91c1c":undefined }}
                  placeholder="Official legal name" />
                {saveAttempted && errors.leName && <span className="err">{errors.leName}</span>}
              </div>
              <div className="field">
                <label>Display Name * <span style={{ color:"#94a3b8", fontWeight:400 }}>(max 20 chars)</span></label>
                <input value={general.displayName} maxLength={20} readOnly={!!existing}
                  onChange={e => !existing && setGeneral(p => ({ ...p, displayName: e.target.value }))}
                  style={{ background:existing?"#f8fafc":"#fff", borderColor: saveAttempted&&errors.displayName?"#b91c1c":undefined }}
                  placeholder="Short display name" />
                {saveAttempted && errors.displayName && <span className="err">{errors.displayName}</span>}
              </div>
              <div className="field">
                <label>Time Zone *</label>
                <select value={general.timezone} disabled={!!existing}
                  onChange={e => setGeneral(p => ({ ...p, timezone: e.target.value }))}
                  style={{ background:existing?"#f8fafc":"#fff", borderColor: saveAttempted&&errors.timezone?"#b91c1c":undefined }}>
                  <option value="">Select timezone…</option>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
                {saveAttempted && errors.timezone && <span className="err">{errors.timezone}</span>}
              </div>
              <div className="field">
                <label>Currency *</label>
                <select value={general.currency} disabled={!!existing}
                  onChange={e => setGeneral(p => ({ ...p, currency: e.target.value }))}
                  style={{ background:existing?"#f8fafc":"#fff", borderColor: saveAttempted&&errors.currency?"#b91c1c":undefined }}>
                  <option value="">Select currency…</option>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {saveAttempted && errors.currency && <span className="err">{errors.currency}</span>}
              </div>
            </div>
            {!existing && (
              <div style={{ marginTop:14, padding:"10px 14px", background:"#e9edf5", borderRadius:8, fontSize:12, color:"#334b71" }}>
                Each Centre must be linked to a valid Legal Entity. Legal Entity code must be unique within the organisation.
              </div>
            )}
          </div>
        )}

        {/* ── ADDRESS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "Address" && (
          <div className="le-card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <h3>📍 Address Information</h3>
                <p style={{ margin:0 }}>Maintain multiple addresses. Exactly one must be marked as primary.</p>
              </div>
              <button className="add-btn" onClick={() => setAddresses(p => [...p, { description:"", address:"", purpose:"Billing", isPrimary:false }])}>
                + Add Address
              </button>
            </div>
            {addresses.map((addr, idx) => (
              <div key={idx} style={{ border:"1px solid #e7ecf4", borderRadius:10, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>
                    Address #{idx+1} {addr.isPrimary && <span className="primary-badge">Primary</span>}
                  </span>
                  <button className="del-btn" onClick={() => setAddresses(p => p.filter((_,i)=>i!==idx))}>🗑</button>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label>Description *</label>
                    <input value={addr.description} placeholder="e.g. Head Office"
                      onChange={e => setAddresses(p => p.map((a,i) => i===idx ? {...a, description:e.target.value} : a))} />
                  </div>
                  <div className="field">
                    <label>Purpose *</label>
                    <select value={addr.purpose}
                      onChange={e => setAddresses(p => p.map((a,i) => i===idx ? {...a, purpose:e.target.value} : a))}>
                      {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field" style={{ marginTop:10 }}>
                  <label>Address *</label>
                  <textarea value={addr.address} placeholder="Street, City, State, Postal Code, Country"
                    onChange={e => setAddresses(p => p.map((a,i) => i===idx ? {...a, address:e.target.value} : a))} />
                </div>
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
                  <div className={`switch ${addr.isPrimary?"on":""}`} onClick={() => setPrimary(addresses, setAddresses, idx)}>
                    <div className="knob"/>
                  </div>
                  <span style={{ fontSize:13, fontWeight:600 }}>Mark as primary address</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CONTACT TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "Contact" && (
          <div className="le-card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <h3>📞 Contact Information</h3>
                <p style={{ margin:0 }}>Official communication channels. Exactly one phone must be marked primary.</p>
              </div>
              <button className="add-btn" onClick={() => setContacts(p => [...p, { description:"", contactType:"Phone", contactValue:"", isPrimary:false }])}>
                + Add Contact
              </button>
            </div>
            {contacts.map((c, idx) => (
              <div key={idx} style={{ border:"1px solid #e7ecf4", borderRadius:10, padding:14, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>
                    Contact #{idx+1} {c.isPrimary && <span className="primary-badge">Primary</span>}
                  </span>
                  <button className="del-btn" onClick={() => setContacts(p => p.filter((_,i)=>i!==idx))}>🗑</button>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label>Description *</label>
                    <input value={c.description} placeholder="e.g. Support"
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
                  <div className="field" style={{ gridColumn:"1 / -1" }}>
                    <label>{c.contactType === "Phone" ? "Phone Number *" : "Email Address *"}</label>
                    <input value={c.contactValue}
                      placeholder={c.contactType==="Phone" ? "+1 555 0100" : "name@company.com"}
                      onChange={e => setContacts(p => p.map((x,i) => i===idx ? {...x, contactValue:e.target.value} : x))} />
                  </div>
                </div>
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
                  <div className={`switch ${c.isPrimary?"on":""}`} onClick={() => setPrimary(contacts, setContacts, idx)}>
                    <div className="knob"/>
                  </div>
                  <span style={{ fontSize:13, fontWeight:600 }}>Mark as primary contact</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── LOGO TAB ────────────────────────────────────────────────────────── */}
        {activeTab === "Logo" && (
          <div className="le-card">
            <h3>🖼 Logo</h3>
            <p>Used in invoices, reports, and customer-facing documents.</p>
            <div style={{ display:"flex", alignItems:"center", gap:20, marginTop:8 }}>
              <div style={{ width:80, height:80, border:"1px solid #e7ecf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc", overflow:"hidden" }}>
                {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                  : <span style={{ fontSize:28, color:"#cbd5e1" }}>🖼</span>}
              </div>
              <div>
                <button className="add-btn" onClick={() => fileRef.current?.click()}>⬆ Upload Logo</button>
                <input type="file" ref={fileRef} accept=".png,.jpg,.jpeg,.svg" style={{ display:"none" }} onChange={handleFileChange} />
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>PNG, JPG, or SVG. Recommended square format.</div>
                {logoPreview && <button className="add-btn" style={{ marginTop:6, color:"#b91c1c", borderColor:"#f0c4c0" }} onClick={() => { setLogoPreview(""); setLogoUrl(""); }}>Remove</button>}
              </div>
            </div>
          </div>
        )}

        {/* ── TAX TAB ─────────────────────────────────────────────────────────── */}
        {activeTab === "Tax" && (
          <div className="le-card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <h3>🧾 Tax Information</h3>
                <p style={{ margin:0 }}>Statutory registrations used for tax reporting and invoice generation.</p>
              </div>
              <button className="add-btn" onClick={() => setTaxItems(p => [...p, { taxType:"", regNumber:"", country: taxCountry }])}>
                + Add Registration
              </button>
            </div>
            <div className="field" style={{ marginBottom:14, maxWidth:260 }}>
              <label>Filter by Country</label>
              <select value={taxCountry} onChange={e => setTaxCountry(e.target.value)}>
                <option value="">All Countries</option>
                {Object.keys(taxTypes).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {taxItems.length === 0 && (
              <div style={{ textAlign:"center", padding:"20px 0", color:"#94a3b8", fontSize:13 }}>No tax registrations added. Click "+ Add Registration" to add one.</div>
            )}
            {taxItems.map((t, idx) => (
              <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 2fr auto", gap:10, alignItems:"center", marginBottom:10 }}>
                <select value={t.taxType}
                  onChange={e => setTaxItems(p => p.map((x,i) => i===idx ? {...x, taxType:e.target.value} : x))}>
                  <option value="">Select Type…</option>
                  {availableTaxTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                </select>
                <input value={t.regNumber} placeholder="Enter registration number"
                  onChange={e => setTaxItems(p => p.map((x,i) => i===idx ? {...x, regNumber:e.target.value} : x))} />
                <button className="del-btn" onClick={() => setTaxItems(p => p.filter((_,i)=>i!==idx))}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {/* ── SETUP TAB ───────────────────────────────────────────────────────── */}
        {activeTab === "Setup" && (
          <div className="le-card">
            <h3>⚙ Setup Configurations</h3>
            <p>Customer-related operational settings for the Legal Entity.</p>

            <div className="toggle-row">
              <div>
                <div className="toggle-label">Allow customer search across centres</div>
                <div className="toggle-sub">Enables customer search across centres either zone-wise or centre-wise.</div>
                {setup.allowCrossSearch && (
                  <div style={{ marginTop:10, display:"flex", gap:16 }}>
                    {["Centre Level","Zone Level"].map(mode => (
                      <label key={mode} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                        <input type="radio" name="crossMode" checked={setup.crossSearchMode===mode}
                          onChange={() => setSetup(p => ({ ...p, crossSearchMode: mode }))} />
                        {mode}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className={`switch ${setup.allowCrossSearch?"on":""}`} onClick={() => setSetup(p => ({ ...p, allowCrossSearch: !p.allowCrossSearch }))}>
                <div className="knob"/>
              </div>
            </div>

            <div className="toggle-row">
              <div>
                <div className="toggle-label">Same mobile number can be used by multiple customers</div>
                <div className="toggle-sub">Allows duplicate mobile numbers across customer records.</div>
              </div>
              <div className={`switch ${setup.allowDuplicateMobile?"on":""}`} onClick={() => setSetup(p => ({ ...p, allowDuplicateMobile: !p.allowDuplicateMobile }))}>
                <div className="knob"/>
              </div>
            </div>

            <div className="toggle-row">
              <div>
                <div className="toggle-label">Email is optional for customers</div>
                <div className="toggle-sub">Allows customer creation without email address.</div>
              </div>
              <div className={`switch ${setup.emailOptional?"on":""}`} onClick={() => setSetup(p => ({ ...p, emailOptional: !p.emailOptional }))}>
                <div className="knob"/>
              </div>
            </div>

            <div className="toggle-row">
              <div>
                <div className="toggle-label">Same email can be used by multiple customers</div>
                <div className="toggle-sub">Allows duplicate email addresses across customer records.</div>
              </div>
              <div className={`switch ${setup.allowDuplicateEmail?"on":""}`} onClick={() => setSetup(p => ({ ...p, allowDuplicateEmail: !p.allowDuplicateEmail }))}>
                <div className="knob"/>
              </div>
            </div>
          </div>
        )}

        {/* Bottom save */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:8 }}>
          <button style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:10, padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={saving || !canEdit}>
            {saving ? "Saving…" : "💾 Save Entity"}
          </button>
        </div>
      </div>
    </div>
  );
}