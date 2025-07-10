"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const ClinicMaster = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinics, setSelectedClinics] = useState([]);
  const [clinicData, setClinicData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch clinic data from the API
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        setClinicData(data);  // Set the fetched data into state
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, []);

  // Filter clinics based on search term
  const filteredClinics = clinicData.filter(
    (clinic) =>
      clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCheckboxChange = (clinicCode) => {
    setSelectedClinics((prev) => {
      if (prev.includes(clinicCode)) {
        return prev.filter((code) => code !== clinicCode);
      } else {
        return [...prev, clinicCode];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedClinics(filteredClinics.map((clinic) => clinic.code));
    } else {
      setSelectedClinics([]);
    }
  };

  const isAllSelected = filteredClinics.length > 0 && selectedClinics.length === filteredClinics.length;

  if (loading) {
    return <div>Loading clinics...</div>;
  }

  if (error) {
    return <div>Error loading clinics: {error}</div>;
  }

  return (
    <div className="clinic-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Clinic</span>
      </div>

      {/* Page Title */}
      <h1 className="page-title">Manage Clinic</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search clinics..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Clinic Table */}
      <div className="table-container">
        <table className="msttable">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="table-checkbox" />
              </th>
              <th>ZONE</th>
              <th>CODE</th>
              <th>NAME</th>
              <th>ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {filteredClinics.length > 0 ? (
              filteredClinics.map((clinic) => (
                <tr key={clinic.code}>
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedClinics.includes(clinic.code)}
                      onChange={() => handleCheckboxChange(clinic.code)}
                      className="table-checkbox"
                    />
                  </td>
                  <td>{clinic.zone}</td>
                  <td>{clinic.code}</td>
                  <td>{clinic.name}</td>
                  <td>{clinic.address || "No address provided"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No clinics found matching your search criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Count */}
      {selectedClinics.length > 0 && (
        <div className="selected-info">
          <p>{selectedClinics.length} clinic(s) selected</p>
        </div>
      )}
    </div>
  );
};

export default ClinicMaster;
