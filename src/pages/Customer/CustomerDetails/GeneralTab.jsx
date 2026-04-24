import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const SQL_MIN_YMD = "1753-01-01";
const EMPTY_DATE_PREFIXES = ["0001-01-01", "1900-01-01"];

const toIsoOrNull = (yyyyMmDd) => {
  if (!yyyyMmDd) return null;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
};

const notFutureAndAfterMin = (yyyyMmDd) => {
  if (!yyyyMmDd || yyyyMmDd < SQL_MIN_YMD) return false;
  const today = new Date().toISOString().slice(0, 10);
  return yyyyMmDd <= today;
};

const formatDateForInput = (val) => {
  if (!val) return "";
  const s = String(val).slice(0, 10);
  if (EMPTY_DATE_PREFIXES.some((prefix) => s.startsWith(prefix))) return "";
  return s;
};

const NATIONALITIES = [
  { id: 107, name: "Saudi Arabian" },
  { id: 101, name: "Indian" },
  { id: 1,   name: "American" },
  { id: 999, name: "Other" },
];

const COUNTRIES = [
  { id: 1,   name: "Saudi Arabia" },
  { id: 2,   name: "India" },
  { id: 3,   name: "United States" },
  { id: 999, name: "Other" },
];

const STATES = [
  { id: 1,   name: "Ar Riyad",    countryId: 1 },
  { id: 2,   name: "Makkah",      countryId: 1 },
  { id: 10,  name: "Maharashtra", countryId: 2 },
  { id: 11,  name: "Delhi",       countryId: 2 },
  { id: 999, name: "Other",       countryId: null },
];

const LANGUAGES = [
  { id: 1, name: "English" },
  { id: 2, name: "Arabic" },
  { id: 3, name: "Hindi" },
];

