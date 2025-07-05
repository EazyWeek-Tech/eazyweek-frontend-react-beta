"use client"

import { useState } from "react"

const ManagerMaster = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedManagers, setSelectedManagers] = useState([])

  // Sample manager data based on your screenshot
  const managerData = [
    {
      id: 1,
      code: "CENT-00023",
      managerName: "Nahlah - InactiveHassan Altayeb",
      fromDate: "01/01/2023",
      toDate: "02/07/2025",
      associatedClinic: "Bright Clinics",
      progressStatus: "OnGoing",
    },
    // You can add more sample data here
    {
      id: 2,
      code: "CENT-00024",
      managerName: "Ahmed Ali Mohammed",
      fromDate: "15/03/2023",
      toDate: "15/03/2026",
      associatedClinic: "Bright Clinics",
      progressStatus: "OnGoing",
    },
    {
      id: 3,
      code: "CENT-00025",
      managerName: "Sarah Abdullah",
      fromDate: "01/06/2023",
      toDate: "01/06/2025",
      associatedClinic: "Lines Clinics",
      progressStatus: "Completed",
    },
  ]

  // Filter managers based on search term
  const filteredManagers = managerData.filter(
    (manager) =>
      manager.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.associatedClinic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.progressStatus.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleCheckboxChange = (managerId) => {
    setSelectedManagers((prev) => {
      if (prev.includes(managerId)) {
        return prev.filter((id) => id !== managerId)
      } else {
        return [...prev, managerId]
      }
    })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedManagers(filteredManagers.map((manager) => manager.id))
    } else {
      setSelectedManagers([])
    }
  }

  const isAllSelected = filteredManagers.length > 0 && selectedManagers.length === filteredManagers.length

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
              <tr key={manager.id}>
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedManagers.includes(manager.id)}
                    onChange={() => handleCheckboxChange(manager.id)}
                    className="table-checkbox"
                  />
                </td>
                <td>{manager.code}</td>
                <td>{manager.managerName}</td>
                <td>{manager.fromDate}</td>
                <td>{manager.toDate}</td>
                <td>{manager.associatedClinic}</td>
                <td>
                  <span className={`status-badge ${manager.progressStatus.toLowerCase().replace(" ", "-")}`}>
                    {manager.progressStatus}
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
  )
}

export default ManagerMaster
