"use client"

import { useState, useEffect } from "react"
import "./CourtesyCallDashboard.css"
import { API_BASE_URL } from "../../config"
import { useNavigate } from "react-router-dom";

import Toast from "../../components/Toast"

const CourtesyCallDashboard = () => {
  const [courtesyCallData, setCourtesyCallData] = useState([])
  const [auditors, setAuditors] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null);
const navigate = useNavigate();


  const [filters, setFilters] = useState({
    status: "",
    auditor: "",
    fromDate: "",
    toDate: "",
  })

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchCourtesyData = async (filterValues) => {
    setLoading(true)
    try {
      const { status, auditor, fromDate, toDate } = filterValues
      const dateFlag = fromDate && toDate ? "1" : "0"

      const payload = {
        status: status || "0",
        auditor: auditor || "",
        fromDate: fromDate ? new Date(fromDate).toISOString() : new Date().toISOString(),
        toDate: toDate ? new Date(toDate).toISOString() : new Date().toISOString(),
        dateFlag,
      }
      console.log(payload)
      const res = await fetch(`${API_BASE_URL}/api/Courtesy/CourtesyViewList`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
if (Array.isArray(data)) {
  setCourtesyCallData(data)
} else {
  setCourtesyCallData([])
}

    } catch (error) {
      console.error("Failed to fetch courtesy call data:", error)
      setCourtesyCallData([])
    } finally {
      setLoading(false)
    }
  }

  // Load on first mount
  useEffect(() => {
    fetchCourtesyData(filters)
  }, [])

  // Load auditors on mount
  useEffect(() => {
    const loadAuditors = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Courtesy/LoadCourtesyAuditors`, {
          credentials: "include",
        })
        const data = await res.json()
        if (Array.isArray(data)) {
          setAuditors(data)
        }
      } catch (error) {
        console.error("Failed to load auditors", error)
      }
    }

    loadAuditors()
  }, [])

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }
const handleReferenceIdClick = (item) => {
  if (
    item.status?.toLowerCase() === "completed" ||
    item.status === "2"
  ) {
    setToast({ type: "info", message: "The call is already completed." });
  } else {
    navigate(`/courtesy-call/details?referenceID=${item.referenceID}`, {
      state: { data: item },
    });
  }
};

  const handleSearch = (e) => setSearchTerm(e.target.value)

  const handleEntriesPerPageChange = (e) => {
    setEntriesPerPage(Number.parseInt(e.target.value))
    setCurrentPage(1)
  }

  const handleApplyFilters = () => {
  const { status, auditor, fromDate, toDate } = filters;

  if (!status || !auditor || !fromDate || !toDate) {
    setToast({
      type: "info",
      message: "Please fill in all filter fields before searching.",
    });
    return;
  }

  setCurrentPage(1);
  fetchCourtesyData(filters);
};


  const handleClearFilters = () => {
    const cleared = {
      status: "",
      auditor: "",
      fromDate: "",
      toDate: "",
    }
    setFilters(cleared)
    setSearchTerm("")
    setCurrentPage(1)
    fetchCourtesyData(cleared)
  }

  const getFilteredData = () => {
    if (!searchTerm) return courtesyCallData
    return courtesyCallData.filter((item) =>
      Object.values(item).some((val) =>
        val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }

  const filteredData = getFilteredData()
  const totalEntries = filteredData.length
  const startIndex = (currentPage - 1) * entriesPerPage
  const endIndex = Math.min(startIndex + entriesPerPage, totalEntries)
  const currentData = filteredData.slice(startIndex, endIndex)
  const totalPages = Math.ceil(totalEntries / entriesPerPage)


  if (loading) return <div className="loader"></div>

  return (
     <>
    <div className="courtesy-call-dashboard">
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Courtesy Call</span>
      </div>

      <div className="dashboard-header">
        <h1 className="page-title">Tasks - COURTESY CALL</h1>
      </div>

      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>Status :</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="0">Pending</option>
                            <option value="1">Partialy Completed</option>

              <option value="2">Completed</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Auditor :</label>
            <select
              value={filters.auditor}
              onChange={(e) => handleFilterChange("auditor", e.target.value)}
              className="filter-select"
            >
              <option value="">{"< - Select one - >"}</option>
              {auditors.map((aud) => (
                <option key={aud.audtiorCode} value={aud.audtiorCode}>
                  {aud.auditorName}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <div className="filter-group">
            <label>From Date:</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>To Date :</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange("toDate", e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-actions">
          <button className="search-btn" onClick={handleApplyFilters}>Search</button>
          <button className="clear-btn" onClick={handleClearFilters}>Clear Filters</button>
        </div>
      </div>

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
          <label>Search:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
            placeholder="Search in table..."
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference ID</th>
              <th>Appointment Date</th>
              <th>Customer ID</th>
              <th>Customer Name</th>
              <th>Mobile No</th>
              <th>Clinic Name</th>
              <th>Status</th>
              <th>Auditor</th>
            </tr>
          </thead>
        <tbody>
  {courtesyCallData.length === 0 && !loading ? (
    <tr>
      <td colSpan="8" className="no-data">
        Please select status, auditor and date range to view search results.
      </td>
    </tr>
  ) : currentData.length > 0 ? (
    currentData.map((item, index) => (
      <tr key={index}>
        <td>
          <button className="reference-id-link" onClick={() => handleReferenceIdClick(item)}>
            {item.referenceID}
          </button>
        </td>
        <td>{item.appointmentDate}</td>
        <td>{item.customerID}</td>
        <td>{item.customerName}</td>
        <td>{item.mobileNo}</td>
        <td>{item.clinicName}</td>
        <td>
          <span className={`status-badge ${item.status?.toLowerCase().replace(/\s+/g, "-")}`}>
            {item.status}
          </span>
        </td>
        <td>{item.auditorName || "Unassigned"}</td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="8" className="no-data">No data available</td>
    </tr>
  )}
</tbody>

        </table>
      </div>

      <div className="pagination-container">
        <div className="pagination-info">
          Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} entries
        </div>

        <div className="pagination-controls">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
          <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>‹</button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum
            if (totalPages <= 5) pageNum = i + 1
            else if (currentPage <= 3) pageNum = i + 1
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
            else pageNum = currentPage - 2 + i

            return (
              <button key={pageNum} className={currentPage === pageNum ? "active" : ""} onClick={() => setCurrentPage(pageNum)}>
                {pageNum}
              </button>
            )
          })}

          <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>›</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
        </div>
      </div>
    </div>

  
   {toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => setToast(null)}
  />
)}

   </>
  )
}

export default CourtesyCallDashboard
