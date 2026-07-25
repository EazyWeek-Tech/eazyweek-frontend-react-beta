import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";

/* =============================================================================
   LTR Funnel Dashboard (FRD §8) — standalone page.
   Wired to:  GET /api/Opportunity/Funnel           (buckets + badges + metrics)
              GET /api/Opportunity/FunnelDrilldown   (lead list per stage)

    Mount this page in your router, e.g.:
        <Route path="/ltr-funnel" element={<LTRFunnelDashboard />} />
      and add a nav entry pointing at it. Import path here assumes this file sits
      beside the other module pages (../../config). Adjust if placed elsewhere.
   ========================================================================== */

const C = {
  navy:"#334b71", navyDk:"#071D49", navyLt:"#e9edf5",
  coral:"#cc6b5c", gold:"#d4a853", slate:"#8da0b8", green:"#4a9e8a",
  grid:"#eef2f7", axis:"#6e7b8f", border:"#e7ecf4",
  bg:"#f4f6fa", text:"#10223f", sub:"#64748b",
};

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHeaders = () => ({ "Content-Type":"application/json", ...(TOKEN() ? { Authorization:`Bearer ${TOKEN()}` } : {}) });
const nfmt = (n) => Number(n || 0).toLocaleString();
const sar  = (n) => `SAR ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// Campaign status lives on CLINIC_OPPORTUNITYSUMMARY.OppStatus — 1 = Active, 2 = Expired.
// The list endpoint is already called with /1, but the row is re-checked here so an
// unfiltered or stale row can never reach the dropdown. Returns true / false, or
// null when the payload carries no recognisable status field.
const campaignIsActive = (r) => {
  const v = r?.oppStatus ?? r?.OppStatus ?? r?.status ?? r?.Status ??
            r?.cStatus   ?? r?.CStatus   ?? r?.campaignStatus ?? r?.CampaignStatus ??
            r?.oppStatusName ?? r?.statusName;
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const s = String(v).trim().toUpperCase();
  return s === "1" || s === "ACTIVE";
};

const STAGES = [
  { key:"captured",          label:"Captured",           color:C.navy  },
  { key:"converted",         label:"Converted",          color:C.slate },
  { key:"appointmentBooked", label:"Appointment Booked", color:C.gold  },
  { key:"showedUp",          label:"Showed Up",          color:C.green },
  { key:"purchased",         label:"Purchased",          color:C.coral },
];

/* ── Funnel (classic fixed-step trapezoids; labels centred inside each band) ── */
const FUNNEL_SHADES = ["#c9d5e8", "#9db0d0", "#5f79a8", "#3a5788", "#1f3a66"];
function FunnelChart({ buckets, onStage }) {
  const captured = Number(buckets?.captured || 0);
  const vals = STAGES.map((s) => Number(buckets?.[s.key] || 0));
  const n = STAGES.length;
  const W = 560, H = 74, gap = 8, inset = 20;
  const cx = W / 2;
  // Width is a function of POSITION (fixed funnel silhouette), not of the value —
  // magnitude is conveyed by the count + % printed inside each band.
  const fracAt = (i) => 1.0 - 0.72 * (i / n);           // 1.00 → 0.28 across n+1 edges
  const wAt = (i) => fracAt(i) * (W - inset);
  return (
    <svg viewBox={`0 0 ${W} ${(H + gap) * n}`} width="100%" style={{ display:"block", margin:"0 auto", maxWidth: W }}>
      {STAGES.map((s, i) => {
        const y = i * (H + gap);
        const topW = wAt(i), botW = wAt(i + 1);
        const pts = [
          [cx - topW / 2, y], [cx + topW / 2, y],
          [cx + botW / 2, y + H], [cx - botW / 2, y + H],
        ].map((p) => p.join(",")).join(" ");
        const pct = captured > 0 ? Math.round((vals[i] / captured) * 1000) / 10 : 0;
        const light = i < 2;
        const txt = light ? "#17305a" : "#ffffff";
        const sub = light ? "#43597f" : "rgba(255,255,255,0.85)";
        return (
          <g key={s.key} className="ltrf-band" onClick={() => onStage?.(s.key)}>
            <rect x="0" y={y} width={W} height={H} fill="transparent" />
            <polygon points={pts} fill={FUNNEL_SHADES[i]}>
              <title>{`${s.label}: ${nfmt(vals[i])} (${pct}% of captured) — click to drill down`}</title>
            </polygon>
            <text x={cx} y={y + H / 2 - 8} textAnchor="middle" fill={txt} fontSize="21" fontWeight="800">{nfmt(vals[i])}</text>
            <text x={cx} y={y + H / 2 + 11} textAnchor="middle" fill={txt} fontSize="11.5" fontWeight="800" letterSpacing="0.5">{s.label.toUpperCase()}</text>
            <text x={cx} y={y + H / 2 + 27} textAnchor="middle" fill={sub} fontSize="11.5" fontWeight="700">{pct}%</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Small building blocks ─────────────────────────────────────────────────── */
function Card({ title, sub, children, style }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.06)", ...style }}>
      {title && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:800, color:C.navyDk, textTransform:"uppercase", letterSpacing:".05em" }}>{title}</div>
          {sub && <div style={{ fontSize:11.5, color:C.sub, marginTop:3 }}>{sub}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ fontSize:11, fontWeight:800, color:C.sub, textTransform:"uppercase", letterSpacing:".04em" }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color: accent || C.navyDk, marginTop:6 }}>{value}</div>
    </div>
  );
}

function BadgeStat({ label, value, accent, onClick }) {
  return (
    <div onClick={onClick}
      style={{ flex:1, minWidth:150, background:"#fff", border:`1px solid ${C.border}`, borderLeft:`4px solid ${accent}`,
        borderRadius:10, padding:"12px 14px", cursor:onClick?"pointer":"default", boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.sub }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color:accent, marginTop:2 }}>{value}</div>
    </div>
  );
}

/* ── Drill-down modal ──────────────────────────────────────────────────────── */
const COLS = [
  ["prospectId", "Prospect ID"], ["customerName", "Customer"], ["salesOwner", "Sales Owner"],
  ["disposition", "Disposition"], ["appointmentId", "Appointment ID"], ["appointmentStatus", "Appt Status"],
  ["purchased", "Purchased"], ["createdDate", "Created"],
];
function DrilldownModal({ drill, onClose, onPage }) {
  if (!drill) return null;
  const label = STAGES.find((s) => s.key === drill.stage)?.label
    || drill.stage.charAt(0).toUpperCase() + drill.stage.slice(1);
  const rows = drill.rows || [];
  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(7,29,73,0.35)", zIndex:1200, display:"flex", justifyContent:"center", alignItems:"flex-start", padding:"6vh 16px" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width:"min(1000px,96vw)", maxHeight:"84vh", background:"#fff", borderRadius:14, boxShadow:"0 20px 60px rgba(0,0,0,.25)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:800, color:C.navyDk, fontSize:15 }}>{label} — leads</div>
          <button onClick={onClose} style={{ border:0, background:"transparent", fontSize:20, cursor:"pointer", color:C.sub }}>×</button>
        </div>
        <div style={{ overflow:"auto" }}>
          {drill.loading ? (
            <div style={{ padding:40, textAlign:"center", color:C.sub }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:C.sub }}>No leads in this stage.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr>{COLS.map(([, h]) => (
                  <th key={h} style={{ position:"sticky", top:0, background:C.bg, textAlign:"left", padding:"9px 12px", color:C.navy, fontWeight:800, whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${C.grid}` }}>
                    {COLS.map(([k]) => (
                      <td key={k} style={{ padding:"8px 12px", color:C.text, whiteSpace:"nowrap" }}>
                        {k === "purchased"
                          ? (r.purchased ? `Yes${r.invoiceNum ? ` (${r.invoiceNum})` : ""}` : "—")
                          : (r[k] || "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding:"10px 20px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, color:C.sub }}>Page {drill.page || 1}</span>
          <div style={{ display:"flex", gap:8 }}>
            <button disabled={(drill.page || 1) <= 1} onClick={() => onPage((drill.page || 1) - 1)}
              style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:"#fff", cursor:(drill.page||1)<=1?"not-allowed":"pointer", color:C.navy, fontWeight:700 }}>Prev</button>
            <button disabled={rows.length < 50} onClick={() => onPage((drill.page || 1) + 1)}
              style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:"#fff", cursor:rows.length<50?"not-allowed":"pointer", color:C.navy, fontWeight:700 }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Campaign multi-select ─────────────────────────────────────────────────────
   value = array of OppCodes. An empty array means every active campaign (ALL).
   ──────────────────────────────────────────────────────────────────────────── */
