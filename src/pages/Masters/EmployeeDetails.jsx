"use client"

import { useState } from "react"

const EmployeeDetails = ({ employee, onBack }) => {
  const [selectedClinic, setSelectedClinic] = useState("")
  const [selectedAuditSegment, setSelectedAuditSegment] = useState("")
  const [selectedSegments, setSelectedSegments] = useState([])

  // Sample clinic options
  const clinicOptions = [
    { value: "", label: "Select one" },
    { value: "bright-clinics", label: "Bright Clinics" },
    { value: "lines-clinics", label: "Lines Clinics" },
    { value: "maxime-clinics", label: "Maxime Clinics" },
    { value: "infeni-clinic", label: "Infeni Clinic" },
    { value: "silk-clinic", label: "Silk Clinic" },
  ]

  // Sample audit segment options
  const auditSegmentOptions = [
    { value: "", label: "Select one" },
    { value: "digital", label: "Digital" },
    { value: "grooming", label: "Grooming" },
    { value: "medical", label: "Medical" },
    { value: "safety", label: "Safety" },
    { value: "customer-service", label: "Customer Service" },
    { value: "administrative", label: "Administrative" },
  ]

  // Sample existing segment mappings based on your screenshot
  const existingMappings = [
    { id: 1, segment: "Digital", mappedClinic: "Bright Clinics" },
    { id: 2, segment: "Grooming", mappedClinic: "Bright Clinics" },
    { id: 3, segment: "Medical", mappedClinic: "Bright Clinics" },
    { id: 4, segment: "Safety", mappedClinic: "Bright Clinics" },
  ]

  const handleSegmentSelection = (segmentId) => {
    setSelectedSegments((prev) => {
      if (prev.includes(segmentId)) {
        return prev.filter((id) => id !== segmentId)
      } else {
        return [...prev, segmentId]
      }
    })
  }

  return (
    <>
      <style jsx>{`
        .employee-details-container {
          padding: 20px;
          background-color: #f8f9fa;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
        }

        .breadcrumb {
          margin-bottom: 20px;
          font-size: 14px;
          color: #6c757d;
        }

        .breadcrumb-link {
          color: #334B71;
          text-decoration: none;
          cursor: pointer;
        }

        .breadcrumb-link:hover {
          text-decoration: underline;
        }

        .breadcrumb-separator {
          margin: 0 5px;
        }

        .breadcrumb-current {
          color: #6c757d;
        }

        .employee-header {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 40px;
          text-align: center;
        }

        .form-section {
          background: white;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .form-row {
          display: flex;
          align-items: center;
          margin-bottom: 25px;
          justify-content: center;
        }

        .form-label {
          font-weight: 600;
          color: #495057;
          font-size: 16px;
          margin-right: 20px;
          min-width: 120px;
          text-align: right;
        }

        .form-select {
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          outline: none;
          min-width: 200px;
          background-color: white;
        }

        .form-select:focus {
          border-color: #334B71;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .back-button-container {
          text-align: center;
          margin: 30px 0;
        }

        .back-btn {
          padding: 10px 30px;
          background-color: #343a40;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .back-btn:hover {
          background-color: #23272b;
        }

        .mappings-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .mappings-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .mappings-table th {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          border-bottom: 1px solid #dee2e6;
          font-size: 16px;
        }

        .mappings-table td {
          padding: 15px;
          border-bottom: 1px solid #dee2e6;
          color: #495057;
          font-size: 14px;
        }

        .mappings-table tr:hover {
          background-color: #f8f9fa;
        }

        .segment-checkbox {
          width: 16px;
          height: 16px;
          margin-right: 10px;
          accent-color: #334B71;
          cursor: pointer;
        }

        .segment-name {
          display: inline-flex;
          align-items: center;
        }

        @media (max-width: 768px) {
          .employee-details-container {
            padding: 15px;
          }

          .form-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .form-label {
            margin-bottom: 10px;
            margin-right: 0;
            text-align: left;
            min-width: auto;
          }

          .form-select {
            width: 100%;
            min-width: auto;
          }
        }
      `}</style>

      <div className="employee-details-container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
            <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">Segment Mapping</span>
        </div>

        {/* Employee Header */}
        <div className="employee-header">
          Selected Employee for Segment Assign : Code : {employee.employeeCode} , FirstName : {employee.firstName}
        </div>

        {/* Form Section */}
        <div className="form-section">
          <div className="form-row">
            <label className="form-label">Clinic :</label>
            <select className="form-select" value={selectedClinic} onChange={(e) => setSelectedClinic(e.target.value)}>
              {clinicOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">Audit Segment :</label>
            <select
              className="form-select"
              value={selectedAuditSegment}
              onChange={(e) => setSelectedAuditSegment(e.target.value)}
            >
              {auditSegmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Back Button */}
        <div className="back-button-container">
          <button className="back-btn" onClick={onBack}>
            Back
          </button>
        </div>

        {/* Existing Mappings Section */}
        <div className="mappings-section">
          <table className="mappings-table">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Mapped Clinic</th>
              </tr>
            </thead>
            <tbody>
              {existingMappings.map((mapping) => (
                <tr key={mapping.id}>
                  <td>
                    <div className="segment-name">
                      <input
                        type="checkbox"
                        className="segment-checkbox"
                        checked={selectedSegments.includes(mapping.id)}
                        onChange={() => handleSegmentSelection(mapping.id)}
                      />
                      {mapping.segment}
                    </div>
                  </td>
                  <td>{mapping.mappedClinic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default EmployeeDetails
