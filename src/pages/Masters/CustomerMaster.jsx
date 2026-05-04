"use client";

import React, { useEffect, useState, useCallback } from "react";
import DataTable from "react-data-table-component";
import { API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";

const TOKEN = () => localStorage.getItem("token");
const authHeaders = () => ({ Authorization: `Bearer ${TOKEN()}` });

// ── Blank form for create ──────────────────────────────────────────────────────
const BLANK_FORM = {
  customerId: "", firstName: "", middleName: "", lastName: "", preferredName: "",
  email: "", mobilePhone: "", homePhone: "", workPhone: "", gender: "",
  birthDay: "", anniversary: "", referal: "", refBy: "", primaryEmployee: "",
  address1: "", address2: "", city: "", nationalityId: "", nationalityCode: 0,
  countryCode: 0, stateCode: 0, stateOther: "", language: 0, userName: "", tags: "",
  transactionalSMSEnable: 0, transactionalEmailEnable: 0,
  marketingSMSEnable: 0, marketingEmailEnable: 0,
  marketingLoyalPointSMSandEmailEnable: 0,
  blockGuestFromEditCustomerData: 0, blockGuestFromOnlineAppointmentBooking: 0,
  isLoyaltyEnrolled: false,
};

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
  const [countries,         setCountries]         = useState([]);

  const navigate = useNavigate();

  // ── Fetch list ───────────────────────────────────────────────────────────────
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

  // ── Fetch countries for dropdown ─────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/master/LoadCountry`, { headers: authHeaders() })
      .then(r => r.json())
      .then(json => setCountries(Array.isArray(json.data) ? json.data : []))
      .catch(() => {});
  }, []);

  // ── Search filter ────────────────────────────────────────────────────────────
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFilteredCustomers(
      customers.filter(c =>
        [c.firstName, c.lastName, c.custId, c.mobile, c.centerName, c.membership]
          .join(" ").toLowerCase().includes(lower)
      )
    );
  }, [searchTerm, customers]);

  // ── Navigate to customer profile ─────────────────────────────────────────────
  const goToCustomerPage = (row) => {
    const qp = new URLSearchParams();
    if (row?.custId) qp.set("custid", row.custId);
    if (row?.recId)  qp.set("recid",  row.recId);
    const fullName = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
    if (fullName)    qp.set("fullname", fullName);
    if (row?.mobile) qp.set("number",  row.mobile);
    navigate(`/customer?${qp.toString()}`);
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? (checked ? 1 : 0) : value }));
  };

  const handleOpenCreate = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setFormData({ ...BLANK_FORM, centerCode: user.centerCode || "" });
    setFormError(""); setFormSuccess(""); setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setFormError(""); setFormSuccess(""); };

  const handleSave = async () => {
    if (!formData.customerId?.trim()) { setFormError("Customer ID is required."); return; }
    if (!formData.firstName?.trim())  { setFormError("First Name is required.");  return; }
    if (!formData.mobilePhone?.trim()){ setFormError("Mobile is required.");       return; }
    setFormError(""); setSaving(true);
    try {
      const res    = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      const ok     = result.success ?? result.Success ?? false;
      if (ok) {
        setFormSuccess("Customer saved successfully.");
        setTimeout(() => { handleCloseForm(); fetchCustomers(); }, 1200);
      } else {
        setFormError(result.message || result.Message || "Failed to save customer.");
      }
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      name: "Code", sortable: true, width: "120px",
      cell: (row) => (
        <a href="#" onClick={e => { e.preventDefault(); goToCustomerPage(row); }}
          style={{ color: "#334B71", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}>
          {row.custId}
        </a>
      ),
    },
    { name: "First Name",  selector: r => r.firstName,  sortable: true },
    { name: "Last Name",   selector: r => r.lastName,   sortable: true },
    { name: "Phone No.",   selector: r => r.mobile,     sortable: true },
    { name: "Last Visit",  selector: r => r.lastVisit,  sortable: true },
    { name: "Membership",  selector: r => r.membership, sortable: true },
    { name: "Center",      selector: r => r.centerName, sortable: true },
    {
      name: "Actions", width: "90px",
      cell: (row) => (
        <button onClick={() => goToCustomerPage(row)} style={styles.editBtn} title="View Profile">
          View
        </button>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`
        .lds-ring{display:inline-block;position:relative;width:56px;height:56px}
        .lds-ring div{box-sizing:border-box;display:block;position:absolute;width:42px;height:42px;margin:7px;border:4px solid #334B71;border-radius:50%;animation:lds-ring 1.2s linear infinite;border-color:#334B71 transparent transparent transparent}
        .lds-ring div:nth-child(1){animation-delay:-.45s}
        .lds-ring div:nth-child(2){animation-delay:-.3s}
        .lds-ring div:nth-child(3){animation-delay:-.15s}
        @keyframes lds-ring{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Manage Customers</h1>
        <button style={styles.createBtn} onClick={handleOpenCreate}>+ New Customer</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input style={styles.searchInput} type="text" placeholder="Search by name, ID, phone, center..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
          <div className="lds-ring"><div/><div/><div/><div/></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCustomers}
          pagination
          highlightOnHover
          responsive
          dense
          noDataComponent={<div style={{ padding:32, color:"#9ca3af" }}>No customers found.</div>}
          customStyles={{
            headCells: { style: { background:"#f1f5f9", fontWeight:700, color:"#334B71", fontSize:12, textTransform:"uppercase", letterSpacing:"0.04em" } },
            rows:       { style: { fontSize:13 } },
          }}
        />
      )}

      {/* Create Customer Slide-In Panel */}
      {showForm && (
        <div style={styles.overlay} onClick={handleCloseForm}>
          <div style={styles.panel} onClick={e => e.stopPropagation()}>
            <div style={styles.panelHeader}>
              <span style={{ fontWeight:700, fontSize:16, color:"#334B71" }}>New Customer</span>
              <button style={styles.closeBtn} onClick={handleCloseForm}>✕</button>
            </div>

            <div style={styles.panelBody}>
              {/* Basic Info */}
              <Section title="Basic Information">
                <FormRow label="Customer ID *">
                  <input style={styles.inp} name="customerId" value={formData.customerId} onChange={handleInput} placeholder="e.g. BRI300" />
                </FormRow>
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
                <FormRow label="Home Phone">
                  <input style={styles.inp} name="homePhone" value={formData.homePhone} onChange={handleInput} />
                </FormRow>
                <FormRow label="Work Phone">
                  <input style={styles.inp} name="workPhone" value={formData.workPhone} onChange={handleInput} />
                </FormRow>
                <FormRow label="Email">
                  <input style={styles.inp} type="email" name="email" value={formData.email} onChange={handleInput} />
                </FormRow>
              </Section>

              {/* Address */}
              <Section title="Address">
                <FormRow label="Address 1">
                  <input style={styles.inp} name="address1" value={formData.address1} onChange={handleInput} />
                </FormRow>
                <FormRow label="Address 2">
                  <input style={styles.inp} name="address2" value={formData.address2} onChange={handleInput} />
                </FormRow>
                <FormRow label="City">
                  <input style={styles.inp} name="city" value={formData.city} onChange={handleInput} />
                </FormRow>
                <FormRow label="Country">
                  <select style={styles.sel} name="countryCode" value={formData.countryCode} onChange={handleInput}>
                    <option value={0}>Select Country</option>
                    {countries.map(c => <option key={c.id ?? c.code} value={c.id ?? c.code}>{c.name ?? c.countryName}</option>)}
                  </select>
                </FormRow>
                <FormRow label="State Other">
                  <input style={styles.inp} name="stateOther" value={formData.stateOther} onChange={handleInput} />
                </FormRow>
              </Section>

              {/* Preferences */}
              <Section title="Preferences & Tags">
                <FormRow label="Tags">
                  <input style={styles.inp} name="tags" value={formData.tags} onChange={handleInput} placeholder="Comma separated" />
                </FormRow>
                <FormRow label="Referral">
                  <input style={styles.inp} name="referal" value={formData.referal} onChange={handleInput} />
                </FormRow>
                <FormRow label="Ref By">
                  <input style={styles.inp} name="refBy" value={formData.refBy} onChange={handleInput} />
                </FormRow>
                <FormRow label="Primary Employee">
                  <input style={styles.inp} name="primaryEmployee" value={formData.primaryEmployee} onChange={handleInput} />
                </FormRow>
              </Section>

              {/* Communication */}
              <Section title="Communication Preferences">
                {[
                  { label:"Transactional SMS",   name:"transactionalSMSEnable" },
                  { label:"Transactional Email",  name:"transactionalEmailEnable" },
                  { label:"Marketing SMS",        name:"marketingSMSEnable" },
                  { label:"Marketing Email",      name:"marketingEmailEnable" },
                  { label:"Loyalty Points SMS/Email", name:"marketingLoyalPointSMSandEmailEnable" },
                ].map(({ label, name }) => (
                  <FormRow key={name} label={label}>
                    <input type="checkbox" name={name} checked={!!formData[name]} onChange={handleInput} style={{ width:18, height:18, accentColor:"#334B71" }} />
                  </FormRow>
                ))}
              </Section>

              {/* Restrictions */}
              <Section title="Restrictions">
                <FormRow label="Block Online Booking">
                  <input type="checkbox" name="blockGuestFromOnlineAppointmentBooking"
                    checked={!!formData.blockGuestFromOnlineAppointmentBooking} onChange={handleInput}
                    style={{ width:18, height:18, accentColor:"#334B71" }} />
                </FormRow>
                <FormRow label="Block Profile Edit">
                  <input type="checkbox" name="blockGuestFromEditCustomerData"
                    checked={!!formData.blockGuestFromEditCustomerData} onChange={handleInput}
                    style={{ width:18, height:18, accentColor:"#334B71" }} />
                </FormRow>
              </Section>

              {formError   && <div style={styles.errBox}>⚠ {formError}</div>}
              {formSuccess  && <div style={styles.sucBox}>✓ {formSuccess}</div>}
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

// ── Sub-components defined outside to avoid re-mount ─────────────────────────
const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize:11, fontWeight:700, color:"#334B71", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"2px solid #334B71", paddingBottom:4, marginBottom:14 }}>{title}</div>
    {children}
  </div>
);

const FormRow = ({ label, children }) => (
  <div style={{ display:"flex", alignItems:"center", marginBottom:12, gap:12 }}>
    <label style={{ minWidth:160, fontSize:13, fontWeight:500, color:"#495057" }}>{label}</label>
    <div style={{ flex:1 }}>{children}</div>
  </div>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page:        { padding:24, fontFamily:"Inter,sans-serif", maxWidth:1200, margin:"0 auto" },
  header:      { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 },
  title:       { fontSize:22, fontWeight:700, color:"#111827", margin:0 },
  createBtn:   { padding:"9px 20px", background:"#334B71", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:600 },
  searchInput: { width:"100%", maxWidth:400, padding:"9px 12px", border:"1px solid #ced4da", borderRadius:6, fontSize:14 },
  editBtn:     { padding:"4px 12px", background:"#f1f5f9", border:"1px solid #d0d9e8", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600, color:"#334B71" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", justifyContent:"flex-end" },
  panel:       { width:520, background:"#fff", display:"flex", flexDirection:"column", height:"100vh", boxShadow:"-4px 0 24px rgba(0,0,0,0.15)" },
  panelHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 24px", borderBottom:"1px solid #e5e7eb" },
  panelBody:   { flex:1, overflowY:"auto", padding:"20px 24px" },
  panelFooter: { padding:"16px 24px", borderTop:"1px solid #e5e7eb", display:"flex", gap:12, justifyContent:"flex-end" },
  closeBtn:    { background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#6b7280" },
  inp:         { width:"100%", padding:"8px 10px", border:"1px solid #ced4da", borderRadius:6, fontSize:13, boxSizing:"border-box" },
  sel:         { width:"100%", padding:"8px 10px", border:"1px solid #ced4da", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" },
  cancelBtn:   { padding:"9px 20px", background:"#f1f5f9", border:"1px solid #d0d9e8", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600, color:"#374151" },
  saveBtn:     { padding:"9px 22px", background:"#334B71", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600 },
  errBox:      { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:6, padding:"10px 14px", color:"#991b1b", fontSize:13, marginTop:12 },
  sucBox:      { background:"#ecfdf5", border:"1px solid #6ee7b7", borderRadius:6, padding:"10px 14px", color:"#065f46", fontSize:13, marginTop:12 },
};

export default CustomerMaster;