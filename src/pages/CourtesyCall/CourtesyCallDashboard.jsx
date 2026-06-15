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

export default function CourtesyCallDashboard() {
  const [data,         setData]         = useState([])
  const [auditors,     setAuditors]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState(null)
  const [filters,      setFilters]      = useState({ status: "", auditor: "", fromDate: "2020-01-01", toDate: todayYMD() })
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
    const reset = { status: "", auditor: "", fromDate: "2020-01-01", toDate: todayYMD() }
    setFilters(reset)
    setSearch("")
    setPage(1)
    fetchData(reset)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(r =>
      [r.referenceID, r.customerID, r.customerName, r.mobileNo, r.clinicName, r.auditorName]
        .some(v => v?.toString().toLowerCase().includes(q))
    )
  }, [data, search])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPage))
  const start       = (page - 1) * perPage
  const pageData    = filtered.slice(start, start + perPage)

  return (
    <div style={{ fontFamily:"Lato,sans-serif", background:"#f7f9fc", minHeight:"100vh", padding:"28px 24px 60px" }}>
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
          <div style={{ display:"flex", gap:8 }}>
            <span style={{ fontSize:12, color:"#94a3b8", alignSelf:"center" }}>{getUser().centerName || ""}</span>
          </div>
        </div>
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