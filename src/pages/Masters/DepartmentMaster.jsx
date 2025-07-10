"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const DepartmentMaster = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/LoadDepartment`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        try {
          const data = await response.json();
          setDepartmentData(data);
        } catch {
          throw new Error("Failed to parse JSON. Response might be HTML or something else.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const filteredDepartments = departmentData.filter(
    (department) =>
      department.dName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.dCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCheckboxChange = (departmentId) => {
    setSelectedDepartments((prev) => {
      if (prev.includes(departmentId)) {
        return prev.filter((id) => id !== departmentId);
      } else {
        return [...prev, departmentId];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDepartments(filteredDepartments.map((department) => department.dCode));
    } else {
      setSelectedDepartments([]);
    }
  };

  const isAllSelected =
    filteredDepartments.length > 0 && selectedDepartments.length === filteredDepartments.length;

  if (loading) {
    return <div>Loading departments...</div>;
  }

  if (error) {
    return <div>Error loading departments: {error}</div>;
  }

  return (
    <div className="department-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Department</span>
      </div>

      {/* Page Title */}
      <h1 className="page-title">Manage Department</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search departments..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Department Table */}
      <div className="table-container">
        <table className="msttable">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="table-checkbox"
                  aria-label="Select All Departments"
                />
              </th>
              <th width="200">DCODE</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.length > 0 ? (
              filteredDepartments.map((department) => (
                <tr key={department.dCode}>
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(department.dCode)}
                      onChange={() => handleCheckboxChange(department.dCode)}
                      className="table-checkbox"
                      aria-label={`Select ${department.dName}`}
                    />
                  </td>
                  <td>{department.dCode}</td>
                  <td>{department.dName}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No departments found matching your search criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Count */}
      {selectedDepartments.length > 0 && (
        <div className="selected-info">
          <p>{selectedDepartments.length} department(s) selected</p>
        </div>
      )}
    </div>
  );
};

export default DepartmentMaster;
