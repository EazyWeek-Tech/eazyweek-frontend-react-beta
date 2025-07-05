"use client"

import { useState } from "react"
import "./mastr.css"

const CustomerMaster = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Sample customer data based on your screenshot
  const customerData = [
    {
      code: "BRI40",
      firstName: "Dolce",
      lastName: "Nespresso",
      phoneNo: "89761123",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI41",
      firstName: "Chiaro",
      lastName: "Nespresso",
      phoneNo: "56789002",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI3",
      firstName: "Test",
      lastName: "01",
      phoneNo: "67788878",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI141",
      firstName: "Fay",
      lastName: "Alharbi",
      phoneNo: "555555555",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI142",
      firstName: "Sarah",
      lastName: "Alkharji",
      phoneNo: "500210047",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI143",
      firstName: "JAWAHER",
      lastName: "ALHARBI",
      phoneNo: "537401568",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI144",
      firstName: "NORAH",
      lastName: "ALBARJAS",
      phoneNo: "534297707",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI107",
      firstName: "Hanan",
      lastName: "Alasiri",
      phoneNo: "592124020",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI38",
      firstName: "Raheem",
      lastName: "Madoo",
      phoneNo: "9158157861",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
    {
      code: "BRI39",
      firstName: "Umair",
      lastName: "Madoo",
      phoneNo: "78985134",
      lastVisit: "",
      membership: "",
      categories: "",
      center: "Bright Clinics",
    },
  ]

  const itemsPerPage = 10
  const totalPages = Math.ceil(customerData.length / itemsPerPage)

  // Filter customers based on search term
  const filteredCustomers = customerData.filter(
    (customer) =>
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNo.includes(searchTerm),
  )

  // Get current page data
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage)

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
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

  return (
    <div className="customer-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Customer</span>
      </div>

      {/* Page Title */}
      <h1 className="page-title">Customer</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Customer Table */}
      <div className="table-container">
        <table className="customer-table msttable">
          <thead>
            <tr>
              <th>Code</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Phone No.</th>
              <th>Last Visit</th>
              <th>Membership</th>
              <th>Categories</th>
              <th>Center</th>
            </tr>
          </thead>
          <tbody>
            {currentCustomers.map((customer, index) => (
              <tr key={index} className="table-row">
                <td>
                  <a href="#" className="customer-code-link">
                    {customer.code}
                  </a>
                </td>
                <td>{customer.firstName}</td>
                <td>{customer.lastName}</td>
                <td>{customer.phoneNo}</td>
                <td>{customer.lastVisit}</td>
                <td>{customer.membership}</td>
                <td>{customer.categories}</td>
                <td>{customer.center}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-container">{renderPagination()}</div>
    </div>
  )
}

export default CustomerMaster
