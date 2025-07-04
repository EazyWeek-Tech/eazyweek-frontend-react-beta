"use client"

import { useState } from "react"
import EmployeeDetails from "./EmployeeDetails"

const SegmentMapping = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  // Sample employee data based on your screenshot
  const employeeData = [
    {
      id: 1,
      employeeCode: "CENT-00001",
      firstName: "Amr",
      lastName: "Abdelhakim Rateb Said",
      mobileNo: "56 844 7145",
      role: "",
      clinic: "",
    },
    {
      id: 2,
      employeeCode: "CENT00002",
      firstName: "Aaliya",
      lastName: "Mukhtar Ahmad",
      mobileNo: "58 135 1231",
      role: "",
      clinic: "",
    },
    {
      id: 3,
      employeeCode: "CENT-00002",
      firstName: "Aaliya",
      lastName: "Mukhtar Ahmad",
      mobileNo: "58 135 1231",
      role: "",
      clinic: "",
    },
    {
      id: 4,
      employeeCode: "CENT-00003",
      firstName: "Ehab",
      lastName: "Ibrahim Abdalla Afandy",
      mobileNo: "54 407 3595",
      role: "",
      clinic: "",
    },
    {
      id: 5,
      employeeCode: "CENT-00004",
      firstName: "Rose",
      lastName: "Ann Ted Tolentino",
      mobileNo: "57 004 6981",
      role: "Clinic Manager",
      clinic: "Lines Clinics",
    },
    {
      id: 6,
      employeeCode: "CENT-00004",
      firstName: "Rose",
      lastName: "Ann Ted Tolentino",
      mobileNo: "57 004 6981",
      role: "Team Member",
      clinic: "Bright Clinics",
    },
    {
      id: 7,
      employeeCode: "CENT00005",
      firstName: "Bernadet",
      lastName: "Remiter Deluna",
      mobileNo: "57 015 5709",
      role: "",
      clinic: "",
    },
    {
      id: 8,
      employeeCode: "CENT-00005",
      firstName: "Bernadet",
      lastName: "Remiter Deluna",
      mobileNo: "57 015 5709",
      role: "",
      clinic: "",
    },
    {
      id: 9,
      employeeCode: "CENT00006",
      firstName: "Dr. Hassnaa",
      lastName: "Samir Abdelaziz Abosena",
      mobileNo: "50 033 0462",
      role: "",
      clinic: "",
    },
    {
      id: 10,
      employeeCode: "CENT-00006",
      firstName: "Ali",
      lastName: "Ejaz Muhammad Ejaz",
      mobileNo: "55 539 0941",
      role: "",
      clinic: "",
    },
  ]

  const itemsPerPage = 10
  const totalPages = Math.ceil(employeeData.length / itemsPerPage)

  // Filter employees based on search term
  const filteredEmployees = employeeData.filter(
    (employee) =>
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.mobileNo.includes(searchTerm) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.clinic.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Get current page data
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage)

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee)
    setShowDetails(true)
  }

  const handleBackToList = () => {
    setShowDetails(false)
    setSelectedEmployee(null)
  }

  const renderPagination = () => {
    const pages = []
    const maxVisiblePages = 10

    for (let i = 1; i <= Math.min(totalPages, maxVisiblePages); i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>,
      )
    }

    if (totalPages > maxVisiblePages) {
      pages.push(
        <button key="more" className="pagination-btn">
          ...
        </button>,
      )
    }

    return pages
  }

  // If showing details, render the EmployeeDetails component
  if (showDetails && selectedEmployee) {
    return <EmployeeDetails employee={selectedEmployee} onBack={handleBackToList} />
  }

  return (
    <div className="segment-mapping-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="#" className="breadcrumb-link">
          Employee Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Segment Mapping</span>
      </div>

      {/* Page Title */}
      <h1 className="page-title">Map Employee To Audit Segment's</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Employee Table */}
      <div className="table-container">
        <table className="msttable">
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Mobile No</th>
              <th>Role</th>
              <th>Clinic</th>
            </tr>
          </thead>
          <tbody>
            {currentEmployees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <a
                    href="#"
                    className="employee-code-link"
                    onClick={(e) => {
                      e.preventDefault()
                      handleEmployeeClick(employee)
                    }}
                  >
                    {employee.employeeCode}
                  </a>
                </td>
                <td>{employee.firstName}</td>
                <td>{employee.lastName}</td>
                <td>{employee.mobileNo}</td>
                <td>{employee.role}</td>
                <td>{employee.clinic}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEmployees.length === 0 && (
          <div className="no-results">
            <p>No employees found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination-container">{renderPagination()}</div>
    </div>
  )
}

export default SegmentMapping
