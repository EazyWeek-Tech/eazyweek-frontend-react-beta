import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => {
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const json = await res.json();
  return json.data ?? json;
};

const theme = {
  navy: "#334b71", darkBlue: "#18396E", coral: "#CC6B5C",
  aqua: "#A8D0CF", mist: "#E9EDF5", slate: "#8DA0B8",
  sand: "#F3DCB0", apricot: "#EDAF90", border: "#e7ecf4",
  text: "#10223f", red: "#a4210d", lgthgreen: "#85A2AA",
};

const TYPE_LABEL   = { simple: "Simple", mix: "Mix & Match", threshold: "Threshold" };
const ALL_TYPES    = ["simple", "mix", "threshold"];
const ALL_STATUSES = ["active", "draft", "expired", "inactive"];

const typeChipBg = (t) => (t === "simple" ? theme.coral : t === "mix" ? theme.sand : theme.aqua);
const statusBg   = (s) =>
  s === "active" ? theme.lgthgreen : s === "draft" ? theme.slate :
  s === "expired" ? theme.apricot  : s === "inactive" ? theme.red : theme.mist;
const statusFg = (s) => (s === "active" || s === "draft" || s === "inactive" ? "#fff" : "#333");

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
};

const discountDetail = (d) => {
  const name = d.discountName ? `${d.discountName} — ` : "";
  if (d.discountType === "simple") {
    const val = d.discountValue > 0
      ? (d.discountValueType === "Percentage" ? `${d.discountValue}% off` : `SAR ${d.discountValue} off`)
      : "";
    return `${name}${val}`.trim().replace(/^— /, "");
  }
  if (d.discountType === "threshold") {
    const trig = d.thresholdType === "Minimum Value"
      ? `Min SAR ${d.thresholdValue} spend`
      : d.thresholdType === "Minimum Quantity"
      ? `Min Qty ${d.thresholdValue}`
      : "";
    const rew  = d.discountValue > 0
      ? (d.discountValueType === "Percentage" ? `${d.discountValue}% off` : `SAR ${d.discountValue} off`)
      : "";
    return `${name}${trig}${trig && rew ? " → " : ""}${rew}`.trim().replace(/^— /, "");
  }
  if (d.discountType === "mix") return `${name}Mix & Match combination`.trim().replace(/^— /, "");
  return name.replace(/— $/, "");
};