const PHONE_CODES = [
  { code: "+966", label: "+966" },
  { code: "+91",  label: "+91"  },
  { code: "+1",   label: "+1"   },
];

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');

  .gt-wrap {
    font-family: 'DM Sans', sans-serif;
    color: #1a1f2e;
    padding: 0 0 48px 0;
  }

  /* ── Section card ── */
  .gt-card {
    background: #fff;
    border: 1px solid #e8eaf0;
    border-radius: 12px;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .gt-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 24px;
    background: #f7f8fc;
    border-bottom: 1px solid #e8eaf0;
  }

  .gt-card-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #3E5D8A;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .gt-card-icon svg {
    width: 16px;
    height: 16px;
    fill: #fff;
  }

  .gt-card-title {
    font-family: 'Inter', serif;
    font-size: 15px;
    font-weight: 400;
    color: #1a1f2e;
    letter-spacing: 0.01em;
  }

  .gt-card-body {
    padding: 24px;
  }

  /* ── Grid ── */
  .gt-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px 20px;
  }

  .gt-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px 20px;
  }

  @media (max-width: 1100px) {
    .gt-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 800px) {
    .gt-grid, .gt-grid-2 { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 500px) {
    .gt-grid, .gt-grid-2 { grid-template-columns: 1fr; }
  }

  /* ── Field ── */
  .gt-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .gt-field.gt-span2 { grid-column: span 2; }

  .gt-label {
    font-size: 11.5px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .gt-label .gt-req {
    color: #e53e3e;
    margin-left: 2px;
  }

  .gt-input,
  .gt-select {
    height: 38px;
    padding: 0 12px;
    border: 1.5px solid #dde1ea;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    color: #1a1f2e;
    background: #fff;
    transition: border-color 0.18s, box-shadow 0.18s;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  .gt-input:focus,
  .gt-select:focus {
    border-color: #3E5D8A;
    box-shadow: 0 0 0 3px rgba(62,93,138,0.10);
  }

  .gt-input.gt-error,
  .gt-select.gt-error {
    border-color: #e53e3e;
    box-shadow: 0 0 0 3px rgba(229,62,62,0.08);
  }

  .gt-error-msg {
    font-size: 11px;
    color: #e53e3e;
    margin-top: 2px;
  }

  /* ── Phone row ── */
  .gt-phone-row {
    display: flex;
    gap: 6px;
  }

  .gt-phone-code {
    width: 80px;
    flex-shrink: 0;
  }

  .gt-phone-number {
    flex: 1;
  }

  /* ── Divider ── */
  .gt-divider {
    height: 1px;
    background: #f0f1f5;
    margin: 20px 0;
  }

  /* ── Actions ── */
  .gt-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 0 2px;
    margin-top: 8px;
  }

  .gt-btn {
    height: 40px;
    padding: 0 28px;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
  }

  .gt-btn:active { transform: scale(0.97); }

  .gt-btn-primary {
    background: #3E5D8A;
    color: #fff;
    box-shadow: 0 2px 8px rgba(62,93,138,0.18);
  }

  .gt-btn-primary:hover { background: #2f4a72; }
  .gt-btn-primary:disabled { background: #9badc7; cursor: not-allowed; transform: none; }

  .gt-btn-secondary {
    background: #f3f4f8;
    color: #4b5563;
  }

  .gt-btn-secondary:hover { background: #e5e7ef; }

  /* ── Saving indicator ── */
  .gt-spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: gt-spin 0.7s linear infinite;
    margin-right: 7px;
    vertical-align: middle;
  }

  @keyframes gt-spin { to { transform: rotate(360deg); } }
`;

// ── SVG icons ──────────────────────────────────────────────────────────────
const IconPerson = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
  </svg>
);

const IconLocation = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);

 const F = ({ name, label, required, error, children, span2 }) => (
    <div className={`gt-field${span2 ? " gt-span2" : ""}`}>
      <span className="gt-label">
        {label}{required && <span className="gt-req">*</span>}
      </span>
      {children}
      {error && <span className="gt-error-msg">{error}</span>}
    </div>
  );

// ── Component ──────────────────────────────────────────────────────────────
const GeneralTab = ({ customer }) => {
  const [formData, setFormData]   = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (customer) setFormData({ ...customer });
  }, [customer]);

  const filteredStates = STATES.filter(
    (s) => s.countryId === Number(formData.countryCode) || s.countryId === null
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: val }));

    if (name === "nationalityCode") {
      const found = NATIONALITIES.find((n) => String(n.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        nationalityCode: Number(value),
        nationalityName: found ? found.name : "",
      }));
    }
    if (name === "countryCode") {
      const found = COUNTRIES.find((c) => String(c.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        countryCode: Number(value),
        countryName: found ? found.name : "",
        stateCode: 0,
        stateName: "",
      }));
    }
    if (name === "stateCode") {
      const found = STATES.find((s) => String(s.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        stateCode: Number(value),
        stateName: found ? found.name : "",
      }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!String(formData.firstName    || "").trim()) errs.firstName    = "Required";
    if (!String(formData.lastName     || "").trim()) errs.lastName     = "Required";
    if (!String(formData.mobilePhone  || "").trim()) errs.mobilePhone  = "Required";
    if (!String(formData.gender       || "").trim()) errs.gender       = "Required";
    if (!Number(formData.nationalityCode || 0))      errs.nationalityCode = "Required";

    const birthYmd = formatDateForInput(formData.birthDay);
    if (!birthYmd) {
      errs.birthDay = "Required";
    } else if (!notFutureAndAfterMin(birthYmd)) {
      errs.birthDay = "Must be ≥ 1753-01-01 and not in the future";
    }

    const annYmd = formatDateForInput(formData.anniversary);
    if (annYmd && !notFutureAndAfterMin(annYmd)) {
      errs.anniversary = "Must be ≥ 1753-01-01 and not in the future";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const birthYmd = formatDateForInput(formData.birthDay);
    const annYmd   = formatDateForInput(formData.anniversary);

    const payload = {
      customerId:    String(formData.customerId    || ""),
      firstName:     String(formData.firstName     || ""),
      middleName:    String(formData.middleName    || ""),
      lastName:      String(formData.lastName      || ""),
      preferredName: String(formData.preferredName || ""),
      email:         String(formData.email         || ""),
      mobilePhone:   String(formData.mobilePhone   || ""),
      homePhone:     String(formData.homePhone     || ""),
      workPhone:     String(formData.workPhone     || ""),
      gender:        String(formData.gender        || ""),
      phoneCode:     String(formData.phoneCode     || ""),
      birthDay:      toIsoOrNull(birthYmd),
      anniversary:   annYmd ? toIsoOrNull(annYmd) : null,
      referal:         String(formData.referal         || ""),
      refBy:           String(formData.refBy           || ""),
      primaryEmployee: String(formData.primaryEmployee || ""),
      address1:        String(formData.address1        || ""),
      address2:        String(formData.address2        || ""),
      city:            String(formData.city            || ""),
      zipCode:         String(formData.zipCode         || ""),
      nationalityCode: Number(formData.nationalityCode || 0),
      countryCode:     Number(formData.countryCode     || 0),
      stateCode:       Number(formData.stateCode       || 0),
      nationalityName: String(formData.nationalityName || ""),
      countryName:     String(formData.countryName     || ""),
      stateName:       String(formData.stateName       || ""),
      centerName:      String(formData.centerName      || ""),
      nationalityId:   String(formData.nationalityId   || ""),
      stateOther:      String(formData.stateOther      || ""),
      centerCode:      String(formData.centerCode      || ""),
      language:        Number(formData.language        || 0),
      userName:        String(formData.userName        || ""),
      tags:            String(formData.tags            || ""),
      transactionalSMSEnable:               Number(formData.transactionalSMSEnable               || 0),
      transactionalEmailEnable:             Number(formData.transactionalEmailEnable             || 0),
      marketingSMSEnable:                   Number(formData.marketingSMSEnable                   || 0),
      marketingEmailEnable:                 Number(formData.marketingEmailEnable                 || 0),
      marketingLoyalPointSMSandEmailEnable: Number(formData.marketingLoyalPointSMSandEmailEnable || 0),
      blockGuestFromEditCustomerData:           Number(formData.blockGuestFromEditCustomerData           || 0),
      blockGuestFromOnlineAppointmentBooking:   Number(formData.blockGuestFromOnlineAppointmentBooking   || 0),
      isLoyaltyEnrolled: !!formData.isLoyaltyEnrolled, 
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save customer");
      const result = await res.json();
      console.log("SaveCustomer response:", result);
      alert("Customer saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving customer details.");
    } finally {
      setSaving(false);
    }
  };

 

  const inp = (name, extra = {}) => (
    <input
      className={`gt-input${formErrors[name] ? " gt-error" : ""}`}
      name={name}
      value={formData[name] || ""}
      onChange={handleChange}
      {...extra}
    />
  );

  const sel = (name, options, extra = {}) => (
    <select
      className={`gt-select${formErrors[name] ? " gt-error" : ""}`}
      name={name}
      value={formData[name] || ""}
      onChange={handleChange}
      {...extra}
    >
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <>
      <style>{styles}</style>
      <form className="gt-wrap" onSubmit={handleSubmit}>

        {/* ── Personal Info ─────────────────────────────────────── */}
        <div className="gt-card">
          <div className="gt-card-header">
            <div className="gt-card-icon"><IconPerson /></div>
            <span className="gt-card-title">Personal Info</span>
          </div>
          <div className="gt-card-body">
            <div className="gt-grid">

              <F name="customerId" label="Customer ID">
                {inp("customerId", { readOnly: true, style: { background: "#f7f8fc", color: "#6b7280" } })}
              </F>

              <F name="firstName" label="First Name" required error={formErrors.firstName}>
                {inp("firstName")}
              </F>

              <F name="middleName" label="Middle Name">
                {inp("middleName")}
              </F>

              <F name="lastName" label="Last Name" required error={formErrors.lastName}>
                {inp("lastName")}
              </F>

              <F name="preferredName" label="Preferred Name">
                {inp("preferredName")}
              </F>

              <F name="email" label="Email">
                {inp("email", { type: "email" })}
              </F>

              <F name="mobilePhone" label="Mobile Phone" required error={formErrors.mobilePhone}>
                <div className="gt-phone-row">
                  <select
                    className="gt-select gt-phone-code"
                    name="phoneCode"
                    value={formData.phoneCode || ""}
                    onChange={handleChange}
                  >
                    <option value="">--</option>
                    {PHONE_CODES.map((p) => (
                      <option key={p.code} value={p.code}>{p.label}</option>
                    ))}
                  </select>
                  <input
                    className={`gt-input gt-phone-number${formErrors.mobilePhone ? " gt-error" : ""}`}
                    name="mobilePhone"
                    value={formData.mobilePhone || ""}
                    onChange={handleChange}
                  />
                </div>
              </F>

              <F name="homePhone" label="Home Phone">
                {inp("homePhone")}
              </F>

              <F name="workPhone" label="Work Phone">
                {inp("workPhone")}
              </F>

              <F name="gender" label="Gender" required error={formErrors.gender}>
                {sel("gender", [
                  { value: "Male",   label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other",  label: "Other" },
                ])}
              </F>

              <F name="birthDay" label="Birthday" required error={formErrors.birthDay}>
                <input
                  className={`gt-input${formErrors.birthDay ? " gt-error" : ""}`}
                  type="date"
                  name="birthDay"
                  value={formatDateForInput(formData.birthDay)}
                  onChange={handleChange}
                />
              </F>

              <F name="anniversary" label="Anniversary" error={formErrors.anniversary}>
                <input
                  className={`gt-input${formErrors.anniversary ? " gt-error" : ""}`}
                  type="date"
                  name="anniversary"
                  value={formatDateForInput(formData.anniversary)}
                  onChange={handleChange}
                />
              </F>

              <F name="referal" label="Referral">
                {inp("referal")}
              </F>

              <F name="refBy" label="Ref By">
                {inp("refBy")}
              </F>

              <F name="primaryEmployee" label="Primary Employee">
                {inp("primaryEmployee")}
              </F>

              <F name="language" label="Language">
                {sel("language", LANGUAGES.map((l) => ({ value: l.id, label: l.name })))}
              </F>

              <F name="userName" label="Username">
                {inp("userName")}
              </F>

              <F name="tags" label="Tags">
                {inp("tags")}
              </F>

              <F name="isLoyaltyEnrolled" label="Loyalty Program" span2>
  <label style={{ display: "flex", alignItems: "center", gap: 10, height: 38, cursor: "pointer" }}>
    <input
      type="checkbox"
      name="isLoyaltyEnrolled"
      checked={!!formData.isLoyaltyEnrolled}
      onChange={handleChange}
      style={{ width: 16, height: 16, accentColor: "#3E5D8A", cursor: "pointer" }}
    />
    <span style={{ fontSize: 13.5, color: "#1a1f2e", fontWeight: 500 }}>
      Is customer part of loyalty program?
    </span>
  </label>
</F>

            </div>
          </div>
        </div>

        {/* ── Address ───────────────────────────────────────────── */}
        <div className="gt-card">
          <div className="gt-card-header">
            <div className="gt-card-icon"><IconLocation /></div>
            <span className="gt-card-title">Address</span>
          </div>
          <div className="gt-card-body">
            <div className="gt-grid">

              <F name="address1" label="Address 1" span2>
                {inp("address1")}
              </F>

              <F name="address2" label="Address 2" span2>
                {inp("address2")}
              </F>

              <F name="city" label="City">
                {inp("city")}
              </F>

              <F name="zipCode" label="ZIP / Postal Code">
                {inp("zipCode")}
              </F>

              <F name="nationalityCode" label="Nationality" required error={formErrors.nationalityCode}>
                <select
                  className={`gt-select${formErrors.nationalityCode ? " gt-error" : ""}`}
                  name="nationalityCode"
                  value={formData.nationalityCode || 0}
                  onChange={handleChange}
                >
                  <option value={0}>Select</option>
                  {NATIONALITIES.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </F>

              <F name="nationalityId" label="Nationality ID">
                {inp("nationalityId")}
              </F>

              <F name="countryCode" label="Country">
                <select
                  className="gt-select"
                  name="countryCode"
                  value={formData.countryCode || 0}
                  onChange={handleChange}
                >
                  <option value={0}>Select</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </F>

              <F name="stateCode" label="State">
                <select
                  className="gt-select"
                  name="stateCode"
                  value={formData.stateCode || 0}
                  onChange={handleChange}
                >
                  <option value={0}>Select</option>
                  {filteredStates.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </F>

              <F name="stateOther" label="State (Other)">
                {inp("stateOther")}
              </F>

            </div>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="gt-actions">
          <button type="button" className="gt-btn gt-btn-secondary">Cancel</button>
          <button type="submit" className="gt-btn gt-btn-primary" disabled={saving}>
            {saving && <span className="gt-spinner" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

      </form>
    </>
  );
};

export default GeneralTab;