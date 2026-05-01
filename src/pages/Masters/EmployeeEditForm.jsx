import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import EmployeeSegmentMapping from "./EmployeeSegmentMapping";

const TOKEN = () => localStorage.getItem("token");

// ✅ ALL sub-components defined OUTSIDE to prevent remount on every keystroke
const InputRow = ({ label, name, value, onChange, type = "text", readOnly = false, placeholder = "" }) => (
  <div style={s.row}>
    <label style={s.label}>{label} :</label>
    <input
      style={{ ...s.input, background: readOnly ? "#e9ecef" : "#fff" }}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
    />
  </div>
);

const SelectRow = ({ label, name, value, onChange, children }) => (
  <div style={s.row}>
    <label style={s.label}>{label} :</label>
    <select name={name} value={value} onChange={onChange} style={s.input}>
      {children}
    </select>
  </div>
);

const SectionTitle = ({ children, marginTop = 0 }) => (
  <div style={{ ...s.sectionTitle, marginTop }}>{children}</div>
);

const EmployeeEditForm = ({ employee, onBack, onSaved }) => {
  const [activeTab, setActiveTab]     = useState("GENERAL");
  const [clinics, setClinics]         = useState([]);
  const [roles, setRoles]             = useState([]);
  const [roleMapping, setRoleMapping] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [showSegmentMapping, setShowSegmentMapping] = useState(false);
  const [newClinic, setNewClinic]     = useState("");
  const [newRole, setNewRole]         = useState("");
  const [newPrimary, setNewPrimary]   = useState(false);
  const [addingRole, setAddingRole]   = useState(false);

  const [form, setForm] = useState({
    RECID:         employee.RECID         || "",
    EMPLOYEECODE:  employee.EMPLOYEECODE  || "",
    FIRSTNAME:     employee.FIRSTNAME     || "",
    MIDDLENAME:    employee.MIDDLENAME    || "",
    LASTNAME:      employee.LASTNAME      || "",
    NICKNAME:      employee.NICKNAME      || "",
    EMAIL:         employee.EMAIL         || "",
    CENTERCODE:    employee.CENTERCODE    || "",
    JOB:           employee.JOB           || "",
    USERNAME:      employee.USERNAME      || "",
    MOBILEPHONE:   employee.MOBILEPHONE   || "",
    HOMEPHONE:     employee.HOMEPHONE     || "",
    WORKPHONE:     employee.WORKPHONE     || "",
    GENDER:        employee.GENDER        || "",
    BIRTHDAY:      employee.BIRTHDAY      ? new Date(employee.BIRTHDAY).toLocaleDateString("en-GB") : "",
    ANNIVERSARY:   employee.ANNIVERSARY   ? new Date(employee.ANNIVERSARY).toLocaleDateString("en-GB") : "",
    ADDRESS1:      employee.ADDRESS1      || "",
    ADDRESS2:      employee.ADDRESS2      || "",
    CITY:          employee.CITY          || "",
    COUNTRY:       employee.COUNTRY       || "Saudi Arabia",
    ASTATE:        employee.ASTATE        || "Ar Riya-d",
    NATIONALITYID: employee.NATIONALITYID || "",
  });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ✅ Stable handler — won't cause remounts
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/master/LoadCenters`, {
      headers: { Authorization: `Bearer ${TOKEN()}` },
    }).then((r) => r.json()).then((j) => { if (j.success) setClinics(j.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/employee/roles`, {
      headers: { Authorization: `Bearer ${TOKEN()}` },
    }).then((r) => r.json()).then((j) => { if (j.success) setRoles(j.data); }).catch(() => {});
  }, []);

  const fetchRoleMapping = useCallback(() => {
    if (!employee.EMPLOYEECODE) return;
    fetch(`${API_BASE_URL}/api/employee/${employee.EMPLOYEECODE}/role-mapping`, {
      headers: { Authorization: `Bearer ${TOKEN()}` },
    }).then((r) => r.json()).then((j) => { if (j.success) setRoleMapping(j.data); }).catch(() => {});
  }, [employee.EMPLOYEECODE]);

  useEffect(() => { fetchRoleMapping(); }, [fetchRoleMapping]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee/${form.RECID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Employee updated successfully");
        setTimeout(() => { onSaved?.(); onBack(); }, 1000);
      } else {
        showToast(json.message || "Save failed", "error");
      }
    } catch { showToast("Save failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee/${form.EMPLOYEECODE}/deactivate`, {
        method: "PUT", headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      if (json.success) { showToast("Employee deactivated"); setTimeout(() => { onSaved?.(); onBack(); }, 1000); }
      else showToast(json.message || "Failed", "error");
    } catch { showToast("Failed to deactivate", "error"); }
    finally { setConfirmDeactivate(false); }
  };

  const handleAddRoleMapping = async () => {
    if (!newClinic || !newRole) return showToast("Select clinic and role", "error");
    setAddingRole(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE_URL}/api/employee/role-mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({
          employeeCode: form.EMPLOYEECODE, centerCode: newClinic,
          rCode: newRole, primaryClinic: newPrimary ? 1 : 0,
          createdBy: user.employeeCode || "",
        }),
      });
      const json = await res.json();
      if (json.success) { showToast("Role mapping added"); setNewClinic(""); setNewRole(""); setNewPrimary(false); fetchRoleMapping(); }
      else showToast(json.message || "Failed to add", "error");
    } catch { showToast("Failed to add role mapping", "error"); }
    finally { setAddingRole(false); }
  };

  const handleRemoveRoleMapping = async (recId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee/role-mapping/${recId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      if (json.success) { showToast("Role mapping removed"); fetchRoleMapping(); }
      else showToast(json.message || "Failed to remove", "error");
    } catch { showToast("Failed to remove", "error"); }
  };

  if (showSegmentMapping) {
    return <EmployeeSegmentMapping employee={employee} onBack={() => setShowSegmentMapping(false)} />;
  }

  const JOBS      = ["","Nurse","Doctor","Manager","Receptionist","Call Centre Executive","CALLCENTEROFFICER","Owner","Therapist","Consultant"];
  const COUNTRIES = ["Saudi Arabia","UAE","Kuwait","Bahrain","Qatar","Oman"];
  const STATES    = ["Ar Riya-d","Makkah","Eastern Province","Madinah","Asir"];

  const primaryMapping = roleMapping.find((r) => r.PRIMARYCLINIC === 1);
  const otherMappings  = roleMapping.filter((r) => r.PRIMARYCLINIC !== 1);

  return (
    <div style={s.page}>
      <div style={s.breadcrumb}>
        <span style={s.breadLink} onClick={onBack}>Employee</span>
        <span style={s.sep}> &gt; </span>
        <span style={s.breadCurrent}>Edit Employee</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={s.title}>Edit Employee</h1>
        <button style={s.segBtn} onClick={() => setShowSegmentMapping(true)}>Segment Mapping</button>
      </div>

      <div style={s.card}>
        {/* Tabs */}
        <div style={s.tabs}>
          {["GENERAL", "CLINICS ROLES"].map((tab) => (
            <button key={tab} style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div style={s.formContent}>

          {/* ── GENERAL TAB ── */}
          {activeTab === "GENERAL" && (
            <>
              <SectionTitle>PERSONAL INFO</SectionTitle>
              <InputRow label="Employee Code" name="EMPLOYEECODE" value={form.EMPLOYEECODE} onChange={handleChange} readOnly />
              <InputRow label="First Name"    name="FIRSTNAME"    value={form.FIRSTNAME}    onChange={handleChange} />
              <InputRow label="Middle Name"   name="MIDDLENAME"   value={form.MIDDLENAME}   onChange={handleChange} />
              <InputRow label="Last Name"     name="LASTNAME"     value={form.LASTNAME}     onChange={handleChange} />
              <InputRow label="Nickname"      name="NICKNAME"     value={form.NICKNAME}     onChange={handleChange} />
              <InputRow label="Email"         name="EMAIL"        value={form.EMAIL}        onChange={handleChange} type="email" />

              <SelectRow label="Clinic" name="CENTERCODE" value={form.CENTERCODE} onChange={handleChange}>
                <option value="">Select one</option>
                {clinics.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </SelectRow>

              <SelectRow label="Job" name="JOB" value={form.JOB} onChange={handleChange}>
                {JOBS.map((j) => <option key={j} value={j}>{j || "Select one"}</option>)}
              </SelectRow>

              <SectionTitle marginTop={24}>LOGIN INFO</SectionTitle>
              <InputRow label="Username"     name="USERNAME"    value={form.USERNAME}    onChange={handleChange} />
              <InputRow label="Mobile Phone" name="MOBILEPHONE" value={form.MOBILEPHONE} onChange={handleChange} />
              <InputRow label="Home Phone"   name="HOMEPHONE"   value={form.HOMEPHONE}   onChange={handleChange} />
              <InputRow label="Work Phone"   name="WORKPHONE"   value={form.WORKPHONE}   onChange={handleChange} />

              <SelectRow label="Gender" name="GENDER" value={form.GENDER} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </SelectRow>

              <InputRow label="Birthday"    name="BIRTHDAY"    value={form.BIRTHDAY}    onChange={handleChange} placeholder="DD/MM/YYYY" />
              <InputRow label="Anniversary" name="ANNIVERSARY" value={form.ANNIVERSARY} onChange={handleChange} placeholder="DD/MM/YYYY" />

              <SectionTitle marginTop={24}>ADDRESS INFO</SectionTitle>
              <InputRow label="Address 1"    name="ADDRESS1"      value={form.ADDRESS1}      onChange={handleChange} />
              <InputRow label="Address 2"    name="ADDRESS2"      value={form.ADDRESS2}      onChange={handleChange} />
              <InputRow label="City"         name="CITY"          value={form.CITY}          onChange={handleChange} />

              <SelectRow label="Country" name="COUNTRY" value={form.COUNTRY} onChange={handleChange}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectRow>

              <SelectRow label="State" name="ASTATE" value={form.ASTATE} onChange={handleChange}>
                {STATES.map((st) => <option key={st} value={st}>{st}</option>)}
              </SelectRow>

              <InputRow label="Nationality ID" name="NATIONALITYID" value={form.NATIONALITYID} onChange={handleChange} />

              <div style={s.row}>
                <label style={s.label}>Attachment Upload :</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="file" style={{ ...s.input, padding: "5px 8px" }} />
                  <button style={s.uploadBtn}>Upload</button>
                </div>
              </div>
            </>
          )}

          {/* ── CLINICS ROLES TAB ── */}
          {activeTab === "CLINICS ROLES" && (
            <>
              <h2 style={s.clinicsTitle}>Clinics and Roles</h2>

              <div style={s.row}>
                <label style={s.label}>Primary Clinic :</label>
                <input style={{ ...s.input, background: "#e9ecef" }} readOnly
                  value={primaryMapping ? (clinics.find((c) => c.code === primaryMapping.CENTERCODE)?.name || primaryMapping.CENTERCODE) : ""} />
              </div>
              <div style={s.row}>
                <label style={s.label}>Primary Clinic Role :</label>
                <input style={{ ...s.input, background: "#e9ecef" }} readOnly value={primaryMapping?.RNAME || ""} />
              </div>

              <SectionTitle marginTop={24}>Others Clinic :</SectionTitle>

              {otherMappings.length === 0 ? (
                <p style={{ color: "#6c757d", fontStyle: "italic", marginLeft: 180 }}>No other clinic assignments.</p>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}></th>
                      <th style={s.th}>Clinic</th>
                      <th style={s.th}>Role</th>
                      <th style={s.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherMappings.map((m) => (
                      <tr key={m.RECID}>
                        <td style={s.td}><input type="checkbox" /></td>
                        <td style={s.td}>{clinics.find((c) => c.code === m.CENTERCODE)?.name || m.CENTERCODE}</td>
                        <td style={s.td}>{m.RNAME || m.RCODE}</td>
                        <td style={s.td}>
                          <button style={s.removeBtn} onClick={() => handleRemoveRoleMapping(m.RECID)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <SectionTitle marginTop={24}>Add Clinic Role :</SectionTitle>
              <div style={s.row}>
                <label style={s.label}>Clinic :</label>
                <select value={newClinic} onChange={(e) => setNewClinic(e.target.value)} style={s.input}>
                  <option value="">Select one</option>
                  {clinics.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div style={s.row}>
                <label style={s.label}>Role :</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={s.input}>
                  <option value="">Select one</option>
                  {roles.map((r) => <option key={r.RCODE} value={r.RCODE}>{r.RNAME}</option>)}
                </select>
              </div>
              <div style={s.row}>
                <label style={s.label}>Set as Primary :</label>
                <input type="checkbox" checked={newPrimary} onChange={(e) => setNewPrimary(e.target.checked)} style={{ width: 16, height: 16 }} />
              </div>
              <div style={{ marginLeft: 180, marginTop: 8 }}>
                <button style={s.addRoleBtn} onClick={handleAddRoleMapping} disabled={addingRole}>
                  {addingRole ? "Adding..." : "+ Add"}
                </button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div style={s.actions}>
            <button style={s.saveBtn}   onClick={handleSave}                    disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            <button style={s.cancelBtn} onClick={onBack}>Cancel</button>
            <button style={s.deleteBtn} onClick={() => setConfirmDeactivate(true)}>Delete</button>
          </div>
        </div>
      </div>

      {/* Deactivate Modal */}
      {confirmDeactivate && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <p style={{ fontSize: 16, marginBottom: 20 }}>
              Are you sure you want to deactivate <strong>{form.FIRSTNAME} {form.LASTNAME}</strong>?
            </p>
            <div style={s.modalActions}>
              <button style={s.saveBtn}   onClick={handleDeactivate}>Yes, Deactivate</button>
              <button style={s.cancelBtn} onClick={() => setConfirmDeactivate(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ ...s.toast, ...(toast.type === "error" ? s.toastError : s.toastSuccess) }}>{toast.text}</div>
      )}
    </div>
  );
};

const s = {
  page:        { padding: "24px", fontFamily: "Inter, sans-serif", maxWidth: 900, margin: "0 auto" },
  breadcrumb:  { fontSize: 14, color: "#6c757d", marginBottom: 10 },
  breadLink:   { color: "#334B71", cursor: "pointer" },
  sep:         { margin: "0 6px" },
  breadCurrent:{ color: "#6c757d" },
  title:       { fontSize: 22, fontWeight: 600, color: "#333", margin: 0 },
  segBtn:      { background: "#f0f4f8", border: "1px solid #d1d5db", color: "#334B71", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 },
  card:        { background: "#fff", borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.1)", overflow: "hidden" },
  tabs:        { display: "flex", borderBottom: "1px solid #dee2e6", background: "#f8f9fa" },
  tab:         { padding: "12px 24px", background: "none", border: "none", borderBottom: "3px solid transparent", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#6c757d" },
  tabActive:   { color: "#334B71", borderBottomColor: "#334B71", background: "#fff" },
  formContent: { padding: 30 },
  sectionTitle:{ fontWeight: 700, fontSize: 14, color: "#333", borderBottom: "2px solid #334B71", paddingBottom: 6, marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.5px" },
  clinicsTitle:{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 28, color: "#333" },
  row:         { display: "flex", alignItems: "center", marginBottom: 18 },
  label:       { minWidth: 160, textAlign: "right", marginRight: 20, fontWeight: 500, color: "#495057", fontSize: 14 },
  input:       { flex: 1, maxWidth: 400, padding: "8px 12px", border: "1px solid #ced4da", borderRadius: 4, fontSize: 14, outline: "none" },
  uploadBtn:   { padding: "8px 16px", background: "#343a40", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 },
  table:       { width: "100%", borderCollapse: "collapse", marginBottom: 20 },
  th:          { padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: 15, color: "#495057", borderBottom: "1px solid #dee2e6", background: "#f8f9fa" },
  td:          { padding: "12px 16px", borderBottom: "1px solid #dee2e6", fontSize: 14, color: "#495057" },
  removeBtn:   { padding: "6px 14px", background: "#b94b56", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 },
  addRoleBtn:  { padding: "8px 20px", background: "#334B71", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  actions:     { display: "flex", justifyContent: "center", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid #dee2e6" },
  saveBtn:     { padding: "10px 28px", background: "#334B71", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" },
  cancelBtn:   { padding: "10px 28px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" },
  deleteBtn:   { padding: "10px 28px", background: "#b94b56", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" },
  modalOverlay:{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:       { background: "#fff", borderRadius: 8, padding: 28, width: 380, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  modalActions:{ display: "flex", justifyContent: "center", gap: 12 },
  toast:       { position: "fixed", bottom: 24, right: 24, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 14px rgba(0,0,0,0.12)" },
  toastSuccess:{ background: "#ecfdf5", color: "#065f46", border: "1px solid #6ee7b7" },
  toastError:  { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" },
};

export default EmployeeEditForm;