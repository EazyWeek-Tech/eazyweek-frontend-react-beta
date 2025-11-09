import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const GeneralTab = ({ customer }) => {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({
    birthDay: "",
    anniversary: "",
  });

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

  // Validate birthDay and anniversary dates
  // --- replace your validateDates with this ---
const validateDates = () => {
  const errors = {};

  const birthDay = formData.birthDay;
  const anniversary = formData.anniversary;

  // Validate birthDay (still required)
  if (birthDay) {
    const birthDate = new Date(birthDay);
    if (isNaN(birthDate.getTime()) || birthDate < new Date("1753-01-01")) {
      errors.birthDay = "Birth date must be a valid date after 01/01/1753";
    } else if (birthDate > new Date()) {
      errors.birthDay = "Birth date cannot be in the future";
    }
  } else {
    errors.birthDay = "Birth date is required";
  }

  // Anniversary is NOT mandatory. Only validate if provided.
  if (anniversary) {
    const anniversaryDate = new Date(anniversary);
    if (isNaN(anniversaryDate.getTime()) || anniversaryDate < new Date("1753-01-01")) {
      errors.anniversary = "Anniversary date must be a valid date after 01/01/1753";

   } else if (anniversaryDate > new Date()) {
     errors.anniversary = "Anniversary date cannot be in the future";
    }
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateDates()) {
      return; // Do not submit if there are validation errors
    }

   // --- inside handleSubmit before POST ---
const cleanedData = { ...formData };

// Prevent invalid SQL dates (keep birthDay required rule)
if (!cleanedData.birthDay || cleanedData.birthDay < "1753-01-01") {
  delete cleanedData.birthDay;
}

// Anniversary optional: remove if blank or invalid lower bound
if (!cleanedData.anniversary || cleanedData.anniversary < "1753-01-01") {
  delete cleanedData.anniversary;
}


    try {
      const response = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to save customer");

      const result = await response.json();
      console.log(result);
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

          {/* Date Fields */}
          <label>Birthday <input type="date" name="birthDay" value={formatDate(formData.birthDay)} onChange={handleChange} />
            {formErrors.birthDay && <span className="error">{formErrors.birthDay}</span>}
          </label>

          <label>Anniversary <input type="date" name="anniversary" value={formatDate(formData.anniversary)} onChange={handleChange} />
            {formErrors.anniversary && <span className="error">{formErrors.anniversary}</span>}
          </label>

          <label>Referral <input name="referal" value={formData.referal || ""} onChange={handleChange} /></label>
          <label>Ref By <input name="refBy" value={formData.refBy || ""} onChange={handleChange} /></label>
          <label>Primary Employee <input name="primaryEmployee" value={formData.primaryEmployee || ""} onChange={handleChange} /></label>
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

      {/* Form Actions */}
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button">Cancel</button>
      </div>
    </form>
  );
};

export default GeneralTab;
