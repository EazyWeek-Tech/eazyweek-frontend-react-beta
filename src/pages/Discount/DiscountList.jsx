import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const theme = {
  navy: "#334b71",
  darkBlue: "#18396E",
  coral: "#CC6B5C",
  aqua: "#A8D0CF",
  mist: "#E9EDF5",
  slate: "#8DA0B8",
  sand: "#F3DCB0",
  apricot: "#EDAF90",
  border: "#e7ecf4",
  text: "#10223f",
  red: "#a4210d",
  lgthgreen: "#85A2AA",
};

const TYPE_LABEL = { simple: "Simple", mix: "Mix & Match", threshold: "Threshold" };
const ALL_TYPES = ["simple", "mix", "threshold"];
const ALL_STATUSES = ["active", "draft", "expired", "inactive"];

const typeChipBg = (t) => (t === "simple" ? theme.coral : t === "mix" ? theme.sand : theme.aqua);
const statusBg = (s) =>
  s === "active" ? theme.lgthgreen :
  s === "draft" ? theme.slate :
  s === "expired" ? theme.apricot :
  s === "inactive" ? theme.red : theme.mist;
const statusFg = (s) => (s === "active" || s === "draft" ? "#fff" : "#eee");

// ---- Sample skin-treatment discounts (replace with API later) ----
const SAMPLE_DISCOUNTS = [
  // SIMPLE
  { id: "D001", name: "HydraFacial Glow Pack (3 Sessions)", type: "simple", status: "active",   owner: "Marketing",    startDate: "2025-02-01", endDate: "2025-03-31", details: "15% off package price" },
  { id: "D002", name: "Chemical Peel – Brightening Series (4)", type: "simple", status: "draft", owner: "Derm Team",    startDate: "2025-03-01", endDate: "2025-05-31", details: "SAR 300 off" },
  { id: "D003", name: "Laser Hair Reduction – Full Face (6)",   type: "simple", status: "active", owner: "Laser Clinic", startDate: "2025-02-01", endDate: "2025-07-31", details: "Flat SAR 500 off package" },

  // MIX & MATCH
  { id: "D101", name: "Microneedling + PRP Combo",               type: "mix", status: "active",   owner: "Aesthetic Dept", startDate: "2025-01-15", endDate: "2025-04-15", details: "Buy Microneedling, get 20% off PRP" },
  { id: "D102", name: "Laser Toning + Medi-Facial Duo",          type: "mix", status: "inactive", owner: "Marketing",       startDate: "2024-12-01", endDate: "2025-01-15", details: "Bundle save SAR 250" },

  // THRESHOLD
  { id: "D201", name: "Skincare Spend ≥ SAR 1500",               type: "threshold", status: "expired", owner: "Retail",    startDate: "2024-11-01", endDate: "2024-12-31", details: "10% off qualifying items" },
  { id: "D202", name: "Acne Control Bundle (any 3 treatments)",  type: "threshold", status: "active",  owner: "Derm Team", startDate: "2025-02-10", endDate: "2025-06-30", details: "12% off when cart meets rule" },
];

