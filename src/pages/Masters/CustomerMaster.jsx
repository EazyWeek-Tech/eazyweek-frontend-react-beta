import React, { useEffect, useState, useCallback, useRef } from "react";
import DataTable from "react-data-table-component";
import { API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";

const TOKEN      = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHdr    = () => ({ Authorization: `Bearer ${TOKEN()}` });
const jsonHdr    = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });
const getUser    = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCC      = () => (getUser().centerCode || "").trim();

// ── Stripped BLANK_FORM — only fields we keep ──────────────────────────────────
const BLANK_FORM = {
  customerId:    "",   // read-only after auto-gen
  firstName:     "",
  middleName:    "",
  lastName:      "",
  preferredName: "",
  gender:        "",
  birthDay:      "",
  anniversary:   "",
  mobilePhone:   "",
  nationalityCode: 0,  // RECID / NCODE of selected nationality
  nationalityId:  "",  // nationality number/id text
  language:      0,
  refBy:         "",
};

// ──────────────────────────────────────────────────────────────────────────────
// CustomerFormPanel — reusable form panel used in CustomerMaster AND
//                     as a modal from the Appointment page
// ──────────────────────────────────────────────────────────────────────────────
export function CustomerFormPanel({ onSaved, onClose, initialData = null }) {
  const [form,           setForm]          = useState({ ...BLANK_FORM, ...initialData });
  const [generatedId,    setGeneratedId]   = useState("");
  const [nationalities,  setNationalities] = useState([]);
  const [languages,      setLanguages]     = useState([]);
  const [centreCountryId,setCentreCountryId] = useState(0);
  const [citizenType,    setCitizenType]   = useState(null); // "Citizen" | "Expat" | null
  const [saving,         setSaving]        = useState(false);
  const [error,          setError]         = useState("");
  const [success,        setSuccess]       = useState("");

  // ── Load supporting data on mount ──────────────────────────────────────────
  useEffect(() => {
    const cc = getCC();

    // 1. Auto-generate customer ID preview
    if (!initialData?.customerId) {
      fetch(`${API_BASE_URL}/api/Customer/CentreSettings/${cc}`, { headers: authHdr() })
        .then(r => r.json())
        .then(j => {
          const d = j?.data ?? j;
          if (d?.prefixCustomer) {
            setGeneratedId(`${d.prefixCustomer}####`);
          }
        })
        .catch(() => {});
    }

    // 2. Centre country (for citizen/expat)
    fetch(`${API_BASE_URL}/api/Customer/CentreCountry`, { headers: authHdr() })
      .then(r => r.json())
      .then(j => {
        const d = j?.data ?? j;
        if (d?.countryId) setCentreCountryId(Number(d.countryId));
      })
      .catch(() => {});

    // 3. Nationalities
    fetch(`${API_BASE_URL}/api/Master/Nationality`, { headers: authHdr() })
      .then(r => r.json())
      .then(j => setNationalities(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : []))
      .catch(() => {});

    // 4. Languages
    fetch(`${API_BASE_URL}/api/Master/LoadLanguage`, { headers: authHdr() })
      .then(r => r.json())
      .then(j => setLanguages(Array.isArray(j?.data ?? j) ? (j?.data ?? j) : []))
      .catch(() => {});
  }, []);

  // ── Citizen / Expat logic ──────────────────────────────────────────────────
  const handleNationalityChange = (e) => {
    const code = parseInt(e.target.value) || 0;
    setForm(p => ({ ...p, nationalityCode: code }));
    if (code && centreCountryId) {
      const nat = nationalities.find(n => Number(n.code || n.NCODE) === code);
      const natCountryId = Number(nat?.countryId || nat?.COUNTRY_ID || 0);
      if (natCountryId) {
        setCitizenType(natCountryId === centreCountryId ? "Citizen" : "Expat");
      } else {
        setCitizenType(null);
      }
    } else {
      setCitizenType(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.firstName?.trim())  { setError("First Name is required."); return; }
    if (!form.mobilePhone?.trim()){ setError("Mobile is required."); return; }
    setError(""); setSaving(true);
    try {
      const payload = {
        ...form,
        centerCode:   getCC(),
        customerType: citizenType || "",  // Citizen / Expat
      };
      const res  = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST", headers: jsonHdr(), body: JSON.stringify(payload),
      });
      const json = await res.json();
      const data = json?.data ?? json;
      if (json.success) {
        setSuccess("Customer saved successfully.");
        setTimeout(() => { onSaved?.(data); }, 1000);
      } else {
        setError(json.message || "Failed to save customer.");
      }
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const F = ({ label, children, required }) => (
    <div style={S.row}>
      <label style={S.label}>{label}{required && <span style={{ color:"#b91c1c" }}> *</span>}</label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={S.panelHeader}>
        <span style={{ fontWeight:700, fontSize:16, color:"#334B71" }}>
          {initialData?.customerId ? "Edit Customer" : "New Customer"}
        </span>
        {onClose && <button style={S.closeBtn} onClick={onClose}>✕</button>}
      </div>

      {/* Body */}
      <div style={S.panelBody}>

        {/* Customer ID — read only */}
        <Sec title="Customer ID">
          <F label="Customer ID">
            <div style={{ ...S.inp, background:"#f0f4fa", color:"#334b71", fontWeight:700, cursor:"default" }}>
              {initialData?.customerId || generatedId || "Auto-generated on save"}
            </div>
          </F>
        </Sec>

        {/* Basic Info */}
        <Sec title="Basic Information">
          <F label="First Name" required>
            <input style={S.inp} name="firstName" value={form.firstName} onChange={handleChange} />
          </F>
          <F label="Middle Name">
            <input style={S.inp} name="middleName" value={form.middleName} onChange={handleChange} />
          </F>
          <F label="Last Name">
            <input style={S.inp} name="lastName" value={form.lastName} onChange={handleChange} />
          </F>
          <F label="Preferred Name">
            <input style={S.inp} name="preferredName" value={form.preferredName} onChange={handleChange} />
          </F>
          <F label="Gender">
            <select style={S.sel} name="gender" value={form.gender} onChange={handleChange}>
              <option value="">Select</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </F>
          <F label="Date of Birth">
            <input style={S.inp} type="date" name="birthDay" value={form.birthDay} onChange={handleChange} />
          </F>
          <F label="Anniversary">
            <input style={S.inp} type="date" name="anniversary" value={form.anniversary} onChange={handleChange} />
          </F>
        </Sec>

        {/* Contact */}
        <Sec title="Contact">
          <F label="Mobile" required>
            <input style={S.inp} name="mobilePhone" value={form.mobilePhone} onChange={handleChange} />
          </F>
        </Sec>

        {/* Nationality */}
        <Sec title="Nationality">
          <F label="Nationality">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <select style={{ ...S.sel, flex:1 }}
                name="nationalityCode"
                value={form.nationalityCode || ""}
                onChange={handleNationalityChange}>
                <option value="">Select Nationality</option>
                {nationalities.map(n => (
                  <option key={n.code || n.NCODE} value={n.code || n.NCODE}>
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
          </F>
        </Sec>

        {/* Preferences */}
        <Sec title="Other">
          <F label="Language">
            <select style={S.sel} name="language" value={form.language} onChange={handleChange}>
              <option value={0}>Select Language</option>
              {languages.map(l => (
                <option key={l.id || l.languageId} value={l.id || l.languageId}>
                  {l.name || l.languageName}
                </option>
              ))}
            </select>
          </F>
          <F label="Referred By">
            <input style={S.inp} name="refBy" value={form.refBy} onChange={handleChange} />
          </F>
        </Sec>

        {error   && <div style={S.errBox}>⚠ {error}</div>}
        {success && <div style={S.sucBox}>✓ {success}</div>}
      </div>

      {/* Footer */}
      <div style={S.panelFooter}>
        {onClose && <button style={S.cancelBtn} onClick={onClose}>Cancel</button>}
        <button style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Customer"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const Sec = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize:11, fontWeight:700, color:"#334B71", textTransform:"uppercase",
      letterSpacing:"0.05em", borderBottom:"2px solid #334B71", paddingBottom:4, marginBottom:14 }}>
      {title}
    </div>
    {children}
  </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = {
  inp:         { width:"100%", padding:"8px 10px", border:"1px solid #ced4da", borderRadius:6, fontSize:13, boxSizing:"border-box" },
  sel:         { width:"100%", padding:"8px 10px", border:"1px solid #ced4da", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" },
  row:         { display:"flex", alignItems:"center", marginBottom:12, gap:12 },
  label:       { minWidth:140, fontSize:13, fontWeight:500, color:"#495057" },
  panelHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 24px", borderBottom:"1px solid #e5e7eb" },
  panelBody:   { flex:1, overflowY:"auto", padding:"20px 24px" },
  panelFooter: { padding:"16px 24px", borderTop:"1px solid #e5e7eb", display:"flex", gap:12, justifyContent:"flex-end" },
  closeBtn:    { background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#6b7280" },
  cancelBtn:   { padding:"9px 20px", background:"#f1f5f9", border:"1px solid #d0d9e8", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600, color:"#374151" },
  saveBtn:     { padding:"9px 22px", background:"#334B71", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600 },
  errBox:      { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:6, padding:"10px 14px", color:"#991b1b", fontSize:13, marginTop:12 },
  sucBox:      { background:"#ecfdf5", border:"1px solid #6ee7b7", borderRadius:6, padding:"10px 14px", color:"#065f46", fontSize:13, marginTop:12 },
};

// ──────────────────────────────────────────────────────────────────────────────
// CustomerMaster — the main page at /customer-master
// ──────────────────────────────────────────────────────────────────────────────
const CustomerMaster = () => {
  const [customers,         setCustomers]         = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [loading,           setLoading]           = useState(true);
  const [showForm,          setShowForm]          = useState(false);

  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers`, { headers: authHdr() });
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setCustomers(list);
      setFilteredCustomers(list);
    } catch { console.error("Failed to fetch customers"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFilteredCustomers(customers.filter(c =>
      [c.firstName, c.lastName, c.custId, c.mobile, c.centerName].join(" ").toLowerCase().includes(lower)
    ));
  }, [searchTerm, customers]);

  const goToCustomerPage = (row) => {
    const q = new URLSearchParams();
    if (row?.custId)   q.set("custid",    row.custId);
    if (row?.recId)    q.set("recid",     row.recId);
    const fullName = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
    if (fullName)      q.set("fullname",  fullName);
    if (row?.mobile)   q.set("number",   row.mobile);
    navigate(`/customer?${q.toString()}`);
  };

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
    { name:"First Name",  selector: r => r.firstName,  sortable:true },
    { name:"Last Name",   selector: r => r.lastName,   sortable:true },
    { name:"Phone No.",   selector: r => r.mobile,     sortable:true },
    { name:"Last Visit",  selector: r => r.lastVisit,  sortable:true },
    { name:"Center",      selector: r => r.centerName, sortable:true },
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
        <button
          style={{ padding:"9px 20px", background:"#334B71", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:600 }}
          onClick={() => setShowForm(true)}>
          + New Customer
        </button>
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
        <DataTable
          columns={columns} data={filteredCustomers}
          pagination highlightOnHover responsive dense
          noDataComponent={<div style={{ padding:32, color:"#9ca3af" }}>No customers found.</div>}
          customStyles={{
            headCells: { style:{ background:"#f1f5f9", fontWeight:700, color:"#334B71", fontSize:12, textTransform:"uppercase" } },
            rows:      { style:{ fontSize:13 } },
          }}
        />
      )}

      {/* Slide-in panel */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", justifyContent:"flex-end" }}
          onClick={() => setShowForm(false)}>
          <div style={{ width:520, background:"#fff", display:"flex", flexDirection:"column", height:"100vh", boxShadow:"-4px 0 24px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}>
            <CustomerFormPanel
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); fetchCustomers(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMaster;