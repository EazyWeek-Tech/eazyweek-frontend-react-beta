"use client";

import { useState, useEffect } from "react";
import "./mastr.css";
import { API_BASE_URL } from "../../config";

const DoctorMaster = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [doctorData, setDoctorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch doctor data from API
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/LoadDoctorMapping`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        setDoctorData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Filter doctors based on search term
  const filteredDoctors = doctorData.filter(
    (doctor) =>
      doctor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.associatedClinic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCheckboxChange = (doctorCode) => {
    setSelectedDoctors((prev) => {
      if (prev.includes(doctorCode)) {
        return prev.filter((code) => code !== doctorCode);
      } else {
        return [...prev, doctorCode];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDoctors(filteredDoctors.map((doctor) => doctor.employeeCode));
    } else {
      setSelectedDoctors([]);
    }
  };

  const isAllSelected = filteredDoctors.length > 0 && selectedDoctors.length === filteredDoctors.length;

  if (loading) {
    return <div>Loading doctors/therapists...</div>;
  }

  if (error) {
    return <div>Error loading doctors/therapists: {error}</div>;
  }

  return (
    <div className="doctor-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Doctor/Therapist</span>
      </div>

      {/* Page Title */}
      <h1 className="page-title">Manage Doctor/Therapist</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search doctors/therapists..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Doctor Table */}
      <div className="table-container">
        <table className="doctor-table msttable">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="table-checkbox" />
              </th>
              <th>Employee Code</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Associated Clinic</th>
            </tr>
          </thead>
          <tbody>
            {filteredDoctors.map((doctor) => (
              <tr key={doctor.employeeCode} className="table-row">
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedDoctors.includes(doctor.employeeCode)}
                    onChange={() => handleCheckboxChange(doctor.employeeCode)}
                    className="table-checkbox"
                  />
                </td>
                <td className="employee-code">{doctor.employeeCode}</td>
                <td>{doctor.firstName}</td>
                <td>{doctor.lastName}</td>
                <td>{doctor.associatedClinic}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDoctors.length === 0 && (
          <div className="no-results">
            <p>No doctors/therapists found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Selected Count */}
      {selectedDoctors.length > 0 && (
        <div className="selected-info">
          <p>{selectedDoctors.length} doctor(s)/therapist(s) selected</p>
        </div>
      )}
    </div>
  );
};

export default DoctorMaster;