export default function DiscountList() {
  const navigate = useNavigate();
  const [discounts] = useState(SAMPLE_DISCOUNTS);

  // ---- Filters & Search ----
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState("type"); // 'type' | 'status' | 'none'

  const owners = useMemo(
    () => Array.from(new Set(discounts.map((d) => d.owner))).sort(),
    [discounts]
  );

  // ---- Derived counters (global) ----
  const stats = useMemo(() => {
    const byStatus = (s) => discounts.filter((d) => d.status === s).length;
    const byType = (t) => discounts.filter((d) => d.type === t).length;
    return {
      total: discounts.length,
      active: byStatus("active"),
      draft: byStatus("draft"),
      expired: byStatus("expired"),
      inactive: byStatus("inactive"),
      simple: byType("simple"),
      mix: byType("mix"),
      threshold: byType("threshold"),
    };
  }, [discounts]);

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

  // ---- Apply filters & search ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return discounts.filter((d) => {
      const matchType   = typeFilter === "all"   || d.type === typeFilter;
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      const matchOwner  = ownerFilter === "all"  || d.owner === ownerFilter;
      const matchQuery  =
        q === "" ||
        d.name.toLowerCase().includes(q) ||
        d.details.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q);
      return matchType && matchStatus && matchOwner && matchQuery;
    });
  }, [discounts, typeFilter, statusFilter, ownerFilter, query]);

  // ---- Group results for display ----
  const grouped = useMemo(() => {
    if (groupBy === "none") return { Results: filtered };
    const out = {};
    if (groupBy === "type") {
      ALL_TYPES.forEach((t) => {
        const arr = filtered.filter((d) => d.type === t);
        if (arr.length) out[TYPE_LABEL[t]] = arr;
      });
    } else if (groupBy === "status") {
      ALL_STATUSES.forEach((s) => {
        const arr = filtered.filter((d) => d.status === s);
        if (arr.length) out[s[0].toUpperCase() + s.slice(1)] = arr;
      });
    }
    return Object.keys(out).length ? out : { Results: [] };
  }, [filtered, groupBy]);

  // ---- UI ----
  return (
    <div className="dl-wrap">
      <style>{`
        .dl-wrap{ font-family:"Lato",sans-serif; background:#f7f9fc; min-height:100vh; color:${theme.text}; }
        .dl-container{ max-width:1200px; margin:0 auto; padding:28px 20px 60px; }
        .dl-topbar{ display:flex; align-items:center; gap:14px; margin-bottom:16px; }
        .dl-back{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px;
                  border:1px solid ${theme.border}; background:#fff; color:${theme.navy}; font-weight:700; cursor:pointer; }
        .dl-title{ font-size:34px; font-weight:700; color:${theme.darkBlue}; margin:4px 0 2px; }
        .dl-sub{ color:#5b6a85; margin: 10px 0 0; }

        .dl-stats{ display:grid; grid-template-columns: repeat(8, minmax(120px,1fr)); gap:14px; margin:18px 0 18px; }
        .dl-card{ border-radius:12px; padding:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:86px; box-shadow:0 2px 10px rgba(13,27,62,.05); }
        .dl-card .val{ font-size:28px; font-weight:700; line-height:28px; }
        .dl-card .lab{ margin-top:6px; font-weight:700; font-size:13px; opacity:.95; text-align:center; }

        .dl-toolbar{ background:#fff; border:1px solid ${theme.border}; border-radius:12px; padding:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .select{ border:1px solid ${theme.border}; background:#fff; color:${theme.navy}; border-radius:10px; height:40px; padding:0 12px; font-weight:700; }
        .seg{ display:flex; gap:6px; background:${theme.mist}; padding:6px; border-radius:12px; border:1px solid ${theme.border}; }
        .seg-btn{ background:#fff; border:1px solid ${theme.border}; padding:8px 12px; border-radius:8px; font-weight:700; color:${theme.navy}; cursor:pointer; }
        .seg-btn.active{ background:${theme.navy}; color:#fff; border-color:${theme.navy}; }

        .spacer{ flex:1; }
        .search{ display:flex; align-items:center; gap:8px; border:1px solid ${theme.border}; background:#fff; border-radius:10px; padding:0 12px; height:40px; min-width:280px; }
        .search input{ border:0; outline:0; width:100%; font-size:14px; }
        .primary{ background:${theme.darkBlue}; color:#fff; border:0; height:40px; padding:0 16px; border-radius:10px; font-weight:700; }
        .ghost { background:#fff; border:1px solid ${theme.border}; height:40px; padding:0 14px; border-radius:10px; font-weight:700; color:${theme.navy}; }

        .section{ background:#fff; border:1px solid ${theme.border}; border-radius:12px; margin-top:16px; overflow:hidden; }
        .section h4{ margin:0; padding:12px 16px; border-bottom:1px solid ${theme.border}; color:${theme.darkBlue}; font-size:16px; font-weight:700; display:flex; align-items:center; gap:10px; }
        .grid{ padding:12px; display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
        .dcard{ border:1px solid ${theme.border}; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px; background:#fff; }
        .row{ display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .badge{ display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; font-weight:700; font-size:12px; border:1px solid rgba(0,0,0,.06); }
        .b-type{ background:var(--tbg); color:${theme.navy}; }
        .b-status{ background:var(--sbg); color:var(--sfg); }
        .muted{ color:#7a879f; font-size:12px; }
        .btn-link{ background:#fff; border:1px solid ${theme.border}; padding:8px 12px; border-radius:8px; font-weight:700; color:${theme.navy}; cursor:pointer; }

        @media (max-width:1100px){ .dl-stats{ grid-template-columns: repeat(4, 1fr);} .grid{ grid-template-columns: repeat(2, 1fr);} }
        @media (max-width:700px){ .dl-stats{ grid-template-columns: repeat(2, 1fr);} .grid{ grid-template-columns: 1fr;} .search{ min-width: unset; flex:1; } }
      `}</style>

      <div className="dl-container">
        {/* Back */}
        <div className="dl-topbar">
          <button className="dl-back" onClick={() => navigate("/discounts/configure/simple")}>
            ← Back to Setup
          </button>
        </div>

        {/* Title */}
        <div>
          <div className="dl-title">Discount Management</div>
          <div className="dl-sub">View and manage all your discount configurations</div>
        </div>

        {/* Stat cards (global) */}
        <div className="dl-stats">
          {statCards.map((c) => (
            <div key={c.label} className="dl-card" style={{ background:c.bg, color:c.fg }}>
              <div className="val">{c.value}</div>
              <div className="lab">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar: Filters + Group + Search + Create */}
        <div className="dl-toolbar">
          <span>Filter By:</span>

          <select className="select" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>

          <select className="select" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)}>
            <option value="all">Type: All</option>
            <option value="simple">Simple</option>
            <option value="mix">Mix & Match</option>
            <option value="threshold">Threshold</option>
          </select>

          <select className="select" value={ownerFilter} onChange={(e)=>setOwnerFilter(e.target.value)}>
            <option value="all">Owner: All</option>
            {owners.map((o)=> <option key={o} value={o}>{o}</option>)}
          </select>

          <div className="seg" aria-label="Group By">
            <button className={`seg-btn ${groupBy==="none" ? "active":""}`} onClick={()=>setGroupBy("none")}>Group: None</button>
            <button className={`seg-btn ${groupBy==="type" ? "active":""}`} onClick={()=>setGroupBy("type")}>Type</button>
            <button className={`seg-btn ${groupBy==="status" ? "active":""}`} onClick={()=>setGroupBy("status")}>Status</button>
          </div>

          <div className="spacer" />

          <div className="search">
            <span>🔍</span>
            <input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              placeholder="Search by name, details, ID, owner…"
            />
          </div>

          <button
            className="ghost"
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setOwnerFilter("all"); setQuery(""); setGroupBy("type"); }}
            title="Clear filters"
          >
            Reset
          </button>

          <button className="primary" onClick={() => navigate("/discounts/configure/simple")}>
            Create New
          </button>
        </div>

        {/* Results */}
        {Object.values(grouped).every((arr)=>arr.length===0) ? (
          <div className="section" style={{textAlign:"center", padding:"40px"}}>
            No discounts match your filters.
          </div>
        ) : (
          Object.entries(grouped).map(([groupName, arr]) => (
            <div key={groupName} className="section">
              <h4>{groupName} <span className="muted">({arr.length})</span></h4>
              <div className="grid">
                {arr.map((d) => (
                  <div key={d.id} className="dcard">
                    <div className="row">
                      <strong>{d.name}</strong>
                      <span
                        className="badge b-status"
                        style={{ "--sbg": statusBg(d.status), "--sfg": statusFg(d.status) }}
                      >
                        {d.status[0].toUpperCase() + d.status.slice(1)}
                      </span>
                    </div>
                    <div className="muted">{TYPE_LABEL[d.type]} • {d.details}</div>
                    <div className="muted">
                      {new Date(d.startDate).toLocaleDateString()} – {new Date(d.endDate).toLocaleDateString()} • {d.owner}
                    </div>
                    <div className="row">
                      <button className="btn-link" onClick={() => navigate("/discounts/configure/simple")}>Edit</button>
                      {/* <button className="btn-link">Duplicate</button> */}
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
