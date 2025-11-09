import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const SQL_MIN = "1753-01-01";

const toIsoOrNull = (yyyyMmDd) => {
  if (!yyyyMmDd) return null;
  // Keep as local midnight to avoid TZ date shift, then to ISO string
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
};

const notFutureAndAfterMin = (yyyyMmDd) => {
  if (!yyyyMmDd || yyyyMmDd < SQL_MIN) return false;
  const today = new Date().toISOString().slice(0, 10);
  return yyyyMmDd <= today;
};

const formatDateForInput = (val) => {
  if (!val || val === "0001-01-01T00:00:00") return "";
  // Accept ISO or yyyy-mm-dd
  return String(val).slice(0, 10);
};

const GeneralTab = ({ customer }) => {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (customer) setFormData({ ...customer });
  }, [customer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? (checked ? 1 : 0) : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  // Only validate * fields + date rules: Birthdate required; Anniversary optional.
  const validate = () => {
    const errs = {};
    if (!String(formData.firstName || "").trim()) errs.firstName = "First name is required";
    if (!String(formData.lastName || "").trim()) errs.lastName = "Last name is required";
    if (!String(formData.mobilePhone || "").trim()) errs.mobilePhone = "Mobile phone is required";
    if (!String(formData.gender || "").trim()) errs.gender = "Gender is required";
    if (!String(formData.nationalityName || "").trim()) errs.nationalityName = "Nationality is required";

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

    // Prepare payload with exact schema and defaults
    const birthYmd = formatDateForInput(formData.birthDay);
    const annYmd = formatDateForInput(formData.anniversary);

    const payload = {
      customerId: String(formData.customerId || ""),
      firstName: String(formData.firstName || ""),
      middleName: String(formData.middleName || ""),
      lastName: String(formData.lastName || ""),
      preferredName: String(formData.preferredName || ""),
      email: String(formData.email || ""),
      mobilePhone: String(formData.mobilePhone || ""),
      homePhone: String(formData.homePhone || ""),
      workPhone: String(formData.workPhone || ""),
      gender: String(formData.gender || ""),

      // ISO timestamps per API
      birthDay: toIsoOrNull(birthYmd),                      // required (validated)
      anniversary: annYmd ? toIsoOrNull(annYmd) : null,     // optional

      referal: String(formData.referal || ""),
      refBy: String(formData.refBy || ""),
      primaryEmployee: String(formData.primaryEmployee || ""),
      address1: String(formData.address1 || ""),
      address2: String(formData.address2 || ""),
      city: String(formData.city || ""),

      nationalityCode: Number(formData.nationalityCode || 0),
      countryCode: Number(formData.countryCode || 0),
      stateCode: Number(formData.stateCode || 0),

      nationalityName: String(formData.nationalityName || ""),
      countryName: String(formData.countryName || ""),
      stateName: String(formData.stateName || ""),
      centerName: String(formData.centerName || ""),
      nationalityId: String(formData.nationalityId || ""),
      stateOther: String(formData.stateOther || ""),
      centerCode: String(formData.centerCode || ""),
      language: Number(formData.language || 0),
      userName: String(formData.userName || ""),

      tags: String(formData.tags || ""),

      // Integer flags (checkboxes): default 0
      transactionalSMSEnable: Number(formData.transactionalSMSEnable || 0),
      transactionalEmailEnable: Number(formData.transactionalEmailEnable || 0),
      marketingSMSEnable: Number(formData.marketingSMSEnable || 0),
      marketingEmailEnable: Number(formData.marketingEmailEnable || 0),
      marketingLoyalPointSMSandEmailEnable: Number(formData.marketingLoyalPointSMSandEmailEnable || 0),
      blockGuestFromEditCustomerData: Number(formData.blockGuestFromEditCustomerData || 0),
      blockGuestFromOnlineAppointmentBooking: Number(formData.blockGuestFromOnlineAppointmentBooking || 0),
    };

    try {
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
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Personal Info */}
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

          <label>
            Mobile Phone*
            <input name="mobilePhone" value={formData.mobilePhone || ""} onChange={handleChange} />
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

          {/* Dates */}
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
        </div>
      </div>

      {/* Address */}
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

          <label>
            Nationality*
            <select name="nationalityName" value={formData.nationalityName || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Saudi Arabian</option>
              <option>Indian</option>
              <option>Other</option>
            </select>
            {formErrors.nationalityName && <span className="error">{formErrors.nationalityName}</span>}
          </label>

          <label>
            Country
            <select name="countryName" value={formData.countryName || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Saudi Arabia</option>
              <option>India</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            State
            <select name="stateName" value={formData.stateName || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Ar Riyad</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            State (Other)
            <input name="stateOther" value={formData.stateOther || ""} onChange={handleChange} />
          </label>

          <label>
            Nationality ID
            <input name="nationalityId" value={formData.nationalityId || ""} onChange={handleChange} />
          </label>
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button">Cancel</button>
      </div>
    </form>
  );
};

export default GeneralTab;
