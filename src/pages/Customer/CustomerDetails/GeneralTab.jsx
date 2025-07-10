import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const GeneralTab = ({ customer }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (customer) {
      setFormData({ ...customer });
    }
  }, [customer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? (checked ? 1 : 0) : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const formatDate = (isoDate) =>
    isoDate && isoDate !== "0001-01-01T00:00:00" ? isoDate.slice(0, 10) : "";

  const handleSubmit = async (e) => {
    console.log(formData)
    e.preventDefault();
    const cleanedData = { ...formData };

  // Prevent invalid SQL dates
  if (!cleanedData.birthDay || cleanedData.birthDay < "1753-01-01") {
    delete cleanedData.birthDay;
  }

  if (!cleanedData.anniversary || cleanedData.anniversary < "1753-01-01") {
    delete cleanedData.anniversary;
  }
    try {
      const response = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include"
      });

      if (!response.ok) throw new Error("Failed to save customer");

      const result = await response.json();
      alert("Customer details saved successfully!");
      console.log("SaveCustomer response:", result);
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving customer details.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Personal Info */}
      <div className="section">
        <h3 className="sectttl">Personal Info</h3>
        <div className="form-grid">
          <label>Customer ID <input name="customerId" value={formData.customerId || ""} onChange={handleChange} /></label>
          <label>First Name* <input name="firstName" value={formData.firstName || ""} onChange={handleChange} /></label>
          <label>Middle Name <input name="middleName" value={formData.middleName || ""} onChange={handleChange} /></label>
          <label>Last Name* <input name="lastName" value={formData.lastName || ""} onChange={handleChange} /></label>
          <label>Preferred Name <input name="preferredName" value={formData.preferredName || ""} onChange={handleChange} /></label>
          <label>Email <input type="email" name="email" value={formData.email || ""} onChange={handleChange} /></label>
          <label>Mobile Phone* <input name="mobilePhone" value={formData.mobilePhone || ""} onChange={handleChange} /></label>
          <label>Home Phone <input name="homePhone" value={formData.homePhone || ""} onChange={handleChange} /></label>
          <label>Work Phone <input name="workPhone" value={formData.workPhone || ""} onChange={handleChange} /></label>
          <label>Gender*
            <select name="gender" value={formData.gender || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </label>
          <label>Birthday <input type="date" name="birthDay" value={formatDate(formData.birthDay)} onChange={handleChange} /></label>
          <label>Anniversary <input type="date" name="anniversary" value={formatDate(formData.anniversary)} onChange={handleChange} /></label>
          <label>Referral <input name="referal" value={formData.referal || ""} onChange={handleChange} /></label>
          <label>Ref By <input name="refBy" value={formData.refBy || ""} onChange={handleChange} /></label>
          <label>Primary Employee <input name="primaryEmployee" value={formData.primaryEmployee || ""} onChange={handleChange} /></label>
          <div className="checkbox-group">
            <label>
              <input type="checkbox" name="blockGuestFromEditCustomerData" checked={formData.blockGuestFromEditCustomerData === 1} onChange={handleChange} />
              Block guest from editing custom data
            </label>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="section">
        <h3 className="sectttl">Address</h3>
        <div className="form-grid">
          <label>Address 1 <input name="address1" value={formData.address1 || ""} onChange={handleChange} /></label>
          <label>Address 2 <input name="address2" value={formData.address2 || ""} onChange={handleChange} /></label>
          <label>City <input name="city" value={formData.city || ""} onChange={handleChange} /></label>
          <label>Nationality*
            <select name="nationalityName" value={formData.nationalityName || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Saudi Arabian</option>
              <option>Indian</option>
              <option>Other</option>
            </select>
          </label>
          <label>Country
            <select name="countryName" value={formData.countryName || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Saudi Arabia</option>
              <option>India</option>
              <option>Other</option>
            </select>
          </label>
          <label>State
            <select name="stateName" value={formData.stateName || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Ar Riyad</option>
              <option>Other</option>
            </select>
          </label>
          <label>State (Other) <input name="stateOther" value={formData.stateOther || ""} onChange={handleChange} /></label>
          <label>Nationality ID <input name="nationalityId" value={formData.nationalityId || ""} onChange={handleChange} /></label>
        </div>
      </div>

      {/* Preferences */}
      <div className="section">
        <h3 className="sectttl">Preferences</h3>
        <div className="form-grid">
          <label>Center
            <select name="centerName" value={formData.centerName || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option>Bright Clinics</option>
            </select>
          </label>
          <label>Language
            <select name="language" value={formData.language || 0} onChange={handleChange}>
              <option value={0}>English - United States</option>
              <option value={1}>Arabic</option>
            </select>
          </label>

          <div className="checkbox-group">
            <strong>Transactional Messages:</strong>
            <label>
              <input type="checkbox" name="transactionalEmailEnable" checked={formData.transactionalEmailEnable === 1} onChange={handleChange} />
              Email
            </label>
            <label>
              <input type="checkbox" name="transactionalSMSEnable" checked={formData.transactionalSMSEnable === 1} onChange={handleChange} />
              SMS
            </label>
          </div>

          <div className="checkbox-group">
            <strong>Marketing Messages:</strong>
            <label>
              <input type="checkbox" name="marketingEmailEnable" checked={formData.marketingEmailEnable === 1} onChange={handleChange} />
              Email
            </label>
            <label>
              <input type="checkbox" name="marketingSMSEnable" checked={formData.marketingSMSEnable === 1} onChange={handleChange} />
              SMS
            </label>
            <label>
              <input type="checkbox" name="marketingLoyalPointSMSandEmailEnable" checked={formData.marketingLoyalPointSMSandEmailEnable === 1} onChange={handleChange} />
              Receive loyalty point statement as a text message (SMS) and an email
            </label>
          </div>
        </div>
      </div>

     

      {/* Form Actions */}
      <div className="form-actions">
        <button type="button">Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  );
};

export default GeneralTab;
