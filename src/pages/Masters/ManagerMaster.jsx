"use client";

import { useState, useEffect } from "react";
import "./mastr.css";
import { API_BASE_URL } from "../../config";

const ManagerMaster = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [managerData, setManagerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch manager data from API
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/LoadManager`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        setManagerData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchManagers();
  }, []);

  useEffect(() => {
    if (managerData.length > 0) {
      console.log("Manager Data:", managerData);
    }
  }, [managerData]);


  const filteredManagers = managerData.filter((manager) => {
  const managerName = manager.managerName ? manager.managerName.toLowerCase() : '';
  const code = manager.code ? manager.code.toLowerCase() : '';
  const associatedClinic = manager.associatedClinic ? manager.associatedClinic.toLowerCase() : '';
  const progressStatus = manager.toDateProgressStatus ? manager.toDateProgressStatus.toLowerCase() : '';  // Fix the field name
  return (
    managerName.includes(searchTerm.toLowerCase()) ||
    code.includes(searchTerm.toLowerCase()) ||
    associatedClinic.includes(searchTerm.toLowerCase()) ||
    progressStatus.includes(searchTerm.toLowerCase())
  );
});

console.log(filteredManagers)

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCheckboxChange = (managerCode) => {
    setSelectedManagers((prev) => {
      if (prev.includes(managerCode)) {
        return prev.filter((code) => code !== managerCode);
      } else {
        return [...prev, managerCode];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedManagers(filteredManagers.map((manager) => manager.code));
    } else {
      setSelectedManagers([]);
    }
  };

  const isAllSelected = filteredManagers.length > 0 && selectedManagers.length === filteredManagers.length;

  if (loading) {
    return <div>Loading managers...</div>;
  }

  if (error) {
    return <div>Error loading managers: {error}</div>;
  }

  return (
    <div className="manager-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Manager</span>
      </div>

      {/* Page Title */}
      <h1 className="page-title">Manage Manager</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search managers..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Manager Table */}
      <div className="table-container">
        <table className="msttable">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="table-checkbox" />
              </th>
              <th>Code</th>
              <th>Manager Name</th>
              <th>From Date</th>
              <th>To Date</th>
              <th>Associated Clinic</th>
              <th>To Date Progress Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredManagers.map((manager) => (
              <tr key={manager.code}>
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedManagers.includes(manager.code)}
                    onChange={() => handleCheckboxChange(manager.code)}
                    className="table-checkbox"
                  />
                </td>
                <td>{manager.code}</td>
                <td>{manager.managerName}</td>
                <td>{manager.fromDate}</td>
                <td>{manager.toDate}</td>
                <td>{manager.associatedClinic}</td>
                <td>
                  <span className={`status-badge ${manager.toDateProgressStatus ? manager.toDateProgressStatus.trim().toLowerCase().replace(" ", "-") : ''}`}>
                    {manager.toDateProgressStatus && manager.toDateProgressStatus.trim() ? manager.toDateProgressStatus : 'Unknown Status'}
                  </span>


                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredManagers.length === 0 && (
          <div className="no-results">
            <p>No managers found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Selected Count */}
      {selectedManagers.length > 0 && (
        <div className="selected-info">
          <p>{selectedManagers.length} manager(s) selected</p>
        </div>
      )}
    </div>
  );
};

export default ManagerMaster;
