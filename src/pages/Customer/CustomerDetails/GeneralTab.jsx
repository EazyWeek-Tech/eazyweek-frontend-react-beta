import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` });

const SQL_MIN_YMD      = "1753-01-01";
const EMPTY_PREFIXES   = ["0001-01-01", "1900-01-01"];

const formatDateForInput = (val) => {
  if (!val) return "";
  const s = String(val).slice(0, 10);
  if (EMPTY_PREFIXES.some(p => s.startsWith(p))) return "";
  return s;
};

const toIsoOrNull = (yyyyMmDd) => {
  if (!yyyyMmDd) return null;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
};

const validDate = (yyyyMmDd) => {
  if (!yyyyMmDd || yyyyMmDd < SQL_MIN_YMD) return false;
  return yyyyMmDd <= new Date().toISOString().slice(0, 10);
};

// ─── Master data (loaded from API) ────────────────────────────────────────────
// Fallback static lists used until API loads
const PHONE_CODES = ["+966","+91","+971","+1","+44","+20","+92","+62","+60"].map(c=>({value:c,label:c}));
const GENDERS     = [{value:"Male",label:"Male"},{value:"Female",label:"Female"},{value:"Other",label:"Other"}];

const F = ({ label, required, error, children, span2, span3 }) => (
  <div className={`gt-field${span2?" gt-span2":span3?" gt-span3":""}`}>
    <span className="gt-label">{label}{required&&<span className="gt-req"> *</span>}</span>
    {children}
    {error && <span className="gt-err">{error}</span>}
  </div>
);

const Inp = ({ name, value, onChange, disabled, ...rest }) => (
  <input className="gt-input" name={name} value={value||""} onChange={onChange} disabled={disabled} {...rest} />
);

const Sel = ({ name, value, onChange, disabled, options, placeholder="Select" }) => (
  <select className="gt-select" name={name} value={value||""} onChange={onChange} disabled={disabled}>
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ─── Component ─────────────────────────────────────────────────────────────────
const GeneralTab = ({ customer }) => {
  const [form, setForm]     = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);

  // Master data
  const [nationalities, setNationalities] = useState([]);
  const [countries, setCountries]         = useState([]);
  const [states, setStates]               = useState([]);
  const [languages] = useState([{ value: 1, label: "English" }, { value: 2, label: "Arabic" }]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (customer) setForm({ ...customer });
  }, [customer]);

  // Load master lists — only when token is available
  useEffect(() => {
    if (!TOKEN()) return;  // wait for auth
    fetch(`${API_BASE_URL}/api/Master/Nationality`, { headers: authHeaders() })
      .then(r => r.json()).then(j => {
        const d = j?.data ?? j;
        if (Array.isArray(d)) setNationalities(d.map(n => ({ value: n.id ?? n.nationalityId, label: n.name ?? n.nationalityName ?? n.NATIONALITY_NAME })));
      }).catch(() => {});

    fetch(`${API_BASE_URL}/api/Master/LoadCountry`, { headers: authHeaders() })
      .then(r => r.json()).then(j => {
        const d = j?.data ?? j;
        if (Array.isArray(d)) setCountries(d.map(c => ({ value: c.countryId ?? c.id, label: c.countryName ?? c.name ?? c.COUNTRY_NAME })));
      }).catch(() => {});


  }, []);

  // Load states when country changes
  useEffect(() => {
    if (!form.countryCode || !TOKEN()) { setStates([]); return; }
    fetch(`${API_BASE_URL}/api/Master/LoadState/${form.countryCode}`, { headers: authHeaders() })
      .then(r => r.json()).then(j => {
        const d = j?.data ?? j;
        if (Array.isArray(d)) setStates(d.map(s => ({ value: s.stateId ?? s.id, label: s.stateName ?? s.name ?? s.STATE_NAME })));
      }).catch(() => {});
  }, [form.countryCode]);

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const coerced = (name === "nationalityCode" || name === "countryCode" || name === "stateCode" || name === "language")
      ? (value === "" ? 0 : Number(value))
      : type === "checkbox" ? checked : value;
    set(name, coerced);
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!String(form.firstName   || "").trim()) e.firstName   = "Required";
    if (!String(form.lastName    || "").trim()) e.lastName    = "Required";
    if (!String(form.mobilePhone || "").trim()) e.mobilePhone = "Required";
    if (!String(form.gender      || "").trim()) e.gender      = "Required";

    const dob = formatDateForInput(form.birthDay);
    if (!dob)               e.birthDay = "Required";
    else if (!validDate(dob)) e.birthDay = "Must be a valid past date";

    const ann = formatDateForInput(form.anniversary);
    if (ann && !validDate(ann)) e.anniversary = "Must be a valid past date";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      customerId:              String(form.customerId       || ""),
      centerCode:              String(form.centerCode       || ""),
      firstName:               String(form.firstName        || ""),
      middleName:              String(form.middleName       || ""),
      lastName:                String(form.lastName         || ""),
      email:                   String(form.email            || ""),
      mobilePhone:             String(form.mobilePhone      || ""),
      phoneCode:               String(form.phoneCode        || ""),
      homePhone:               String(form.homePhone        || ""),
      workPhone:               String(form.workPhone        || ""),
      gender:                  String(form.gender           || ""),
      birthDay:                toIsoOrNull(formatDateForInput(form.birthDay)),
      anniversary:             toIsoOrNull(formatDateForInput(form.anniversary)) || null,
      referal:                 String(form.referal          || ""),
      primaryEmployee:         String(form.primaryEmployee  || ""),
      address1:                String(form.address1         || ""),
      address2:                String(form.address2         || ""),
      city:                    String(form.city             || ""),
      zipCode:                 String(form.zipCode          || ""),
      nationalityCode:         Number(form.nationalityCode  || 0) || 0,
      nationalityId:           String(form.nationalityId    || ""),
      countryCode:             Number(form.countryCode      || 0),
      stateCode:               Number(form.stateCode        || 0),
      stateOther:              String(form.stateOther       || ""),
      language:                Number(form.language         || 0),
      userName:                String(form.userName         || ""),
      tags:                    String(form.tags             || ""),
      isLoyaltyEnrolled:       !!form.isLoyaltyEnrolled,
      isOnlineBookingBlocked:  Number(form.isOnlineBookingBlocked  || 0),
      canEditPersonalInfo:     Number(form.canEditPersonalInfo     || 0),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.success === false)
        throw new Error(json.message || "Failed to save");
      showToast(json.message || "Customer saved successfully.");
    } catch (err) {
      showToast(err.message || "Error saving customer.", "error");
    } finally {
      setSaving(false);
    }
  };

  const chk = (name, label) => (
    <label className="gt-chk-label">
      <input type="checkbox" name={name}
        checked={!!form[name]} onChange={handleChange}
        style={{ width:15, height:15, accentColor:"#3E5D8A", cursor:"pointer" }} />
      <span>{label}</span>
    </label>
  );

  return (
    <>
      <style>{CSS}</style>
      <form className="gt-wrap" onSubmit={handleSubmit} noValidate>

        {/* ── Back button ────────────────────────────────────────────────── */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <button type="button" className="gt-btn gt-btn-sec"
            onClick={() => window.history.back()}
            style={{ display:"flex", alignItems:"center", gap:6 }}>
            ← Back
          </button>
        </div>

        {/* ── Personal Info ──────────────────────────────────────────────── */}
        <Card icon="👤" title="Personal Info">
          <div className="gt-grid">
            <F label="Customer ID">
              <Inp name="customerId" value={form.customerId} onChange={handleChange}
                disabled style={{ background:"#f7f8fc", color:"#6b7280" }} />
            </F>
            <F label="First Name" required error={errors.firstName}>
              <Inp name="firstName" value={form.firstName} onChange={handleChange} />
            </F>
            <F label="Middle Name">
              <Inp name="middleName" value={form.middleName} onChange={handleChange} />
            </F>
            <F label="Last Name" required error={errors.lastName}>
              <Inp name="lastName" value={form.lastName} onChange={handleChange} />
            </F>
            <F label="Preferred Name">
              <Inp name="preferredName" value={form.preferredName} onChange={handleChange} />
            </F>
            <F label="Email">
              <Inp name="email" type="email" value={form.email} onChange={handleChange} />
            </F>
            <F label="Mobile Phone" required error={errors.mobilePhone}>
              <div style={{ display:"flex", gap:6 }}>
                <select className="gt-select" name="phoneCode"
                  value={form.phoneCode||""} onChange={handleChange}
                  style={{ width:90, flexShrink:0 }}>
                  <option value="">--</option>
                  {PHONE_CODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <Inp name="mobilePhone" value={form.mobilePhone} onChange={handleChange}
                  style={{ flex:1 }} className={errors.mobilePhone?"gt-input gt-error":"gt-input"} />
              </div>
            </F>
            <F label="Home Phone">
              <Inp name="homePhone" value={form.homePhone} onChange={handleChange} />
            </F>
            <F label="Work Phone">
              <Inp name="workPhone" value={form.workPhone} onChange={handleChange} />
            </F>
            <F label="Gender" required error={errors.gender}>
              <Sel name="gender" value={form.gender} onChange={handleChange} options={GENDERS} />
            </F>
            <F label="Date of Birth" required error={errors.birthDay}>
              <Inp name="birthDay" type="date"
                value={formatDateForInput(form.birthDay)} onChange={handleChange}
                max={new Date().toISOString().slice(0,10)} />
            </F>
            <F label="Anniversary" error={errors.anniversary}>
              <Inp name="anniversary" type="date"
                value={formatDateForInput(form.anniversary)} onChange={handleChange}
                max={new Date().toISOString().slice(0,10)} />
            </F>
            <F label="Language">
              <Sel name="language" value={form.language} onChange={handleChange} options={languages} />
            </F>
            <F label="Referred By">
              <Inp name="refBy" value={form.refBy} onChange={handleChange} />
            </F>

          </div>

          <div className="gt-divider" />

          {/* Preferences checkboxes */}
          <div className="gt-chk-grid">
            {chk("isLoyaltyEnrolled",       "Opt for Loyalty")}


          </div>
        </Card>

        {/* ── Address ────────────────────────────────────────────────────── */}
        <Card icon="📍" title="Address">
          <div className="gt-grid">
            <F label="Address 1" span2>
              <Inp name="address1" value={form.address1} onChange={handleChange} />
            </F>
            <F label="Address 2" span2>
              <Inp name="address2" value={form.address2} onChange={handleChange} />
            </F>
            <F label="City">
              <Inp name="city" value={form.city} onChange={handleChange} />
            </F>
            <F label="ZIP / Postal Code">
              <Inp name="zipCode" value={form.zipCode} onChange={handleChange} />
            </F>
            <F label="Nationality" required error={errors.nationalityCode}>
              <Sel name="nationalityCode" value={Number(form.nationalityCode) || ""}
                onChange={handleChange} options={nationalities} />
            </F>
            <F label="Nationality ID / Iqama">
              <Inp name="nationalityId" value={form.nationalityId} onChange={handleChange} />
            </F>
            <F label="Country">
              <Sel name="countryCode" value={form.countryCode}
                onChange={handleChange} options={countries} />
            </F>
            <F label="State">
              <Sel name="stateCode" value={form.stateCode}
                onChange={handleChange} options={states}
                disabled={!states.length} />
            </F>
            <F label="State (Other)">
              <Inp name="stateOther" value={form.stateOther} onChange={handleChange} />
            </F>
          </div>
        </Card>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="gt-actions">
          <button type="button" className="gt-btn gt-btn-sec"
            onClick={() => setForm({ ...customer })}>Reset</button>
          <button type="submit" className="gt-btn gt-btn-pri" disabled={saving}>
            {saving && <span className="gt-spinner" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

      </form>

      {toast && (
        <div className={`gt-toast gt-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </>
  );
};

