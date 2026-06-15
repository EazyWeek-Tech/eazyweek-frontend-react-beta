import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Select from "react-select"
import "./DetailedReport.css"
import { API_BASE_URL } from "../../config"
import Toast from "../../components/Toast"

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCenterCode = () => (getUser().centerCode || "").trim();
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` });


// --- helpers ---
const ymd = (d) => {
  const dt = d instanceof Date ? d : new Date(d)
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  const dd = String(dt.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}
const iso = (yyyy_mm_dd) => (yyyy_mm_dd ? new Date(yyyy_mm_dd).toISOString() : "")

// Invisible defaults for the API (NOT shown in UI)
const INVISIBLE_FROM_DEFAULT = "1999-01-01"
const INVISIBLE_TO_DEFAULT   = ymd(new Date()) // today

const DetailedReport = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    fromDate: "",                  // UI stays empty unless user picks
    toDate: "",
    therapistDoctors: [],
    experienceRating: [],
    customerFeedback: [],
    overallSatisfied: [],
    futureAppTaken: [],
    customerType: [],
    status: [],                    // [{ value: "0"|"1"|"2", label }]
    auditor: [],                   // [{ value: "<code>", label: "<name>" }]
  })

  const [totalRecords, setTotalRecords] = useState(0)
  const [reportData, setReportData] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [auditorOptions, setAuditorOptions] = useState([])
  const [therapistOptions, setTherapistOptions] = useState([])
  const [toast, setToast] = useState(null)

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const toOptionList = (arr) => arr.map((v) => ({ value: v, label: v }))

  // ----- Normalizers for API → UI table -----
  const toYesNoLabel = (v) => {
    const t = String(v ?? "").trim().toUpperCase()
    if (t === "1" || t === "YES" || t === "TRUE") return "Yes"
    if (t === "2" || t === "NO"  || t === "FALSE") return "No"
    return ""
  }

  // Robustly map courtesyStatus (handles "Partialy Completed" typo)
  const normalizeCourtesyStatus = (raw) => {
    if (!raw) return ""
    const t = String(raw).trim().toLowerCase()
    if (t.includes("pending")) return "Pending"
    if (t.includes("complete")) {
      // "partially completed", "partialy completed", "completed"
      if (t.startsWith("part")) return "Partially Completed"
      return "Completed"
    }
    return ""
  }

  // Fallback when courtesyStatus is absent/unknown
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

  // Shape each API row for the table (prefer courtesyStatus)
  const normalizeRow = (x) => {
    const courtesy = normalizeCourtesyStatus(x.courtesyStatus)
    const finalStatus = courtesy || deriveStatus(x)

    return {
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
      status: finalStatus,
    }
  }
  // ------------------------------------------

  // Load Therapist/Doctors options from API using centerCode
  useEffect(() => {
    const centerCode = getCenterCode()
    if (!centerCode) return
    const loadPractitioners = async () => {
      try {
        const url = `${API_BASE_URL}/api/Master/LoadAllPractioner/${encodeURIComponent(centerCode)}`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } })
        const json = await res.json()
        const data = json?.data ?? json   // unwrap { success, data } envelope
        const list = Array.isArray(data) ? data : (data ? [data] : [])
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
      // User-entered (visible) values
      const userFrom = filters.fromDate
      const userTo   = filters.toDate

      // Effective values to SEND (invisible defaults when not selected)
      const effFrom = userFrom || INVISIBLE_FROM_DEFAULT
      const effTo   = userTo   || INVISIBLE_TO_DEFAULT

      // dateFlag indicates whether the user explicitly set any date filter
      const dateFlag = (userFrom || userTo) ? "1" : "0"

      const payload = {
        fromDate: iso(effFrom),
        todate:   iso(effTo),
        therapist:              (filters.therapistDoctors?.map(t => t.value) || []).join(","),
        experienceRating:       (filters.experienceRating?.map(r => r.value) || []).join(","),
        customerFeedback:       (filters.customerFeedback?.map(f => f.value) || []).join(","),
        overallSatisfied:       (filters.overallSatisfied?.map(o => o.value) || []).join(","),
        futureAppointmentTaken: (filters.futureAppTaken?.map(f => f.value) || []).join(","),
        customerType:           (filters.customerType?.map(c => c.value) || []).join(","),
        // numeric status codes 0/1/2
        status:                 (filters.status?.map(s => s.value) || []).join(","),
        // CODES ONLY for auditors (handles audtiorCode typo, auditorCode, or code)
        auditor:                (filters.auditor?.map(a => a.value) || []).join(","),
        dateFlag,
        isPendingStatus:
          (filters.status?.length === 1 && (filters.status[0].value || "") === "0") ? "1" : ""
      }

      const response = await fetch(`${API_BASE_URL}/api/Courtesy/CourtesyDetailReport`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      const json = await response.json()
      const data = json?.data ?? json

      if (Array.isArray(data)) {
        const normalized = data.map(normalizeRow)
        setReportData(normalized)
        setTotalRecords(normalized.length)
        setShowResults(true)
      } else {
        setToast({ type: "error", message: "Unexpected response format." })
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
      setToast({ type: "error", message: "Failed to fetch report data." })
    }
  }

  // Load auditors
  useEffect(() => {
    const fetchAuditors = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Courtesy/LoadCourtesyAuditors`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        })
        const json = await res.json()
        const data = json?.data ?? json   // unwrap { success, data } envelope
        if (Array.isArray(data)) {
          setAuditorOptions(data)
        } else {
          console.error("Unexpected auditor list response", json)
        }
      } catch (err) {
        console.error("Failed to load auditors", err)
      }
    }
    fetchAuditors()
  }, [])

  const handleExport = () => {
    if (reportData.length === 0) {
  if (reportData.length === 0) { setToast({ type: "error", message: "No data to export." }); return; }
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
      fromDate: "",   // UI stays empty
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
    navigate(`/courtesy-call/details?referenceID=${referenceId}`)
  }

  // Select options (status uses numeric codes)
  const statusOptions = [
    { value: "0", label: "Pending" },
    { value: "1", label: "Partially Completed" },
    { value: "2", label: "Completed" },
  ]
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
              value={filters.fromDate} // stays empty until user picks
              onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="toDate">To Date:</label>
            <input
              type="date"
              id="toDate"
              value={filters.toDate} // stays empty until user picks
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
              options={auditorOptions.map((a) => ({
                value: a.audtiorCode || a.auditorCode || a.code || "", // <-- pass CODE
                label: a.auditorName || a.name || (a.code ?? ""),      // <-- show NAME
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

export default DetailedReport