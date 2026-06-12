import React, { useEffect, useState, useCallback } from "react";
import DataTable from "react-data-table-component";
import { API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";

const TOKEN       = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHeaders = () => ({ Authorization: `Bearer ${TOKEN()}` });
const jsonHeaders = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });
const getUser     = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCC       = () => (getUser().centerCode || "").trim();

// ── Blank form — only kept fields ─────────────────────────────────────────────
const BLANK_FORM = {
  customerId:      "",  // read-only / auto-generated
  firstName:       "",
  middleName:      "",
  lastName:        "",
  preferredName:   "",
  gender:          "",
  birthDay:        "",
  anniversary:     "",
  mobilePhone:     "",
  nationalityCode: 0,
  nationalityId:   "",
  language:        0,
  refBy:           "",
  customerType:    "",  // Citizen | Expat — derived from nationality
};

// ─────────────────────────────────────────────────────────────────────────────
// CustomerMaster page
// ─────────────────────────────────────────────────────────────────────────────
const CustomerMaster = () => {
  const [customers,         setCustomers]         = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [loading,           setLoading]           = useState(true);
  const [showForm,          setShowForm]          = useState(false);
  const [formData,          setFormData]          = useState(BLANK_FORM);
  const [saving,            setSaving]            = useState(false);
  const [formError,         setFormError]         = useState("");
  const [formSuccess,       setFormSuccess]       = useState("");
  const [nationalities,     setNationalities]     = useState([]);
  const [languages,         setLanguages]         = useState([]);
  const [centreCountryId,   setCentreCountryId]   = useState(0);
  const [citizenType,       setCitizenType]       = useState(null);
  const [generatedId,       setGeneratedId]       = useState("");

  const navigate = useNavigate();

  // ── Fetch customer list ───────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers`, { headers: authHeaders() });
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setCustomers(list);
      setFilteredCustomers(list);
    } catch { console.error("Failed to fetch customers"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ── Fetch supporting dropdowns ────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Master/Nationality`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setNationalities(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});

    fetch(`${API_BASE_URL}/api/Master/LoadLanguage`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setLanguages(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});

    fetch(`${API_BASE_URL}/api/Customer/CentreCountry`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d?.countryId) setCentreCountryId(Number(d.countryId)); }).catch(() => {});
  }, []);

  // ── Search filter ─────────────────────────────────────────────────────────
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFilteredCustomers(customers.filter(c =>
      [c.firstName, c.lastName, c.custId, c.mobile, c.centerName].join(" ").toLowerCase().includes(lower)
    ));
  }, [searchTerm, customers]);

  const goToCustomerPage = (row) => {
    const qp = new URLSearchParams();
    if (row?.custId)   qp.set("custid",   row.custId);
    if (row?.recId)    qp.set("recid",    row.recId);
    const fullName = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
    if (fullName)      qp.set("fullname", fullName);
    if (row?.mobile)   qp.set("number",   row.mobile);
    navigate(`/customer?${qp.toString()}`);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNationalityChange = (e) => {
    const code = parseInt(e.target.value) || 0;
    setFormData(prev => ({ ...prev, nationalityCode: code }));
    if (code && centreCountryId) {
      const nat = nationalities.find(n => Number(n.code || n.NCODE || n.id) === code);
      const natCountry = Number(nat?.countryId || nat?.COUNTRY_ID || 0);
      const ct = natCountry ? (natCountry === centreCountryId ? "Citizen" : "Expat") : null;
      setCitizenType(ct);
      setFormData(prev => ({ ...prev, nationalityCode: code, customerType: ct || "" }));
    } else {
      setCitizenType(null);
      setFormData(prev => ({ ...prev, nationalityCode: code, customerType: "" }));
    }
  };

  const handleOpenCreate = () => {
    const cc = getCC();
    setFormData({ ...BLANK_FORM, centerCode: cc });
    setFormError(""); setFormSuccess(""); setCitizenType(null);
    setGeneratedId("");
    // Load prefix preview
    fetch(`${API_BASE_URL}/api/Customer/CentreSettings/${cc}`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d?.prefixCustomer) setGeneratedId(`${d.prefixCustomer}####`); }).catch(() => {});
    setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setFormError(""); setFormSuccess(""); setCitizenType(null); };

  const handleSave = async () => {
    if (!formData.firstName?.trim())  { setFormError("First Name is required."); return; }
    if (!formData.mobilePhone?.trim()){ setFormError("Mobile is required.");     return; }
    if (!formData.email?.trim())       { setFormError("Email is required.");       return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRx.test(formData.email.trim())) { setFormError("Please enter a valid email address."); return; }
    setFormError(""); setSaving(true);
    try {
      const payload = { ...formData, centerCode: getCC(), customerType: citizenType || "" };
      const res    = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success ?? result.Success) {
        setFormSuccess("Customer saved successfully.");
        setTimeout(() => { handleCloseForm(); fetchCustomers(); }, 1200);
      } else {
        setFormError(result.message || "Failed to save customer.");
      }
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      name: "Code", sortable: true, width: "120px",
      cell: (row) => (
        <a href="#" onClick={e => { e.preventDefault(); goToCustomerPage(row); }}
          style={{ color:"#334B71", textDecoration:"underline", cursor:"pointer", fontWeight:600 }}>
          {row.custId}
        </a>
      ),
    },
    { name:"First Name", selector: r => r.firstName,  sortable:true },
    { name:"Last Name",  selector: r => r.lastName,   sortable:true },
    { name:"Phone No.",  selector: r => r.mobile,     sortable:true },
    { name:"Last Visit", selector: r => r.lastVisit,  sortable:true },
    { name:"Center",     selector: r => r.centerName, sortable:true },
    {
      name:"Actions", width:"90px",
      cell: (row) => (
        <button onClick={() => goToCustomerPage(row)}
          style={{ padding:"4px 12px", background:"#f1f5f9", border:"1px solid #d0d9e8",
            borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600, color:"#334B71" }}>
          View
        </button>
      ),
    },
  ];

  return (
    <div style={{ padding:24, fontFamily:"Inter,sans-serif", maxWidth:1200, margin:"0 auto" }}>
      <style>{`
        .lds-ring{display:inline-block;position:relative;width:56px;height:56px}
        .lds-ring div{box-sizing:border-box;display:block;position:absolute;width:42px;height:42px;margin:7px;border:4px solid #334B71;border-radius:50%;animation:lds-ring 1.2s linear infinite;border-color:#334B71 transparent transparent transparent}
        @keyframes lds-ring{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:"#111827", margin:0 }}>Manage Customers</h1>
        <button style={styles.saveBtn} onClick={handleOpenCreate}>+ New Customer</button>
      </div>

      <div style={{ marginBottom:16 }}>
        <input style={{ width:"100%", maxWidth:400, padding:"9px 12px", border:"1px solid #ced4da", borderRadius:6, fontSize:14 }}
          type="text" placeholder="Search by name, ID, phone, center..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
          <div className="lds-ring"><div/><div/><div/><div/></div>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredCustomers}
          pagination highlightOnHover responsive dense
          noDataComponent={<div style={{ padding:32, color:"#9ca3af" }}>No customers found.</div>}
          customStyles={{
            headCells: { style:{ background:"#f1f5f9", fontWeight:700, color:"#334B71", fontSize:12, textTransform:"uppercase" } },
            rows: { style:{ fontSize:13 } },
          }}
        />
      )}

      {/* Slide-in form panel */}
      {showForm && (
        <div style={styles.overlay} onClick={handleCloseForm}>
          <div style={styles.panel} onClick={e => e.stopPropagation()}>
            <div style={styles.panelHeader}>
              <div>
                <span style={{ fontWeight:700, fontSize:16, color:"#334B71" }}>New Customer</span>
                <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
                  ID: <strong>{generatedId || "Auto-generated on save"}</strong>
                  {citizenType && (
                    <span style={{
                      marginLeft:10, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                      background: citizenType === "Citizen" ? "#dcfce7" : "#fef3c7",
                      color:      citizenType === "Citizen" ? "#166534" : "#92400e",
                    }}>
                      {citizenType}
                    </span>
                  )}
                </div>
              </div>
              <button style={styles.closeBtn} onClick={handleCloseForm}>✕</button>
            </div>

            <div style={styles.panelBody}>

              {/* Basic Information */}
              <Section title="Basic Information">
                <FormRow label="First Name *">
                  <input style={styles.inp} name="firstName" value={formData.firstName} onChange={handleInput} />
                </FormRow>
                <FormRow label="Middle Name">
                  <input style={styles.inp} name="middleName" value={formData.middleName} onChange={handleInput} />
                </FormRow>
                <FormRow label="Last Name">
                  <input style={styles.inp} name="lastName" value={formData.lastName} onChange={handleInput} />
                </FormRow>
                <FormRow label="Preferred Name">
                  <input style={styles.inp} name="preferredName" value={formData.preferredName} onChange={handleInput} />
                </FormRow>
                <FormRow label="Gender">
                  <select style={styles.sel} name="gender" value={formData.gender} onChange={handleInput}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </FormRow>
                <FormRow label="Date of Birth">
                  <input style={styles.inp} type="date" name="birthDay" value={formData.birthDay} onChange={handleInput} />
                </FormRow>
                <FormRow label="Anniversary">
                  <input style={styles.inp} type="date" name="anniversary" value={formData.anniversary} onChange={handleInput} />
                </FormRow>
              </Section>

              {/* Contact */}
              <Section title="Contact">
                <FormRow label="Mobile *">
                  <input style={styles.inp} name="mobilePhone" value={formData.mobilePhone} onChange={handleInput} />
                </FormRow>
                <FormRow label="Email *">
                  <input style={styles.inp} type="email" name="email"
                    value={formData.email || ""} onChange={handleInput}
                    placeholder="customer@example.com" />
                </FormRow>
              </Section>

              {/* Nationality */}
              <Section title="Nationality">
                <FormRow label="Nationality">
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <select style={{ ...styles.sel, flex:1 }}
                      name="nationalityCode"
                      value={formData.nationalityCode || ""}
                      onChange={handleNationalityChange}>
                      <option value="">Select Nationality</option>
                      {nationalities.map(n => (
                        <option key={n.code || n.id || n.NCODE} value={n.code || n.id || n.NCODE}>
                          {n.name || n.NATIONALITYNAME}
                        </option>
                      ))}
                    </select>
                    {citizenType && (
                      <span style={{
                        padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:700,
                        background: citizenType === "Citizen" ? "#dcfce7" : "#fef3c7",
                        color:      citizenType === "Citizen" ? "#166534" : "#92400e",
                        whiteSpace: "nowrap",
                      }}>
                        {citizenType}
                      </span>
                    )}
                  </div>
                </FormRow>
              </Section>

              {/* Other */}
              <Section title="Other">
                <FormRow label="Language">
                  <select style={styles.sel} name="language" value={formData.language} onChange={handleInput}>
                    <option value={0}>Select Language</option>
                    {languages.map(l => (
                      <option key={l.id || l.languageId} value={l.id || l.languageId}>
                        {l.name || l.languageName}
                      </option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="Referred By">
                  <input style={styles.inp} name="refBy" value={formData.refBy} onChange={handleInput} />
                </FormRow>
              </Section>

              {formError   && <div style={styles.errBox}>⚠ {formError}</div>}
              {formSuccess && <div style={styles.sucBox}>✓ {formSuccess}</div>}
            </div>

            <div style={styles.panelFooter}>
              <button style={styles.cancelBtn} onClick={handleCloseForm}>Cancel</button>
              <button style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CustomerFormPanel — named export for use in Appointment page
// CRITICAL: defined at MODULE LEVEL, not inside any component.
// If defined inside a component, React creates a new type on every render,
// unmounting/remounting the input and losing focus after every keystroke.
// ─────────────────────────────────────────────────────────────────────────────
export function CustomerFormPanel({ onSaved, onClose }) {
  const [formData,        setFormData]        = useState(BLANK_FORM);
  const [saving,          setSaving]          = useState(false);
  const [formError,       setFormError]       = useState("");
  const [formSuccess,     setFormSuccess]     = useState("");
  const [nationalities,   setNationalities]   = useState([]);
  const [languages,       setLanguages]       = useState([]);
  const [centreCountryId, setCentreCountryId] = useState(0);
  const [citizenType,     setCitizenType]     = useState(null);
  const [generatedId,     setGeneratedId]     = useState("");

  useEffect(() => {
    const cc = getCC();
    fetch(`${API_BASE_URL}/api/Customer/CentreSettings/${cc}`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d?.prefixCustomer) setGeneratedId(`${d.prefixCustomer}####`); }).catch(() => {});
    fetch(`${API_BASE_URL}/api/Customer/CentreCountry`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (d?.countryId) setCentreCountryId(Number(d.countryId)); }).catch(() => {});
    fetch(`${API_BASE_URL}/api/Master/Nationality`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setNationalities(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});
    fetch(`${API_BASE_URL}/api/Master/LoadLanguage`, { headers: authHeaders() })
      .then(r => r.json()).then(j => setLanguages(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : [])).catch(() => {});
  }, []);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNationalityChange = (e) => {
    const code = parseInt(e.target.value) || 0;
    const nat = nationalities.find(n => Number(n.code || n.id || n.NCODE) === code);
    const natCountry = Number(nat?.countryId || nat?.COUNTRY_ID || 0);
    const ct = code && centreCountryId && natCountry ? (natCountry === centreCountryId ? "Citizen" : "Expat") : null;
    setCitizenType(ct);
    setFormData(prev => ({ ...prev, nationalityCode: code, customerType: ct || "" }));
  };

  const handleSave = async () => {
    if (!formData.firstName?.trim())  { setFormError("First Name is required."); return; }
    if (!formData.mobilePhone?.trim()){ setFormError("Mobile is required."); return; }
    setFormError(""); setSaving(true);
    try {
      const payload = { ...formData, centerCode: getCC(), customerType: citizenType || "" };
      const res    = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify(payload),
      });
      const result = await res.json();
      const data   = result?.data ?? result;
      if (result.success ?? result.Success) {
        setFormSuccess("Customer saved successfully.");
        setTimeout(() => onSaved?.(data), 1000);
      } else {
        setFormError(result.message || "Failed to save customer.");
      }
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={styles.panelHeader}>
        <div>
          <span style={{ fontWeight:700, fontSize:16, color:"#334B71" }}>New Customer</span>
          <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
            ID: <strong>{generatedId || "Auto-generated on save"}</strong>
            {citizenType && (
              <span style={{
                marginLeft:10, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                background: citizenType === "Citizen" ? "#dcfce7" : "#fef3c7",
                color:      citizenType === "Citizen" ? "#166534" : "#92400e",
              }}>{citizenType}</span>
            )}
          </div>
        </div>
        {onClose && <button style={styles.closeBtn} onClick={onClose}>✕</button>}
      </div>

      <div style={styles.panelBody}>
        <Section title="Basic Information">
          <FormRow label="First Name *"><input style={styles.inp} name="firstName" value={formData.firstName} onChange={handleInput} /></FormRow>
          <FormRow label="Middle Name"><input style={styles.inp} name="middleName" value={formData.middleName} onChange={handleInput} /></FormRow>
          <FormRow label="Last Name"><input style={styles.inp} name="lastName" value={formData.lastName} onChange={handleInput} /></FormRow>
          <FormRow label="Preferred Name"><input style={styles.inp} name="preferredName" value={formData.preferredName} onChange={handleInput} /></FormRow>
          <FormRow label="Gender">
            <select style={styles.sel} name="gender" value={formData.gender} onChange={handleInput}>
              <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </FormRow>
          <FormRow label="Date of Birth"><input style={styles.inp} type="date" name="birthDay" value={formData.birthDay} onChange={handleInput} /></FormRow>
          <FormRow label="Anniversary"><input style={styles.inp} type="date" name="anniversary" value={formData.anniversary} onChange={handleInput} /></FormRow>
        </Section>

        <Section title="Contact">
          <FormRow label="Mobile *"><input style={styles.inp} name="mobilePhone" value={formData.mobilePhone} onChange={handleInput} /></FormRow>
        </Section>

        <Section title="Nationality">
          <FormRow label="Nationality">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <select style={{ ...styles.sel, flex:1 }} name="nationalityCode" value={formData.nationalityCode || ""} onChange={handleNationalityChange}>
                <option value="">Select Nationality</option>
                {nationalities.map(n => (
                  <option key={n.code || n.id || n.NCODE} value={n.code || n.id || n.NCODE}>{n.name || n.NATIONALITYNAME}</option>
                ))}
              </select>
              {citizenType && (
                <span style={{ padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                  background: citizenType === "Citizen" ? "#dcfce7" : "#fef3c7",
                  color:      citizenType === "Citizen" ? "#166534" : "#92400e" }}>
                  {citizenType}
                </span>
              )}
            </div>
          </FormRow>
        </Section>

        <Section title="Other">
          <FormRow label="Language">
            <select style={styles.sel} name="language" value={formData.language} onChange={handleInput}>
              <option value={0}>Select Language</option>
              {languages.map(l => <option key={l.id || l.languageId} value={l.id || l.languageId}>{l.name || l.languageName}</option>)}
            </select>
          </FormRow>
          <FormRow label="Referred By"><input style={styles.inp} name="refBy" value={formData.refBy} onChange={handleInput} /></FormRow>
        </Section>

        {formError   && <div style={styles.errBox}>⚠ {formError}</div>}
        {formSuccess && <div style={styles.sucBox}>✓ {formSuccess}</div>}
      </div>

      <div style={styles.panelFooter}>
        {onClose && <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>}
        <button style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Customer"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components at MODULE LEVEL — never inside any component function ───────
