"use client";

import { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import { API_BASE_URL } from "../../config";

const DepartmentMaster = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentData, setDepartmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [dCode, setDCode] = useState("");
  const [dName, setDName] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/LoadDepartment`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      setDepartmentData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (department) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/DepartmentRemove`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dCode: department.dCode, dName: department.dName }),
      });
      const result = await response.json();
      if (result.success) {
        setToast({ type: "success", message: "Department deleted successfully" });
        fetchDepartments();
      } else {
        setToast({ type: "error", message: result.message || "Delete failed" });
      }
    } catch (err) {
      setToast({ type: "error", message: "An error occurred during deletion" });
    }
    setConfirmDelete(null);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/DepartmentInsert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dCode, dName }),
      });
      const result = await response.json();
      if (result.success) {
        setToast({ type: "success", message: "Department added successfully" });
        setShowForm(false);
        setDCode("");
        setDName("");
        fetchDepartments();
      } else {
        setToast({ type: "error", message: result.message || "Addition failed" });
      }
    } catch (err) {
      setToast({ type: "error", message: "An error occurred while saving" });
    }
  };

  const filteredDepartments = departmentData.filter(
    (d) =>
      d.dCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.dName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { name: "Code", selector: (row) => row.dCode, sortable: true },
    { name: "Name", selector: (row) => row.dName, sortable: true },
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
    <div className="department-master">
      <div className="header-section">
        <h1>Manage Department</h1>
        <button className="add-btn" onClick={() => setShowForm(true)}>Add Department</button>
      </div>

      <input
        type="text"
        placeholder="Search departments..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-box"
      />

      <DataTable
        columns={columns}
        data={filteredDepartments}
        progressPending={loading}
        progressComponent={<div className="loader"></div>}
        pagination
        highlightOnHover
      />

      {showForm && (
        <div className="modal">
          <div className="form-box">
            <div>
              <label>Department Code:</label>
              <input value={dCode} onChange={(e) => setDCode(e.target.value)} />
            </div>
            <div>
              <label>Department Name:</label>
              <input value={dName} onChange={(e) => setDName(e.target.value)} />
            </div>
            <div className="button-group">
              <button onClick={handleSubmit} className="add-btn">Save</button>
              <button onClick={() => setShowForm(false)} className="restbtn">Back</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal">
          <div className="form-box">
            <p>Are you sure you want to delete {confirmDelete.dName}?</p>
            <div className="button-group">
              <button onClick={() => handleDelete(confirmDelete)} className="add-btn">Yes, Delete</button>
              <button onClick={() => setConfirmDelete(null)} className="restbtn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toastmsg ${toast.type}`}>{toast.message}</div>
      )}

      <style>{`
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
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
          div[data-column-id="1"]{width: 100px;}
          .form-box p{font-size: 16px; font-weight: 600; }
        .delete-btn {
          background: #b94b56;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
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
        .form-box {
          background: white;
          padding: 20px;
          border-radius: 8px;
          min-width: 300px;
        }
        .form-box div  {
          margin-bottom: 12px;
        }
          .form-box div label{margin: 0 0 10px; font-size: 14px; display: block;}
        .form-box input {
          width: 100%;
          padding: 6px;
        }
        .button-group {
          display: flex;
          gap: 10px;
          margin: 30px 0 0;
          justify-content: center;
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
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #334b71;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DepartmentMaster;
