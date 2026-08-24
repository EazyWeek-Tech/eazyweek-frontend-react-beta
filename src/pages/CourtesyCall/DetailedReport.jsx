import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Select, { components } from "react-select"
import "./DetailedReport.css"
import { API_BASE_URL } from "../../config"
import { usePermissions } from "../Settings/usePermissions";
import Toast from "../../components/Toast"

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCenterCode = () => (getUser().centerCode || "").trim();
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` });

/* ---- react-select theming ---- */
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    borderRadius: 8,
    fontFamily: "Lato, sans-serif",
    fontSize: 14,
    background: state.isDisabled ? "#f8fafc" : "#fff",
    borderColor: state.isFocused ? "#334B71" : "#e7ecf4",
    boxShadow: "none",
    flexWrap: "nowrap",
    "&:hover": { borderColor: "#334B71" },
  }),
  valueContainer: (base) => ({ ...base, flexWrap: "nowrap", overflow: "hidden" }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: 14 }),
  singleValue: (base) => ({ ...base, color: "#334B71" }),
  option: (base, state) => ({
    ...base,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "Lato, sans-serif",
    fontSize: 14,
    background: state.isFocused ? "#eef2f8" : "#fff",
    color: "#334B71",
    cursor: "pointer",
  }),
  menu: (base) => ({ ...base, zIndex: 30 }),
  indicatorSeparator: () => ({ display: "none" }),
}

const CheckboxOption = (props) => (
  <components.Option {...props}>
    <input
      type="checkbox"
      checked={props.isSelected}
      onChange={() => {}}
      style={{ accentColor: "#334B71", width: 15, height: 15, margin: 0, flex: "0 0 auto" }}
    />
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{props.label}</span>
  </components.Option>
)

const CountMultiValue = (props) => {
  if (props.index > 0) return null
  const count = props.getValue().length
  return (
    <div style={{
      maxWidth: "100%", padding: "2px 4px", fontSize: 14, color: "#334B71",
      fontFamily: "Lato, sans-serif",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    }}>
      {count} selected
    </div>
  )
}
const compactMulti = {
  closeMenuOnSelect: false,
  hideSelectedOptions: false,
  components: { MultiValue: CountMultiValue, Option: CheckboxOption },
  styles: selectStyles,
};

/* ---- helpers ---- */
const ymd = (d) => {
  const dt = d instanceof Date ? d : new Date(d)
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  const dd = String(dt.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}
const iso = (yyyy_mm_dd) => (yyyy_mm_dd ? new Date(yyyy_mm_dd).toISOString() : "")

const INVISIBLE_FROM_DEFAULT = "1999-01-01"
const INVISIBLE_TO_DEFAULT   = ymd(new Date())

const DetailedReport = () => {
  const perms = usePermissions() || {};
  const has = typeof perms.has === "function" ? perms.has : () => false;
  const permsPending =
    perms.loading === true || perms.isLoading === true ||
    perms.ready === false  || perms.loaded === false   ||
    perms.permissions === null;
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    centres: [],
    therapistDoctors: [],
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
  const [therapistOptions, setTherapistOptions] = useState([])
  const [centreOptions, setCentreOptions] = useState([])
  const [isEntity, setIsEntity] = useState(null)
  const [sessionCentreName, setSessionCentreName] = useState(getCenterCode())
  const [toast, setToast] = useState(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const toOptionList = (arr) => arr.map((v) => ({ value: v, label: v }))

  const selectedCentreCodes = useMemo(() => {
    if (isEntity === true) return (filters.centres || []).map((c) => c.value)
    const cc = getCenterCode()
    return cc ? [cc] : []
  }, [isEntity, filters.centres])

  /* ---- normalizers ---- */
  const toYesNoLabel = (v) => {
    const t = String(v ?? "").trim().toUpperCase()
    if (t === "1" || t === "YES" || t === "TRUE") return "Yes"
    if (t === "2" || t === "NO"  || t === "FALSE") return "No"
    return ""
  }

  const normalizeCourtesyStatus = (raw) => {
    if (!raw) return ""
    const t = String(raw).trim().toLowerCase()
    if (t.includes("pending")) return "Pending"
    if (t.includes("complete")) {
      if (t.startsWith("part")) return "Partially Completed"
      return "Completed"
    }
    return ""
  }

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

  /* ---- centre hierarchy ---- */
  useEffect(() => {
    const loadHierarchy = async () => {
      const session = getCenterCode()
      try {
        const res = await fetch(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        })
        const json = await res.json()
        const data = json?.data ?? json
        const seen = new Set()
        const opts = []
        ;(data?.zones || []).forEach((z) => (z?.clinics || []).forEach((c) => {
          if (!c || c.isEntity) return
          const code = String(c.code || "").trim()
          if (!code || seen.has(code)) return
          seen.add(code)
          opts.push({ value: code, label: String(c.name || code).trim() })
        }))
        setCentreOptions(opts)
        const entityCode = String(data?.entity?.code || "").trim()
        const entity = !session || (entityCode && session === entityCode)
        setIsEntity(entity)
        if (!entity) {
          const match = opts.find((o) => o.value === session)
          setSessionCentreName(match ? match.label : session)
        }
      } catch (err) {
        console.error("Failed to load centre hierarchy:", err)
        setCentreOptions([])
        setIsEntity(!session ? true : false)
        setSessionCentreName(session)
      }
    }
    loadHierarchy()
  }, [])

  /* ---- doctors with appointments ---- */
  useEffect(() => {
    if (isEntity === null) return
    const loadDoctors = async () => {
      try {
        const scope = selectedCentreCodes.join(",")
        const qs = scope ? `?centres=${encodeURIComponent(scope)}` : ""
        const res = await fetch(`${API_BASE_URL}/api/Courtesy/ReportDoctors${qs}`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        })
        const json = await res.json()
        const data = json?.data ?? json
        const list = Array.isArray(data) ? data : []
        const options = list
          .map((x) => {
            if (typeof x === "string") return { value: x, label: x }
            const name = x.name ?? x.doctorName ?? x.label ?? ""
            const value = x.value ?? name
            return value ? { value, label: name || value } : null
          })
          .filter(Boolean)
        setTherapistOptions(options)
      } catch (err) {
        console.error("Failed to load report doctors:", err)
        setTherapistOptions([])
      }
    }
    loadDoctors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEntity, selectedCentreCodes.join(",")])

  /* ---- view ---- */
  const handleView = async () => {
    if (!filters.fromDate || !filters.toDate) {
      setToast({ type: "error", message: "Please select both From Date and To Date." })
      return
    }
    if (new Date(filters.fromDate) > new Date(filters.toDate)) {
      setToast({ type: "error", message: "From Date cannot be after To Date." })
      return
    }
    try {
      const userFrom = filters.fromDate
      const userTo   = filters.toDate

      const effFrom = userFrom || INVISIBLE_FROM_DEFAULT
      const effTo   = userTo   || INVISIBLE_TO_DEFAULT

      const dateFlag = (userFrom || userTo) ? "1" : "0"

      const payload = {
        fromDate: iso(effFrom),
        todate:   iso(effTo),
        centres:                selectedCentreCodes.join(","),
        therapist:              (filters.therapistDoctors?.map(t => t.value) || []).join(","),
        experienceRating:       (filters.experienceRating?.map(r => r.value) || []).join(","),
        customerFeedback:       (filters.customerFeedback?.map(f => f.value) || []).join(","),
        overallSatisfied:       (filters.overallSatisfied?.map(o => o.value) || []).join(","),
        futureAppointmentTaken: (filters.futureAppTaken?.map(f => f.value) || []).join(","),
        customerType:           (filters.customerType?.map(c => c.value) || []).join(","),
        status:                 (filters.status?.map(s => s.value) || []).join(","),
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
        setPage(1)
        setShowResults(true)
      } else {
        setToast({ type: "error", message: "Unexpected response format." })
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
      setToast({ type: "error", message: "Failed to fetch report data." })
    }
  }

  /* ---- auditors ---- */
  useEffect(() => {
    if (isEntity === null) return
    const fetchAuditors = async () => {
      try {
        const scope = selectedCentreCodes.join(",")
        const qs = scope ? `?centres=${encodeURIComponent(scope)}` : ""
        const res = await fetch(`${API_BASE_URL}/api/Courtesy/LoadCourtesyAuditors${qs}`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        })
        const json = await res.json()
        const data = json?.data ?? json
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEntity, selectedCentreCodes.join(",")])

  /* ---- export ---- */
  const handleExport = () => {
    if (reportData.length === 0) {
      setToast({ type: "error", message: "No data to export." })
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

  /* ---- clear ---- */
  const handleClearFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      centres: [],
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
    setPage(1)
  }

  const handleReferenceClick = (referenceId) => {
    navigate(`/courtesy-call/details?referenceID=${referenceId}`)
  }

  /* ---- select options ---- */
  const statusOptions = [
    { value: "0", label: "Pending" },
    { value: "1", label: "Partially Completed" },
    { value: "2", label: "Completed" },
  ]
  const ratingOptions = toOptionList(["1", "2", "3", "4", "5"])
  // Mirrors the Customer Feedback select on CourtesyCallDetails.jsx - the
  // saved value lands in ComplaintDetails, which is what the report filters.
  const feedbackOptions = toOptionList([
    "Satisfied client",
    "Price Conscious",
    "Process related complaints",
    "Infrastructure",
    "Adverse reaction of service",
    "Waiting Time",
    "Not satisfied with employee",
    "Not satisfied with service experience",
  ])
  const futureAppOptions = toOptionList(["Yes", "No"])
  const satisfactionOptions = toOptionList(["Yes", "No"])
  const customerTypeOptions = toOptionList(["New", "Existing"])

  /* ---- pagination ---- */
  const totalPages = Math.max(1, Math.ceil(reportData.length / perPage))
  const pageStart  = (Math.min(page, totalPages) - 1) * perPage
  const pageRows   = reportData.slice(pageStart, pageStart + perPage)
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
    totalPages <= 5 ? i + 1
      : page <= 3 ? i + 1
      : page >= totalPages - 2 ? totalPages - 4 + i
      : page - 2 + i
  ))
  const pgBtn = (active, disabled) => ({
    border: "1px solid #e7ecf4", borderRadius: 6, padding: "6px 11px", fontSize: 13,
    fontFamily: "Lato,sans-serif", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1, fontWeight: active ? 700 : 400,
    background: active ? "#334B71" : "#fff", color: active ? "#fff" : "#334B71",
    borderColor: active ? "#334B71" : "#e7ecf4",
  })

  if (permsPending) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh",
      fontFamily:"Lato,sans-serif", fontSize:13, color:"#64748b" }}>
      Loading&hellip;
    </div>
  );

  if (!has("RPT.COURTESY_CALL_DETAILED")) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", fontFamily:"Lato,sans-serif", gap:12 }}>
      <div style={{ fontSize:18, fontWeight:800, color:"#b91c1c" }}>Access Denied</div>
      <div style={{ fontSize:13, color:"#64748b", textAlign:"center", maxWidth:420 }}>
        You do not have permission to view the Courtesy Call Detailed report.
      </div>
    </div>
  );

  return (
    <>
      <div className="detailed-report">
        <div className="breadcrumb">
          <span className="breadcrumb-link">Dashboard</span>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">Detailed Report</span>
        </div>

        {/* ===== HEADER ===== */}
        <div className="report-header">
          <h1 className="page-title">Courtesy Call - Detailed Report</h1>
        </div>

        {/* ===== FILTERS ===== */}
        <div className="filters-container">
          <div className="dtfltrwrp">
            <div className="filter-group">
              <label htmlFor="fromDate">From Date <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="date"
                id="fromDate"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="toDate">To Date <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="date"
                id="toDate"
                value={filters.toDate}
                onChange={(e) => handleFilterChange("toDate", e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="centres">Clinic Name :</label>
              {isEntity === true ? (
                <Select
                  isMulti
                  {...compactMulti}
                  id="centres"
                  className="filter-select"
                  options={centreOptions}
                  value={filters.centres}
                  onChange={(selected) => handleFilterChange("centres", selected || [])}
                  placeholder="All clinics"
                />
              ) : (
                <Select
                  id="centres"
                  className="filter-select"
                  styles={selectStyles}
                  options={[{ value: getCenterCode(), label: sessionCentreName || getCenterCode() }]}
                  value={{ value: getCenterCode(), label: sessionCentreName || getCenterCode() }}
                  onChange={() => {}}
                  isDisabled
                />
              )}
            </div>

            <div className="filter-group">
              <label htmlFor="therapistDoctors">Therapist/ Doctors :</label>
              <Select
                isMulti
                {...compactMulti}
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
                {...compactMulti}
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
                {...compactMulti}
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
                {...compactMulti}
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
                {...compactMulti}
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
                {...compactMulti}
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
                {...compactMulti}
                id="status"
                className="filter-select"
                options={statusOptions}
                value={filters.status}
                onChange={(selected) => handleFilterChange("status", selected || [])}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="auditor">Auditor :</label>
              <Select
                isMulti
                {...compactMulti}
                id="auditor"
                className="filter-select"
                options={auditorOptions.map((a) => ({
                  value: a.audtiorCode || a.auditorCode || a.code || "",
                  label: a.auditorName || a.name || (a.code ?? ""),
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
      </div>

      <div className="total-records">
        <span className="total-label">Total Records Found :</span>
        <span className="total-count">{totalRecords}</span>
      </div>

      {/* ===== RESULTS ===== */}
      {showResults && reportData.length > 0 && (
        <div className="report-results">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            flexWrap:"wrap", gap:8, padding:"10px 2px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#64748b", fontFamily:"Lato,sans-serif" }}>
              <span>Show</span>
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                style={{ border:"1px solid #e7ecf4", borderRadius:8, padding:"5px 10px", fontSize:13,
                  color:"#334B71", fontFamily:"Lato,sans-serif", background:"#fff", outline:"none" }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>
            <div style={{ fontSize:13, color:"#64748b", fontFamily:"Lato,sans-serif" }}>
              Showing {reportData.length > 0 ? pageStart + 1 : 0}–{Math.min(pageStart + perPage, reportData.length)} of {reportData.length}
            </div>
          </div>
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
                {pageRows.map((row, index) => (
                  <tr key={pageStart + index}>
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

          {totalPages > 1 && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              flexWrap:"wrap", gap:8, padding:"14px 2px 4px" }}>
              <div style={{ fontSize:13, color:"#64748b", fontFamily:"Lato,sans-serif" }}>
                Page {page} of {totalPages}
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <button style={pgBtn(false, page === 1)} disabled={page === 1} onClick={() => setPage(1)}>«</button>
                <button style={pgBtn(false, page === 1)} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                {pageNumbers.map((pg) => (
                  <button key={pg} style={pgBtn(page === pg, false)} onClick={() => setPage(pg)}>{pg}</button>
                ))}
                <button style={pgBtn(false, page === totalPages)} disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
                <button style={pgBtn(false, page === totalPages)} disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
            </div>
          )}
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

export default DetailedReport