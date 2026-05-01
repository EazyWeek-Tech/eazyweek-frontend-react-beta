import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token");

// ✅ ALL sub-components OUTSIDE to prevent remount on every keystroke
const InputRow = ({ label, name, value, onChange, type = "text", placeholder = "" }) => (
  <div style={s.row}>
    <label style={s.label}>{label} :</label>
    <input
      style={s.input}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
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

const EmployeeCreateForm = ({ onBack, onSaved }) => {
  const [clinics, setClinics] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);

  const [form, setForm] = useState({
    EMPLOYEECODE: "", FIRSTNAME: "",   MIDDLENAME:   "",
    LASTNAME:     "", NICKNAME:  "",   EMAIL:        "",
    CENTERCODE:   "", JOB:       "",   USERNAME:     "",
    MOBILEPHONE:  "", HOMEPHONE: "",   WORKPHONE:    "",
    GENDER:       "", BIRTHDAY:  "",   ANNIVERSARY:  "",
    ADDRESS1:     "", ADDRESS2:  "",   CITY:         "",
    COUNTRY:      "Saudi Arabia",      ASTATE:       "Ar Riya-d",
    NATIONALITYID: "",
  });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/master/LoadCenters`, {
      headers: { Authorization: `Bearer ${TOKEN()}` },
    }).then((r) => r.json()).then((j) => { if (j.success) setClinics(j.data); }).catch(() => {});
  }, []);

  // ✅ Stable handler
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const validate = () => {
    if (!form.EMPLOYEECODE.trim()) return "Employee Code is required";
    if (!form.FIRSTNAME.trim())    return "First Name is required";
    if (!form.USERNAME.trim())     return "Username is required";
    if (!form.CENTERCODE.trim())   return "Clinic is required";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return showToast(err, "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Employee created successfully");
        setTimeout(() => { onSaved?.(); onBack(); }, 1000);
      } else {
        showToast(json.message || "Failed to create employee", "error");
      }
    } catch { showToast("Failed to create employee", "error"); }
    finally { setSaving(false); }
  };

  const JOBS      = ["","Nurse","Doctor","Manager","Receptionist","Call Centre Executive","CALLCENTEROFFICER","Owner","Therapist","Consultant"];
  const COUNTRIES = ["Saudi Arabia","UAE","Kuwait","Bahrain","Qatar","Oman"];
  const STATES    = ["Ar Riya-d","Makkah","Eastern Province","Madinah","Asir"];

  return (
    <div style={s.page}>
      <div style={s.breadcrumb}>
        <span style={s.breadLink} onClick={onBack}>Employee</span>
        <span style={s.sep}> &gt; </span>
        <span style={s.breadCurrent}>Create Employee</span>
      </div>

      <h1 style={s.title}>Create Employee</h1>

      <div style={s.card}>
        <SectionTitle>PERSONAL INFO</SectionTitle>
        <InputRow label="Employee Code" name="EMPLOYEECODE" value={form.EMPLOYEECODE} onChange={handleChange} />
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

        <div style={s.actions}>
          <button style={s.saveBtn}   onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          <button style={s.cancelBtn} onClick={onBack}>Cancel</button>
        </div>
      </div>

      {toast && (
        <div style={{ ...s.toast, ...(toast.type === "error" ? s.toastError : s.toastSuccess) }}>{toast.text}</div>
      )}
    </div>
  );
};

const s = {
  page:        { padding: "24px", fontFamily: "Inter, sans-serif", maxWidth: 800, margin: "0 auto" },
  breadcrumb:  { fontSize: 14, color: "#6c757d", marginBottom: 16 },
  breadLink:   { color: "#334B71", cursor: "pointer" },
  sep:         { margin: "0 6px" },
  breadCurrent:{ color: "#6c757d" },
  title:       { fontSize: 22, fontWeight: 600, color: "#333", marginBottom: 20 },
  card:        { background: "#fff", borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.1)", padding: 30 },
  sectionTitle:{ fontWeight: 700, fontSize: 14, color: "#333", borderBottom: "2px solid #334B71", paddingBottom: 8, marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.5px" },
  row:         { display: "flex", alignItems: "center", marginBottom: 18 },
  label:       { minWidth: 160, textAlign: "right", marginRight: 20, fontWeight: 500, color: "#495057", fontSize: 14 },
  input:       { flex: 1, maxWidth: 400, padding: "8px 12px", border: "1px solid #ced4da", borderRadius: 4, fontSize: 14, outline: "none", background: "#fff" },
  actions:     { display: "flex", justifyContent: "center", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid #dee2e6" },
  saveBtn:     { padding: "10px 28px", background: "#334B71", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" },
  cancelBtn:   { padding: "10px 28px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" },
  toast:       { position: "fixed", bottom: 24, right: 24, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 14px rgba(0,0,0,0.12)" },
  toastSuccess:{ background: "#ecfdf5", color: "#065f46", border: "1px solid #6ee7b7" },
  toastError:  { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" },
};

export default EmployeeCreateForm;