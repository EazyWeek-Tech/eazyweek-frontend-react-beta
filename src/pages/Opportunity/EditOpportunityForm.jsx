"use client"

import { useState } from "react"

const EditOpportunityForm = ({ opportunityData, onBack, onSave }) => {
  const [formData, setFormData] = useState({
    oppCode: opportunityData?.oppCode || "",
    opportunityName: opportunityData?.oppName || "",
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    }
  }

  const handleSave = () => {
    // Validate form
    if (!formData.opportunityName.trim()) {
      alert("Please enter an opportunity name")
      return
    }

    if (onSave) {
      onSave({
        ...opportunityData,
        oppName: formData.opportunityName,
      })
    }
  }

  return (
    <>
      <style jsx>{`
        .edit-opportunity-container {
          padding: 20px;
          background-color: #f8f9fa;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin: 0 0 15px 0;
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
        }

        .breadcrumb-current {
          color: #6c757d;
        }

        .form-container {
          background: white;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
          max-width: 800px;
        }

        .form-row {
          display: flex;
          align-items: center;
          margin-bottom: 30px;
          gap: 20px;
        }

        .form-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
          min-width: 150px;
          text-align: right;
        }

        .form-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-input:disabled {
          background-color: #f8f9fa;
          color: #6c757d;
          cursor: not-allowed;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 40px;
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
          background-color: #334b71;
          color: white;
        }

        .btn-save:hover {
          background-color: #2a3f5f;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .edit-opportunity-container {
            padding: 15px;
          }

          .form-container {
            padding: 20px;
          }

          .form-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .form-label {
            text-align: left;
            min-width: auto;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="edit-opportunity-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Opportunity</h1>
          <div className="breadcrumb">
            <span className="breadcrumb-link">Opportunity</span>
            <span className="breadcrumb-separator">&gt;</span>
            <span className="breadcrumb-current">Create Manual Lead</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="form-container">
          {/* OppCode Field */}
          <div className="form-row">
            <label className="form-label">OppCode :</label>
            <input type="text" name="oppCode" value={formData.oppCode} className="form-input" disabled />
          </div>

          {/* Opportunity Name Field */}
          <div className="form-row">
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

          {/* Action Buttons */}
          <div className="action-buttons">
            <button type="button" className="btn btn-back" onClick={handleBack}>
              Back
            </button>
            <button type="button" className="btn btn-save" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default EditOpportunityForm
