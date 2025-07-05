"use client"

import { useState } from "react"

const DepartmentMaster = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartments, setSelectedDepartments] = useState([])

  // Sample department data based on your screenshot
  const departmentData = [
    {
      id: 1,
      dcode: "Dept-001",
      name: "Derma",
    },
    {
      id: 2,
      dcode: "Dept-002",
      name: "Laser",
    },
    {
      id: 3,
      dcode: "Dept-003",
      name: "Hydra",
    },
  ]

  // Filter departments based on search term
  const filteredDepartments = departmentData.filter(
    (department) =>
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.dcode.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleCheckboxChange = (departmentId) => {
    setSelectedDepartments((prev) => {
      if (prev.includes(departmentId)) {
        return prev.filter((id) => id !== departmentId)
      } else {
        return [...prev, departmentId]
      }
    })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDepartments(filteredDepartments.map((department) => department.id))
    } else {
      setSelectedDepartments([])
    }
  }

  const isAllSelected = filteredDepartments.length > 0 && selectedDepartments.length === filteredDepartments.length

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
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="table-checkbox" />
              </th>
              <th width="200">DCODE</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.map((department) => (
              <tr key={department.id}>
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(department.id)}
                    onChange={() => handleCheckboxChange(department.id)}
                    className="table-checkbox"
                  />
                </td>
                <td>{department.dcode}</td>
                <td>{department.name}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDepartments.length === 0 && (
          <div className="no-results">
            <p>No departments found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Selected Count */}
      {selectedDepartments.length > 0 && (
        <div className="selected-info">
          <p>{selectedDepartments.length} department(s) selected</p>
        </div>
      )}
    </div>
  )
}

export default DepartmentMaster
