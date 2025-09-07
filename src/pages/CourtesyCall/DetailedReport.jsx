"use client"

import { useState, useEffect } from "react"
import Select from "react-select"
import "./DetailedReport.css"
import { API_BASE_URL } from "../../config"

const DetailedReport = () => {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    therapistDoctors: [],       // values will be practitioner IDs from API
    experienceRating: [],
    customerFeedback: [],
    overallSatisfied: [],
    futureAppTaken: [],
    customerType: [],
    status: [],
    auditor: [],
  })

  const [totalRecords, setTotalRecords] = useState(0)
  const [reportData, setReportData] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [auditorOptions, setAuditorOptions] = useState([])

  // options for Therapist/Doctors from API
  const [therapistOptions, setTherapistOptions] = useState([])

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const toOptionList = (arr) => arr.map((v) => ({ value: v, label: v }))

  // ----- Normalizers for API → UI table -----
  // Normalize mixed "YES"/"NO"/"1"/"2"/true/false → "Yes" | "No" | ""
  const toYesNoLabel = (v) => {
    const t = String(v ?? "").trim().toUpperCase()
    if (t === "1" || t === "YES" || t === "TRUE") return "Yes"
    if (t === "2" || t === "NO" || t === "FALSE") return "No"
    return ""
  }

  // Compute a human status from after-call fields (fallback if API doesn't send a string)
  const deriveStatus = (row) => {
    const fields = [
      row.googleReview,
      row.receivedPostCareCmmunication,
      row.receivedInvoice,
      row.overallSatisfied,
      row.experienceRating,
      row.customerComplaintRemarks,
      row.agentdecision,
    ].map(x => String(x ?? "").trim())

    const total = fields.length
    const filled = fields.filter(x => x && x !== "0").length

    if (filled === 0) return "Pending"
    if (filled === total) return "Completed"
    return "Partially Completed"
  }

  // Turn the API item into the shape your table expects
  const normalizeRow = (x) => ({
    referenceId: x.referenceId || x.referenceID || "",
    apptDate: x.apptDate || x.appointmentDate || "",
    custName: x.custName || x.customerName || "",
    expRating: x.expRating || x.experienceRating || "",
    customerType: x.customerType || "",
    clinic: x.clinic || x.clinicName || "",
    therapistDoctors: x.therapistDoctors || x.therapist || x.doctorName || "",
    futureAppTaken: toYesNoLabel(x.futureAppointmentTaken),
    overallSatisfied: toYesNoLabel(x.overallSatisfied),
    customerFeedback: x.customerFeedback || x.customerComplaintRemarks || "",
    auditor: x.auditor || x.auditorName || "",
    status: typeof x.status === "string" ? x.status : deriveStatus(x),
  })
  // ------------------------------------------

  // Helper: pull centerCode from session/local storage
  const getCenterCode = () => {
    const tryStores = [sessionStorage, localStorage]
    for (const store of tryStores) {
      const raw = store.getItem("user")
      if (!raw) continue
      try {
        const u = JSON.parse(raw)
        // try common shapes
        const code =
          u?.centerCode ||
          u?.center?.code ||
          u?.center?.centerCode ||
          u?.branchCode ||
          u?.centerId ||
          u?.centerID ||
          ""
        if (code && String(code).trim()) return String(code).trim()
      } catch {
        /* ignore parse errors */
      }
    }
    return ""
  }

  // Load Therapist/Doctors options from API using centerCode
  useEffect(() => {
    const centerCode = getCenterCode()
    if (!centerCode) {
      console.warn("centerCode not found in session/local storage; therapist list will be empty.")
      return
    }

    const loadPractitioners = async () => {
      try {
        const url = `${API_BASE_URL}/api/Master/LoadAllPractioner/${encodeURIComponent(centerCode)}`
        const res = await fetch(url, { credentials: "include" })
        const data = await res.json()

        // Accept both array and single-object responses
        const list = Array.isArray(data) ? data : (data ? [data] : [])

        // Map to react-select {value,label}. Use id as value, name as label.
        const options = list
          .filter(x => x && (x.id || x.name))
          .map(x => ({ value: x.id ?? x.code ?? x.name, label: x.name ?? x.id }))
        setTherapistOptions(options)
      } catch (err) {
        console.error("Failed to load practitioners:", err)
        setTherapistOptions([])
      }
    }

    loadPractitioners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleView = async () => {
    try {
      // strings only (API expects strings, not null)
      const hasDates = Boolean(filters.fromDate && filters.toDate)
      const payload = {
        fromDate: hasDates ? new Date(filters.fromDate).toISOString() : "",
        todate:   hasDates ? new Date(filters.toDate).toISOString()   : "",
        therapist:              (filters.therapistDoctors?.map(t => t.value) || []).join(","), // IDs or names per your Select 'value'
        experienceRating:       (filters.experienceRating?.map(r => r.value) || []).join(","),
        customerFeedback:       (filters.customerFeedback?.map(f => f.value) || []).join(","),
        overallSatisfied:       (filters.overallSatisfied?.map(o => o.value) || []).join(","),
        futureAppointmentTaken: (filters.futureAppTaken?.map(f => f.value) || []).join(","),
        customerType:           (filters.customerType?.map(c => c.value) || []).join(","),
        status:                 (filters.status?.map(s => s.value) || []).join(","),
        auditor:                (filters.auditor?.map(a => a.value) || []).join(","),
        dateFlag: hasDates ? "1" : "0",
        // If ONLY "Pending" is selected (and no other statuses), flag it; otherwise empty.
        isPendingStatus:
          (filters.status?.length === 1 && (filters.status[0].value || "").toLowerCase() === "pending")
            ? "1"
            : ""
      }

      console.log("Request Payload:", payload)

      const response = await fetch(`${API_BASE_URL}/api/Courtesy/CourtesyDetailReport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      console.log("API Response:", data)

      if (Array.isArray(data)) {
        const normalized = data.map(normalizeRow)
        setReportData(normalized)
        setTotalRecords(normalized.length)
        setShowResults(true)
      } else {
        alert("Unexpected response format.")
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
      alert("Failed to fetch report data.")
    }
  }

  useEffect(() => {
    const fetchAuditors = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Courtesy/LoadCourtesyAuditors`, {
          method: "GET",
          credentials: "include",
        })
        const data = await res.json()
        if (Array.isArray(data)) {
          setAuditorOptions(data)
        } else {
          console.error("Unexpected auditor list response", data)
        }
      } catch (err) {
        console.error("Failed to load auditors", err)
      }
    }
    fetchAuditors()
  }, [])

  const handleExport = () => {
    if (reportData.length === 0) {
      alert("No data to export. Please generate a report first.")
      return
    }
    const headers = [
      "Reference ID",
      "Appt Date",
      "Cust Name",
      "Exp Rating",
      "CustomerType",
      "Clinic",
      "Therapist/ Doctors",
      "Future App Taken",
      "Overall Satisfied",
      "Customer Feedback",
      "Auditor",
      "STATUS"
    ]
    const csvContent = [
      headers.join(","),
      ...reportData.map((row) => [
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
      ].join(",")),
    ].join("\n")
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
      therapistDoctors: [],
      experienceRating: [],
      customerFeedback: [],
      overallSatisfied: [],
      futureAppTaken: [],
      customerType: [],
      status: [],
      auditor: [],
    })
    setTotalRecords(0)
    setReportData([])
    setShowResults(false)
  }

  const handleReferenceClick = (referenceId) => {
    console.log("Clicked reference ID:", referenceId)
  }

  const statusOptions = toOptionList(["Pending", "Partially Completed", "Completed"])
  const ratingOptions = toOptionList(["1", "2", "3", "4", "5"])
  const feedbackOptions = toOptionList(["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"])
  const futureAppOptions = toOptionList(["Yes", "No"])
  const satisfactionOptions = toOptionList(["Yes", "No"])
  const customerTypeOptions = toOptionList(["New", "Existing"])

  return (
    <>
      <div className="detailed-report">
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">Detailed Report</span>
        </div>

        {/* Header */}
        <div className="report-header">
          <h1 className="page-title">Courtesy Call - Detailed Report</h1>
        </div>

        <div className="dtfltrwrp">
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
            <Select
              isMulti
              id="therapistDoctors"
              className="filter-select"
              options={therapistOptions}
              value={filters.therapistDoctors}
              onChange={(selected) => handleFilterChange("therapistDoctors", selected || [])}
              placeholder="Select therapist(s)…"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="experienceRating">Experience Rating :</label>
            <Select
              isMulti
              id="experienceRating"
              className="filter-select"
              options={ratingOptions}
              value={filters.experienceRating}
              onChange={(selected) => handleFilterChange("experienceRating", selected || [])}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="customerFeedback">Customer Feedback :</label>
            <Select
              isMulti
              id="customerFeedback"
              className="filter-select"
              options={feedbackOptions}
              value={filters.customerFeedback}
              onChange={(selected) => handleFilterChange("customerFeedback", selected || [])}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="overallSatisfied">Overall Satisfied :</label>
            <Select
              isMulti
              id="overallSatisfied"
              className="filter-select"
              options={satisfactionOptions}
              value={filters.overallSatisfied}
              onChange={(selected) => handleFilterChange("overallSatisfied", selected || [])}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="futureAppTaken">Future App Taken :</label>
            <Select
              isMulti
              id="futureAppTaken"
              className="filter-select"
              options={futureAppOptions}
              value={filters.futureAppTaken}
              onChange={(selected) => handleFilterChange("futureAppTaken", selected || [])}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="customerType">Customer Type :</label>
            <Select
              isMulti
              id="customerType"
              className="filter-select"
              options={customerTypeOptions}
              value={filters.customerType}
              onChange={(selected) => handleFilterChange("customerType", selected || [])}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="status">Status :</label>
            <Select
              isMulti
              id="status"
              className="filter-select"
              options={statusOptions}
              value={filters.status}
              onChange={(selected) => handleFilterChange("status", selected || [])}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="auditor">Auditor</label>
            <Select
              isMulti
              id="auditor"
              className="filter-select"
              options={auditorOptions.map((auditor) => ({
                value: auditor.audtiorCode,
                label: auditor.auditorName,
              }))}
              value={filters.auditor}
              onChange={(selected) => handleFilterChange("auditor", selected || [])}
            />
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
      </div>

      <div className="total-records">
        <span className="total-label">Total Records Found :</span>
        <span className="total-count">{totalRecords}</span>
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
                      <span className={`status-badge ${String(row.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

export default DetailedReport
