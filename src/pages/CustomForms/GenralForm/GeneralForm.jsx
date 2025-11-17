import React, { useState, useEffect } from "react";
import "./GeneralForm.css";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

const GeneralForm = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    formName: "",
    code: "",
    description: "",
    formType: "",
    status:"Active"
  });

  const [serviceData, setServiceData] = useState({
    createFormUsing: "Form builder",
    status: "Active",
    formValidity: "noExpirySameDay",
    requireReview: false,
    requireReviewOnce: false,
    readOnlyForGuests: false,
    prefillData: false,
    copyDetails: false,
    emailCopy: false,
    expiryDays: "",
    expiryDate: "",
  });

  const [guestData, setGuestData] = useState({
    createFormUsing: "Form builder",
    webstore: true,
    readOnlyForGuests: false,
    copyDetails: false,
    emailCopy: false,
  });

  const [tagData, setTagData] = useState({
    createFormUsing: "Form builder",
    status: "Active",
    formValidity: "noExpirySameDay",
    requireReview: false,
    requireReviewOnce: false,
    readOnlyForGuests: false,
    prefillData: false,
    copyDetails: false,
    emailCopy: false,
    expiryDays: "",
    expiryDate: "",
  });

  const [membershipData, setMembershipData] = useState({
    createFormUsing: "Form builder",
    mode: "Online",
    purpose: "Others",
    status: "Active",
  });

  const [packagesData, setPackagesData] = useState({
    createFormUsing: "Form builder",
    purpose: "Others",
    status: "Active",
  });

  const [loyaltyData, setLoyaltyData] = useState({
    createFormUsing: "Form builder",
  });

  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleBaseChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChange = (type, field, value) => {
    const setters = {
      Service: setServiceData,
      Guest: setGuestData,
      Tag: setTagData,
      Membership: setMembershipData,
      Packages: setPackagesData,
      Loyalty: setLoyaltyData,
    };

    setters[type]?.((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (type, field, value) => {
    if (field === "copyDetails" && value) setShowModal(true);
    handleChange(type, field, value);
  };

  const checkDuplicate = async (name, code) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/form/check-duplicate?name=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`);
      if (!response.ok) {
        throw new Error('Failed to check duplicates');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return { nameExists: false, codeExists: false }; // Default to false on error
    }
  };

  const handleSave = async () => {
    if (!formData.formName.trim() || !formData.code.trim() || !formData.formType) {
      setToast({ message: "Form Name, Code, and Form Type are required.", type: "error" });
      return;
    }

    const duplicateCheck = await checkDuplicate(formData.formName.trim(), formData.code.trim());
    if (duplicateCheck.nameExists || duplicateCheck.codeExists) {
      const newErrors = {};
      if (duplicateCheck.nameExists) {
        newErrors.formName = "Form name already exists.";
      }
      if (duplicateCheck.codeExists) {
        newErrors.code = "Code already exists.";
      }
      setErrors(newErrors);
      return;
    }

    // Clear errors
    setErrors({});

    console.log("Form Data:", formData);
    console.log("Service Data:", serviceData);
    console.log("Guest Data:", guestData);
    console.log("Tag Data:", tagData);
    console.log("Membership Data:", membershipData);
    console.log("Packages Data:", packagesData);
    console.log("Loyalty Data:", loyaltyData);

    let additionalData = {};
    if (formData.formType === "Service") {
      additionalData = {
        formType: formData.formType,
        formValidity: serviceData.formValidity || "",
        expiryDate: serviceData.expiryDate || null,
        status: serviceData.status,
      };
    } else if (formData.formType === "Guest") {
      additionalData = {
        formType: formData.formType,
        formValidity: "",
        expiryDate: null,
        status: "Active", // Assuming default for Guest
      };
    }

    navigate("/custom-forms/form-builder", { state: { formData, additionalData } });
  };

  const handleCancel = () => {
    setShowModal(false);
    const type = formData.formType;
    if (!type) return;

    handleChange(type, "copyDetails", false);
  };

  const handleAgree = () => setShowModal(false);

  return (
    <div className="GF-general-form-container">
        <div className="GF-breadcrumb">
          <a href="/" className="GF-breadcrumb-link">Dashboard</a>
          <span className="GF-breadcrumb-separator">›</span>
          <a href="/custom-forms" className="GF-breadcrumb-link">Personalised Form Creator</a>
          <span className="GF-breadcrumb-separator">›</span>
          <span className="GF-breadcrumb-current">Create Form</span>
        </div>
      {toast && (
        <div className={`GF-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
     <div className="GF-form-wrapper">
      <div className="GF-form-container">
        <div className="GF-page-header">
          <h1 className="GF-page-title">Create Form</h1>
        </div>
        <div className="GF-form-content">
          {/* Base Fields */}
          <div className="GF-form-row">
            <label className="GF-form-label">Form Name *</label>
            <input
              type="text"
              name="formName"
              value={formData.formName}
              onChange={handleBaseChange}
              className="GF-form-input"
              placeholder="Enter form name"
            />
            {errors.formName && <span className="error">{errors.formName}</span>}
          </div>

          <div className="GF-form-row">
            <label className="GF-form-label">Code *</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleBaseChange}
              className="GF-form-input"
              placeholder="Enter code"
            />
            {errors.code && <span className="error">{errors.code}</span>}
          </div>

          {/* <div className="GF-form-row">
            <label className="GF-form-label">Description</label>
            <textarea
              className="GF-form-textarea"
              name="description"
              value={formData.description}
              onChange={handleBaseChange}
              placeholder="Enter description"
            />
          </div> */}

          <div className="GF-form-row">
            <label className="GF-form-label">Form Type *</label>
            <select
              name="formType"
              value={formData.formType}
              onChange={handleBaseChange}
              className="GF-form-select"
            >
              <option value="">Select Form Type</option>
              <option value="Service">Service</option>
              <option value="Guest">Guest</option>
              {/* <option value="Tag">Tag</option>
              <option value="Membership">Membership</option>
              <option value="Packages">Packages</option>
              <option value="Loyalty">Loyalty</option> */}
            </select>
          </div>

          {/* <div className="GF-form-row">
            <label className="GF-form-label">Create form using</label>
            <select
              value={packagesData.createFormUsing}
              onChange={(e) =>
                handleChange("Packages", "createFormUsing", e.target.value)
              }
              className="GF-form-select"
            >
              <option>Form builder</option>
              <option>HTML code</option>
            </select>
          </div> */}

          {/* ================= Service ================= */}
          {formData.formType === "Service" && (
            <div className="GF-form-section">
              <div className="GF-form-row">
                <label className="GF-form-label">Status</label>
                <div className="GF-status-buttons">
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      serviceData.status === "Active" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Service", "status", "Active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      serviceData.status === "Inactive" ? "active" : ""
                    }`}
                    onClick={() =>
                      handleChange("Service", "status", "Inactive")
                    }
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div className="GF-form-row">
                <label className="GF-form-label">Form validity</label>
                <select
                  value={serviceData.formValidity}
                  onChange={(e) =>
                    handleChange("Service", "formValidity", e.target.value)
                  }
                  className="GF-form-select"
                >
                  <option value="noExpirySameDay">
                    No expiry - Common form for all services on the same day
                  </option>
                  <option value="noExpirySingle">
                    No expiry - Applicable to a single service
                  </option>
                  <option value="expiresAfter">Expires after</option>
                  <option value="expiresOn">Expires on</option>
                </select>
              </div>

              {serviceData.formValidity === "expiresAfter" && (
                <div className="GF-form-row">
                  <label className="GF-form-label">Days</label>
                  <input
                    type="number"
                    maxLength="6"
                    value={serviceData.expiryDays}
                    onChange={(e) =>
                      handleChange("Service", "expiryDays", e.target.value)
                    }
                    className="GF-form-input"
                    placeholder="Enter days"
                  />
                </div>
              )}

              {serviceData.formValidity === "expiresOn" && (
                <div className="GF-form-row">
                  <label className="GF-form-label">Expiry Date</label>
                  <input
                    type="date"
                    value={serviceData.expiryDate}
                    onChange={(e) =>
                      handleChange("Service", "expiryDate", e.target.value)
                    }
                    className="GF-form-input"
                  />
                </div>
              )}

              {/* <h3 className="GF-section-subtitle">Additional settings</h3>
              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={serviceData.requireReview}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Service",
                      "requireReview",
                      e.target.checked
                    )
                  }
                />
                Require review
              </label>

              {serviceData.requireReview && (
                <label className="GF-checkbox-label">
                  <input
                    type="checkbox"
                    checked={serviceData.requireReviewOnce}
                    onChange={(e) =>
                      handleCheckboxChange(
                        "Service",
                        "requireReviewOnce",
                        e.target.checked
                      )
                    }
                  />
                  Require review only once within validity period
                </label>
              )} */}

              {/* <h3 className="GF-section-subtitle">Form behavior settings</h3>
              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={serviceData.readOnlyForGuests}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Service",
                      "readOnlyForGuests",
                      e.target.checked
                    )
                  }
                />
                Make this form read-only for guests (applies to Webstore and
                CMA)
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={serviceData.prefillData}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Service",
                      "prefillData",
                      e.target.checked
                    )
                  }
                />
                Prefill form with data from previous visit
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={serviceData.copyDetails}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Service",
                      "copyDetails",
                      e.target.checked
                    )
                  }
                />
                Copy details from old version of the form to the new version
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={serviceData.emailCopy}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Service",
                      "emailCopy",
                      e.target.checked
                    )
                  }
                />
                Email copy of the form to guest on submission
              </label> */}
            </div>
          )}

          {/* ================= Guest ================= */}
          {/* {formData.formType === "Guest" && (
            <div className="GF-form-section">
              <h3 className="GF-section-subtitle">Form behavior settings</h3>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={guestData.webstore}
                  onChange={(e) =>
                    handleCheckboxChange("Guest", "webstore", e.target.checked)
                  }
                />
                Show this form on Webstore
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={guestData.readOnlyForGuests}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Guest",
                      "readOnlyForGuests",
                      e.target.checked
                    )
                  }
                />
                Make this form read-only for guests (applies to Webstore and
                CMA)
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={guestData.copyDetails}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Guest",
                      "copyDetails",
                      e.target.checked
                    )
                  }
                />
                Copy details from old version of the form to the new version
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={guestData.emailCopy}
                  onChange={(e) =>
                    handleCheckboxChange("Guest", "emailCopy", e.target.checked)
                  }
                />
                Email copy of the form to guest on submission
              </label>
            </div>
          )} */}

          {/* ================= Tag ================= */}
          {formData.formType === "Tag" && (
            <div className="GF-form-section">
              <div className="GF-form-row">
                <label className="GF-form-label">Status</label>
                <div className="GF-status-buttons">
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      tagData.status === "Active" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Tag", "status", "Active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      tagData.status === "Inactive" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Tag", "status", "Inactive")}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div className="GF-form-row">
                <label className="GF-form-label">Form validity</label>
                <select
                  value={tagData.formValidity}
                  onChange={(e) =>
                    handleChange("Tag", "formValidity", e.target.value)
                  }
                  className="GF-form-select"
                >
                  <option value="noExpirySameDay">
                    No expiry - Common form for all services on the same day
                  </option>
                  <option value="noExpirySingle">
                    No expiry - Applicable to a single service
                  </option>
                  <option value="expiresAfter">Expires after</option>
                  <option value="expiresOn">Expires on</option>
                </select>
              </div>

              {tagData.formValidity === "expiresAfter" && (
                <div className="GF-form-row">
                  <label className="GF-form-label">Days</label>
                  <input
                    type="number"
                    maxLength="6"
                    value={tagData.expiryDays}
                    onChange={(e) =>
                      handleChange("Tag", "expiryDays", e.target.value)
                    }
                    className="GF-form-input"
                    placeholder="Enter days"
                  />
                </div>
              )}

              {tagData.formValidity === "expiresOn" && (
                <div className="GF-form-row">
                  <label className="GF-form-label">Expiry Date</label>
                  <input
                    type="date"
                    value={tagData.expiryDate}
                    onChange={(e) =>
                      handleChange("Tag", "expiryDate", e.target.value)
                    }
                    className="GF-form-input"
                  />
                </div>
              )}

              <h3 className="GF-section-subtitle">Additional settings</h3>
              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={tagData.requireReview}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Tag",
                      "requireReview",
                      e.target.checked
                    )
                  }
                />
                Require review
              </label>

              {tagData.requireReview && (
                <label className="GF-checkbox-label">
                  <input
                    type="checkbox"
                    checked={tagData.requireReviewOnce}
                    onChange={(e) =>
                      handleCheckboxChange(
                        "Tag",
                        "requireReviewOnce",
                        e.target.checked
                      )
                    }
                  />
                  Require review only once within validity period
                </label>
              )}

              <h3 className="GF-section-subtitle">Form behavior settings</h3>
              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={tagData.readOnlyForGuests}
                  onChange={(e) =>
                    handleCheckboxChange(
                      "Tag",
                      "readOnlyForGuests",
                      e.target.checked
                    )
                  }
                />
                Make this form read-only for guests (applies to Webstore and
                CMA)
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={tagData.prefillData}
                  onChange={(e) =>
                    handleCheckboxChange("Tag", "prefillData", e.target.checked)
                  }
                />
                Prefill form with data from previous visit
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={tagData.copyDetails}
                  onChange={(e) =>
                    handleCheckboxChange("Tag", "copyDetails", e.target.checked)
                  }
                />
                Copy details from old version of the form to the new version
              </label>

              <label className="GF-checkbox-label">
                <input
                  type="checkbox"
                  checked={tagData.emailCopy}
                  onChange={(e) =>
                    handleCheckboxChange("Tag", "emailCopy", e.target.checked)
                  }
                />
                Email copy of the form to guest on submission
              </label>
            </div>
          )}

          {/* ================= Membership ================= */}
          {formData.formType === "Membership" && (
            <div className="GF-form-section">

              <div className="GF-form-row">
                <label className="GF-form-label">Mode</label>
                <div className="GF-status-buttons">
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      membershipData.mode === "Online" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Membership", "mode", "Online")}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      membershipData.mode === "Offline" ? "active" : ""
                    }`}
                    onClick={() =>
                      handleChange("Membership", "mode", "Offline")
                    }
                  >
                    Offline
                  </button>
                </div>
              </div>

              <div className="GF-form-row">
                <label className="GF-form-label">Purpose</label>
                <select
                  value={membershipData.purpose}
                  onChange={(e) =>
                    handleChange("Membership", "purpose", e.target.value)
                  }
                  className="GF-form-select"
                >
                  <option value="">Select Purpose</option>
                  <option value="Sign-Up">Sign-Up</option>
                  <option value="Sign-Up">Cancel</option>
                  <option value="Freeze">Freeze</option>
                  <option value="Upgrade/Downgrade">Upgrade/Downgrade</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="GF-form-row">
                <label className="GF-form-label">Status</label>
                <div className="GF-status-buttons">
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      membershipData.status === "Active" ? "active" : ""
                    }`}
                    onClick={() =>
                      handleChange("Membership", "status", "Active")
                    }
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      membershipData.status === "Inactive" ? "active" : ""
                    }`}
                    onClick={() =>
                      handleChange("Membership", "status", "Inactive")
                    }
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= Packages ================= */}
          {formData.formType === "Packages" && (
            <div className="GF-form-section">
              {/* <h2 className="section-title">Packages Configuration</h2> */}

              <div className="GF-form-row">
                <label className="GF-form-label">Purpose</label>
                <select
                  value={packagesData.purpose}
                  onChange={(e) =>
                    handleChange("Packages", "purpose", e.target.value)
                  }
                  className="GF-form-select"
                >
                  <option value="">Select Purpose</option>
                  <option value="Sign-Up">Sign-Up</option>
                  <option value="Upgrade/Downgrade">Upgrade/Downgrade</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="GF-form-row">
                <label className="GF-form-label">Status</label>
                <div className="GF-status-buttons">
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      packagesData.status === "Active" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Packages", "status", "Active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`GF-status-btn ${
                      packagesData.status === "Inactive" ? "active" : ""
                    }`}
                    onClick={() =>
                      handleChange("Packages", "status", "Inactive")
                    }
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= Loyalty ================= */}
          {formData.formType === "Loyalty" && (
            <div className="GF-form-section">

            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="GF-form-buttons">
          <button className="GF-save-btn" onClick={handleSave}>
            Save and Proceed
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="GF-modal-overlay">
          <div className="GF-modal">
            <div className="GF-modal-header">
              <h2 className="GF-modal-title">Prefill Old Version Data</h2>
            </div>

            <div className="GF-modal-body">
              <div className="GF-warning-row">
                <div className="GF-warning-icon" aria-hidden>
                  ⚠
                </div>
                <div className="GF-warning-text">
                  <p>
                    When you select this option, Zenoti will automatically copy
                    and fill details from the old form into the new version of
                    the form. Note that the old and the new forms may be
                    completely different - we strongly recommend that you
                    carefully read through the details in the new form before
                    you save or submit it.
                  </p>
                  <p>
                    Zenoti takes no responsibility towards the accuracy of
                    details in the new version of the form. Once you click I
                    agree, Zenoti will not be held accountable for
                    discrepancies in the details copied over from the old
                    form. It is the responsibility of Centriq Clinics
                    Staging to verify the details for accuracy.
                  </p>
                </div>
              </div>
            </div>

            <div className="GF-modal-buttons">
              <button onClick={handleAgree} className="GF-agree-btn">
                I Agree
              </button>
              <button onClick={handleCancel} className="GF-cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default GeneralForm;