const Card = ({ icon, title, children }) => (
  <div className="gt-card">
    <div className="gt-card-hd">
      <span className="gt-card-icon">{icon}</span>
      <span className="gt-card-title">{title}</span>
    </div>
    <div className="gt-card-body">{children}</div>
  </div>
);

const CSS = `
  .gt-wrap { font-family:'DM Sans',system-ui,sans-serif; color:#1a1f2e; padding:0 0 48px; }

  .gt-card { background:#fff; border:1px solid #e8eaf0; border-radius:12px;
    margin-bottom:20px; overflow:hidden; }
  .gt-card-hd { display:flex; align-items:center; gap:10px; padding:14px 24px;
    background:#f7f8fc; border-bottom:1px solid #e8eaf0; }
  .gt-card-icon { font-size:18px; }
  .gt-card-title { font-size:14px; font-weight:700; color:#1a1f2e; }
  .gt-card-body { padding:24px; }

  .gt-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px 20px; }
  .gt-span2 { grid-column:span 2; }
  .gt-span3 { grid-column:span 3; }
  @media(max-width:1100px){ .gt-grid{grid-template-columns:repeat(3,1fr);} }
  @media(max-width:780px) { .gt-grid{grid-template-columns:repeat(2,1fr);} }
  @media(max-width:480px) { .gt-grid{grid-template-columns:1fr;} }

  .gt-field { display:flex; flex-direction:column; gap:5px; }
  .gt-label { font-size:11.5px; font-weight:600; color:#6b7280;
    text-transform:uppercase; letter-spacing:.06em; }
  .gt-req { color:#e53e3e; }
  .gt-err { font-size:11px; color:#e53e3e; }

  .gt-input,.gt-select { height:38px; padding:0 12px; border:1.5px solid #dde1ea;
    border-radius:8px; font-family:inherit; font-size:13.5px; color:#1a1f2e;
    background:#fff; outline:none; width:100%; box-sizing:border-box;
    transition:border-color .15s, box-shadow .15s; }
  .gt-input:focus,.gt-select:focus { border-color:#3E5D8A;
    box-shadow:0 0 0 3px rgba(62,93,138,.10); }
  .gt-error { border-color:#e53e3e; }
  .gt-input:disabled { background:#f7f8fc; color:#6b7280; cursor:default; }

  .gt-divider { height:1px; background:#f0f1f5; margin:20px 0; }

  .gt-chk-grid { display:flex; flex-wrap:wrap; gap:20px; }
  .gt-chk-label { display:flex; align-items:center; gap:8px;
    font-size:13.5px; color:#1a1f2e; cursor:pointer; }

  .gt-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:4px; }
  .gt-btn { height:40px; padding:0 28px; border-radius:8px;
    font-family:inherit; font-size:13.5px; font-weight:600;
    cursor:pointer; border:none; transition:background .15s; }
  .gt-btn-pri { background:#3E5D8A; color:#fff; }
  .gt-btn-pri:hover { background:#2f4a72; }
  .gt-btn-pri:disabled { background:#9badc7; cursor:not-allowed; }
  .gt-btn-sec { background:#f3f4f8; color:#4b5563; }
  .gt-btn-sec:hover { background:#e5e7ef; }

  .gt-spinner { display:inline-block; width:13px; height:13px;
    border:2px solid rgba(255,255,255,.4); border-top-color:#fff;
    border-radius:50%; animation:gtspin .7s linear infinite;
    margin-right:7px; vertical-align:middle; }
  @keyframes gtspin { to{transform:rotate(360deg);} }

  .gt-toast { position:fixed; bottom:24px; right:24px; padding:12px 20px;
    border-radius:10px; font-size:14px; font-weight:600; color:#fff;
    z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,.15); }
  .gt-toast-success { background:#16a34a; }
  .gt-toast-error   { background:#dc2626; }
`;

export default GeneralTab;