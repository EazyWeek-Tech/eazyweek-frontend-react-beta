import { useState, useEffect, useMemo, useRef } from "react"
import { API_BASE_URL } from "../../config"
import { useNavigate } from "react-router-dom"
import Toast from "../../components/Toast"

const TOKEN      = () => localStorage.getItem("token") || sessionStorage.getItem("token") || ""
const getUser    = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}") } catch { return {} } }
const authHdr    = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` })

const pad2    = (n) => String(n).padStart(2, "0")
const todayYMD = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` }
/* ---- filter persistence ---- */
const STATE_KEY = "cc:dashFilters"
const DEFAULT_FILTERS = () => ({ status: "", auditor: "", customerType: "", fromDate: todayYMD(), toDate: todayYMD() })
const loadSavedState = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null")
    if (!s || typeof s !== "object" || !s.filters) return null
    return { ...s, filters: { ...DEFAULT_FILTERS(), ...s.filters } }
  } catch { return null }
}

/* ---- export access ---- */
const EXPORT_ROLES = ["admin", "administrator", "super admin", "superadmin", "product", "product team"]
const canExport = () => {
  const u = getUser()
  const claims = [u.roleName, u.role, u.roleCode, u.userType, u.designation]
  if (Array.isArray(u.roles)) claims.push(...u.roles.map(r => (r && (r.roleName || r.name)) || r))
  return claims.some(v => v && EXPORT_ROLES.includes(String(v).trim().toLowerCase()))
}

const STATUS_LABEL = { "0": "Pending", "1": "Partially Completed", "2": "Completed" }
const STATUS_STYLE = {
  "Pending":              { bg: "#FFF8E7", color: "#B45309", dot: "#F59E0B" },
  "Partially Completed":  { bg: "#EFF6FF", color: "#1D4ED8", dot: "#334B71" },
  "Completed":            { bg: "#F0FDF4", color: "#166534", dot: "#22C55E" },
}

/* ---- csv export ---- */
const EXPORT_COLUMNS = [
  ["Reference ID",     r => r.referenceID],
  ["Appointment Date", r => r.appointmentDate],
  ["Customer ID",      r => r.customerID],
  ["Customer Name",    r => r.customerName],
  ["Customer Type",    r => r.customerType || ""],
  ["Mobile",           r => r.mobileNo],
  ["Clinic",           r => r.clinicName],
  ["Status",           r => STATUS_LABEL[String(r.status)] || r.status || "Pending"],
  ["Auditor",          r => r.auditorName || "Unassigned"],
]
const csvCell = (v) => {
  const s = v == null ? "" : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const buildCsv = (rows) => [
  EXPORT_COLUMNS.map(c => csvCell(c[0])).join(","),
  ...rows.map(r => EXPORT_COLUMNS.map(c => csvCell(c[1](r))).join(",")),
].join("\r\n")
const downloadCsv = (csv, filename) => {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ---- period + donut helpers ---- */
const pad2b = (n) => String(n).padStart(2, "0")
const ymd   = (d) => `${d.getFullYear()}-${pad2b(d.getMonth()+1)}-${pad2b(d.getDate())}`
const monthStartYMD = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), 1)) }
const RANGES = ["Previous Date", "Current Date", "Current Week", "Current Month", "Custom Range"]
const periodBounds = (range) => {
  const today = new Date()
  if (range === "Previous Date") {
    const y = new Date(today); y.setDate(today.getDate() - 1)
    return { fromDate: ymd(y), toDate: ymd(y) }
  }
  const start = new Date(today)
  if (range === "Current Week")  start.setDate(today.getDate() - today.getDay())
  else if (range === "Current Month") start.setDate(1)
  else if (range === "Custom Range") return null
  return { fromDate: ymd(start), toDate: ymd(today) }
}

