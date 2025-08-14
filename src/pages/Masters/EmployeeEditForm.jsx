"use client"

import { useState } from "react"

const EmployeeEditForm = ({ employee, onBack }) => {
  const [activeTab, setActiveTab] = useState("GENERAL INFORMATION")
  const [formData, setFormData] = useState({
    employeeCode: employee.employeeCode || "",
    firstName: employee.firstName || "",
    middleName: employee.middleName || "",
    lastName: employee.lastName || "",
    nickname: employee.nickname || "",
    email: employee.email || "",
    clinic: employee.primaryClinic || "",
    job: employee.job || "",
    username: employee.username || "",
    mobilePhone: employee.mobileNo || "",
    homePhone: employee.homePhone || "",
    workPhone: employee.workPhone || "",
    gender: employee.gender || "",
    birthday: employee.birthday || "",
    anniversary: employee.anniversary || "",
    address1: employee.address1 || "",
    address2: employee.address2 || "",
    city: employee.city || "",
    country: employee.country || "",
    state: employee.state || "",
    nationalityId: employee.nationalityId || "",
    // Clinics and Roles data
    primaryClinic: employee.primaryClinic || "",
    primaryClinicRole: employee.job || "",
  })

  const [otherClinics, setOtherClinics] = useState([
    // Sample other clinics data
    { id: 1, clinic: "Lines Clinics", role: "Part-time Nurse" },
    { id: 2, clinic: "Maxime Clinics", role: "Consultant" },
  ])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDeleteOtherClinic = (clinicId) => {
    if (window.confirm("Are you sure you want to delete this clinic assignment?")) {
      setOtherClinics((prev) => prev.filter((clinic) => clinic.id !== clinicId))
    }
  }

  const handleSave = () => {
    console.log("Saving employee data:", formData)
    console.log("Other clinics:", otherClinics)
    alert("Employee data saved successfully!")
  }

  const handleCancel = () => {
    onBack()
  }

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      console.log("Deleting employee:", employee.employeeCode)
      alert("Employee deleted successfully!")
      onBack()
    }
  }

  return (
    <>
      <style jsx>{`
        .employee-edit-container {
          
          min-height: 100vh;
        }

        .breadcrumb {
          margin-bottom: 10px;
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

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
          margin-top: 10px;
        }

        .form-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .tabs-container {
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          padding: 0;
        }

        .general-label {
          padding: 15px 20px;
          font-weight: 600;
          color: #495057;
          background-color: #e9ecef;
          margin: 0;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tabs {
          display: flex;
          margin: 0;
          padding: 0;
        }

        .tab {
          padding: 12px 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #6c757d;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .tab:hover {
          background-color: #f8f9fa;
          color: #495057;
        }

        .tab.active {
          color: #334B71;
          border-bottom-color: #334B71;
          background-color: white;
        }

        .form-content {
          padding: 30px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #333;
          margin-bottom: 20px;
          padding: 10px;
          color: #fff;
          border-bottom: 2px solid #334B71;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .clinics-roles-title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 30px;
          text-align: center;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-weight: 500;
          color: #495057;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .clinic-role-group {
          display: flex;
          align-items: center;
          margin-bottom: 25px;
          max-width: 600px;
        }

        .clinic-role-label {
          font-weight: 500;
          color: #495057;
          font-size: 16px;
          min-width: 180px;
          text-align: right;
          margin-right: 20px;
        }

        .form-input {
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          background-color: white;
          flex: 1;
        }

        .form-input:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-select {
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .form-select:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .others-clinic-section {
          margin-top: 40px;
        }

        .others-clinic-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
        }

        .other-clinic-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          margin-bottom: 10px;
          background-color: #f8f9fa;
        }

        .clinic-info {
          flex: 1;
        }

        .clinic-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 5px;
        }

        .clinic-role {
          color: #6c757d;
          font-size: 14px;
        }

        .delete-clinic-btn {
          padding: 8px 16px;
          background-color: #b94b56;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }

        .delete-clinic-btn:hover {
          background-color: #c82333;
        }

        .delete-section {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
        }

        .delete-btn {
          padding: 10px 20px;
          background-color: #343a40;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }

        .delete-btn:hover {
          background-color: #23272b;
        }

        .file-upload-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .file-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: #f8f9fa;
        }

        .upload-btn {
          padding: 8px 16px;
          background-color: #343a40;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }

        .upload-btn:hover {
          background-color: #23272b;
        }

        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
        }

        .btn {
          padding: 12px 30px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 100px;
        }

        .btn-primary {
          background-color: #334B71;
          color: white;
        }

        .btn-primary:hover {
          background-color: #334B71;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #545b62;
          transform: translateY(-1px);
        }

        .btn-danger {
          background-color: #b94b56;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .employee-edit-container {
            padding: 15px;
          }

          .form-content {
            padding: 20px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .clinic-role-group {
            flex-direction: column;
            align-items: flex-start;
          }

          .clinic-role-label {
            margin-bottom: 8px;
            margin-right: 0;
            text-align: left;
            min-width: auto;
          }

          .tabs {
            flex-direction: column;
          }

          .action-buttons {
            flex-direction: column;
            align-items: center;
          }

          .btn {
            width: 100%;
            max-width: 200px;
          }

          .other-clinic-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>

      <div className="employee-edit-container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={onBack}>
            Employee
          </span>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">Edit Employee</span>
        </div>

        {/* Page Title */}
        <h1 className="page-title">Edit Employee</h1>

        {/* Form Container */}
        <div className="form-container">
          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "GENERAL INFORMATION" ? "active" : ""}`}
                onClick={() => setActiveTab("GENERAL INFORMATION")}
              >
                GENERAL INFORMATION
              </button>
              {/* <button
                className={`tab ${activeTab === "CLINICS ROLES" ? "active" : ""}`}
                onClick={() => setActiveTab("CLINICS ROLES")}
              >
                CLINICS ROLES
              </button> */}
            </div>
          </div>

          {/* Form Content */}
          <div className="form-content">
            {activeTab === "GENERAL INFORMATION" && (
              <>
                {/* Personal Info Section */}
                <div className="section-title">GENERAL INFORMATION</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Employee Code :</label>
                    <input
                      type="text"
                      name="employeeCode"
                      value={formData.employeeCode}
                      onChange={handleInputChange}
                      className="form-input"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">First Name :</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Middle Name :</label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name :</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nickname :</label>
                    <input
                      type="text"
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email :</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Clinic :</label>
                    <select name="clinic" value={formData.clinic} onChange={handleInputChange} className="form-select">
                      <option value="">Select Clinic</option>
                      <option value="Bright Clinics">Bright Clinics</option>
                      <option value="Lines Clinics">Lines Clinics</option>
                      <option value="Maxime Clinics">Maxime Clinics</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job :</label>
                    <select name="job" value={formData.job} onChange={handleInputChange} className="form-select">
                      <option value="">Select Job</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Manager">Manager</option>
                      <option value="Receptionist">Receptionist</option>
                    </select>
                  </div>
                </div>

                {/* Login Info Section */}
                <div className="section-title">LOGIN INFO</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Username :</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Phone :</label>
                    <input
                      type="text"
                      name="mobilePhone"
                      value={formData.mobilePhone}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Home Phone :</label>
                    <input
                      type="text"
                      name="homePhone"
                      value={formData.homePhone}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Work Phone :</label>
                    <input
                      type="text"
                      name="workPhone"
                      value={formData.workPhone}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender :</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="form-select">
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Birthday :</label>
                    <input
                      type="text"
                      name="birthday"
                      value={formData.birthday}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Anniversary :</label>
                    <input
                      type="text"
                      name="anniversary"
                      value={formData.anniversary}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                </div>

                {/* Address Info Section */}
                <div className="section-title">ADDRESS INFO</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Address 1 :</label>
                    <input
                      type="text"
                      name="address1"
                      value={formData.address1}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address 2 :</label>
                    <input
                      type="text"
                      name="address2"
                      value={formData.address2}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City :</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country :</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">Select Country</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="UAE">UAE</option>
                      <option value="Kuwait">Kuwait</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">State :</label>
                    <select name="state" value={formData.state} onChange={handleInputChange} className="form-select">
                      <option value="">Select State</option>
                      <option value="Ar Riya-d">Ar Riya-d</option>
                      <option value="Makkah">Makkah</option>
                      <option value="Eastern Province">Eastern Province</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nationality ID :</label>
                    <input
                      type="text"
                      name="nationalityId"
                      value={formData.nationalityId}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Attachment Upload :</label>
                    <div className="file-upload-container">
                      <input type="file" className="file-input" />
                      <button type="button" className="upload-btn">
                        Upload
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "CLINICS ROLES" && (
              <>
                <div className="clinics-roles-title">Clinics and Roles</div>

                {/* Primary Clinic Section */}
                <div className="clinic-role-group">
                  <label className="clinic-role-label">Primary Clinic :</label>
                  <input
                    type="text"
                    name="primaryClinic"
                    value={formData.primaryClinic}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter primary clinic"
                  />
                </div>

                <div className="clinic-role-group">
                  <label className="clinic-role-label">Primary Clinic Role :</label>
                  <input
                    type="text"
                    name="primaryClinicRole"
                    value={formData.primaryClinicRole}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter primary clinic role"
                  />
                </div>

                {/* Others Clinic Section */}
                <div className="others-clinic-section">
                  <div className="others-clinic-title">Others Clinic :</div>

                  {otherClinics.map((clinic) => (
                    <div key={clinic.id} className="other-clinic-item">
                      <div className="clinic-info">
                        <div className="clinic-name">{clinic.clinic}</div>
                        <div className="clinic-role">{clinic.role}</div>
                      </div>
                      <button className="delete-clinic-btn" onClick={() => handleDeleteOtherClinic(clinic.id)}>
                        Delete
                      </button>
                    </div>
                  ))}

                  {otherClinics.length === 0 && (
                    <div style={{ color: "#6c757d", fontStyle: "italic", padding: "20px 0" }}>
                      No other clinic assignments found.
                    </div>
                  )}

                  <div className="delete-section">
                    <button className="delete-btn">Delete</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={handleSave}>
              Save
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default EmployeeEditForm
