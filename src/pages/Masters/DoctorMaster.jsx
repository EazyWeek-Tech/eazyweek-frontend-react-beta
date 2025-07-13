"use client";

import { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import { API_BASE_URL } from "../../config";

const DoctorMaster = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [doctorData, setDoctorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [employeeCode, setEmployeeCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [associatedClinic, setAssociatedClinic] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [clinicOptions, setClinicOptions] = useState([]);

  useEffect(() => {
    fetchDoctors();
    fetchEmployees();
    fetchClinics();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/LoadDoctorMapping`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setDoctorData(data);
    } catch (err) {
      setToast({ type: "error", message: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Employees`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setEmployeeOptions(data);
    } catch (err) {
      setToast({ type: "error", message: "Failed to load employees" });
    }
  };

  const fetchClinics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setClinicOptions(data);
    } catch (err) {
      setToast({ type: "error", message: "Failed to load clinics" });
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/DoctorMappingInsert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode, firstName, lastName, associatedClinic }),
      });
      const result = await response.json();
      if (result.success) {
        setToast({ type: "success", message: "Practitioner added successfully" });
        setShowForm(false);
        setEmployeeCode("");
        setFirstName("");
        setLastName("");
        setAssociatedClinic("");
        fetchDoctors();
      } else {
        setToast({ type: "error", message: result.message || "Add failed" });
      }
    } catch {
      setToast({ type: "error", message: "An error occurred while saving" });
    }
  };

  const handleDelete = async (doctor) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/DoctorMappingRemove`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doctor),
      });
      const result = await response.json();
      if (result.success) {
        setToast({ type: "success", message: "Deleted successfully" });
        fetchDoctors();
      } else {
        setToast({ type: "error", message: result.message || "Delete failed" });
      }
    } catch {
      setToast({ type: "error", message: "An error occurred during deletion" });
    }
    setConfirmDelete(null);
  };

  const filteredDoctors = doctorData.filter(
    (d) =>
      d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.associatedClinic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { name: "Employee Code", selector: (row) => row.employeeCode, sortable: true },
    { name: "First Name", selector: (row) => row.firstName },
    { name: "Last Name", selector: (row) => row.lastName },
    { name: "Clinic", selector: (row) => row.associatedClinic },
    {
      name: "Actions",
      cell: (row) => (
        <button onClick={() => setConfirmDelete(row)} className="delete-btn">
          Delete
        </button>
      ),
      ignoreRowClick: true
    },
  ];

  return (
    <div className="doctor-master">
      <div className="header-section">
        <h1>Manage Doctor/Therapist</h1>
        <button className="add-btn" onClick={() => setShowForm(true)}>Add Practitioner</button>
      </div>

      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-box"
      />

      <DataTable
        columns={columns}
        data={filteredDoctors}
        pagination
        progressPending={loading}
        highlightOnHover
      />

      {showForm && (
        <div className="modal">
          <div className="form-box">
            <div>
              <label>Employee Name:</label>
              <select value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)}>
                <option value="">&lt; - Select one - &gt;</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.employeeCode} value={emp.employeeCode}>
                    {emp.employeeName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>First Name:</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label>Last Name:</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <label>Associated Clinic:</label>
              <select value={associatedClinic} onChange={(e) => setAssociatedClinic(e.target.value)}>
                <option value="">Select one</option>
                {clinicOptions.map((clinic) => (
                  <option key={clinic.code} value={clinic.code}>{clinic.name}</option>
                ))}
              </select>
            </div>
            <div className="button-group">
              <button onClick={handleSubmit} className="add-btn">Save</button>
              <button onClick={() => setShowForm(false)}>Back</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal">
          <div className="form-box">
            <p className="cnfrmmsg">Are you sure you want to delete {confirmDelete.firstName}?</p>
            <div className="button-group">
              <button onClick={() => handleDelete(confirmDelete)} className="add-btn">Yes, Delete</button>
              <button onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toastmsg ${toast.type}`}>{toast.message}</div>
      )}

      <style jsx>{`
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
          .cnfrmmsg{ font-weight: 600; font-size: 16px;margin: 0 0 20px; }
        .add-btn {
          background: #334b71;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .search-box {
          margin: 1rem 0;
          padding: 0.5rem;
          width: 300px;
        }
        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
        }
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.4);
          display: flex;
          justify-content: center;
          align-items: center;
        }
           .form-box div label{margin: 0 0 10px; font-size: 14px; display: block;}
        .form-box {
          background: white;
          padding: 20px;
          border-radius: 8px;
          min-width: 300px;
        }
        .form-box div {
          margin-bottom: 12px;
        }
        .form-box input, .form-box select {
          width: 100%;
          padding: 6px;
        }
        .button-group {
          display: flex;
          gap: 10px;
        }
        .toastmsg {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          padding: 10px 20px;
          border-radius: 4px;
          color: white;
        }
        .toastmsg.success {
          background: green;
        }
        .toastmsg.error {
          background: red;
        }
      `}</style>
    </div>
  );
};

export default DoctorMaster;