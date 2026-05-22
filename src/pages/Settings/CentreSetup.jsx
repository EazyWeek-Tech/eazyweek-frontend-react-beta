import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN    = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser  = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const authGet  = async (url) => { const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } }); const j = await r.json(); return j.data ?? j; };
const authPost = async (url, body) => { const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}` }, body:JSON.stringify(body) }); return r.json(); };

const TABS = ["General","Contact","Logo","Tax","Numbering","Setup"];

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

export default function CentreSetup() {
  const [centres,      setCentres]      = useState([]);
  const [selected,     setSelected]     = useState(null); // centerCode
  const [data,         setData]         = useState(null);
  const [activeTab,    setActiveTab]    = useState("General");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);
  const [legalEntities,setLegalEntities]= useState([]);

  // Tab states
  const [contacts,     setContacts]     = useState([]);
  const [logoUrl,      setLogoUrl]      = useState("");
  const [logoPreview,  setLogoPreview]  = useState("");
  const [taxItems,     setTaxItems]     = useState([]);
  const [taxCountry,   setTaxCountry]   = useState("Saudi Arabia");
  const [numbering,    setNumbering]    = useState({
    prefixCustomer:"CUST-", prefixInvoice:"INV-", prefixReturn:"SR-",
    prefixCreditNote:"CN-", prefixAdvance:"ADV-", prefixGiftCard:"GC-",
  });
  const [setup, setSetup] = useState({
    giftCardValidityDays:365, giftCardMinAmount:1,
    allowMultiPayment:true, allowMultiPractitioner:true,
    allowPkgServiceBilling:true, allowPkgSvcPrdBilling:true,
    returnWindowDays:30,
    allowReturnPackages:true, allowReturnServices:true, allowReturnProducts:true,
    roomMandatory:false, equipmentMandatory:false, allowOverbooking:false,
  });
  const [general, setGeneral] = useState({ displayName:"", leCode:"" });
  const fileRef = useRef();

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  // Load centre list + legal entities
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
        setGeneral({ displayName: d.displayName || "", leCode: d.leCode || "" });
        setContacts(d.contacts?.length ? d.contacts : []);
        setLogoUrl(d.logoUrl || ""); setLogoPreview(d.logoUrl || "");
        setTaxItems(d.tax || []);
        if (d.numbering) setNumbering(d.numbering);
        if (d.setup)     setSetup(d.setup);
      });
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const u = getUser();
      const by = u.employeeCode || u.userId || "";
      let res;

      if (activeTab === "General") {
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveGeneral`, { centerCode: selected, ...general });
      } else if (activeTab === "Contact") {
        if (!contacts.some(c => c.isPrimary && c.contactType === "Phone"))
          throw new Error("A primary phone number is mandatory.");
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveContacts`, { centerCode: selected, contacts });
      } else if (activeTab === "Logo") {
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveLogo`, { centerCode: selected, logoUrl, mimeType:"image/*" });
      } else if (activeTab === "Tax") {
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveTax`, { centerCode: selected, taxItems });
      } else if (activeTab === "Numbering") {
        res = await authPost(`${API_BASE_URL}/api/Settings/Centre/SaveNumbering`, { centerCode: selected, numbering });
      } else if (activeTab === "Setup") {
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
  const availableTaxTypes = Object.values(TAX_TYPES[taxCountry] ? { [taxCountry]: TAX_TYPES[taxCountry] } : TAX_TYPES).flat();

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh", color:"#10223f" }}>
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
          <h3>🏥 Centres</h3>
          {loading ? <div style={{ fontSize:12, color:"#94a3b8" }}>Loading…</div> :
            centres.length === 0 ? <div style={{ fontSize:12, color:"#94a3b8" }}>No centres found.</div> :
            centres.map(c => (
              <button key={c.centerCode}
                className={`cs-centre-btn ${selected === c.centerCode ? "active" : ""}`}
                onClick={() => setSelected(c.centerCode)}>
                <span>🏥</span>
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
          {!selected ? (
            <div style={{ padding:60, textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🏥</div>
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
                  <div style={{ fontWeight:800, fontSize:16, color:"#071D49" }}>🏥 {data.centreName}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{data.centerCode} · {data.address}</div>
                </div>
                <button className="save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "💾 Save Centre"}
                </button>
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
                    {t==="General"?"🏢":t==="Contact"?"📞":t==="Logo"?"🖼":t==="Tax"?"🧾":t==="Numbering"?"#":t==="Setup"?"⚙":""} {t}
                  </div>
                ))}
              </div>

              <div className="cs-body">

                {/* ── GENERAL TAB ── */}
                {activeTab === "General" && (
                  <>
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}>General Information</div>
                      <div style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>Primary identification details. Centre Code and Name are read-only (from existing setup).</div>
                      <div className="grid-2">
                        <div className="field">
                          <label>Centre Code</label>
                          <input value={data.centerCode} readOnly style={{ background:"#f8fafc" }} />
                        </div>
                        <div className="field">
                          <label>Centre Name</label>
                          <input value={data.centreName} readOnly style={{ background:"#f8fafc" }} />
                        </div>
                        <div className="field">
                          <label>Display Name <span style={{ color:"#94a3b8", fontWeight:400 }}>(max 20 chars)</span></label>
                          <input value={general.displayName} maxLength={20}
                            onChange={e => setGeneral(p => ({ ...p, displayName: e.target.value }))}
                            placeholder="Short display name" />
                        </div>
                        <div className="field">
                          <label>Legal Entity</label>
                          <select value={general.leCode} onChange={e => setGeneral(p => ({ ...p, leCode: e.target.value }))}>
                            <option value="">Select Legal Entity…</option>
                            {legalEntities.map(le => <option key={le.leCode} value={le.leCode}>{le.leName} ({le.leCode})</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Address</label>
                          <input value={data.address} readOnly style={{ background:"#f8fafc" }} />
                        </div>
                        <div className="field">
                          <label>Zone</label>
                          <input value={data.zone} readOnly style={{ background:"#f8fafc" }} />
                        </div>
                        <div className="field">
                          <label>VAT Number</label>
                          <input value={data.vatNumber} readOnly style={{ background:"#f8fafc" }} />
                        </div>
                        <div className="field">
                          <label>Branch</label>
                          <input value={data.branch} readOnly style={{ background:"#f8fafc" }} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── CONTACT TAB ── */}
                {activeTab === "Contact" && (
                  <div className="card-inner">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:14, color:"#071D49" }}>📞 Contact Information</div>
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
                    <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}>🖼 Centre Logo</div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>Used on invoices, receipts, reports, and customer communications.</div>
                    <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                      <div style={{ width:80, height:80, border:"1px solid #e7ecf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:"#f8fafc", overflow:"hidden" }}>
                        {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                          : <span style={{ fontSize:28, color:"#cbd5e1" }}>🖼</span>}
                      </div>
                      <div>
                        <button className="add-btn" onClick={() => fileRef.current?.click()}>⬆ Upload Logo</button>
                        <input type="file" ref={fileRef} accept=".png,.jpg,.jpeg,.svg" style={{ display:"none" }}
                          onChange={e => {
                            const file = e.target.files[0]; if (!file) return;
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
                        <div style={{ fontWeight:800, fontSize:14, color:"#071D49" }}>🧾 Tax Information</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Statutory registrations. Must comply with local regulations.</div>
                      </div>
                      <button className="add-btn" onClick={() => setTaxItems(p => [...p, { taxType:"", regNumber:"", country:taxCountry }])}>
                        + Add Tax
                      </button>
                    </div>
                    <div className="field" style={{ marginBottom:14, maxWidth:240 }}>
                      <label>Country</label>
                      <select value={taxCountry} onChange={e => setTaxCountry(e.target.value)}>
                        {Object.keys(TAX_TYPES).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {taxItems.map((t, idx) => (
                      <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 2fr auto", gap:10, alignItems:"center", marginBottom:10 }}>
                        <select value={t.taxType}
                          onChange={e => setTaxItems(p => p.map((x,i) => i===idx ? {...x, taxType:e.target.value} : x))}>
                          <option value="">Select Type…</option>
                          {availableTaxTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                        </select>
                        <input value={t.regNumber} placeholder="Registration number"
                          onChange={e => setTaxItems(p => p.map((x,i) => i===idx ? {...x, regNumber:e.target.value} : x))} />
                        <button className="del-btn" onClick={() => setTaxItems(p => p.filter((_,i)=>i!==idx))}>🗑</button>
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
                      <div className="field" style={{ marginBottom:16, maxWidth:260 }}>
                        <label>Return validity in days from purchase *</label>
                        <input type="number" min={1} value={setup.returnWindowDays}
                          onChange={e => setSetup(p => ({ ...p, returnWindowDays: e.target.value }))}
                          placeholder="e.g. 30" />
                      </div>
                      <Toggle value={setup.allowReturnPackages} onChange={() => setSetup(p=>({...p,allowReturnPackages:!p.allowReturnPackages}))}
                        label="Allow return of packages" sub="" />
                      <Toggle value={setup.allowReturnServices} onChange={() => setSetup(p=>({...p,allowReturnServices:!p.allowReturnServices}))}
                        label="Allow return of services" sub="" />
                      <Toggle value={setup.allowReturnProducts} onChange={() => setSetup(p=>({...p,allowReturnProducts:!p.allowReturnProducts}))}
                        label="Allow return of products" sub="" />
                    </div>

                    {/* Appointment */}
                    <div className="card-inner">
                      <div style={{ fontWeight:800, fontSize:14, color:"#071D49", marginBottom:4 }}>📅 Appointment Configurations</div>
                      <Toggle value={setup.roomMandatory}      onChange={() => setSetup(p=>({...p,roomMandatory:!p.roomMandatory}))}
                        label="Room selection mandatory for appointment booking" sub="" />
                      <Toggle value={setup.equipmentMandatory} onChange={() => setSetup(p=>({...p,equipmentMandatory:!p.equipmentMandatory}))}
                        label="Equipment selection mandatory for appointment booking" sub="" />
                      <Toggle value={setup.allowOverbooking}   onChange={() => setSetup(p=>({...p,allowOverbooking:!p.allowOverbooking}))}
                        label="Allow overbooking of practitioners in the same time slot" sub="" />
                    </div>
                  </>
                )}

                {/* Bottom save */}
                <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:16 }}>
                  <button className="save-btn" onClick={handleSave} disabled={saving}>
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