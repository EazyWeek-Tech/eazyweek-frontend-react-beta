import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Toast from "../../components/Toast";

const SegmentAddForm = () => {
  const { employeeCode } = useParams();
  const navigate = useNavigate();
  const [clinicOptions, setClinicOptions] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [toast, setToast] = useState(null);
  const [mappedSegments, setMappedSegments] = useState([]);

  const segmentOptions = [
    "Digital",
    "Grooming",
    "Housekeeping",
    "Instagram",
    "Medical",
    "Safety",
    "Telephone",
    "Whatsapp",
  ];

  // Load Clinics
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setClinicOptions(data));
  }, []);

  // Load mapped segments
  useEffect(() => {
    if (employeeCode) {
      loadMappedSegments();
    }
  }, [employeeCode]);

  const loadMappedSegments = () => {
    const payload = {
      employeeCode: employeeCode,
      auditSegment: "",
      clinicName: sessionStorage.getItem("centerCode") || "",
      clinicCode: sessionStorage.getItem("centerName") || "",
      createdBy: sessionStorage.getItem("userId") || "Admin",
      id: 0
    };

    fetch(`${API_BASE_URL}/api/Master/LoadAuditMappingEmpWise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => setMappedSegments(data))
      .catch(() => alert("Failed to load mappings"));
  };

  const handleAddSegment = () => {
    if (!employeeCode) return;

    const payload = {
      employeeCode: employeeCode,
      auditSegment: selectedSegment,
      clinicName: clinicOptions.find(c => c.code === selectedClinic)?.name || "",
      clinicCode: selectedClinic,
      createdBy: sessionStorage.getItem("userId") || "Admin",
      id: 0,
    };

    fetch(`${API_BASE_URL}/api/Master/AuditMappingEmpInsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(() => {
        setToast({ message: "Segment successfully mapped.", type: "success" });
        loadMappedSegments();
      })
      .catch(() => setToast({ message: "Failed to map segment.", type: "error" }));
  };

  const handleDeleteMapping = (item) => {
    const payload = {
      employeeCode: employeeCode,
      auditSegment: item.auditSegment,
      clinicName: item.clinicName,
      clinicCode: item.clinicCode,
      createdBy: sessionStorage.getItem("userId") || "Admin",
      id: item.id || 0,
    };

    fetch(`${API_BASE_URL}/api/Master/AuditMappingEmpRemove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(() => {
        setToast({ message: "Mapping removed successfully.", type: "success" });
        loadMappedSegments();
      })
      .catch(() => setToast({ message: "Failed to remove mapping.", type: "error" }));
  };

  return (
    <>
      <div className="breadcrumb">
        <Link to="/dashboard" className="bradcrumb-link">Employee Dashboard</Link> {">"} Segment Mapping
      </div>

      <h2 className="page-title">Map Employee To Audit Segment's</h2>
      <div className="employee-details-page">
        <style>{`
          .employee-details-page { font-family: Arial; padding: 20px; max-width: 1000px; margin: auto; }
          .employee-summary { background: #e9edf5; padding: 10px; border-left: 5px solid #3E5D8A; margin-bottom: 20px; }
          .form-section { background: #fff; padding: 20px; border-radius: 10px; margin-top: 20px; }
          .form-group { margin-bottom: 15px; }
          label { font-weight: bold; color: #2a3850; margin-bottom: 5px; display: block; }
          select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 5px; color:#000 }
          .action-buttons { margin-top: 20px; display: flex; gap: 10px; }
          .action-buttons button { background: #3E5D8A; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; }
          .action-buttons button:hover { background: #2a3850; }
          table.mapping-table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; }
          table.mapping-table th, table.mapping-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          table.mapping-table th { background: #3E5D8A; color: #fff; }
          table.mapping-table tbody tr:nth-child(even) { background: #f9f9f9; }
          .delete-btn { background: #C23B22; color: #fff; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; }
          .delete-btn:hover { background: #9b2c1a; }
        `}</style>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <div className="employee-summary">
          <b>Selected Employee Code:</b> {employeeCode}
        </div>

        <div className="form-section">
          <div className="form-group">
            <label>Clinic:</label>
            <select value={selectedClinic} onChange={(e) => setSelectedClinic(e.target.value)}>
              <option value="">Select one</option>
              {clinicOptions.map((clinic) => (
                <option key={clinic.code} value={clinic.code}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Audit Segment:</label>
            <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)}>
              <option value="">Select one</option>
              {segmentOptions.map((segment) => (
                <option key={segment} value={segment}>
                  {segment}
                </option>
              ))}
            </select>
          </div>

          <div className="action-buttons">
            <button onClick={handleAddSegment}>Add Segment</button>
            <button onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>

        <div className="form-section">
          <h3>Mapped Segments</h3>
          <table className="mapping-table">
            <thead>
              <tr>
                <th>Audit Segment</th>
                <th>Clinic Name</th>
                <th>Clinic Code</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mappedSegments.length > 0 ? (
                mappedSegments.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.auditSegment}</td>
                    <td>{item.clinicName}</td>
                    <td>{item.clinicCode}</td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteMapping(item)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No mappings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default SegmentAddForm;
