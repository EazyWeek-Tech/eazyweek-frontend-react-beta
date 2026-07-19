import { useState, useEffect, useMemo } from "react"
import { API_BASE_URL } from "../../config"
import { useNavigate } from "react-router-dom"
import Toast from "../../components/Toast"

const TOKEN      = () => localStorage.getItem("token") || sessionStorage.getItem("token") || ""
const getUser    = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}") } catch { return {} } }
const authHdr    = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` })

const pad2    = (n) => String(n).padStart(2, "0")
const todayYMD = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` }

const STATUS_LABEL = { "0": "Pending", "1": "Partially Completed", "2": "Completed" }
const STATUS_STYLE = {
  "Pending":              { bg: "#FFF8E7", color: "#B45309", dot: "#F59E0B" },
  "Partially Completed":  { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  "Completed":            { bg: "#F0FDF4", color: "#166534", dot: "#22C55E" },
}

/* ── §4.5 helpers (inline; no external CSS) ────────────────────────────────── */
const pad2b = (n) => String(n).padStart(2, "0")
const ymd   = (d) => `${d.getFullYear()}-${pad2b(d.getMonth()+1)}-${pad2b(d.getDate())}`
const monthStartYMD = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), 1)) }
const RANGES = ["Current Date", "Current Week", "Current Month", "Custom Range"]
const periodBounds = (range) => {
  const today = new Date(); const start = new Date(today)
  if (range === "Current Week")  start.setDate(today.getDate() - today.getDay())
  else if (range === "Current Month") start.setDate(1)
  else if (range === "Custom Range") return null // user sets From/To in the filters card
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
        <text x={cx} y={cy-2} textAnchor="middle" fontFamily="Lato,sans-serif" fontSize={30} fontWeight={800} fill="#071D49">{Math.round(centerValue != null ? centerValue : total).toLocaleString()}</text>
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
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState(null)
  const [filters,      setFilters]      = useState({ status: "", auditor: "", fromDate: monthStartYMD(), toDate: todayYMD() })
  const [range,        setRange]        = useState("Current Month")
  const [search,       setSearch]       = useState("")
  const [page,         setPage]         = useState(1)
  const [perPage,      setPerPage]      = useState(10)
  const navigate = useNavigate()

  const fetchData = async (f) => {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/Courtesy/CourtesyViewList`, {
        method: "POST", headers: authHdr(),
        body: JSON.stringify({ status: f.status || "", auditor: f.auditor || "",
          fromDate: f.fromDate || "2020-01-01", toDate: f.toDate || todayYMD(), dateFlag: "1" }),
      })
      const json = await res.json()
      const list = json?.data ?? json
      const arr  = Array.isArray(list) ? list : []
      // Sort by creation time descending — whichever courtesy call was created
      // last appears first. Falls back to appointmentDate (DD/MM/YYYY) if a row
      // has no createdDate.
      const parseAppt = (s) => {
        if (!s) return 0
        const [d, m, y] = s.split("/")
        return new Date(`${y}-${m}-${d}`).getTime()
      }
      const sortKey = (r) => {
        const t = r.createdDate ? new Date(r.createdDate).getTime() : 0
        return Number.isFinite(t) && t > 0 ? t : parseAppt(r.appointmentDate)
      }
      arr.sort((a, b) => sortKey(b) - sortKey(a))
      setData(arr)
    } catch { setData([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData(filters) }, [])

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Courtesy/LoadCourtesyAuditors`, { headers: { Authorization: `Bearer ${TOKEN()}` } })
      .then(r => r.json()).then(j => { const d = j?.data ?? j; if (Array.isArray(d)) setAuditors(d) }).catch(() => {})
  }, [])

  // Auto-filter on any filter change
  const handleFilter = (field, value) => {
    const next = { ...filters, [field]: value }
    setFilters(next)
    setPage(1)
    fetchData(next)
  }

  const handleClear = () => {
    const reset = { status: "", auditor: "", fromDate: monthStartYMD(), toDate: todayYMD() }
    setFilters(reset)
    setSearch("")
    setPage(1)
    setRange("Current Month")
    fetchData(reset)
  }

  // Period filter drives the existing fromDate/toDate (and refetch)
  const handlePeriod = (r) => {
    setRange(r)
    const b = periodBounds(r)
    if (!b) return // Custom Range → user edits From/To in the filters card below
    const next = { ...filters, fromDate: b.fromDate, toDate: b.toDate }
    setFilters(next); setPage(1); fetchData(next)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(r =>
      [r.referenceID, r.customerID, r.customerName, r.mobileNo, r.clinicName, r.auditorName]
        .some(v => v?.toString().toLowerCase().includes(q))
    )
  }, [data, search])

  // Completion bifurcation counts (FRD §4.5) — from the loaded, period-scoped list
  const counts = useMemo(() => {
    let pending = 0, partial = 0, completed = 0
    data.forEach(r => {
      const s = STATUS_LABEL[String(r.status)] || r.status
      if (s === "Pending") pending++
      else if (s === "Partially Completed") partial++
      else if (s === "Completed") completed++
    })
    return { pending, partial, completed, total: pending + partial + completed }
  }, [data])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPage))
  const start       = (page - 1) * perPage
  const pageData    = filtered.slice(start, start + perPage)

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
        .cc-ref:hover { color:#071D49; }
        .cc-inp { border:1px solid #e7ecf4; border-radius:8px; padding:8px 12px; font-size:13px;
          color:#334B71; outline:none; font-family:Lato,sans-serif; background:#fff; width:100%; box-sizing:border-box; }
        .cc-inp:focus { border-color:#334B71; box-shadow:0 0 0 3px rgba(51,75,113,.1); }
        .cc-btn { border:none; border-radius:8px; padding:9px 20px; font-size:13px;
          font-weight:700; cursor:pointer; font-family:Lato,sans-serif; }
        .cc-btn-pri { background:#334B71; color:#fff; }
        .cc-btn-pri:hover { background:#071D49; }
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
            <h1 style={{ fontSize:22, fontWeight:800, color:"#071D49", margin:0 }}>Courtesy Call</h1>
            <div style={{ fontSize:13, color:"#64748b", marginTop:3 }}>
              {loading ? "Loading…" : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
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
            <input className="cc-inp" style={{ width:"auto" }} type="date" value={filters.fromDate}
              onChange={e => handleFilter("fromDate", e.target.value)} />
          </label>
          <label style={{ fontSize:13, color:"#64748b", display:"flex", alignItems:"center", gap:6 }}>To
            <input className="cc-inp" style={{ width:"auto" }} type="date" value={filters.toDate} min={filters.fromDate || undefined}
              onChange={e => handleFilter("toDate", e.target.value)} />
          </label>
          {filters.fromDate && filters.toDate && new Date(filters.toDate) < new Date(filters.fromDate) && (
            <span style={{ fontSize:12, color:"#cc6b5c", fontWeight:700 }}>To Date cannot be earlier than From Date.</span>
          )}
        </div>
      )}

      {/* Completion bifurcation — FRD §4.5 */}
      <div className="cc-card" style={{ padding:"20px 22px", marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#071D49" }}>Completion bifurcation</div>
        <div style={{ fontSize:11.5, color:"#64748b", marginTop:3, marginBottom:16 }}>Courtesy calls split by completion status</div>
        {counts.total > 0 ? (
          <CCDonut centerValue={counts.total} segments={[
            { label:"Completed",           value:counts.completed, color:"#22C55E" },
            { label:"Partially Completed", value:counts.partial,   color:"#3B82F6" },
            { label:"Pending",             value:counts.pending,   color:"#F59E0B" },
          ]} />
        ) : (
          <div style={{ minHeight:120, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:13 }}>
            No courtesy calls in the selected period.
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="cc-card" style={{ padding:"18px 20px", marginBottom:16 }}>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"flex-end" }}>

          {/* Status */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:160 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Status</label>
            <select className="cc-inp" value={filters.status} onChange={e => handleFilter("status", e.target.value)}>
              <option value="">All Statuses</option>
              <option value="0">Pending</option>
              <option value="1">Partially Completed</option>
              <option value="2">Completed</option>
            </select>
          </div>

          {/* Auditor */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:180 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Auditor</label>
            <select className="cc-inp" value={filters.auditor} onChange={e => handleFilter("auditor", e.target.value)}>
              <option value="">All Auditors</option>
              {auditors.map(a => <option key={a.audtiorCode} value={a.audtiorCode}>{a.auditorName}</option>)}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* From Date */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:150 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>From Date</label>
            <input className="cc-inp" type="date" value={filters.fromDate} onChange={e => handleFilter("fromDate", e.target.value)} />
          </div>

          {/* To Date */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:150 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>To Date</label>
            <input className="cc-inp" type="date" value={filters.toDate} onChange={e => handleFilter("toDate", e.target.value)} />
          </div>

          {/* Search */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, flex:1, minWidth:200 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".04em" }}>Search</label>
            <input className="cc-inp" placeholder="Name, ID, mobile…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>

          {/* Clear */}
          <button className="cc-btn cc-btn-sec" onClick={handleClear} style={{ whiteSpace:"nowrap", alignSelf:"flex-end" }}>
            Clear
          </button>
        </div>
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
          <div style={{ fontSize:13, color:"#64748b" }}>
            {loading ? "Loading…" : `Showing ${filtered.length > 0 ? start+1 : 0}–${Math.min(start+perPage, filtered.length)} of ${filtered.length}`}
          </div>
        </div>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["Reference ID","Appointment Date","Customer ID","Customer Name","Mobile","Clinic","Status","Auditor"].map(h => (
                  <th key={h} className="cc-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding:"48px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>
                  Loading courtesy calls…
                </td></tr>
              ) : pageData.length === 0 ? (
                <tr><td colSpan={8} style={{ padding:"48px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>
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
                    <td className="cc-td" style={{ fontWeight:600, color:"#071D49" }}>{item.customerID || "—"}</td>
                    <td className="cc-td">{item.customerName || "—"}</td>
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