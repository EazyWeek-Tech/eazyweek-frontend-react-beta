"use client"

import { useState } from "react"
import "./CourtesyCallDashboard.css"

const CourtesyCallDashboard = () => {
  const [filters, setFilters] = useState({
    status: "",
    auditor: "",
    fromDate: "",
    toDate: "",
  })

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Sample data with more rows
  const courtesyCallData = [
    {
      referenceId: "CC-00152",
      appointmentDate: "04/07/2025",
      customerId: "BRI15",
      customerName: "Insiya Kharbe",
      mobileNo: "9763347642",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00153",
      appointmentDate: "05/07/2025",
      customerId: "BRI16",
      customerName: "Rahul Sharma",
      mobileNo: "9876543210",
      clinicName: "Bright Clinics",
      statusOfCall: "Completed",
      auditorName: "John Doe",
    },
    {
      referenceId: "CC-00154",
      appointmentDate: "06/07/2025",
      customerId: "BRI17",
      customerName: "Priya Patel",
      mobileNo: "9123456789",
      clinicName: "City Medical Center",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00155",
      appointmentDate: "07/07/2025",
      customerId: "BRI18",
      customerName: "Amit Kumar",
      mobileNo: "9988776655",
      clinicName: "Bright Clinics",
      statusOfCall: "Cancelled",
      auditorName: "Jane Smith",
    },
    {
      referenceId: "CC-00156",
      appointmentDate: "08/07/2025",
      customerId: "BRI19",
      customerName: "Sneha Reddy",
      mobileNo: "9445566778",
      clinicName: "Health Plus Clinic",
      statusOfCall: "Completed",
      auditorName: "Mike Johnson",
    },
    {
      referenceId: "CC-00157",
      appointmentDate: "09/07/2025",
      customerId: "BRI20",
      customerName: "Vikram Singh",
      mobileNo: "9334455667",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00158",
      appointmentDate: "10/07/2025",
      customerId: "BRI21",
      customerName: "Anita Desai",
      mobileNo: "9223344556",
      clinicName: "Metro Health Care",
      statusOfCall: "Completed",
      auditorName: "Sarah Wilson",
    },
    {
      referenceId: "CC-00159",
      appointmentDate: "11/07/2025",
      customerId: "BRI22",
      customerName: "Ravi Gupta",
      mobileNo: "9112233445",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00160",
      appointmentDate: "12/07/2025",
      customerId: "BRI23",
      customerName: "Kavya Nair",
      mobileNo: "9001122334",
      clinicName: "Wellness Center",
      statusOfCall: "Completed",
      auditorName: "David Brown",
    },
    {
      referenceId: "CC-00161",
      appointmentDate: "13/07/2025",
      customerId: "BRI24",
      customerName: "Suresh Yadav",
      mobileNo: "8990011223",
      clinicName: "Bright Clinics",
      statusOfCall: "Cancelled",
      auditorName: "Lisa Davis",
    },
    {
      referenceId: "CC-00152",
      appointmentDate: "04/07/2025",
      customerId: "BRI15",
      customerName: "Insiya Kharbe",
      mobileNo: "9763347642",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00153",
      appointmentDate: "05/07/2025",
      customerId: "BRI16",
      customerName: "Rahul Sharma",
      mobileNo: "9876543210",
      clinicName: "Bright Clinics",
      statusOfCall: "Completed",
      auditorName: "John Doe",
    },
    {
      referenceId: "CC-00154",
      appointmentDate: "06/07/2025",
      customerId: "BRI17",
      customerName: "Priya Patel",
      mobileNo: "9123456789",
      clinicName: "City Medical Center",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00155",
      appointmentDate: "07/07/2025",
      customerId: "BRI18",
      customerName: "Amit Kumar",
      mobileNo: "9988776655",
      clinicName: "Bright Clinics",
      statusOfCall: "Cancelled",
      auditorName: "Jane Smith",
    },
    {
      referenceId: "CC-00156",
      appointmentDate: "08/07/2025",
      customerId: "BRI19",
      customerName: "Sneha Reddy",
      mobileNo: "9445566778",
      clinicName: "Health Plus Clinic",
      statusOfCall: "Completed",
      auditorName: "Mike Johnson",
    },
    {
      referenceId: "CC-00157",
      appointmentDate: "09/07/2025",
      customerId: "BRI20",
      customerName: "Vikram Singh",
      mobileNo: "9334455667",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00158",
      appointmentDate: "10/07/2025",
      customerId: "BRI21",
      customerName: "Anita Desai",
      mobileNo: "9223344556",
      clinicName: "Metro Health Care",
      statusOfCall: "Completed",
      auditorName: "Sarah Wilson",
    },
    {
      referenceId: "CC-00159",
      appointmentDate: "11/07/2025",
      customerId: "BRI22",
      customerName: "Ravi Gupta",
      mobileNo: "9112233445",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00160",
      appointmentDate: "12/07/2025",
      customerId: "BRI23",
      customerName: "Kavya Nair",
      mobileNo: "9001122334",
      clinicName: "Wellness Center",
      statusOfCall: "Completed",
      auditorName: "David Brown",
    },
    {
      referenceId: "CC-00161",
      appointmentDate: "13/07/2025",
      customerId: "BRI24",
      customerName: "Suresh Yadav",
      mobileNo: "8990011223",
      clinicName: "Bright Clinics",
      statusOfCall: "Cancelled",
      auditorName: "Lisa Davis",
    },
    {
      referenceId: "CC-00152",
      appointmentDate: "04/07/2025",
      customerId: "BRI15",
      customerName: "Insiya Kharbe",
      mobileNo: "9763347642",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00153",
      appointmentDate: "05/07/2025",
      customerId: "BRI16",
      customerName: "Rahul Sharma",
      mobileNo: "9876543210",
      clinicName: "Bright Clinics",
      statusOfCall: "Completed",
      auditorName: "John Doe",
    },
    {
      referenceId: "CC-00154",
      appointmentDate: "06/07/2025",
      customerId: "BRI17",
      customerName: "Priya Patel",
      mobileNo: "9123456789",
      clinicName: "City Medical Center",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00155",
      appointmentDate: "07/07/2025",
      customerId: "BRI18",
      customerName: "Amit Kumar",
      mobileNo: "9988776655",
      clinicName: "Bright Clinics",
      statusOfCall: "Cancelled",
      auditorName: "Jane Smith",
    },
    {
      referenceId: "CC-00156",
      appointmentDate: "08/07/2025",
      customerId: "BRI19",
      customerName: "Sneha Reddy",
      mobileNo: "9445566778",
      clinicName: "Health Plus Clinic",
      statusOfCall: "Completed",
      auditorName: "Mike Johnson",
    },
    {
      referenceId: "CC-00157",
      appointmentDate: "09/07/2025",
      customerId: "BRI20",
      customerName: "Vikram Singh",
      mobileNo: "9334455667",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00158",
      appointmentDate: "10/07/2025",
      customerId: "BRI21",
      customerName: "Anita Desai",
      mobileNo: "9223344556",
      clinicName: "Metro Health Care",
      statusOfCall: "Completed",
      auditorName: "Sarah Wilson",
    },
    {
      referenceId: "CC-00159",
      appointmentDate: "11/07/2025",
      customerId: "BRI22",
      customerName: "Ravi Gupta",
      mobileNo: "9112233445",
      clinicName: "Bright Clinics",
      statusOfCall: "Pending",
      auditorName: "",
    },
    {
      referenceId: "CC-00160",
      appointmentDate: "12/07/2025",
      customerId: "BRI23",
      customerName: "Kavya Nair",
      mobileNo: "9001122334",
      clinicName: "Wellness Center",
      statusOfCall: "Completed",
      auditorName: "David Brown",
    },
    {
      referenceId: "CC-00161",
      appointmentDate: "13/07/2025",
      customerId: "BRI24",
      customerName: "Suresh Yadav",
      mobileNo: "8990011223",
      clinicName: "Bright Clinics",
      statusOfCall: "Cancelled",
      auditorName: "Lisa Davis",
    },
  ]

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleEntriesPerPageChange = (e) => {
    setEntriesPerPage(Number.parseInt(e.target.value))
    setCurrentPage(1)
  }

  const handleReferenceIdClick = (referenceId) => {
    // Handle reference ID click - you can navigate to detail page or open modal
    console.log("Clicked reference ID:", referenceId)
    // Example: navigate to detail page
    // router.push(`/courtesy-call/${referenceId}`)
  }

  const handleApplyFilters = () => {
    setCurrentPage(1) // Reset to first page when applying filters
  }

  const handleClearFilters = () => {
    setFilters({
      status: "",
      auditor: "",
      fromDate: "",
      toDate: "",
    })
    setCurrentPage(1)
  }

  // Convert date string to Date object for comparison
  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split("/")
    return new Date(year, month - 1, day)
  }

  // Apply filters to data
  const getFilteredData = () => {
    let filtered = courtesyCallData

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        Object.values(item).some((value) => value.toString().toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter((item) => item.statusOfCall.toLowerCase() === filters.status.toLowerCase())
    }

    // Apply auditor filter
    if (filters.auditor) {
      filtered = filtered.filter(
        (item) =>
          item.auditorName.toLowerCase().includes(filters.auditor.toLowerCase()) ||
          (filters.auditor === "unassigned" && item.auditorName === ""),
      )
    }

    // Apply date range filter
    if (filters.fromDate || filters.toDate) {
      filtered = filtered.filter((item) => {
        const appointmentDate = parseDate(item.appointmentDate)
        const fromDate = filters.fromDate ? new Date(filters.fromDate) : null
        const toDate = filters.toDate ? new Date(filters.toDate) : null

        if (fromDate && toDate) {
          return appointmentDate >= fromDate && appointmentDate <= toDate
        } else if (fromDate) {
          return appointmentDate >= fromDate
        } else if (toDate) {
          return appointmentDate <= toDate
        }
        return true
      })
    }

    return filtered
  }

  const filteredData = getFilteredData()
  const totalEntries = filteredData.length
  const startIndex = (currentPage - 1) * entriesPerPage
  const endIndex = Math.min(startIndex + entriesPerPage, totalEntries)
  const currentData = filteredData.slice(startIndex, endIndex)

  // Calculate total pages
  const totalPages = Math.ceil(totalEntries / entriesPerPage)

  return (
    <div className="courtesy-call-dashboard">
      {/* Header */}
      <div className="breadcrumb">
          <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">Courtesy Call</span>
        </div>
      <div className="dashboard-header">
        <h1 className="page-title">Tasks - COURTESY CALL</h1>
        
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="status">Status :</label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="auditor">Auditor :</label>
            <select
              id="auditor"
              value={filters.auditor}
              onChange={(e) => handleFilterChange("auditor", e.target.value)}
              className="filter-select"
            >
              <option value="">{"< - Select one - >"}</option>
              <option value="john doe">John Doe</option>
              <option value="jane smith">Jane Smith</option>
              <option value="mike johnson">Mike Johnson</option>
              <option value="sarah wilson">Sarah Wilson</option>
              <option value="david brown">David Brown</option>
              <option value="lisa davis">Lisa Davis</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="fromDate">From Date:</label>
            <input
              type="date"
              id="fromDate"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="toDate">To Date :</label>
            <input
              type="date"
              id="toDate"
              value={filters.toDate}
              onChange={(e) => handleFilterChange("toDate", e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-actions">
          {/* <button className="search-btn" onClick={handleApplyFilters}>
            Search
          </button> */}
          <button className="clear-btn" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table Controls */}
      <div className="table-controls">
        <div className="entries-control">
          <select value={entriesPerPage} onChange={handleEntriesPerPageChange} className="entries-select">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span> entries per page</span>
        </div>

        <div className="search-control">
          <label htmlFor="search">Search:</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
            placeholder="Search in table..."
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable">
                Reference ID
                <span className="sort-arrows">
                  <span className="sort-arrow">▲</span>
                  <span className="sort-arrow">▼</span>
                </span>
              </th>
              <th>Appointment Date</th>
              <th>Customer ID</th>
              <th>Customer Name</th>
              <th>Mobile No</th>
              <th>Clinic Name</th>
              <th>Status of Call</th>
              <th>Auditor Name</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr key={index}>
                  <td>
                    <button className="reference-id-link" onClick={() => handleReferenceIdClick(item.referenceId)}>
                      {item.referenceId}
                    </button>
                  </td>
                  <td>{item.appointmentDate}</td>
                  <td>{item.customerId}</td>
                  <td>{item.customerName}</td>
                  <td>{item.mobileNo}</td>
                  <td>{item.clinicName}</td>
                  <td>
                    <span className={`status-badge ${item.statusOfCall.toLowerCase()}`}>{item.statusOfCall}</span>
                  </td>
                  <td>{item.auditorName || "Unassigned"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">
                  No data available matching the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries}{" "}
          {totalEntries === 1 ? "entry" : "entries"}
          {(filters.status || filters.auditor || filters.fromDate || filters.toDate || searchTerm) && (
            <span className="filter-indicator"> (filtered)</span>
          )}
        </div>

        <div className="pagination-controls">
          <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            «
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            ‹
          </button>

          {/* Show page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = currentPage - 2 + i
            }

            return (
              <button
                key={pageNum}
                className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            )
          })}

          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            ›
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}

export default CourtesyCallDashboard
