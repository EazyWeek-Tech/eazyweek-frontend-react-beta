import React, { useState } from "react";
import "./GeneralForm.css";

const GeneralForm = () => {
  const [formData, setFormData] = useState({
    formName: "",
    code: "",
    description: "",
    formType: "",
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

  const handleSave = () => {
    console.log("Form Data:", formData);
    console.log("Service Data:", serviceData);
    console.log("Guest Data:", guestData);
    console.log("Tag Data:", tagData);
    console.log("Membership Data:", membershipData);
    console.log("Packages Data:", packagesData);
    console.log("Loyalty Data:", loyaltyData);
    alert("Form saved successfully!");
  };

  const handleCancel = () => {
    setShowModal(false);
    const type = formData.formType;
    if (!type) return;

    handleChange(type, "copyDetails", false);
  };

  const handleAgree = () => setShowModal(false);

  return (
    <div className="general-form-container">
      <div className="form-container">
        <div className="page-header">
          <h1 className="page-title">General Form</h1>
        </div>
        <div className="form-content">
          {/* Base Fields */}
          <div className="form-row">
            <label className="form-label">Form Name</label>
            <input
              type="text"
              name="formName"
              value={formData.formName}
              onChange={handleBaseChange}
              className="form-input"
              placeholder="Enter form name"
            />
          </div>

          <div className="form-row">
            <label className="form-label">Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleBaseChange}
              className="form-input"
              placeholder="Enter code"
            />
          </div>

          <div className="form-row">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              name="description"
              value={formData.description}
              onChange={handleBaseChange}
              placeholder="Enter description"
            />
          </div>

          <div className="form-row">
            <label className="form-label">Form Type</label>
            <select
              name="formType"
              value={formData.formType}
              onChange={handleBaseChange}
              className="form-select"
            >
              <option value="">Select Form Type</option>
              <option value="Service">Service</option>
              <option value="Guest">Guest</option>
              <option value="Tag">Tag</option>
              <option value="Membership">Membership</option>
              <option value="Packages">Packages</option>
              <option value="Loyalty">Loyalty</option>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">Create form using</label>
            <select
              value={packagesData.createFormUsing}
              onChange={(e) =>
                handleChange("Packages", "createFormUsing", e.target.value)
              }
              className="form-select"
            >
              <option>Form builder</option>
              <option>HTML code</option>
            </select>
          </div>

          {/* ================= Service ================= */}
          {formData.formType === "Service" && (
            <div className="form-section">
              <div className="form-row">
                <label className="form-label">Status</label>
                <div className="status-buttons">
                  <button
                    type="button"
                    className={`status-btn ${
                      serviceData.status === "Active" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Service", "status", "Active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`status-btn ${
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

              <div className="form-row">
                <label className="form-label">Form validity</label>
                <select
                  value={serviceData.formValidity}
                  onChange={(e) =>
                    handleChange("Service", "formValidity", e.target.value)
                  }
                  className="form-select"
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
                <div className="form-row">
                  <label className="form-label">Days</label>
                  <input
                    type="number"
                    maxLength="6"
                    value={serviceData.expiryDays}
                    onChange={(e) =>
                      handleChange("Service", "expiryDays", e.target.value)
                    }
                    className="form-input"
                    placeholder="Enter days"
                  />
                </div>
              )}

              {serviceData.formValidity === "expiresOn" && (
                <div className="form-row">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    value={serviceData.expiryDate}
                    onChange={(e) =>
                      handleChange("Service", "expiryDate", e.target.value)
                    }
                    className="form-input"
                  />
                </div>
              )}

              <h3 className="section-subtitle">Additional settings</h3>
              <label className="checkbox-label">
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
                <label className="checkbox-label">
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
              )}

              <h3 className="section-subtitle">Form behavior settings</h3>
              <label className="checkbox-label">
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

              <label className="checkbox-label">
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

              <label className="checkbox-label">
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

              <label className="checkbox-label">
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
              </label>
            </div>
          )}

          {/* ================= Guest ================= */}
          {formData.formType === "Guest" && (
            <div className="form-section">
              <h3 className="section-subtitle">Form behavior settings</h3>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={guestData.webstore}
                  onChange={(e) =>
                    handleCheckboxChange("Guest", "webstore", e.target.checked)
                  }
                />
                Show this form on Webstore
              </label>

              <label className="checkbox-label">
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

              <label className="checkbox-label">
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

              <label className="checkbox-label">
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
          )}

          {/* ================= Tag ================= */}
          {formData.formType === "Tag" && (
            <div className="form-section">
              <div className="form-row">
                <label className="form-label">Status</label>
                <div className="status-buttons">
                  <button
                    type="button"
                    className={`status-btn ${
                      tagData.status === "Active" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Tag", "status", "Active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`status-btn ${
                      tagData.status === "Inactive" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Tag", "status", "Inactive")}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Form validity</label>
                <select
                  value={tagData.formValidity}
                  onChange={(e) =>
                    handleChange("Tag", "formValidity", e.target.value)
                  }
                  className="form-select"
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
                <div className="form-row">
                  <label className="form-label">Days</label>
                  <input
                    type="number"
                    maxLength="6"
                    value={tagData.expiryDays}
                    onChange={(e) =>
                      handleChange("Tag", "expiryDays", e.target.value)
                    }
                    className="form-input"
                    placeholder="Enter days"
                  />
                </div>
              )}

              {tagData.formValidity === "expiresOn" && (
                <div className="form-row">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    value={tagData.expiryDate}
                    onChange={(e) =>
                      handleChange("Tag", "expiryDate", e.target.value)
                    }
                    className="form-input"
                  />
                </div>
              )}

              <h3 className="section-subtitle">Additional settings</h3>
              <label className="checkbox-label">
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
                <label className="checkbox-label">
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

              <h3 className="section-subtitle">Form behavior settings</h3>
              <label className="checkbox-label">
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

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={tagData.prefillData}
                  onChange={(e) =>
                    handleCheckboxChange("Tag", "prefillData", e.target.checked)
                  }
                />
                Prefill form with data from previous visit
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={tagData.copyDetails}
                  onChange={(e) =>
                    handleCheckboxChange("Tag", "copyDetails", e.target.checked)
                  }
                />
                Copy details from old version of the form to the new version
              </label>

              <label className="checkbox-label">
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
            <div className="form-section">

              <div className="form-row">
                <label className="form-label">Mode</label>
                <div className="status-buttons">
                  <button
                    type="button"
                    className={`status-btn ${
                      membershipData.mode === "Online" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Membership", "mode", "Online")}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    className={`status-btn ${
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

              <div className="form-row">
                <label className="form-label">Purpose</label>
                <select
                  value={membershipData.purpose}
                  onChange={(e) =>
                    handleChange("Membership", "purpose", e.target.value)
                  }
                  className="form-select"
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

              <div className="form-row">
                <label className="form-label">Status</label>
                <div className="status-buttons">
                  <button
                    type="button"
                    className={`status-btn ${
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
                    className={`status-btn ${
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
            <div className="form-section">
              {/* <h2 className="section-title">Packages Configuration</h2> */}

              <div className="form-row">
                <label className="form-label">Purpose</label>
                <select
                  value={packagesData.purpose}
                  onChange={(e) =>
                    handleChange("Packages", "purpose", e.target.value)
                  }
                  className="form-select"
                >
                  <option value="">Select Purpose</option>
                  <option value="Sign-Up">Sign-Up</option>
                  <option value="Upgrade/Downgrade">Upgrade/Downgrade</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">Status</label>
                <div className="status-buttons">
                  <button
                    type="button"
                    className={`status-btn ${
                      packagesData.status === "Active" ? "active" : ""
                    }`}
                    onClick={() => handleChange("Packages", "status", "Active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`status-btn ${
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
            <div className="form-section">
              
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="form-buttons">
          <button className="save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Prefill Old Version Data</h2>
            </div>

            <div className="modal-body">
              <div className="warning-row">
                <div className="warning-icon" aria-hidden>
                  ⚠
                </div>
                <div className="warning-text">
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

            <div className="modal-buttons">
              <button onClick={handleAgree} className="agree-btn">
                I Agree
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralForm;
