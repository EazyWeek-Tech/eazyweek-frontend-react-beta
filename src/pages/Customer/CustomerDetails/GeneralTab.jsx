import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

// SQL Server minimum date
const SQL_MIN_YMD = "1753-01-01";
// Default "empty" dates stored as 1900-01-01 in DB — treat as blank
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

/**
 * BUG FIX: Also treat "1900-01-01" as empty (DB default for missing dates).
 * Previously only "0001-01-01T00:00:00" was handled.
 */
const formatDateForInput = (val) => {
  if (!val) return "";
  const s = String(val).slice(0, 10);
  if (EMPTY_DATE_PREFIXES.some((prefix) => s.startsWith(prefix))) return "";
  return s;
};

// ── Lookup data (replace with API calls if available) ──────────────────────
const NATIONALITIES = [
  { id: 107, code: "SA", name: "Saudi Arabian" },
  { id: 101, code: "IN", name: "Indian" },
  { id: 1,   code: "US", name: "American" },
  { id: 999, code: "OT", name: "Other" },
];

const COUNTRIES = [
  { id: 1,  name: "Saudi Arabia" },
  { id: 2,  name: "India" },
  { id: 3,  name: "United States" },
  { id: 999, name: "Other" },
];

const STATES = [
  { id: 1,  name: "Ar Riyad",    countryId: 1 },
  { id: 2,  name: "Makkah",      countryId: 1 },
  { id: 10, name: "Maharashtra", countryId: 2 },
  { id: 11, name: "Delhi",       countryId: 2 },
  { id: 999, name: "Other",      countryId: null },
];

const LANGUAGES = [
  { id: 1, name: "English" },
  { id: 2, name: "Arabic" },
  { id: 3, name: "Hindi" },
];

const PHONE_CODES = [
  { code: "+966", label: "+966 Saudi Arabia" },
  { code: "+91",  label: "+91 India" },
  { code: "+1",   label: "+1 USA" },
];

