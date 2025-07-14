"use client"

import { useState } from "react"

const OpportunityForm = ({ onBack, onNext, mode = "create" }) => {
  const [formData, setFormData] = useState({
    opportunityName: "",
    segmentationTransaction: {
      paidForXButNotY: false,
      paidForXCategoryInYDays: false,
      noShowAppointment: false,
      cancelledAppointment: false,
    },
    segmentationMasters: {
      customerSpecialDay: false,
      customerType: false,
    },
    manualBased: {
      createManualLead: false,
    },
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCheckboxChange = (section, field) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field],
      },
    }))
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    }
  }

  const handleNext = () => {
    // Validate form
    if (!formData.opportunityName.trim()) {
      alert("Please enter an opportunity name")
      return
    }

    // Check if at least one rule is selected
    const hasTransactionRule = Object.values(formData.segmentationTransaction).some(Boolean)
    const hasMasterRule = Object.values(formData.segmentationMasters).some(Boolean)
    const hasManualRule = Object.values(formData.manualBased).some(Boolean)

    if (!hasTransactionRule && !hasMasterRule && !hasManualRule) {
      alert("Please select at least one rule")
      return
    }

    if (onNext) {
      onNext(formData)
    }
  }

  return (
    <>
      <style jsx>{`
        .opportunity-form-container {
          
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin: 0 0 20px 0;
        }


        .form-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 30px;
        }

        .form-label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .fieldset {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          margin-bottom: 25px;
          padding: 0;
        }

        .legend {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          padding: 0 10px;
          margin-left: 15px;
          background: white;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .legend-icon {
          color: #334B71;
          font-weight: bold;
          font-size: 16px;
        }

        .fieldset-content {
          padding: 20px 25px;
        }

        .rules-label {
          font-weight: 600;
          color: #495057;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-left: 20px;
        }

        .checkbox-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .checkbox-input {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          cursor: pointer;
          accent-color: #334B71;
        }

        .checkbox-label {
          font-size: 14px;
          color: #495057;
          cursor: pointer;
          line-height: 1.4;
          flex: 1;
        }

        .checkbox-label:hover {
          color: #333;
        }

        .manual-section {
          padding-left: 20px;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 30px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 100px;
        }

        .btn-back {
          background-color: #6c757d;
          color: white;
        }

        .btn-back:hover {
          background-color: #5a6268;
          transform: translateY(-1px);
        }

        .btn-next {
          background-color: #334b71;
          color: white;
        }

        .btn-next:hover {
          background-color: #2a3f5f;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .opportunity-form-container {
            padding: 15px;
          }

          .form-container {
            padding: 20px;
          }

          .fieldset-content {
            padding: 15px 20px;
          }

          .checkbox-group {
            margin-left: 10px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="opportunity-form-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Opportunity</h1>
          <div className="breadcrumb">
            <span className="breadcrumb-link">Opportunity</span>
            <span className="breadcrumb-separator">&gt;</span>
            <span className="breadcrumb-current">Create</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="form-container">
          {/* Opportunity Name */}
          <div className="form-group">
            <label className="form-label">Opportunity Name :</label>
            <input
              type="text"
              name="opportunityName"
              value={formData.opportunityName}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter opportunity name"
            />
          </div>

          {/* Segmentation Based on Transaction */}
          <fieldset className="fieldset">
            <legend className="legend">
              
              <span>Segmentation Based on Transaction</span>
            </legend>
            <div className="fieldset-content">
              <div className="rules-label">Rules :</div>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="paidForXButNotY"
                    className="checkbox-input"
                    checked={formData.segmentationTransaction.paidForXButNotY}
                    onChange={() => handleCheckboxChange("segmentationTransaction", "paidForXButNotY")}
                  />
                  <label htmlFor="paidForXButNotY" className="checkbox-label">
                    Paid for X but not for Y
                  </label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="paidForXCategoryInYDays"
                    className="checkbox-input"
                    checked={formData.segmentationTransaction.paidForXCategoryInYDays}
                    onChange={() => handleCheckboxChange("segmentationTransaction", "paidForXCategoryInYDays")}
                  />
                  <label htmlFor="paidForXCategoryInYDays" className="checkbox-label">
                    Paid for X Category in Y days and No future appointment in Z days for Category P
                  </label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="noShowAppointment"
                    className="checkbox-input"
                    checked={formData.segmentationTransaction.noShowAppointment}
                    onChange={() => handleCheckboxChange("segmentationTransaction", "noShowAppointment")}
                  />
                  <label htmlFor="noShowAppointment" className="checkbox-label">
                    No show appointment for X days
                  </label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="cancelledAppointment"
                    className="checkbox-input"
                    checked={formData.segmentationTransaction.cancelledAppointment}
                    onChange={() => handleCheckboxChange("segmentationTransaction", "cancelledAppointment")}
                  />
                  <label htmlFor="cancelledAppointment" className="checkbox-label">
                    Cancelled appointment for X days
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Segmentation Based on Masters */}
          <fieldset className="fieldset">
            <legend className="legend">
              
              <span>Segmentation Based on Masters</span>
            </legend>
            <div className="fieldset-content">
              <div className="rules-label">Rules :</div>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="customerSpecialDay"
                    className="checkbox-input"
                    checked={formData.segmentationMasters.customerSpecialDay}
                    onChange={() => handleCheckboxChange("segmentationMasters", "customerSpecialDay")}
                  />
                  <label htmlFor="customerSpecialDay" className="checkbox-label">
                    Customer Special Day
                  </label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="customerType"
                    className="checkbox-input"
                    checked={formData.segmentationMasters.customerType}
                    onChange={() => handleCheckboxChange("segmentationMasters", "customerType")}
                  />
                  <label htmlFor="customerType" className="checkbox-label">
                    Customer Type
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Manual Based */}
          <fieldset className="fieldset">
            <legend className="legend">
              
              <span>Manual Based</span>
            </legend>
            <div className="fieldset-content">
              <div className="manual-section">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="createManualLead"
                    className="checkbox-input"
                    checked={formData.manualBased.createManualLead}
                    onChange={() => handleCheckboxChange("manualBased", "createManualLead")}
                  />
                  <label htmlFor="createManualLead" className="checkbox-label">
                    Create Manual Lead
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button type="button" className="btn btn-back" onClick={handleBack}>
              Back
            </button>
            <button type="button" className="btn btn-next" onClick={handleNext}>
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default OpportunityForm