export default function DiscountList() {
  const navigate = useNavigate();

  const [discounts,    setDiscounts]    = useState([]);
  const [stats,        setStats]        = useState({ total:0, active:0, draft:0, expired:0, inactive:0, simple:0, mix:0, threshold:0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  // Filters
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter,  setOwnerFilter]  = useState("all");
  const [query,        setQuery]        = useState("");
  const [groupBy,      setGroupBy]      = useState("type");

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [list, st] = await Promise.all([
        authGet(`${API_BASE_URL}/api/Discount/List`),
        authGet(`${API_BASE_URL}/api/Discount/Stats`),
      ]);
      setDiscounts(Array.isArray(list) ? list : []);
      setStats(st || {});
    } catch (e) {
      setError("Failed to load discounts. " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Stat card click — apply filter ─────────────────────────────────────────
  const handleStatCard = (label) => {
    // Reset all filters first (FRD rule 20)
    setTypeFilter("all"); setStatusFilter("all"); setOwnerFilter("all"); setQuery("");
    const statusMap = { Active:"active", Draft:"draft", Expired:"expired", Inactive:"inactive" };
    const typeMap   = { Simple:"simple", "Mix & Match":"mix", Threshold:"threshold" };
    if (statusMap[label]) setStatusFilter(statusMap[label]);
    else if (typeMap[label]) setTypeFilter(typeMap[label]);
    // "Total Discounts" — no filter (already reset above)
  };

  const statCards = [
    { label: "Total Discounts", value: stats.total,     bg: theme.darkBlue, fg: "#fff" },
    { label: "Active",          value: stats.active,    bg: theme.lgthgreen, fg: "#fff" },
    { label: "Draft",           value: stats.draft,     bg: theme.slate,     fg: "#fff" },
    { label: "Expired",         value: stats.expired,   bg: theme.apricot,   fg: theme.navy },
    { label: "Simple",          value: stats.simple,    bg: theme.coral,     fg: "#fff" },
    { label: "Mix & Match",     value: stats.mix,       bg: theme.sand,      fg: theme.navy },
    { label: "Threshold",       value: stats.threshold, bg: theme.aqua,      fg: theme.navy },
    { label: "Inactive",        value: stats.inactive,  bg: theme.red,       fg: "#fff" },
  ];

  const owners = useMemo(
    () => Array.from(new Set(discounts.map(d => d.owner).filter(Boolean))).sort(),
    [discounts]
  );

  // ── Client-side filter + search ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return discounts.filter(d => {
      const matchType   = typeFilter   === "all" || d.discountType === typeFilter;
      const matchStatus = statusFilter === "all" || d.status.toLowerCase() === statusFilter;
      const matchOwner  = ownerFilter  === "all" || d.owner === ownerFilter;
      const matchQuery  = q === "" ||
        (d.discountName || "").toLowerCase().includes(q) ||
        (d.discountId   || "").toLowerCase().includes(q) ||
        (d.owner        || "").toLowerCase().includes(q) ||
        discountDetail(d).toLowerCase().includes(q);
      return matchType && matchStatus && matchOwner && matchQuery;
    });
  }, [discounts, typeFilter, statusFilter, ownerFilter, query]);

  // ── Group ──────────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (groupBy === "none") return { Results: filtered };
    const out = {};
    if (groupBy === "type") {
      ALL_TYPES.forEach(t => {
        const arr = filtered.filter(d => d.discountType === t);
        if (arr.length) out[TYPE_LABEL[t]] = arr;
      });
    } else {
      ALL_STATUSES.forEach(s => {
        const arr = filtered.filter(d => d.status.toLowerCase() === s);
        if (arr.length) out[s[0].toUpperCase() + s.slice(1)] = arr;
      });
    }
    return Object.keys(out).length ? out : { Results: [] };
  }, [filtered, groupBy]);

  const handleEdit = (d) => {
    navigate(`/discounts/configure/${d.discountType}?edit=${d.discountId}`);
  };

  const handleReset = () => {
    setTypeFilter("all"); setStatusFilter("all"); setOwnerFilter("all");
    setQuery(""); setGroupBy("type");
  };

  return (
    <div className="dl-wrap">
      <style>{`
        .dl-wrap { font-family:"Lato",sans-serif; background:#f7f9fc; min-height:100vh; color:${theme.text}; }
        .dl-container { max-width:1200px; margin:0 auto; padding:28px 20px 60px; }
        .dl-topbar { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
        .dl-back { display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; border:1px solid ${theme.border}; background:#fff; color:${theme.navy}; font-weight:700; cursor:pointer; }
        .dl-title { font-size:34px; font-weight:700; color:${theme.darkBlue}; margin:4px 0 2px; }
        .dl-sub { color:#5b6a85; margin:10px 0 0; }

        .dl-stats { display:grid; grid-template-columns:repeat(8,minmax(110px,1fr)); gap:12px; margin:18px 0; }
        .dl-card { border-radius:12px; padding:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:86px; box-shadow:0 2px 10px rgba(13,27,62,.05); cursor:pointer; transition:transform .15s,box-shadow .15s; }
        .dl-card:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(13,27,62,.12); }
        .dl-card .val { font-size:28px; font-weight:700; line-height:28px; }
        .dl-card .lab { margin-top:6px; font-weight:700; font-size:12px; opacity:.95; text-align:center; }

        .dl-toolbar { background:#fff; border:1px solid ${theme.border}; border-radius:12px; padding:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px; }
        .select { border:1px solid ${theme.border}; background:#fff; color:${theme.navy}; border-radius:10px; height:40px; padding:0 12px; font-weight:700; font-size:13px; }
        .seg { display:flex; gap:4px; background:${theme.mist}; padding:5px; border-radius:12px; border:1px solid ${theme.border}; }
        .seg-btn { background:#fff; border:1px solid ${theme.border}; padding:6px 10px; border-radius:8px; font-weight:700; color:${theme.navy}; cursor:pointer; font-size:12px; }
        .seg-btn.active { background:${theme.navy}; color:#fff; border-color:${theme.navy}; }
        .spacer { flex:1; }
        .search { display:flex; align-items:center; gap:8px; border:1px solid ${theme.border}; background:#fff; border-radius:10px; padding:0 12px; height:40px; min-width:260px; }
        .search input { border:0; outline:0; width:100%; font-size:13px; }
        .primary { background:${theme.darkBlue}; color:#fff; border:0; height:40px; padding:0 16px; border-radius:10px; font-weight:700; cursor:pointer; font-size:13px; }
        .ghost { background:#fff; border:1px solid ${theme.border}; height:40px; padding:0 14px; border-radius:10px; font-weight:700; color:${theme.navy}; cursor:pointer; font-size:13px; }

        .section { background:#fff; border:1px solid ${theme.border}; border-radius:12px; margin-top:14px; overflow:hidden; }
        .section h4 { margin:0; padding:12px 16px; border-bottom:1px solid ${theme.border}; color:${theme.darkBlue}; font-size:15px; font-weight:700; display:flex; align-items:center; gap:10px; }
        .grid { padding:12px; display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .dcard { border:1px solid ${theme.border}; border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:8px; background:#fff; transition:box-shadow .15s; }
        .dcard:hover { box-shadow:0 4px 14px rgba(13,27,62,.08); }
        .row { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
        .badge { display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px; font-weight:700; font-size:11px; white-space:nowrap; }
        .muted { color:#7a879f; font-size:12px; }
        .disc-name { font-weight:700; font-size:14px; color:${theme.darkBlue}; }
        .disc-id { font-size:11px; color:#94a3b8; margin-top:2px; }
        .btn-link { background:#fff; border:1px solid ${theme.border}; padding:7px 14px; border-radius:8px; font-weight:700; color:${theme.navy}; cursor:pointer; font-size:12px; }
        .btn-link:hover { background:${theme.mist}; }
        .empty-state { text-align:center; padding:50px 20px; color:#94a3b8; }
        .empty-state .icon { font-size:40px; margin-bottom:12px; }
        .refresh-btn { background:none; border:none; color:${theme.navy}; cursor:pointer; font-size:13px; font-weight:700; padding:0; }

        @media (max-width:1100px) { .dl-stats { grid-template-columns:repeat(4,1fr); } .grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:700px)  { .dl-stats { grid-template-columns:repeat(2,1fr); } .grid { grid-template-columns:1fr; } .search { min-width:unset; flex:1; } }
      `}</style>

      <div className="dl-container">
        {/* Back */}
        <div className="dl-topbar">
          <button className="dl-back" onClick={() => navigate("/discounts/configure/simple")}>
            ← Back to Setup
          </button>
          <button className="refresh-btn" onClick={loadData}>↺ Refresh</button>
        </div>

        {/* Title */}
        <div className="dl-title">Discount Management</div>
        <div className="dl-sub">View and manage all your discount configurations</div>

        {/* Stat cards */}
        <div className="dl-stats">
          {statCards.map(c => (
            <div key={c.label} className="dl-card"
              style={{ background: c.bg, color: c.fg }}
              onClick={() => handleStatCard(c.label)}
              title={`Filter by ${c.label}`}>
              <div className="val">{loading ? "—" : (c.value ?? 0)}</div>
              <div className="lab">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding:"12px 16px", background:"#fdf3f3", border:"1px solid #f0c4c0", borderRadius:10, color:"#b91c1c", fontSize:13, marginBottom:12 }}>
            ⚠ {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="dl-toolbar">
          <span style={{ fontWeight:700, fontSize:13 }}>Filter By:</span>

          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>

          <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Type: All</option>
            <option value="simple">Simple</option>
            <option value="mix">Mix & Match</option>
            <option value="threshold">Threshold</option>
          </select>

          <select className="select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
            <option value="all">Owner: All</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <div className="seg">
            {[["none","None"],["type","Type"],["status","Status"]].map(([v,l]) => (
              <button key={v} className={`seg-btn ${groupBy===v?"active":""}`} onClick={() => setGroupBy(v)}>
                {l}
              </button>
            ))}
          </div>

          <div className="spacer" />

          <div className="search">
            <span>🔍</span>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, ID, owner…" />
          </div>

          <button className="ghost" onClick={handleReset}>Reset</button>
          <button className="primary" onClick={() => navigate("/discounts/configure/simple")}>
            + Create New
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="section" style={{ textAlign:"center", padding:40, color:"#64748b" }}>
            Loading discounts…
          </div>
        ) : Object.values(grouped).every(arr => arr.length === 0) ? (
          <div className="section">
            <div className="empty-state">
              <div className="icon">️</div>
              <div style={{ fontWeight:700, fontSize:15, color:"#334b71", marginBottom:6 }}>No discounts found</div>
              <div style={{ fontSize:13 }}>
                {query || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters or search."
                  : "Create your first discount to get started."}
              </div>
            </div>
          </div>
        ) : (
          Object.entries(grouped).map(([groupName, arr]) => (
            <div key={groupName} className="section">
              <h4>
                {groupName}
                <span className="muted">({arr.length})</span>
              </h4>
              <div className="grid">
                {arr.map(d => (
                  <div key={d.discountId} className="dcard">
                    <div className="row">
                      <div>
                        <div className="disc-name">{d.discountName}</div>
                        <div className="disc-id">{d.discountId}</div>
                      </div>
                      <span className="badge"
                        style={{ background: statusBg(d.status.toLowerCase()), color: statusFg(d.status.toLowerCase()) }}>
                        {d.status}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize:12, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                      <span className="badge"
                        style={{ background: typeChipBg(d.discountType), color: "#fff", fontSize:10, padding:"3px 8px" }}>
                        {TYPE_LABEL[d.discountType] || d.discountType}
                      </span>
                      <span>·</span>
                      <span>{discountDetail(d)}</span>
                      <span>·</span>
                      <span>{fmtDate(d.startDate)} – {fmtDate(d.endDate)}</span>
                      {d.owner && <><span>·</span><span>{d.owner}</span></>}
                    </div>
                    <div className="row" style={{ marginTop:4 }}>
                      <button className="btn-link" onClick={() => handleEdit(d)}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}