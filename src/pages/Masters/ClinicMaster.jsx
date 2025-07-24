// ClinicMaster.jsx
"use client";

import { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import { API_BASE_URL } from "../../config";

const ClinicMaster = () => {
  const [clinicData, setClinicData] = useState([]);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clinicToDelete, setClinicToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        setClinicData(data);
        setFilteredClinics(data);
      } catch (err) {
        setToast({ type: "error", message: "Failed to load clinics." });
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, []);

  useEffect(() => {
    const filtered = clinicData.filter((clinic) =>
      clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClinics(filtered);
  }, [searchTerm, clinicData]);

  const handleDeleteClick = (clinic) => {
    setClinicToDelete(clinic);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/ClinicRemove`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clinicToDelete),
      });

      const result = await response.json();

      if (result.success) {
        setToast({ type: "success", message: "Clinic deleted successfully." });
        setClinicData((prev) => prev.filter((c) => c.code !== clinicToDelete.code));
      } else {
        setToast({ type: "error", message: result.message || "Delete failed." });
      }
    } catch (err) {
      console.error("Error deleting clinic:", err);
      setToast({ type: "error", message: "An error occurred." });
    } finally {
      setShowConfirmModal(false);
      setClinicToDelete(null);
    }
  };

  const columns = [
    {
      name: "Zone",
      selector: (row) => row.zone,
      sortable: true,
    },
    {
      name: "Code",
      selector: (row) => row.code,
      sortable: true,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Address",
      selector: (row) => row.address,
      wrap: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button className="delete-btn" onClick={() => handleDeleteClick(row)}>Delete</button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  return (
    <div className="clinic-master-container">
       {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Products</span>
      </div>
      <div className="header-section">
        <h1 className="page-title">Manage Clinic</h1>
        <button className="add-clinic-btn" onClick={() => setShowForm(true)}>Add Clinic</button>
      </div>

      <input
        type="text"
        placeholder="Search clinics..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      <DataTable
        columns={columns}
        data={filteredClinics}
        progressPending={loading}
        className="clinictbl cstmtable"
        pagination
        highlightOnHover
      />

      {toast && (
        <div className={`toastmsg ${toast.type}`}>{toast.message}</div>
      )}

      {showConfirmModal && (
        <div className="confirm-modal">
          <div className="confirm-box">
            <p>Are you sure you want to delete this clinic?</p>
            <div className="modal-actions">
              <button onClick={confirmDelete}>Yes</button>
              <button onClick={() => setShowConfirmModal(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .add-clinic-btn {
          padding: 10px 20px;
          background: #334B71;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        .delete-btn {
          padding: 6px 12px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .modal-actions{display: flex; justify-content: center; gap:10px;margin: 20px 0 0;}
        .confirm-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .confirm-box {
          background: white;
          padding: 20px;
          border-radius: 6px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
          .confirm-box p{font-size: 16px; }
        .modal-actions button {
          margin: 10px 5px 0;
          padding: 8px 14px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .toastmsg {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 18px;
          border-radius: 4px;
          color: white;
          z-index: 1001;
        }
        .toastmsg.success {
          background: #28a745;
        }
        .toastmsg.error {
          background: #dc3545;
        }
      `}</style>
    </div>
  );
};

export default ClinicMaster;