function PeriodFilter({ range, onPick }) {
  return (
    <div style={{ display:"flex", gap:3, background:"#eef2f7", border:"1px solid #e7ecf4", borderRadius:9, padding:3 }}>
      {RANGES.map((r) => {
        const a = range === r
        return (
          <button key={r} onClick={() => onPick(r)}
            style={{ border:"none", cursor:"pointer", fontFamily:"Lato,sans-serif", fontSize:12.5,
              fontWeight:a?800:600, padding:"6px 12px", borderRadius:7,
              background:a?"#fff":"transparent", color:a?"#334B71":"#64748b",
              boxShadow:a?"0 1px 3px rgba(20,30,45,.12)":"none" }}>
            {r}
          </button>
        )
      })}
    </div>
  )
}

function CCDonut({ segments, centerValue, size = 176, thickness = 26 }) {
  const total = segments.reduce((a, s) => a + (s.value || 0), 0)
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2, CIRC = 2 * Math.PI * r
  let off = 0
  return (
    <div style={{ display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex:"none" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f4" strokeWidth={thickness} />
        {total > 0 && segments.map((s, i) => {
          const len = (s.value / total) * CIRC
          const el = (<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />)
          off += len; return el
        })}
        <text x={cx} y={cy-2} textAnchor="middle" fontFamily="Lato,sans-serif" fontSize={30} fontWeight={800} fill="#2b3f73">{Math.round(centerValue != null ? centerValue : total).toLocaleString()}</text>
        <text x={cx} y={cy+18} textAnchor="middle" fontFamily="Lato,sans-serif" fontSize={12} fontWeight={600} fill="#64748b">calls</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:12, minWidth:170 }}>
        {segments.map((s, i) => {
          const pct = total ? Math.round((s.value / total) * 100) : 0
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:9, fontSize:13 }}>
              <span style={{ width:11, height:11, borderRadius:3, background:s.color, flex:"none" }} />
              <span style={{ fontWeight:700, color:"#334B71" }}>{s.label}</span>
              <span style={{ marginLeft:"auto", color:"#64748b" }}>{Math.round(s.value).toLocaleString()} · {pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CourtesyCallDashboard() {
  const [data,         setData]         = useState([])
  const [auditors,     setAuditors]     = useState([])
  const [loading,      setLoading]      = useState(false)

  const [hasLoaded,    setHasLoaded]    = useState(false)
  const [toast,        setToast]        = useState(null)
  const [saved]                        = useState(loadSavedState)
  const [filters,      setFilters]      = useState(saved?.filters ?? DEFAULT_FILTERS())
  const [range,        setRange]        = useState(saved?.range ?? "Current Date")
  const [search,       setSearchRaw]    = useState(saved?.search ?? "")
  const setSearch = (v) => { setSearchRaw(v); setPage(1) }
  const [page,         setPage]         = useState(saved?.page ?? 1)
  const [perPage,      setPerPage]      = useState(saved?.perPage ?? 10)
  const [draft,        setDraft]        = useState(saved?.filters ?? DEFAULT_FILTERS())
  const [serverTotal,  setServerTotal]  = useState(0)
  const [srvCounts,    setSrvCounts]    = useState(null)
  const navigate = useNavigate()
  const reqSeq = useRef(0)

  const fetchData = async (f) => {
    const seq = ++reqSeq.current
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/Courtesy/CourtesyViewList`, {
        method: "POST", headers: authHdr(),
        body: JSON.stringify({ status: f.status || "", auditor: f.auditor || "",
          customerType: f.customerType || "",
          fromDate: f.fromDate || "2020-01-01", toDate: f.toDate || todayYMD(), dateFlag: "1",
          page: f.page ?? 1, pageSize: f.pageSize ?? 10,
          searchTerm: f.searchTerm ?? "" }),
      })
      const json = await res.json()
      const body = json?.data ?? json
      const list = Array.isArray(body) ? body : (body?.data ?? [])
      const arr  = Array.isArray(list) ? list : []
      if (!Array.isArray(body)) {
        setServerTotal(body?.totalCount ?? arr.length)
        setSrvCounts(body?.statusCounts ?? null)
      } else {
        setServerTotal(arr.length)
        setSrvCounts(null)
      }
      const parseAppt = (s) => {
        if (!s) return 0
        const [d, m, y] = s.split("/")
        const t = new Date(`${y}-${m}-${d}`).getTime()
        return Number.isFinite(t) ? t : 0
      }
      const createdKey = (r) => {
        const t = r.createdDate ? new Date(r.createdDate).getTime() : 0
        return Number.isFinite(t) && t > 0 ? t : 0
      }
      arr.sort((a, b) =>
        (parseAppt(b.appointmentDate) - parseAppt(a.appointmentDate)) ||
        (createdKey(b) - createdKey(a)) ||
        String(b.referenceID || "").localeCompare(String(a.referenceID || ""), undefined, { numeric: true })
      )
      if (seq !== reqSeq.current) return
      setData(arr)
      setHasLoaded(true)
    } catch {
      if (seq === reqSeq.current) { setData([]); setHasLoaded(true) }
    }
    finally {
      if (seq === reqSeq.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Courtesy/LoadCourtesyAuditors`, { headers: { Authorization: `Bearer ${TOKEN()}` } })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (Array.isArray(d)) setAuditors(d) }).catch(() => {})
  }, [])

  const handleFilter = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  /* ---- initial + paged load ---- */
  useEffect(() => {
    const t = setTimeout(() => {
      fetchData({ ...filters, page, pageSize: perPage, searchTerm: search })
    }, search ? 350 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, search])

  /* ---- persist filters across navigation ---- */
  useEffect(() => {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify({ filters, range, search, page, perPage })) } catch {}
  }, [filters, range, search, page, perPage])

  const dateRangeInvalid = Boolean(
    draft.fromDate && draft.toDate && new Date(draft.toDate) < new Date(draft.fromDate)
  )

  const filtersDirty =
    draft.status       !== filters.status       ||
    draft.auditor      !== filters.auditor      ||
    draft.customerType !== filters.customerType ||
    draft.fromDate !== filters.fromDate ||
    draft.toDate   !== filters.toDate

  const applyFilters = () => {
    if (dateRangeInvalid) {
      setToast({ message: "To Date cannot be earlier than From Date.", type: "error" })
      return
    }
    setFilters(draft)
    setPage(1)
    fetchData({ ...draft, page: 1, pageSize: perPage, searchTerm: search })
  }

  const handleClear = () => {
    const reset = DEFAULT_FILTERS()
    setFilters(reset)
    setDraft(reset)
    setSearchRaw("")
    setPage(1)
    setRange("Current Date")
    fetchData({ ...reset, page: 1, pageSize: perPage, searchTerm: "" })
  }

  const handlePeriod = (r) => {
    setRange(r)
    const b = periodBounds(r)
    if (!b) return
    setDraft(prev => ({ ...prev, fromDate: b.fromDate, toDate: b.toDate }))
  }

  const filtered = data

  /* ---- completion bifurcation counts ---- */
  const counts = useMemo(() => {
    if (srvCounts) {
      let pending = 0, partial = 0, completed = 0
      Object.entries(srvCounts).forEach(([k, n]) => {
        const s = STATUS_LABEL[String(k)] || k
        if (s === "Pending") pending += n
        else if (s === "Partially Completed") partial += n
        else if (s === "Completed") completed += n
      })
      return { pending, partial, completed, total: pending + partial + completed }
    }
    let pending = 0, partial = 0, completed = 0
    data.forEach(r => {
      const s = STATUS_LABEL[String(r.status)] || r.status
      if (s === "Pending") pending++
      else if (s === "Partially Completed") partial++
      else if (s === "Completed") completed++
    })
    return { pending, partial, completed, total: pending + partial + completed }
  }, [data, srvCounts])

  const totalPages  = Math.max(1, Math.ceil(serverTotal / perPage))
  const start       = (page - 1) * perPage
  const pageData    = filtered

  const allowExport = useMemo(() => canExport(), [])

  /* ---- export ---- */
  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    if (!allowExport) { setToast({ message: "You do not have access to export courtesy calls.", type: "error" }); return }
    if (!serverTotal) { setToast({ message: "Nothing to export for the selected filters.", type: "error" }); return }
    setExporting(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/Courtesy/CourtesyViewList`, {
        method: "POST", headers: authHdr(),
        body: JSON.stringify({
          status: filters.status || "", auditor: filters.auditor || "",
          customerType: filters.customerType || "",
          fromDate: filters.fromDate || "2020-01-01", toDate: filters.toDate || todayYMD(),
          dateFlag: "1", searchTerm: search || "",
        }),
      })
      const json = await res.json()
      const body = json?.data ?? json
      const all  = Array.isArray(body) ? body : (body?.data ?? [])
      if (!all.length) { setToast({ message: "Nothing to export for the selected filters.", type: "error" }); return }
      const centre = (getUser().centerName || getUser().centerCode || "centre").replace(/[^\w-]+/g, "-")
      downloadCsv(buildCsv(all), `courtesy-calls_${centre}_${filters.fromDate}_to_${filters.toDate}.csv`)
      setToast({ message: `Exported ${all.length} record${all.length !== 1 ? "s" : ""}.`, type: "success" })
    } catch {
      setToast({ message: "Export failed. Please try again.", type: "error" })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ fontFamily:"Lato,sans-serif", minHeight:"100vh", padding:"0" }}>
      <style>{`
        .cc-card { background:#fff; border:1px solid #e7ecf4; border-radius:12px; }
        .cc-th { background:#f1f5f9; padding:11px 14px; font-size:11px; font-weight:800;
          color:#334B71; text-transform:uppercase; letter-spacing:.04em; border-bottom:2px solid #e7ecf4; text-align:left; white-space:nowrap; }
        .cc-td { padding:12px 14px; font-size:13px; color:#334B71; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .cc-tr:hover td { background:#f8fafc; }
        .cc-tr:last-child td { border-bottom:none; }
        .cc-ref { background:none; border:none; color:#334B71; font-weight:700; font-size:13px;
          cursor:pointer; padding:0; text-decoration:underline; text-underline-offset:2px; }
        .cc-ref:hover { color:#2b3f73; }
        .cc-inp { border:1px solid #e7ecf4; border-radius:8px; padding:8px 12px; font-size:13px;
          color:#334B71; outline:none; font-family:Lato,sans-serif; background:#fff; width:100%; box-sizing:border-box; }
        .cc-inp:focus { border-color:#334B71; box-shadow:0 0 0 3px rgba(51,75,113,.1); }
        .cc-btn { border:none; border-radius:8px; padding:9px 20px; font-size:13px;
          font-weight:700; cursor:pointer; font-family:Lato,sans-serif; }
        .cc-btn-pri { background:#334B71; color:#fff; }
        .cc-btn-pri:hover { background:#2b3f73; }
        .cc-btn-sec { background:#f1f5f9; color:#334B71; border:1px solid #e7ecf4; }
        .cc-btn-sec:hover { background:#e7ecf4; }
        .cc-pg { border:1px solid #e7ecf4; border-radius:6px; padding:6px 11px; font-size:13px;
          background:#fff; cursor:pointer; color:#334B71; font-family:Lato,sans-serif; }
        .cc-pg:hover:not(:disabled) { background:#f1f5f9; }
        .cc-pg:disabled { opacity:.4; cursor:not-allowed; }
        .cc-pg.active { background:#334B71; color:#fff; border-color:#334B71; font-weight:700; }
        .dot { width:7px; height:7px; border-radius:50%; display:inline-block; margin-right:6px; flex-shrink:0; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:12, color:"#94a3b8", marginBottom:4 }}>
          <a href="/dashboard" style={{ color:"#334B71", textDecoration:"none" }}>Dashboard</a>
          <span style={{ margin:"0 6px" }}>›</span>
          <span>Courtesy Call</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:"#2b3f73", margin:0 }}>Courtesy Call</h1>
            <div style={{ fontSize:13, color:"#64748b", marginTop:3 }}>
              {loading ? "Loading…" : hasLoaded ? `${serverTotal} record${serverTotal !== 1 ? "s" : ""}` : "Not loaded yet"}
            </div>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <PeriodFilter range={range} onPick={handlePeriod} />
            <span style={{ fontSize:12, color:"#94a3b8", alignSelf:"center" }}>{getUser().centerName || ""}</span>
          </div>
        </div>
      </div>

      {range === "Custom Range" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap", justifyContent:"flex-end" }}>
          <label style={{ fontSize:13, color:"#64748b", display:"flex", alignItems:"center", gap:6 }}>From
            <input className="cc-inp" style={{ width:"auto" }} type="date" value={draft.fromDate}
              onChange={e => handleFilter("fromDate", e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyFilters() }} />
          </label>
          <label style={{ fontSize:13, color:"#64748b", display:"flex", alignItems:"center", gap:6 }}>To
            <input className="cc-inp" style={{ width:"auto" }} type="date" value={draft.toDate} min={draft.fromDate || undefined}
              onChange={e => handleFilter("toDate", e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyFilters() }} />
          </label>
          <button className="cc-btn cc-btn-pri" onClick={applyFilters} disabled={loading || dateRangeInvalid}
            style={{ whiteSpace:"nowrap" }}>
            Apply
          </button>
          {dateRangeInvalid && (
            <span style={{ fontSize:12, color:"#cc6b5c", fontWeight:700 }}>To Date cannot be earlier than From Date.</span>
          )}
        </div>
      )}

      {/* Completion bifurcation — FRD §4.5 */}
      <div className="cc-card" style={{ padding:"20px 22px", marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#2b3f73" }}>Completion bifurcation</div>
        <div style={{ fontSize:11.5, color:"#64748b", marginTop:3, marginBottom:16 }}>Courtesy calls split by completion status</div>
        {counts.total > 0 ? (
          <CCDonut centerValue={counts.total} segments={[
            { label:"Completed",           value:counts.completed, color:"#22C55E" },
            { label:"Partially Completed", value:counts.partial,   color:"#334B71" },
            { label:"Pending",             value:counts.pending,   color:"#F59E0B" },
          ]} />
        ) : (
          <div style={{ minHeight:120, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:13 }}>
            {loading ? "Loading…" : "No courtesy calls in the selected period."}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="cc-card" style={{ padding:"18px 20px", marginBottom:16 }}>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"flex-end" }}>

          {/* Status */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:160 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Status</label>
            <select className="cc-inp" value={draft.status} onChange={e => handleFilter("status", e.target.value)}>
              <option value="">All Statuses</option>
              <option value="0">Pending</option>
              <option value="1">Partially Completed</option>
              <option value="2">Completed</option>
            </select>
          </div>

          {/* Auditor */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:180 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Auditor</label>
            <select className="cc-inp" value={draft.auditor} onChange={e => handleFilter("auditor", e.target.value)}>
              <option value="">All Auditors</option>
              {auditors.map(a => <option key={a.audtiorCode} value={a.audtiorCode}>{a.auditorName}</option>)}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* Customer Type */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:150 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Customer Type</label>
            <select className="cc-inp" value={draft.customerType} onChange={e => handleFilter("customerType", e.target.value)}>
              <option value="">All Types</option>
              <option value="New">New</option>
              <option value="Existing">Existing</option>
            </select>
          </div>

          {/* From Date */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:150 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>From Date</label>
            <input className="cc-inp" type="date" value={draft.fromDate}
              onChange={e => handleFilter("fromDate", e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyFilters() }} />
          </div>

          {/* To Date */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:150 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>To Date</label>
            <input className="cc-inp" type="date" value={draft.toDate} min={draft.fromDate || undefined}
              onChange={e => handleFilter("toDate", e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyFilters() }} />
          </div>

          {/* Search */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, flex:1, minWidth:200 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Search</label>
            <input className="cc-inp" placeholder="Name, ID, mobile…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>

          {/* Apply / Clear */}
          <div style={{ display:"flex", gap:10, alignSelf:"flex-end" }}>
            <button className="cc-btn cc-btn-pri" onClick={applyFilters} disabled={loading || dateRangeInvalid}
              style={{ whiteSpace:"nowrap" }}>
              {loading ? "Loading…" : "Filter"}
            </button>
            <button className="cc-btn cc-btn-sec" onClick={handleClear} disabled={loading}
              style={{ whiteSpace:"nowrap" }}>
              Clear
            </button>
          </div>
        </div>

        {(filtersDirty || dateRangeInvalid) && (
          <div style={{ marginTop:12, fontSize:12, fontWeight:700,
                        color: dateRangeInvalid ? "#cc6b5c" : "#b45309" }}>
            {dateRangeInvalid
              ? "To Date cannot be earlier than From Date."
              : "Filters changed — press Filter to load the results."}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="cc-card" style={{ overflow:"hidden" }}>
        {/* Table controls bar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"12px 16px", borderBottom:"1px solid #f1f5f9" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#64748b" }}>
            <span>Show</span>
            <select className="cc-inp" style={{ width:"auto", padding:"5px 10px" }}
              value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
              {[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>entries</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap", justifyContent:"flex-end" }}>
            <div style={{ fontSize:13, color:"#64748b" }}>
              {loading ? "Loading…" : `Showing ${serverTotal > 0 ? start+1 : 0}–${Math.min(start+perPage, serverTotal)} of ${serverTotal}`}
            </div>
            {allowExport && (
              <button className="cc-btn cc-btn-pri" onClick={handleExport} disabled={exporting}
                style={{ padding:"7px 16px", display:"inline-flex", alignItems:"center", gap:7, whiteSpace:"nowrap" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["Reference ID","Appointment Date","Customer ID","Customer Name","Customer Type","Mobile","Clinic","Status","Auditor"].map(h => (
                  <th key={h} className="cc-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding:"48px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>
                  Loading courtesy calls…
                </td></tr>
              ) : pageData.length === 0 ? (
                <tr><td colSpan={9} style={{ padding:"48px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>
                  No courtesy calls found.
                </td></tr>
              ) : pageData.map((item, i) => {
                const statusStr = STATUS_LABEL[String(item.status)] || item.status || "Pending"
                const ss = STATUS_STYLE[statusStr] || STATUS_STYLE["Pending"]
                return (
                  <tr key={i} className="cc-tr">
                    <td className="cc-td">
                      <button className="cc-ref" onClick={() => navigate(`/courtesy-call/details?referenceID=${item.referenceID}`, { state: { data: item } })}>
                        {item.referenceID}
                      </button>
                    </td>
                    <td className="cc-td" style={{ whiteSpace:"nowrap" }}>{item.appointmentDate || "—"}</td>
                    <td className="cc-td" style={{ fontWeight:600, color:"#2b3f73" }}>{item.customerID || "—"}</td>
                    <td className="cc-td">{item.customerName || "—"}</td>
                    <td className="cc-td">
                      {item.customerType ? (
                        <span style={{ display:"inline-flex", alignItems:"center",
                          background: item.customerType === "New" ? "#EEF3FB" : "#f1f5f9",
                          color:"#334B71", borderRadius:999, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                          {item.customerType}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="cc-td" style={{ whiteSpace:"nowrap" }}>{item.mobileNo || "—"}</td>
                    <td className="cc-td">{item.clinicName || "—"}</td>
                    <td className="cc-td">
                      <span style={{ display:"inline-flex", alignItems:"center", background:ss.bg,
                        color:ss.color, borderRadius:999, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                        <span className="dot" style={{ background:ss.dot }} />
                        {statusStr}
                      </span>
                    </td>
                    <td className="cc-td" style={{ color: item.auditorName ? "#334B71" : "#94a3b8" }}>
                      {item.auditorName || "Unassigned"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"14px 16px", borderTop:"1px solid #f1f5f9", flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:13, color:"#64748b" }}>
              Page {page} of {totalPages}
            </div>
            <div style={{ display:"flex", gap:4 }}>
              <button className="cc-pg" disabled={page===1} onClick={() => setPage(1)}>«</button>
              <button className="cc-pg" disabled={page===1} onClick={() => setPage(p => p-1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = totalPages <= 5 ? i+1
                  : page <= 3 ? i+1
                  : page >= totalPages-2 ? totalPages-4+i
                  : page-2+i
                return (
                  <button key={pg} className={`cc-pg${page===pg?" active":""}`} onClick={() => setPage(pg)}>{pg}</button>
                )
              })}
              <button className="cc-pg" disabled={page===totalPages} onClick={() => setPage(p => p+1)}>›</button>
              <button className="cc-pg" disabled={page===totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}