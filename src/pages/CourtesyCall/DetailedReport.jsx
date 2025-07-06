"use client"

import { useState } from "react"
import "./DetailedReport.css"

const DetailedReport = () => {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    therapistDoctors: "",
    experienceRating: "",
    customerFeedback: "",
    overallSatisfied: "",
    futureAppTaken: "",
    customerType: "",
    status: "",
    auditor: "",
  })

  const [totalRecords, setTotalRecords] = useState(0)
  const [reportData, setReportData] = useState([])
  const [showResults, setShowResults] = useState(false)

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleView = () => {
    // Mock data matching the screenshot
    const mockData = [
      {
        referenceId: "CC-00148",
        apptDate: "01/07/2025",
        custName: "Neha Kharbe",
        expRating: "3",
        customerType: "Existing",
        clinic: "Bright Clinics",
        therapistDoctors: "Dr X .",
        futureAppTaken: "YES",
        overallSatisfied: "YES",
        customerFeedback: "Satisfied client",
        auditor: "Insiya Kharbe",
        status: "Completed",
      },
      {
        referenceId: "CC-00151",
        apptDate: "02/07/2025",
        custName: "Sarah Alotaibi",
        expRating: "2",
        customerType: "Existing",
        clinic: "Bright Clinics",
        therapistDoctors: "Mona Mohamed Ahmed Mohamed Aly",
        futureAppTaken: "YES",
        overallSatisfied: "YES",
        customerFeedback: "Satisfied client",
        auditor: "Insiya Kharbe",
        status: "Completed",
      },
      {
        referenceId: "CC-00145",
        apptDate: "01/07/2025",
        custName: "Insiya Kharbe",
        expRating: "",
        customerType: "Existing",
        clinic: "Bright Clinics",
        therapistDoctors: "Aaliya Mukhtar Ahmad",
        futureAppTaken: "",
        overallSatisfied: "",
        customerFeedback: "",
        auditor: "",
        status: "Pending",
      },
      {
        referenceId: "CC-00146",
        apptDate: "01/07/2025",
        custName: "Alina B",
        expRating: "",
        customerType: "Existing",
        clinic: "Bright Clinics",
        therapistDoctors: "Reham Hamed Abdelrhim Eisa",
        futureAppTaken: "",
        overallSatisfied: "",
        customerFeedback: "",
        auditor: "",
        status: "Pending",
      },
      {
        referenceId: "CC-00147",
        apptDate: "01/07/2025",
        custName: "Sarah Alotaibi",
        expRating: "",
        customerType: "Existing",
        clinic: "Bright Clinics",
        therapistDoctors: "Hassnaa Samir Abdelaziz Abosena",
        futureAppTaken: "",
        overallSatisfied: "",
        customerFeedback: "",
        auditor: "",
        status: "Pending",
      },
      {
        referenceId: "CC-00149",
        apptDate: "02/07/2025",
        custName: "Alina B",
        expRating: "",
        customerType: "Existing",
        clinic: "Bright Clinics",
        therapistDoctors: "Aaliya Mukhtar Ahmad",
        futureAppTaken: "",
        overallSatisfied: "",
        customerFeedback: "",
        auditor: "",
        status: "Pending",
      },
      {
        referenceId: "CC-00150",
        apptDate: "02/07/2025",
        custName: "Insiya Kharbe",
        expRating: "",
        customerType: "Existing",
        clinic: "Bright Clinics",
        therapistDoctors: "Hassnaa Samir Abdelaziz Abosena",
        futureAppTaken: "",
        overallSatisfied: "",
        customerFeedback: "",
        auditor: "",
        status: "Pending",
      },
      {
        referenceId: "CC-00152",
        apptDate: "04/07/2025",
        custName: "Insiya Kharbe",
        expRating: "",
        customerType: "Existing",
        clinic: "Bright Clinics",
        therapistDoctors: "Aaliya Mukhtar Ahmad",
        futureAppTaken: "",
        overallSatisfied: "",
        customerFeedback: "",
        auditor: "",
        status: "Pending",
      },
    ]

    setReportData(mockData)
    setTotalRecords(mockData.length)
    setShowResults(true)
  }

  const handleExport = () => {
    if (reportData.length === 0) {
      alert("No data to export. Please generate a report first.")
      return
    }

    // Create CSV content
    const headers = [
      "Reference ID",
      "Appt Date",
      "Cust Name",
      "Exp Rating",
      "CustomerType",
      "Clinic",
      "Therapist/Doctors",
      "Future App Taken",
      "Overall Satisfied",
      "Customer Feedback",
      "Auditor",
      "STATUS",
    ]

    const csvContent = [
      headers.join(","),
      ...reportData.map((row) =>
        [
          row.referenceId,
          row.apptDate,
          row.custName,
          row.expRating,
          row.customerType,
          row.clinic,
          `"${row.therapistDoctors}"`,
          row.futureAppTaken,
          row.overallSatisfied,
          row.customerFeedback,
          row.auditor,
          row.status,
        ].join(","),
      ),
    ].join("\n")

    // Download CSV file
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "courtesy_call_detailed_report.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleClearFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      therapistDoctors: "",
      experienceRating: "",
      customerFeedback: "",
      overallSatisfied: "",
      futureAppTaken: "",
      customerType: "",
      status: "",
      auditor: "",
    })
    setTotalRecords(0)
    setReportData([])
    setShowResults(false)
  }

  const handleReferenceClick = (referenceId) => {
    console.log("Clicked reference ID:", referenceId)
    // Add navigation logic here
  }

  return (
    <div className="detailed-report">
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">Detailed Report</span>
        </div>
      {/* Header */}
      <div className="report-header">
        <h1 className="page-title">Detailed Report</h1>
        
      </div>

      {/* Filters Section */}
      <div className="filters-container">
        {/* Row 1 */}
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="fromDate">From Date</label>
            <input
              type="date"
              id="fromDate"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="toDate">To Date:</label>
            <input
              type="date"
              id="toDate"
              value={filters.toDate}
              onChange={(e) => handleFilterChange("toDate", e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="therapistDoctors">Therapist/ Doctors :</label>
            <select
              id="therapistDoctors"
              value={filters.therapistDoctors}
              onChange={(e) => handleFilterChange("therapistDoctors", e.target.value)}
              className="filter-select"
            >
              <option value="">None selected</option>
              <option value="dr-smith">Dr. Smith</option>
              <option value="dr-johnson">Dr. Johnson</option>
              <option value="dr-williams">Dr. Williams</option>
              <option value="dr-brown">Dr. Brown</option>
              <option value="dr-davis">Dr. Davis</option>
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="experienceRating">Experience Rating :</label>
            <select
              id="experienceRating"
              value={filters.experienceRating}
              onChange={(e) => handleFilterChange("experienceRating", e.target.value)}
              className="filter-select"
            >
              <option value="">None selected</option>
              <option value="excellent">Excellent</option>
              <option value="very-good">Very Good</option>
              <option value="good">Good</option>
              <option value="average">Average</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="customerFeedback">Customer Feedback :</label>
            <select
              id="customerFeedback"
              value={filters.customerFeedback}
              onChange={(e) => handleFilterChange("customerFeedback", e.target.value)}
              className="filter-select"
            >
              <option value="">None selected</option>
              <option value="very-satisfied">Very Satisfied</option>
              <option value="satisfied">Satisfied</option>
              <option value="neutral">Neutral</option>
              <option value="dissatisfied">Dissatisfied</option>
              <option value="very-dissatisfied">Very Dissatisfied</option>
            </select>
          </div>
        </div>

        {/* Row 3 */}
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="overallSatisfied">Overall Satisfied</label>
            <select
              id="overallSatisfied"
              value={filters.overallSatisfied}
              onChange={(e) => handleFilterChange("overallSatisfied", e.target.value)}
              className="filter-select"
            >
              <option value="">None selected</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="partially">Partially</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="futureAppTaken">Future App Taken :</label>
            <select
              id="futureAppTaken"
              value={filters.futureAppTaken}
              onChange={(e) => handleFilterChange("futureAppTaken", e.target.value)}
              className="filter-select"
            >
              <option value="">None selected</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="maybe">Maybe</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="customerType">Customer Type :</label>
            <select
              id="customerType"
              value={filters.customerType}
              onChange={(e) => handleFilterChange("customerType", e.target.value)}
              className="filter-select"
            >
              <option value="">None selected</option>
              <option value="new">New</option>
              <option value="regular">Regular</option>
              <option value="vip">VIP</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>

        {/* Row 4 */}
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="filter-select"
            >
              <option value="">None selected</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="auditor">Auditor</label>
            <select
              id="auditor"
              value={filters.auditor}
              onChange={(e) => handleFilterChange("auditor", e.target.value)}
              className="filter-select"
            >
              <option value="">None selected</option>
              <option value="john-doe">John Doe</option>
              <option value="jane-smith">Jane Smith</option>
              <option value="mike-johnson">Mike Johnson</option>
              <option value="sarah-wilson">Sarah Wilson</option>
              <option value="david-brown">David Brown</option>
              <option value="lisa-davis">Lisa Davis</option>
            </select>
          </div>

          <div className="filter-actions">
            <button className="view-btn" onClick={handleView}>
              View
            </button>
            <button className="export-btn" onClick={handleExport}>
              Export
            </button>
            <button className="clear-btn" onClick={handleClearFilters}>
              Clear
            </button>
          </div>
        </div>

        {/* Total Records */}
        <div className="total-records">
          <span className="total-label">Total Records Found :</span>
          <span className="total-count">{totalRecords}</span>
        </div>
      </div>

      {/* Report Results */}
      {showResults && reportData.length > 0 && (
        <div className="report-results">
          <div className="table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Reference ID</th>
                  <th>Appt Date</th>
                  <th>Cust Name</th>
                  <th>Exp Rating</th>
                  <th>CustomerType</th>
                  <th>Clinic</th>
                  <th>Therapist/ Doctors</th>
                  <th>Future App Taken</th>
                  <th>Overall Satisfied</th>
                  <th>Customer Feedback</th>
                  <th>Auditor</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <button className="reference-link" onClick={() => handleReferenceClick(row.referenceId)}>
                        {row.referenceId}
                      </button>
                    </td>
                    <td>{row.apptDate}</td>
                    <td>{row.custName}</td>
                    <td>{row.expRating}</td>
                    <td>{row.customerType}</td>
                    <td>{row.clinic}</td>
                    <td>{row.therapistDoctors}</td>
                    <td>{row.futureAppTaken}</td>
                    <td>{row.overallSatisfied}</td>
                    <td>{row.customerFeedback}</td>
                    <td>{row.auditor}</td>
                    <td>
                      <span className={`status-badge ${row.status.toLowerCase()}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailedReport
