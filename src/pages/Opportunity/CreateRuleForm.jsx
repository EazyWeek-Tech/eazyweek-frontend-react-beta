"use client"

import { useState } from "react"

const CreateRuleForm = ({ opportunityData, onBack, onSave, onActivate }) => {
  const [ruleConfig, setRuleConfig] = useState({
    dataFetchType: "",
    paidFor: "",
    categoryButNotFor: "",
    categoryFor: "",
    days: "",
  })

  const handleSelectChange = (field, value) => {
    setRuleConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave({
        ...opportunityData,
        ruleConfig,
      })
    }
  }

  const handleActivate = () => {
    if (onActivate) {
      onActivate({
        ...opportunityData,
        ruleConfig,
      })
    }
  }

  // Get the first selected rule for display
  const selectedRule = opportunityData?.selectedRules?.[0] || "No rule selected"

  return (
    <>
      <style jsx>{`
        .create-rule-container {
        }

        .breadcrumb {
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 30px;
        }

        .breadcrumb-link {
          color: #007bff;
          text-decoration: none;
          cursor: pointer;
        }

        .breadcrumb-link:hover {
          text-decoration: underline;
        }

        .breadcrumb-separator {
          margin: 0 8px;
          color: #6c757d;
        }

        .breadcrumb-current {
          color: #6c757d;
        }

        .form-container {
          background: white;
          border-radius: 8px;
          
          margin-bottom: 20px;
          max-width: 1200px;
        }

        .form-row {
          display: flex;
          align-items: center;
          margin-bottom: 30px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .form-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
          min-width: 150px;
        }

        .form-input {
          padding: 12px 16px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s ease;
          min-width: 300px;
        }

        .form-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-select {
          padding: 12px 16px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
          min-width: 150px;
        }

        .form-select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .selected-rule-container {
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }

        .selected-rule-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
          margin-bottom: 10px;
        }

        .selected-rule-value {
          font-size: 16px;
          color: #495057;
          font-weight: 500;
        }

        .rule-config-section {
          margin-top: 30px;
          padding-top: 30px;
          border-top: 1px solid #dee2e6;
        }

        .config-row {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .config-label {
          font-size: 14px;
          color: #495057;
          font-weight: 500;
        }

        .none-selected-btn {
          padding: 8px 16px;
          background-color: #f8f9fa;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .none-selected-btn:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #dee2e6;
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

        .btn-save {
          background-color: #28a745;
          color: white;
        }

        .btn-save:hover {
          background-color: #218838;
          transform: translateY(-1px);
        }

        .btn-activate {
          background-color: #334b71;
          color: white;
        }

        .btn-activate:hover {
          background-color: #2a3f5f;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .create-rule-container {
            padding: 15px;
          }

          .form-container {
            padding: 20px;
          }

          .form-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .form-label {
            min-width: auto;
          }

          .form-input,
          .form-select {
            min-width: 100%;
          }

          .config-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="create-rule-container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link">Opportunity</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-current">Create Rule</span>
        </div>

        {/* Form Container */}
        <div className="form-container">
          {/* Opportunity Name */}
          <div className="form-row">
            <label className="form-label">Opportunity Name :</label>
            <input type="text" value={opportunityData?.opportunityName || ""} className="form-input" readOnly />
          </div>

          {/* Selected Rule */}
          <div className="selected-rule-container">
            <div className="selected-rule-label">Selected Rule:</div>
            <div className="selected-rule-value">{selectedRule}</div>
          </div>

          {/* Rule Data Fetch Type */}
          <div className="form-row">
            <label className="form-label">Rule Data Fetch Type</label>
            <select
              className="form-select"
              value={ruleConfig.dataFetchType}
              onChange={(e) => handleSelectChange("dataFetchType", e.target.value)}
            >
              <option value="">Select</option>
              <option value="realtime">Real Time</option>
              <option value="batch">Batch</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {/* Rule Configuration Section */}
          <div className="rule-config-section">
            <div className="config-row">
              <span className="config-label">Paid for</span>
              <button
                className="none-selected-btn"
                onClick={() => {
                  /* Handle category selection */
                }}
              >
                None selected
              </button>

              <span className="config-label">Category but not for</span>
              <button
                className="none-selected-btn"
                onClick={() => {
                  /* Handle category selection */
                }}
              >
                None selected
              </button>

              <span className="config-label">Category for</span>
              <select
                className="form-select"
                value={ruleConfig.categoryFor}
                onChange={(e) => handleSelectChange("categoryFor", e.target.value)}
              >
                <option value="">Select</option>
                <option value="consultation">Consultation</option>
                <option value="treatment">Treatment</option>
                <option value="procedure">Procedure</option>
              </select>

              <span className="config-label">days</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button type="button" className="btn btn-back" onClick={handleBack}>
              Back
            </button>
            <button type="button" className="btn btn-save" onClick={handleSave}>
              Save
            </button>
            <button type="button" className="btn btn-activate" onClick={handleActivate}>
              Activate
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CreateRuleForm