// ── Component ──────────────────────────────────────────────────────────────
const GeneralTab = ({ customer }) => {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) setFormData({ ...customer });
  }, [customer]);

  // Filtered states based on selected country
  const filteredStates = STATES.filter(
    (s) => s.countryId === Number(formData.countryCode) || s.countryId === null
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? (checked ? 1 : 0) : value;
    setFormData((prev) => ({ ...prev, [name]: val }));

    // When country changes, reset state
    if (name === "countryCode") {
      setFormData((prev) => ({ ...prev, countryCode: value, stateCode: 0, stateName: "" }));
    }

    // Sync name fields from lookup selections
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
    if (!String(formData.firstName || "").trim())   errs.firstName   = "First name is required";
    if (!String(formData.lastName || "").trim())    errs.lastName    = "Last name is required";
    if (!String(formData.mobilePhone || "").trim()) errs.mobilePhone = "Mobile phone is required";
    if (!String(formData.gender || "").trim())      errs.gender      = "Gender is required";
    if (!Number(formData.nationalityCode || 0))     errs.nationalityCode = "Nationality is required";

    const birthYmd = formatDateForInput(formData.birthDay);
    if (!birthYmd) {
      errs.birthDay = "Birth date is required";
    } else if (!notFutureAndAfterMin(birthYmd)) {
      errs.birthDay = "Birth date must be on/after 1753-01-01 and not in the future";
    }

    const annYmd = formatDateForInput(formData.anniversary);
    if (annYmd && !notFutureAndAfterMin(annYmd)) {
      errs.anniversary = "Anniversary must be on/after 1753-01-01 and not in the future";
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

      // BUG FIX: dates now correctly omit 1900-01-01 defaults
      birthDay:    toIsoOrNull(birthYmd),
      anniversary: annYmd ? toIsoOrNull(annYmd) : null,

      referal:         String(formData.referal         || ""),
      refBy:           String(formData.refBy           || ""),
      primaryEmployee: String(formData.primaryEmployee || ""),
      address1:        String(formData.address1        || ""),
      address2:        String(formData.address2        || ""),
      city:            String(formData.city            || ""),
      zipCode:         String(formData.zipCode         || ""),

      // Use integer codes, not display names
      nationalityCode: Number(formData.nationalityCode || 0),
      countryCode:     Number(formData.countryCode     || 0),
      stateCode:       Number(formData.stateCode       || 0),

      // Name fields kept for display/reference but codes drive the DB
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

      // Communication preferences (previously missing from UI)
      transactionalSMSEnable:                Number(formData.transactionalSMSEnable                || 0),
      transactionalEmailEnable:              Number(formData.transactionalEmailEnable              || 0),
      marketingSMSEnable:                    Number(formData.marketingSMSEnable                    || 0),
      marketingEmailEnable:                  Number(formData.marketingEmailEnable                  || 0),
      marketingLoyalPointSMSandEmailEnable:  Number(formData.marketingLoyalPointSMSandEmailEnable  || 0),

      // Block flags (previously missing from UI)
      blockGuestFromEditCustomerData:           Number(formData.blockGuestFromEditCustomerData           || 0),
      blockGuestFromOnlineAppointmentBooking:   Number(formData.blockGuestFromOnlineAppointmentBooking   || 0),
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
      alert("Customer details saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving customer details.");
    } finally {
      setSaving(false);
    }
  };

  const chk = (name) => Number(formData[name] || 0) === 1;

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Personal Info ──────────────────────────────────────── */}
      <div className="section">
        <h3 className="sectttl">Personal Info</h3>
        <div className="form-grid">

          <label>
            Customer ID
            <input name="customerId" value={formData.customerId || ""} onChange={handleChange} />
          </label>

          <label>
            First Name*
            <input name="firstName" value={formData.firstName || ""} onChange={handleChange} />
            {formErrors.firstName && <span className="error">{formErrors.firstName}</span>}
          </label>

          <label>
            Middle Name
            <input name="middleName" value={formData.middleName || ""} onChange={handleChange} />
          </label>

          <label>
            Last Name*
            <input name="lastName" value={formData.lastName || ""} onChange={handleChange} />
            {formErrors.lastName && <span className="error">{formErrors.lastName}</span>}
          </label>

          <label>
            Preferred Name
            <input name="preferredName" value={formData.preferredName || ""} onChange={handleChange} />
          </label>

          <label>
            Email
            <input type="email" name="email" value={formData.email || ""} onChange={handleChange} />
          </label>

          {/* BUG FIX: Added phone code (PHONE_CODE) selector alongside mobile */}
          <label>
            Mobile Phone*
            <div style={{ display: "flex", gap: "6px" }}>
              <select
                name="phoneCode"
                value={formData.phoneCode || ""}
                onChange={handleChange}
                style={{ width: "140px", flexShrink: 0 }}
              >
                <option value="">Code</option>
                {PHONE_CODES.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
              <input
                name="mobilePhone"
                value={formData.mobilePhone || ""}
                onChange={handleChange}
                style={{ flex: 1 }}
              />
            </div>
            {formErrors.mobilePhone && <span className="error">{formErrors.mobilePhone}</span>}
          </label>

          <label>
            Home Phone
            <input name="homePhone" value={formData.homePhone || ""} onChange={handleChange} />
          </label>

          <label>
            Work Phone
            <input name="workPhone" value={formData.workPhone || ""} onChange={handleChange} />
          </label>

          <label>
            Gender*
            <select name="gender" value={formData.gender || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
            {formErrors.gender && <span className="error">{formErrors.gender}</span>}
          </label>

          {/* BUG FIX: formatDateForInput now strips 1900-01-01 defaults */}
          <label>
            Birthday*
            <input
              type="date"
              name="birthDay"
              value={formatDateForInput(formData.birthDay)}
              onChange={handleChange}
            />
            {formErrors.birthDay && <span className="error">{formErrors.birthDay}</span>}
          </label>

          <label>
            Anniversary
            <input
              type="date"
              name="anniversary"
              value={formatDateForInput(formData.anniversary)}
              onChange={handleChange}
            />
            {formErrors.anniversary && <span className="error">{formErrors.anniversary}</span>}
          </label>

          <label>
            Referral
            <input name="referal" value={formData.referal || ""} onChange={handleChange} />
          </label>

          <label>
            Ref By
            <input name="refBy" value={formData.refBy || ""} onChange={handleChange} />
          </label>

          <label>
            Primary Employee
            <input name="primaryEmployee" value={formData.primaryEmployee || ""} onChange={handleChange} />
          </label>

          <label>
            Language
            <select name="language" value={formData.language || 0} onChange={handleChange}>
              <option value={0}>Select</option>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>

          <label>
            Username
            <input name="userName" value={formData.userName || ""} onChange={handleChange} />
          </label>

          <label>
            Tags
            <input name="tags" value={formData.tags || ""} onChange={handleChange} />
          </label>

        </div>
      </div>

      {/* ── Address ────────────────────────────────────────────── */}
      <div className="section">
        <h3 className="sectttl">Address</h3>
        <div className="form-grid">

          <label>
            Address 1
            <input name="address1" value={formData.address1 || ""} onChange={handleChange} />
          </label>

          <label>
            Address 2
            <input name="address2" value={formData.address2 || ""} onChange={handleChange} />
          </label>

          <label>
            City
            <input name="city" value={formData.city || ""} onChange={handleChange} />
          </label>

          {/* BUG FIX: Added ZIP_CODE field that exists in DB but was missing from UI */}
          <label>
            ZIP / Postal Code
            <input name="zipCode" value={formData.zipCode || ""} onChange={handleChange} />
          </label>

          {/* BUG FIX: Nationality now binds to nationalityCode (int) not nationalityName (string).
              Previously nationalityName was used as both the value and the key, which broke
              the mapping to NATIONALITY_NUMBER in the DB. */}
          <label>
            Nationality*
            <select
              name="nationalityCode"
              value={formData.nationalityCode || 0}
              onChange={handleChange}
            >
              <option value={0}>Select</option>
              {NATIONALITIES.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
            {formErrors.nationalityCode && <span className="error">{formErrors.nationalityCode}</span>}
          </label>

          <label>
            Nationality ID
            <input name="nationalityId" value={formData.nationalityId || ""} onChange={handleChange} />
          </label>

          {/* BUG FIX: Country now binds to countryCode (int) */}
          <label>
            Country
            <select
              name="countryCode"
              value={formData.countryCode || 0}
              onChange={handleChange}
            >
              <option value={0}>Select</option>
              {COUNTRIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          {/* BUG FIX: State now binds to stateCode (int) and is filtered by countryCode */}
          <label>
            State
            <select
              name="stateCode"
              value={formData.stateCode || 0}
              onChange={handleChange}
            >
              <option value={0}>Select</option>
              {filteredStates.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label>
            State (Other)
            <input name="stateOther" value={formData.stateOther || ""} onChange={handleChange} />
          </label>

        </div>
      </div>

      {/* ── Communication Preferences (previously missing from UI) ── */}
      <div className="section">
        <h3 className="sectttl">Communication Preferences</h3>
        <div className="form-grid-checkboxes">

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="transactionalSMSEnable"
              checked={chk("transactionalSMSEnable")}
              onChange={handleChange}
            />
            Transactional SMS
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="transactionalEmailEnable"
              checked={chk("transactionalEmailEnable")}
              onChange={handleChange}
            />
            Transactional Email
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="marketingSMSEnable"
              checked={chk("marketingSMSEnable")}
              onChange={handleChange}
            />
            Marketing SMS
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="marketingEmailEnable"
              checked={chk("marketingEmailEnable")}
              onChange={handleChange}
            />
            Marketing Email
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="marketingLoyalPointSMSandEmailEnable"
              checked={chk("marketingLoyalPointSMSandEmailEnable")}
              onChange={handleChange}
            />
            Loyalty Points SMS &amp; Email
          </label>

        </div>
      </div>

      {/* ── Access Control (previously missing from UI) ────────── */}
      <div className="section">
        <h3 className="sectttl">Access Control</h3>
        <div className="form-grid-checkboxes">

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="blockGuestFromEditCustomerData"
              checked={chk("blockGuestFromEditCustomerData")}
              onChange={handleChange}
            />
            Block Guest from Editing Personal Info
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="blockGuestFromOnlineAppointmentBooking"
              checked={chk("blockGuestFromOnlineAppointmentBooking")}
              onChange={handleChange}
            />
            Block Guest from Online Appointment Booking
          </label>

        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button">Cancel</button>
      </div>

    </form>
  );
};

export default GeneralTab;