const Section = ({ title, children }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ fontSize:11, fontWeight:700, color:"#334B71", textTransform:"uppercase",
      letterSpacing:"0.05em", borderBottom:"2px solid #334B71", paddingBottom:4, marginBottom:14 }}>
      {title}
    </div>
    {children}
  </div>
);

const FormRow = ({ label, children }) => (
  <div style={{ display:"flex", alignItems:"center", marginBottom:12, gap:12 }}>
    <label style={{ minWidth:140, fontSize:13, fontWeight:500, color:"#495057" }}>{label}</label>
    <div style={{ flex:1 }}>{children}</div>
  </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = {
  inp:         { width:"100%", padding:"8px 10px", border:"1px solid #ced4da", borderRadius:6, fontSize:13, boxSizing:"border-box" },
  sel:         { width:"100%", padding:"8px 10px", border:"1px solid #ced4da", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", justifyContent:"flex-end" },
  panel:       { width:500, background:"#fff", display:"flex", flexDirection:"column", height:"100vh", boxShadow:"-4px 0 24px rgba(0,0,0,0.15)" },
  panelHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 24px", borderBottom:"1px solid #e5e7eb", flexShrink:0 },
  panelBody:   { flex:1, overflowY:"auto", padding:"20px 24px" },
  panelFooter: { padding:"16px 24px", borderTop:"1px solid #e5e7eb", display:"flex", gap:12, justifyContent:"flex-end", flexShrink:0 },
  closeBtn:    { background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#6b7280" },
  cancelBtn:   { padding:"9px 20px", background:"#f1f5f9", border:"1px solid #d0d9e8", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600, color:"#374151" },
  saveBtn:     { padding:"9px 22px", background:"#334B71", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:600 },
  errBox:      { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:6, padding:"10px 14px", color:"#991b1b", fontSize:13, marginTop:12 },
  sucBox:      { background:"#ecfdf5", border:"1px solid #6ee7b7", borderRadius:6, padding:"10px 14px", color:"#065f46", fontSize:13, marginTop:12 },
};

export default CustomerMaster;