"use client"

import { useState } from "react"
import EmployeeEditForm from "./EmployeeEditForm"

const EmployeeMaster = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showEditForm, setShowEditForm] = useState(false)

  // Sample employee data based on your screenshot
  const employeeData = [
    {
      id: 1,
      employeeCode: "CENT00069",
      firstName: "Kris",
      lastName: "Tolentino Cajuguiran",
      mobileNo: "55 704 8644",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Kris",
      email: "kris.cajuguiran@linesclinics.com",
      job: "Nurse",
      username: "kris.cajuguiran@linesclinics.com",
      homePhone: "55 704 8644",
      workPhone: "55 704 8644",
      gender: "Male",
      birthday: "01/01/1990",
      anniversary: "01/01/1990",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 2,
      employeeCode: "CENT00030",
      firstName: "Merian",
      lastName: "Solita Sorio",
      mobileNo: "56 254 7083",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Merian",
      email: "merian.sorio@linesclinics.com",
      job: "Nurse",
      username: "merian.sorio@linesclinics.com",
      homePhone: "56 254 7083",
      workPhone: "56 254 7083",
      gender: "Female",
      birthday: "01/01/1985",
      anniversary: "01/01/1985",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 3,
      employeeCode: "CENT00068",
      firstName: "Quenaver",
      lastName: "Vicente Acabo",
      mobileNo: "55 477 9834",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Quenaver",
      email: "quenaver.acabo@linesclinics.com",
      job: "Nurse",
      username: "quenaver.acabo@linesclinics.com",
      homePhone: "55 477 9834",
      workPhone: "55 477 9834",
      gender: "Male",
      birthday: "01/01/1988",
      anniversary: "01/01/1988",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 4,
      employeeCode: "CENT-00191",
      firstName: "Danah Mohammed",
      lastName: "Alqarni",
      mobileNo: "55 464 1645",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Danah",
      email: "danah.alqarni@linesclinics.com",
      job: "Nurse",
      username: "danah.alqarni@linesclinics.com",
      homePhone: "55 464 1645",
      workPhone: "55 464 1645",
      gender: "Female",
      birthday: "01/01/1992",
      anniversary: "01/01/1992",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 5,
      employeeCode: "CENT00124",
      firstName: "Reema",
      lastName: "Ibrahim Sulaiman Alqaseem",
      mobileNo: "53 379 4446",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Reema",
      email: "reema.alqaseem@linesclinics.com",
      job: "Nurse",
      username: "reema.alqaseem@linesclinics.com",
      homePhone: "53 379 4446",
      workPhone: "53 379 4446",
      gender: "Female",
      birthday: "01/01/1987",
      anniversary: "01/01/1987",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 6,
      employeeCode: "CENT00121",
      firstName: "Ahlam",
      lastName: "Ahmed Ali Alqarni",
      mobileNo: "57 039 8637",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Ahlam",
      email: "ahlam.alqarni@linesclinics.com",
      job: "Nurse",
      username: "ahlam.alqarni@linesclinics.com",
      homePhone: "57 039 8637",
      workPhone: "57 039 8637",
      gender: "Female",
      birthday: "01/01/1991",
      anniversary: "01/01/1991",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 7,
      employeeCode: "CENT-00156",
      firstName: "Amirah",
      lastName: "Alduwayhim",
      mobileNo: "55 646 8681",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Amirah",
      email: "amirah.alduwayhim@linesclinics.com",
      job: "Nurse",
      username: "amirah.alduwayhim@linesclinics.com",
      homePhone: "55 646 8681",
      workPhone: "55 646 8681",
      gender: "Female",
      birthday: "01/01/1989",
      anniversary: "01/01/1989",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 8,
      employeeCode: "CENT101",
      firstName: "Dr X",
      lastName: "",
      mobileNo: "",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Dr X",
      email: "drx@linesclinics.com",
      job: "Doctor",
      username: "drx@linesclinics.com",
      homePhone: "",
      workPhone: "",
      gender: "Male",
      birthday: "",
      anniversary: "",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 9,
      employeeCode: "CENT-00165",
      firstName: "Abeer",
      lastName: "Saleh",
      mobileNo: "53 193 1991",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Abeer",
      email: "abeer.saleh@linesclinics.com",
      job: "Nurse",
      username: "abeer.saleh@linesclinics.com",
      homePhone: "53 193 1991",
      workPhone: "53 193 1991",
      gender: "Female",
      birthday: "01/01/1993",
      anniversary: "01/01/1993",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
    },
    {
      id: 10,
      employeeCode: "CENT-00139",
      firstName: "Maria",
      lastName: "Alshehri",
      mobileNo: "53 233 6104",
      primaryClinic: "Bright Clinics",
      middleName: "",
      nickname: "Maria",
      email: "maria.alshehri@linesclinics.com",
      job: "Nurse",
      username: "maria.alshehri@linesclinics.com",
      homePhone: "53 233 6104",
      workPhone: "53 233 6104",
      gender: "Female",
      birthday: "01/01/1986",
      anniversary: "01/01/1986",
      address1: "",
      address2: "",
      city: "",
      country: "Saudi Arabia",
      state: "Ar Riya-d",
      nationalityId: "",
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
      employee.primaryClinic.toLowerCase().includes(searchTerm.toLowerCase()),
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
    setShowEditForm(true)
  }

  const handleBackToList = () => {
    setShowEditForm(false)
    setSelectedEmployee(null)
  }

  const renderPagination = () => {
    const pages = []
    const maxVisiblePages = 9

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

  // If showing edit form, render the EmployeeEditForm component
  if (showEditForm && selectedEmployee) {
    return <EmployeeEditForm employee={selectedEmployee} onBack={handleBackToList} />
  }

  return (
    <div className="employee-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="#" className="breadcrumb-link">
          Employee
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Employee</span>
      </div>

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
              <th>Primary Clinic</th>
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
                <td>{employee.primaryClinic}</td>
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

export default EmployeeMaster