function CampaignMultiSelect({ campaigns, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q,    setQ]    = useState("");
  const boxRef = useRef(null);

  // Close on outside click / Escape (same pattern as the appointment drawer).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sel    = Array.isArray(value) ? value : [];
  const toggle = (code) => onChange(sel.includes(code) ? sel.filter((c) => c !== code) : [...sel, code]);
  const term   = q.trim().toLowerCase();
  const shown  = term
    ? campaigns.filter((c) => `${c.oppName} ${c.oppCode}`.toLowerCase().includes(term))
    : campaigns;

  const label =
    sel.length === 0 ? "All campaigns"
    : sel.length === 1 ? (campaigns.find((c) => c.oppCode === sel[0])?.oppName || sel[0])
    : `${sel.length} campaigns selected`;

  const rowStyle = (on) => ({
    display:"flex", alignItems:"center", gap:9, padding:"7px 12px", cursor:"pointer",
    fontSize:12.5, color:C.text, background:on ? C.navyLt : "transparent",
  });

  return (
    <div ref={boxRef} style={{ position:"relative", minWidth:240 }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
                 padding:"9px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:"#fff",
                 color:C.navy, fontWeight:700, fontSize:13, cursor:"pointer", textAlign:"left" }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</span>
        <span style={{ color:C.sub, fontSize:11 }}>▾</span>
      </button>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:40, width:320,
                      background:"#fff", border:`1px solid ${C.border}`, borderRadius:10,
                      boxShadow:"0 10px 28px rgba(7,29,73,0.14)", overflow:"hidden" }}>
          <div style={{ padding:"10px 12px", borderBottom:`1px solid ${C.grid}` }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns…" autoFocus
              style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", fontSize:12.5,
                       border:`1px solid ${C.border}`, borderRadius:7, outline:"none", color:C.text }} />
          </div>

          <div onClick={() => onChange([])} style={{ ...rowStyle(sel.length === 0), fontWeight:700, borderBottom:`1px solid ${C.grid}` }}>
            <input type="checkbox" readOnly checked={sel.length === 0} style={{ accentColor:C.navy }} />
            <span>All campaigns</span>
          </div>

          <div style={{ maxHeight:260, overflowY:"auto" }}>
            {shown.length === 0 && (
              <div style={{ padding:"14px 12px", fontSize:12.5, color:C.sub }}>No active campaigns match.</div>
            )}
            {shown.map((c) => {
              const on = sel.includes(c.oppCode);
              return (
                <div key={c.oppCode} onClick={() => toggle(c.oppCode)} style={rowStyle(on)}>
                  <input type="checkbox" readOnly checked={on} style={{ accentColor:C.navy }} />
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {c.oppName} <span style={{ color:C.sub }}>({c.oppCode})</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"9px 12px", borderTop:`1px solid ${C.grid}`, background:"#fbfcfe" }}>
            <span style={{ fontSize:11.5, color:C.sub }}>
              {sel.length === 0 ? "Every active campaign" : `${sel.length} selected`}
            </span>
            <div style={{ display:"flex", gap:8 }}>
              <button type="button" onClick={() => onChange([])}
                style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:"#fff",
                         color:C.navy, fontWeight:700, fontSize:12, cursor:"pointer" }}>Clear</button>
              <button type="button" onClick={() => setOpen(false)}
                style={{ padding:"5px 14px", borderRadius:7, border:"none", background:C.navy,
                         color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function LTRFunnelDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  // Selected campaigns. Empty array = ALL active campaigns.
  const [oppCodes,  setOppCodes]  = useState([]);
  const [funnel,    setFunnel]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [drill,     setDrill]     = useState(null);

  // Campaign filter options — ACTIVE campaigns only (OppStatus = 1).
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/api/Opportunity/LoadOpprotunityList/1`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const arr = Array.isArray(d) ? d : (d?.data || []);
        // Active-only: filter on the row's own status. If no row exposes a status
        // field the filter degrades to a no-op rather than emptying the dropdown.
        const statusKnown = arr.some((r) => campaignIsActive(r) !== null);
        if (!statusKnown && arr.length) {
          console.warn("LTR funnel: campaign list carries no status field — relying on the endpoint's active filter.");
        }
        const activeArr = statusKnown ? arr.filter((r) => campaignIsActive(r) === true) : arr;
        const seen = new Set(); const list = [];
        activeArr.forEach((r) => {
          const code = r.oppCode || r.OppCode;
          const name = r.oppName || r.OppName || code;
          if (code && !seen.has(code)) { seen.add(code); list.push({ oppCode: code, oppName: name }); }
        });
        setCampaigns(list);
        // Drop any selected campaign that is no longer active (empty = ALL).
        setOppCodes((cur) => cur.filter((code) => list.some((c) => c.oppCode === code)));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Comma-separated scope for the API; "ALL" when nothing is picked. Also the
  // effect dependency, so selecting/deselecting refetches exactly once.
  const oppParam = oppCodes.length ? oppCodes.join(",") : "ALL";

  // Funnel data.
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch(`${API_BASE_URL}/api/Opportunity/Funnel?oppCode=${encodeURIComponent(oppParam)}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => { if (alive) setFunnel(j?.data || j); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [oppParam]);

  const openDrill = async (stage, page = 1) => {
    setDrill({ stage, loading: true, rows: [], page });
    try {
      const r = await fetch(
        `${API_BASE_URL}/api/Opportunity/FunnelDrilldown?stage=${encodeURIComponent(stage)}&oppCode=${encodeURIComponent(oppParam)}&page=${page}&pageSize=50`,
        { headers: authHeaders() }
      );
      const j = await r.json(); const d = j?.data || j;
      setDrill({ stage, loading: false, rows: d.rows || [], page: d.page || page });
    } catch { setDrill({ stage, loading: false, rows: [], page }); }
  };

  const b = funnel?.buckets || {};
  const badges = funnel?.badges || {};
  const appt = funnel?.appointment || {};
  const rev = funnel?.revenue || {};
  const spend = funnel?.spend || {};
  const showUpUnavailable = (funnel?.notes || []).some((n) => String(n).toLowerCase().includes("showedup"));

  return (
    <div style={{ background:C.bg, minHeight:"100vh", padding:"22px 26px", fontFamily:"Lato, system-ui, sans-serif" }}>
      <style>{`
        .ltrf-top { display:grid; grid-template-columns:minmax(0,2fr) minmax(230px,1fr); gap:16px; margin-bottom:16px; }
        @media (max-width:920px){ .ltrf-top { grid-template-columns:1fr; } }
        .ltrf-metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; }
        .ltrf-band { cursor:pointer; }
        .ltrf-band polygon { transition:opacity .15s; }
        .ltrf-band:hover polygon { opacity:0.86; }
      `}</style>
      {/* Header + filter */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:22, color:C.navyDk }}>Lead-to-Revenue Funnel</div>
          <div style={{ fontSize:12.5, color:C.sub, marginTop:2 }}>Captured → Converted → Booked → Showed Up → Purchased</div>
        </div>
        <CampaignMultiSelect campaigns={campaigns} value={oppCodes} onChange={setOppCodes} />
      </div>

      {loading && !funnel ? (
        <div style={{ padding:60, textAlign:"center", color:C.sub }}>Loading funnel…</div>
      ) : (
        <>
          {/* Section 1 — Lead funnel + badges */}
          <div className="ltrf-top">
            <Card title="Lead funnel" sub="Click any band to see the leads behind it">
              <FunnelChart buckets={b} onStage={openDrill} />
              {showUpUnavailable && (
                <div style={{ fontSize:11.5, color:C.gold, marginTop:8, textAlign:"center" }}>
                  Showed-Up pending Appointment-master verification — other stages are live.
                </div>
              )}
            </Card>
            <Card title="Awaiting / lost">
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <BadgeStat label="Pending appointment mapping" value={nfmt(badges.pendingApptMapping)} accent={C.gold} onClick={() => openDrill("pending")} />
                <BadgeStat label="Dropped / Lost" value={nfmt(badges.droppedLost)} accent={C.coral} onClick={() => openDrill("lost")} />
              </div>
            </Card>
          </div>

          {/* Section 2 — Appointment funnel */}
          <div style={{ fontSize:12, fontWeight:800, color:C.navyDk, textTransform:"uppercase", letterSpacing:".05em", margin:"18px 2px 10px" }}>Appointment funnel</div>
          <div className="ltrf-metrics" style={{ marginBottom:8 }}>
            <Metric label="Show-Up Rate" value={`${appt.showUpRate ?? 0}%`} accent={C.green} />
            <Metric label="No-shows" value={nfmt(appt.noShows)} accent={C.coral} />
          </div>

          {/* Section 3 — Revenue funnel */}
          <div style={{ fontSize:12, fontWeight:800, color:C.navyDk, textTransform:"uppercase", letterSpacing:".05em", margin:"18px 2px 10px" }}>Revenue funnel</div>
          <div className="ltrf-metrics">
            <Metric label="Purchase Rate" value={`${rev.purchaseRate ?? 0}%`} accent={C.green} />
            <Metric label="Average Basket Size" value={sar(rev.avgBasketSize)} accent={C.navy} />
            <Metric label="Total Revenue" value={sar(rev.totalRevenue)} accent={C.navy} />
            <Metric label="Campaign Spend" value={sar(spend.campaignSpend)} accent={C.slate} />
            <Metric label="Lead Acquisition Cost" value={sar(spend.leadAcquisitionCost)} accent={C.gold} />
          </div>
        </>
      )}

      <DrilldownModal drill={drill} onClose={() => setDrill(null)} onPage={(p) => openDrill(drill.stage, p)} />
    </div>
  );
}