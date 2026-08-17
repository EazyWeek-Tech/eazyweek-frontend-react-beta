// src/pages/Opportunity/CampaignDetails.jsx
// ─── Single unified campaign details page for all rule types ─────────────────
// Route: /opportunity/:oppCode/details
// Detects rule type from campaign header → renders correct columns + filters
//
// Rule routing:
//   R3 / R4              → transaction table (CLINIC_OPPORTUNITYTRANSDETAILS)
//   R1 / R2 / R5 / R6   → transaction table (same, different columns shown)
//   R7                   → external source table (CLINIC_OPPORTUNITYEXTERNALSOURCE)
//   Manual Lead          → LeadOpp table (GET /api/LeadOpp/List)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import AssignmentModal from "./AssignmentModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  ...(TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}),
});

// ── LTR Funnel: resolve mapped Appointment IDs for a set of leads ─────────────
const fetchLeadAppointments = async (leadSource, recIds) => {
  const ids = [...new Set((recIds || []).map((x) => String(x || "")).filter(Boolean))];
  if (!ids.length) return {};
  try {
    const r = await fetch(`${API_BASE_URL}/api/Opportunity/LeadAppointments`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ leadSource, recIds: ids }),
    });
    const j = await r.json();
    return (j && j.data) || {};
  } catch { return {}; }
};
// Appointment ID cell: mapped id → shown; else Pending for converted leads; else —
const apptCell = (appt, disposition) => {
  const id = appt && appt.appointmentId;
  if (id) return id;
  const conv = String(disposition || "").trim().toLowerCase().startsWith("converted");
  return conv ? "Pending" : "—";
};

// ── Case B: a customer's future appointments + manual link (FRD §6.3 / §7) ────
const fetchFutureAppointments = async (custId) => {
  const cid = String(custId || "").trim();
  if (!cid) return [];
  try {
    const r = await fetch(`${API_BASE_URL}/api/Opportunity/CustomerFutureAppointments?custId=${encodeURIComponent(cid)}`,
      { headers: authHeaders() });
    const j = await r.json();
    return (j && j.data) || [];
  } catch { return []; }
};
const linkLeadAppt = async (payload) => {
  try {
    const r = await fetch(`${API_BASE_URL}/api/Opportunity/LinkLeadAppointment`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
    });
    const j = await r.json();
    return j && j.success !== false;
  } catch { return false; }
};
const fmtApptOption = (a) => {
  const dt = a.dateTime ? new Date(a.dateTime) : null;
  const d  = dt && !isNaN(dt.getTime()) ? dt.toLocaleString() : "";
  return `${a.appointmentId}${a.service ? ` · ${a.service}` : ""}${d ? ` · ${d}` : ""}`;
};

// Appointment ID cell — read-only when mapped or not-converted; an editable
// future-appointments dropdown when the lead is Converted but still Pending.
//
// This dropdown is the Case B (FRD §6.3) landing spot: with Appt Booking Mandatory
// = No the agent can convert and decline the booking, which leaves the lead
// Converted with Appointment ID = Pending until it is mapped from here. It stays
// available on mandatory campaigns too — a converted lead should never be stuck
// at Pending with no way to fix it if the auto-link missed.
//
// (This replaces the old "NA" rendering for non-mandatory campaigns. Under the
// new conversion rules those are exactly the rows that DO need mapping.)
function ApptMapCell({ leadSource, recId, custId, oppCode, disposition, mapped, onLinked, apptMandatory=true }) {
  const conv = String(disposition || "").trim().toLowerCase().startsWith("converted");
  const [opts, setOpts] = useState(null);
  const [busy, setBusy] = useState(false);

  // A booking that already exists always wins.
  if (mapped) return <span>{mapped}</span>;
  if (!conv)  return <span>{"—"}</span>;
  if (!String(custId || "").trim())
    return <span title="No customer linked yet">Pending</span>;

  const load = async () => {
    if (opts !== null || busy) return;
    setBusy(true);
    setOpts(await fetchFutureAppointments(custId));
    setBusy(false);
  };
  const pick = async (appointmentId) => {
    if (!appointmentId) return;
    setBusy(true);
    const ok = await linkLeadAppt({
      leadSource, leadRecId: String(recId), oppCode: oppCode || "",
      custId: String(custId), appointmentId,
    });
    setBusy(false);
    if (ok) onLinked?.(recId, appointmentId);
  };

  return (
    <select
      className="cd-appt-map"
      disabled={busy}
      defaultValue=""
      onMouseDown={load}
      onFocus={load}
      onChange={(e) => pick(e.target.value)}
      title={apptMandatory === false
        ? "Appointment mapping pending — pick one of this customer's future appointments"
        : "Map a future appointment (Converted lead)"}
      style={{ maxWidth: 180, fontSize: 12, padding: "4px 6px" }}
    >
      <option value="">{busy ? "Loading\u2026" : "Pending — map…"}</option>
      {(opts || []).map((a) => (
        <option key={a.appointmentId} value={a.appointmentId}>{fmtApptOption(a)}</option>
      ))}
      {opts && opts.length === 0 && <option value="" disabled>No future appointments</option>}
    </select>
  );
}

const toISODateOnly = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    if (isNaN(+d)) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(s);
  return isNaN(+dt) ? "" : toISODateOnly(dt);
};

const fmtDate = (v) => {
  const iso = toISODateOnly(v);
  if (!iso) return "—";
  // Mask 1900-01-01 placeholder dates
  if (iso.startsWith("1900-01-0") || iso.startsWith("0001-01-01")) return "—";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const toMidnight = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(+v) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(+iso[1], +iso[2]-1, +iso[3]);
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return new Date(+dmy[3], +dmy[2]-1, +dmy[1]);
  const dt = new Date(s);
  return isNaN(+dt) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

const stamp = (d) => d ? +new Date(d.getFullYear(), d.getMonth(), d.getDate()) : NaN;

const fmt12h = (hhmmss, ampm) => {
  const t = String(hhmmss||"").trim();
  const ap = String(ampm||"").trim().toUpperCase();
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return ap||"";
  let h = +m[1]; const mm = m[2];
  const label = ap || (h>=12?"PM":"AM");
  let h12 = h%12; if (!h12) h12=12;
  return `${String(h12).padStart(2,"0")}:${mm} ${label}`;
};

// Canonical 12h label for follow-up time. Handles: an existing "02:30 PM" label (pads hour),
// a SQL time serialized as ISO ("1970-01-01T18:30:00.000Z" -> wall-clock HH:MM after "T", NO
// timezone shift), and a plain 24h "14:30:00". Returns "" when there's nothing usable.
const to12hLabel = (s) => {
  const t = String(s ?? "").trim();
  if (!t) return "";
  // A blank follow-up is stored as a zero time on some rows, not as NULL, which
  // rendered as "12:00 AM" next to an empty Follow Up Date. Midnight is never a
  // real choice — the picker only offers 01:00–12:30 — so treat it as blank.
  if (/^0{1,2}:00(:00)?$/.test(t)) return "";
  let m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) return `${String(m[1]).padStart(2,"0")}:${m[2]} ${m[3].toUpperCase()}`;
  m = t.match(/T(\d{2}):(\d{2})/) || t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = parseInt(m[1], 10);
  if (Number.isNaN(h)) return "";
  const ap = h >= 12 ? "PM" : "AM";
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2,"0")}:${m[2]} ${ap}`;
};

const timeToMin = (hhmm) => {
  if (!hhmm) return NaN;
  const p = String(hhmm).split(":");
  if (p.length<2) return NaN;
  const h=+p[0], m=+p[1];
  return (isNaN(h)||isNaN(m)) ? NaN : h*60+m;
};

const safe = (v, fb="—") => (v==null||v==="") ? fb : v;

const norm = (v) => String(v??"").trim().toLowerCase();

/* Sales Owner. A lead stays unclaimed until someone actually edits and submits its
   form, so a blank owner is a real state rather than missing data — it is shown and
   filtered as "Unassigned". The filter carries a sentinel value so it can never be
   confused with a real employee who happens to be called Unassigned. */
const UNASSIGNED_VALUE   = "__UNASSIGNED__";
const UNASSIGNED_LABEL   = "Unassigned";
const isUnassignedOwner  = (v) => !String(v ?? "").trim();
const ownerLabel         = (v) => (isUnassignedOwner(v) ? UNASSIGNED_LABEL : String(v).trim());
const ownerOptionLabel   = (v, allLabel="All") =>
  v === UNASSIGNED_VALUE ? UNASSIGNED_LABEL : (v || allLabel);
// [UNASSIGNED, ...real owners] — for SearchableSelect, which supplies its own "All"
const withUnassigned     = (opts) =>
  [UNASSIGNED_VALUE, ...new Set((opts||[]).map(o=>String(o??"").trim()).filter(Boolean))];
// ["", UNASSIGNED, ...real owners] — for a native <select>, where "" is the All row
const withAllAndUnassigned = (opts) => ["", ...withUnassigned(opts)];

const fmtProspectId = (n, prefix="LD") => {
  const x = Number(n);
  if (!Number.isFinite(x)||x<=0) return "—";
  return `${prefix}-${String(Math.trunc(x)).padStart(7,"0")}`;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// ─── Created / Modified date-range helpers ────────────────────────────────────
// A blank range means "no filter". Once a range IS set, rows carrying no date
// are excluded — they cannot satisfy the range.
const inDateRange = (value, fromISO, toISO) => {
  if (!fromISO && !toISO) return true;
  const s = stamp(toMidnight(value));
  if (isNaN(s)) return false;
  if (fromISO) { const f = stamp(toMidnight(fromISO)); if (!isNaN(f) && s < f) return false; }
  if (toISO)   { const t = stamp(toMidnight(toISO));   if (!isNaN(t) && s > t) return false; }
  return true;
};

const rangeInvalid = (fromISO, toISO) => {
  if (!fromISO || !toISO) return false;
  const f = stamp(toMidnight(fromISO)), t = stamp(toMidnight(toISO));
  return !isNaN(f) && !isNaN(t) && f > t;
};

const shiftISO = (days) => {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + days);
  return toISODateOnly(d);
};

// Quick presets shared by every Created / Modified range control
const RANGE_PRESETS = [
  { key:"today", label:"Today"        },
  { key:"7",     label:"Last 7 days"  },
  { key:"30",    label:"Last 30 days" },
  { key:"mtd",   label:"This month"   },
  { key:"ytd",   label:"This year"    },
];

const presetRange = (key) => {
  const now = new Date(); now.setHours(0,0,0,0);
  const today = toISODateOnly(now);
  if (key === "today") return { from: today,          to: today };
  if (key === "7")     return { from: shiftISO(-6),   to: today };
  if (key === "30")    return { from: shiftISO(-29),  to: today };
  if (key === "mtd")   return { from: toISODateOnly(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  if (key === "ytd")   return { from: toISODateOnly(new Date(now.getFullYear(), 0, 1)),              to: today };
  return { from: "", to: "" };
};

// ─── Rule type detector ───────────────────────────────────────────────────────
const detectKind = (ruleCode) => {
  const c = String(ruleCode||"").trim().toUpperCase();
  if (c === "MANUAL LEAD") return "manual";
  if (c === "R7")           return "external";
  return "transaction"; // R1-R6
};

const RULE_LABELS = {
  R1: "Paid for X but not for Y",
  R2: "Paid X Category in Y days, No future appt in Z days for P",
  R3: "No Show appointments",
  R4: "Cancelled appointments",
  R5: "Customer Special Day",
  R6: "Customer Type",
  R7: "External Source",
  "MANUAL LEAD": "Manual Lead",
};

// ─── Shared sub-components ────────────────────────────────────────────────────

const Toast = ({ msg }) => {
  if (!msg) return null;
  const text    = typeof msg === "object" ? msg.msg   : msg;
  const isError = typeof msg === "object" ? msg.type === "error" : false;
  return (
    <div className="cd-toast" style={{ background: isError ? "#7f1d1d" : "#0d3d1a" }}>
      {text}
    </div>
  );
};

const EmptyNote = ({ msg="No data found." }) =>
  <div className="cd-empty">{msg}</div>;

const Loading = () =>
  <div className="cd-loading">Loading…</div>;

const ErrMsg = ({ msg }) =>
  <div className="cd-err">{msg}</div>;

// Simple searchable select used in R7 filters
/* ── Lead Score ───────────────────────────────────────────────────────────────
   Bands and colours match the score panel on the lead forms, so a lead that
   reads HOT LEAD on the form reads Hot here. The grids carry the LATEST score
   for each lead (CLINIC_LEADSCORE's newest row), not a running average.

   "Not scored" is a first-class filter value rather than an absence: until a
   campaign has been through a chase cycle most leads have no score, and
   finding those is the point. */
const SCORE_FILTER_OPTIONS = [
  { value:"",         label:"All" },
  { value:"Hot",      label:"Hot" },
  { value:"Warm",     label:"Warm" },
  { value:"Cold",     label:"Cold" },
  { value:"UNSCORED", label:"Not scored" },
];

const SCORE_COLORS = {
  hot:  { bg:"#dd7766", fg:"#fff" },
  warm: { bg:"#c98a2e", fg:"#fff" },
  cold: { bg:"#85a2aa", fg:"#fff" },
};

const bandKey = (r) => String(r?.scoreBand ?? "").trim().toLowerCase();

/** Row passes the picked band. "" = no filter, UNSCORED = never scored. */
const matchesScoreBand = (r, band) => {
  if (!band) return true;
  const b = bandKey(r);
  return band === "UNSCORED" ? !b : b === String(band).toLowerCase();
};

/** Score + band, e.g. 82 HOT. An unscored lead shows a dash, not a zero. */
function ScoreCell({ row }) {
  const b = bandKey(row);
  const s = row?.leadScore;
  if (!b && (s === null || s === undefined || s === "")) return <>—</>;
  const c = SCORE_COLORS[b] || { bg:"#94a3b8", fg:"#fff" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
      {(s === null || s === undefined || s === "") ? null : <b>{s}</b>}
      {b && (
        <span style={{ background:c.bg, color:c.fg, borderRadius:3, padding:"2px 7px",
          fontSize:10, fontWeight:800, letterSpacing:".04em" }}>
          {b.toUpperCase()}
        </span>
      )}
    </span>
  );
}

function ScoreFilter({ value, onChange }) {
  return (
    <div className="cd-fg">
      <label>Lead Score</label>
      <select value={value} onChange={e=>onChange(e.target.value)}>
        {SCORE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SearchableSelect({ options=[], value, onChange, placeholder="All", labelOf=(o)=>o }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref             = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter(o => String(labelOf(o)).toLowerCase().includes(s)) : options;
  }, [options, q]);

  return (
    <div className="ss-wrap" ref={ref}>
      <div className={`ss-ctrl ${open?"ss-open":""}`} onClick={() => setOpen(o=>!o)}>
        <span className={!value?"ss-ph":""}>{value ? labelOf(value) : placeholder}</span>
        <span className="ss-acts">
          {value && <span className="ss-x" onClick={(e)=>{e.stopPropagation();onChange("");setOpen(false);}}>✕</span>}
          <span>{open?"▲":"▼"}</span>
        </span>
      </div>
      {open && (
        <div className="ss-drop">
          <input autoFocus className="ss-search" placeholder="Search…" value={q}
            onChange={e=>setQ(e.target.value)} onClick={e=>e.stopPropagation()} />
          <div className="ss-list">
            <div className={`ss-item ${!value?"ss-active":""}`} onClick={()=>{onChange("");setOpen(false);setQ("");}}>All</div>
            {filtered.map((o,i) => (
              <div key={i} className={`ss-item ${value===o?"ss-active":""}`}
                onClick={()=>{onChange(o);setOpen(false);setQ("");}}>
                {labelOf(o)}
              </div>
            ))}
            {!filtered.length && <div className="ss-no">No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── From/To date range control (Created, Modified, Appointment, Follow Up) ────
// allowClear={false} keeps a range mandatory — used where the server needs dates.
const NA_NOTE = "NA — no such column in the table below.";

function RangeField({ label, from, to, onFrom, onTo, presets=true, allowClear=true, hint="", span=2,
                      disabled=false, na=false, offNote="" }) {
  const off    = disabled || na;
  const bad    = !off && rangeInvalid(from, to);
  const active = !off && !!(from || to);
  const apply  = (key) => { const r = presetRange(key); onFrom(r.from); onTo(r.to); };
  return (
    <div className={`cd-fg cd-range ${active?"cd-range-on":""} ${bad?"cd-range-bad":""} ${off?"cd-fg-off":""}`} style={{gridColumn:`span ${span}`}}>
      <div className="cd-range-head">
        <label>{label}</label>
        {na && <span className="cd-natag">NA</span>}
        {active && allowClear && (
          <button type="button" className="cd-linkbtn cd-linkbtn-sm" title={`Clear ${label}`}
            onClick={()=>{ onFrom(""); onTo(""); }}>Clear</button>
        )}
      </div>
      <div className="cd-range-body">
        {na ? (
          <>
            <input type="text" value="NA" readOnly disabled aria-label={`${label} not applicable`} />
            <span className="cd-range-sep">→</span>
            <input type="text" value="NA" readOnly disabled aria-label={`${label} not applicable`} />
          </>
        ) : (
          <>
            <input type="date" aria-label={`${label} from`} value={from} disabled={disabled} onChange={e=>onFrom(e.target.value)} />
            <span className="cd-range-sep">→</span>
            <input type="date" aria-label={`${label} to`}   value={to}   disabled={disabled} onChange={e=>onTo(e.target.value)} />
          </>
        )}
      </div>
      {presets && !off && (
        <div className="cd-chiprow">
          {RANGE_PRESETS.map(p => {
            const r  = presetRange(p.key);
            const on = from === r.from && to === r.to;
            return (
              <button key={p.key} type="button" className={`cd-chip ${on?"cd-chip-on":""}`}
                onClick={()=>{ if (on) { if (allowClear) apply(""); } else apply(p.key); }}>
                {p.label}
              </button>
            );
          })}
        </div>
      )}
      {bad
        ? <span className="cd-fgnote cd-fgnote-err">“From” is after “To” — nothing will match.</span>
        : off ? <span className="cd-fgnote cd-fgnote-off">{offNote || NA_NOTE}</span>
        : hint ? <span className="cd-fgnote">{hint}</span> : null}
    </div>
  );
}

// ── Collapsible filter panel with active-count badge + Clear all ──────────────
function FilterPanel({ activeCount=0, onClear, actions=null, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="cd-filters">
      <div className="cd-filters-bar">
        <button type="button" className="cd-filters-toggle" onClick={()=>setOpen(o=>!o)}>
          <span className={`cd-caret ${open?"cd-caret-open":""}`}>▸</span>
          <span>Filters</span>
          {activeCount>0 && <span className="cd-badge">{activeCount}</span>}
        </button>
        <div className="cd-filters-actions">
          {actions}
          {activeCount>0 && onClear && (
            <button type="button" className="cd-linkbtn" onClick={onClear}>Clear all</button>
          )}
        </div>
      </div>
      {open && <div className="cd-fgrid">{children}</div>}
    </div>
  );
}

// Status / disposition tag with a light tone cue
const tagTone = (v) => {
  const s = norm(v);
  if (!s) return "";
  if (s.startsWith("convert")) return "ok";
  if (s === "closed" || s.includes("lost") || s.includes("fail") || s.includes("not interest")) return "off";
  if (s === "open" || s === "wip" || s.includes("progress") || s.includes("follow")) return "on";
  return "";
};
const Pill = ({ v }) => {
  if (v == null || v === "") return <span className="cd-dash">—</span>;
  const tone = tagTone(v);
  return <span className={`cd-tag ${tone?`cd-tag-${tone}`:""}`}>{v}</span>;
};

// Long free text — clamped to one line, full value on hover
const Clamp = ({ v, w=240 }) => (v == null || v === "")
  ? <span className="cd-dash">—</span>
  : <span className="cd-clamp" style={{maxWidth:w}} title={String(v)}>{v}</span>;

// Loading placeholder that keeps the table's shape
const Skeleton = ({ rows=6, cols=10 }) => (
  <div className="cd-tablewrap">
    <table className="cd-table">
      <tbody>
        {Array.from({length:rows}).map((_,r)=>(
          <tr key={r}>{Array.from({length:cols}).map((_,c)=><td key={c}><span className="cd-sk" /></td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Pagination row (with rows-per-page when onPageSize is supplied)
const Pager = ({ page, totalPages, onPage, pageSize, onPageSize }) => (
  <div className="cd-pager">
    {onPageSize && (
      <span className="cd-pgsize">
        Rows
        <select value={pageSize} onChange={e=>{ onPageSize(Number(e.target.value)); onPage(1); }}>
          {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
        </select>
      </span>
    )}
    <button className="cd-pgbtn" disabled={page<=1} onClick={()=>onPage(1)}>« First</button>
    <button className="cd-pgbtn" disabled={page<=1} onClick={()=>onPage(p=>Math.max(1,p-1))}>‹ Prev</button>
    <span className="cd-pginfo">Page <b>{page}</b> / <b>{totalPages}</b></span>
    <button className="cd-pgbtn" disabled={page>=totalPages} onClick={()=>onPage(p=>Math.min(totalPages,p+1))}>Next ›</button>
    <button className="cd-pgbtn" disabled={page>=totalPages} onClick={()=>onPage(totalPages)}>Last »</button>
  </div>
);

// ─── Campaign header loader ───────────────────────────────────────────────────
const useCampaignHeader = (oppCode) => {
  const [header,  setHeader]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    if (!oppCode) return;
    let alive = true;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/LeadOpp/getCampaign/${encodeURIComponent(oppCode)}`,
      { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (alive) setHeader(d?.data ?? d); })
      .catch(e => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [oppCode]);

  return { header, loading, err };
};

// ─── TRANSACTION table (R1-R6) ────────────────────────────────────────────────
const PAGE_SIZE = 10;

/* Export walks the same endpoint the grid uses, in bigger pages, until the
   campaign total is reached. The cap is a runaway guard, not a business rule. */
const EXPORT_PAGE_SIZE = 2000;
const EXPORT_MAX_PAGES = 100;

const mapTransRow = (r) => ({
  ...r,
  __therapist: (r?.therapistname||r?.therapistName||r?.THERAPISTNAME||"").toString().trim(),
  __apptStamp: stamp(toMidnight(r?.appointmentdatetime||r?.appointmentDateTime||"")),
  __fuStamp:   stamp(toMidnight(r?.followUpDate||r?.followupdate||"")),
  __fuMin:     (()=>{const raw=(r?.followUptime||r?.followUpTime||"").toString().trim();const m=raw.match(/^(\d{1,2}):(\d{2})/);if(!m)return NaN;let h=Number(m[1])%12;if((r?.followUpAMPM||r?.followupampm||"").toString().trim().toUpperCase()==="PM")h+=12;return h*60+Number(m[2]);})(),
  __q: [r?.custID,r?.custName,r?.custMobileNo,r?.oppStatus,ownerLabel(r?.salesOwner),r?.disposition,
        r?.therapistname,r?.therapistName].map(x=>(x??"").toString().toLowerCase()).join("|"),
});

/* ── Per-campaign, per-section view state ───────────────────────────────────────
   An agent working a campaign opens a lead, converts it, books, and comes back.
   The section remounts and previously reset to page 1 with every filter cleared,
   so they had to re-filter and re-find their place on every single lead.

   Filters, paging and scroll are remembered per campaign here. sessionStorage (not
   local) so it lasts the working session and dies with the tab.

   R7's own filter persistence under cd:extF:<oppCode> predates this and is left
   exactly as it was — this adds paging and scroll alongside it rather than
   rewriting a working mechanism. */
const viewKey  = (section, oppCode) => `cd:view:${section}:${oppCode || ""}`;
const loadView = (section, oppCode) => {
  try { return JSON.parse(sessionStorage.getItem(viewKey(section, oppCode)) || "{}") || {}; }
  catch { return {}; }
};
const saveView = (section, oppCode, patch) => {
  try {
    sessionStorage.setItem(
      viewKey(section, oppCode),
      JSON.stringify({ ...loadView(section, oppCode), ...patch })
    );
  } catch { /* private mode / quota — remembering the view is best-effort */ }
};

/* Restores scroll once the rows are actually on screen; restoring earlier just
   scrolls a short page back to the top. */
const useViewScroll = (section, oppCode, ready) => {
  const doneRef = useRef(false);
  useEffect(() => {
    if (!ready || doneRef.current) return;
    doneRef.current = true;
    const y = Number(loadView(section, oppCode).scrollY || 0);
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [ready, section, oppCode]);

  useEffect(() => {
    let t = 0;
    const onScroll = () => {
      if (t) return;
      t = setTimeout(() => {
        t = 0;
        saveView(section, oppCode, { scrollY: Math.round(window.scrollY || 0) });
      }, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (t) clearTimeout(t); };
  }, [section, oppCode]);
};

/* True on every render except the first. The page-reset effects below fire on
   mount as well as on change, which would wipe a restored page number. */
const useAfterMount = () => {
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);
  return mounted;
};

const HALF_HOURS = Array.from({length:24},(_, h) =>
  [0,30].map(m => `${String(((h+11)%12)+1).padStart(2,"0")}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`)
).flat();

function TransactionSection({ oppCode, header, fromDate, toDate, churnKey=0, apptMandatory=true }) {
  const ruleCode = String(header?.oRuleCode||"").trim().toUpperCase();
  const showAppt = ["R1","R2","R3","R4"].includes(ruleCode);   // Appt Date col+filter for R1/R2 too

  const [rows,    setRows]    = useState([]);
  const [apptMap, setApptMap] = useState({});   // LTR: recid → { appointmentId, apptStatus }
  useEffect(() => {
    const ids = (rows || []).map(r => r && r.recid).filter(Boolean);
    if (!ids.length) { setApptMap({}); return; }
    let alive = true;
    fetchLeadAppointments("TRANS", ids).then(m => { if (alive) setApptMap(m); });
    return () => { alive = false; };
  }, [rows]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  // Filters — seeded from the remembered view so returning from a lead lands the
  // agent back on the same filtered page.
  const _v = loadView("trans", oppCode);
  const [status,  setStatus]  = useState(_v.status    ?? "");
  const [owner,   setOwner]   = useState(_v.owner     ?? "");
  const [disp,    setDisp]    = useState(_v.disp      ?? "");
  // Lead Score band. Sent to the server: this grid is server-paged, so filtering
  // it here would only filter the batch on screen rather than the campaign.
  const [scoreBand, setScoreBand] = useState(_v.scoreBand ?? "");
  const [therapist,setTherapist] = useState(_v.therapist ?? "");
  const [search,  setSearch]  = useState(_v.search    ?? "");
  const [srchDraft,setSrchDraft] = useState(_v.search ?? "");

  const [apptFrom, setApptFrom] = useState(_v.apptFrom ?? "");
  const [apptTo,   setApptTo]   = useState(_v.apptTo   ?? "");

  // Audit ranges — Created / Modified. Applied to the loaded batch client-side,
  // same as the follow-up filters below.
  const [createdFrom, setCreatedFrom] = useState(_v.createdFrom ?? "");
  const [createdTo,   setCreatedTo]   = useState(_v.createdTo   ?? "");
  const [modFrom,     setModFrom]     = useState(_v.modFrom     ?? "");
  const [modTo,       setModTo]       = useState(_v.modTo       ?? "");

  const [fuMode,  setFuMode]  = useState(_v.fuMode  ?? "");
  const [fuFrom,  setFuFrom]  = useState(_v.fuFrom  ?? "");
  const [fuTo,    setFuTo]    = useState(_v.fuTo    ?? "");
  const [fuTFrom, setFuTFrom] = useState(_v.fuTFrom ?? "");
  const [fuTTo,   setFuTTo]   = useState(_v.fuTTo   ?? "");

  const [sort, setSort] = useState(_v.sort ?? { key:"", dir:"asc" });
  const [page, setPage] = useState(Number(_v.page) || 1);
  const [pageSize, setPageSize] = useState(Number(_v.pageSize) || PAGE_SIZE);
  const mountedRef = useAfterMount();

  const navigate = useNavigate();

  // debounce search
  useEffect(() => {
    const t = setTimeout(()=>setSearch(srchDraft), 250);
    return ()=>clearTimeout(t);
  }, [srchDraft]);

  const [serverTotal, setServerTotal] = useState(0);
  // serverPage/SERVER_PAGE_SIZE are gone - the displayed page IS the server page.

  const serverFilterBody = () => ({
    oppCode, fromDate, toDate,
    search, status, owner, disp, therapist, scoreBand,
    apptFrom: showAppt ? apptFrom : "",
    apptTo:   showAppt ? apptTo   : "",
    createdFrom, createdTo, modifiedFrom: modFrom, modifiedTo: modTo,
  });

  // Fetch current page — ALL filters sent to server
  useEffect(() => {
    if (!oppCode||!fromDate||!toDate) return;
    let alive = true;
    setLoading(true); setErr(""); setExportMsg("");
    fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
      method:"POST", headers: authHeaders(),
      body: JSON.stringify({ ...serverFilterBody(), page, pageSize }),
    })
      .then(r=>r.json())
      .then(d => {
        if (!alive) return;
        const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setServerTotal(d?.totalCount ?? arr.length);
        setRows(arr.map(mapTransRow));
      })
      .catch(e=>{ if(alive) setErr(e.message); })
      .finally(()=>{ if(alive) setLoading(false); });
    return()=>{ alive=false; };
  }, [oppCode, fromDate, toDate, page, pageSize, search, status, owner, disp, therapist, scoreBand, apptFrom, apptTo,
      createdFrom, createdTo, modFrom, modTo, churnKey]);

  useEffect(() => {
    if (!showAppt && (apptFrom || apptTo)) { setApptFrom(""); setApptTo(""); }
  }, [showAppt, apptFrom, apptTo]);

  // Reset to page 1 when server-side filters change — but NOT on mount, which would
  // discard the page number we just restored.
  useEffect(()=>{ if (!mountedRef.current) return; setPage(1); },
    [search, status, owner, disp, therapist, scoreBand, apptFrom, apptTo, createdFrom, createdTo, modFrom, modTo]);
  // Reset display page when client filters change
  useEffect(()=>{ if (!mountedRef.current) return; setPage(1); },
    [disp,scoreBand,therapist,apptFrom,apptTo,fuMode,fuFrom,fuTo,fuTFrom,fuTTo,createdFrom,createdTo,modFrom,modTo,pageSize]);

  // Remember the view for the trip to a lead and back.
  useEffect(() => {
    saveView("trans", oppCode, {
      status, owner, disp, therapist, scoreBand, search, apptFrom, apptTo,
      createdFrom, createdTo, modFrom, modTo,
      fuMode, fuFrom, fuTo, fuTFrom, fuTTo,
      sort, page, pageSize,
    });
  }, [oppCode, status, owner, disp, therapist, scoreBand, search, apptFrom, apptTo,
      createdFrom, createdTo, modFrom, modTo,
      fuMode, fuFrom, fuTo, fuTFrom, fuTTo, sort, page, pageSize]);

  useViewScroll("trans", oppCode, !loading && rows.length > 0);

  // Filter options loaded from server once (not from current page rows)
  const [allOwnerOpts,    setAllOwnerOpts]    = useState([]);
  const [allDispOpts,     setAllDispOpts]     = useState([]);
  const [allTherapistOpts,setAllTherapistOpts]= useState([]);

  useEffect(() => {
    if (!oppCode||!fromDate||!toDate) return;
    fetch(`${API_BASE_URL}/api/Opportunity/LoadOppFilterOptions`, {
      method:"POST", headers: authHeaders(),
      body: JSON.stringify({ oppCode, fromDate, toDate }),
    })
      .then(r=>r.json())
      .then(d => {
        if (!d?.data) return;
        setAllOwnerOpts(   ["", ...( d.data.owners      || [])]);
        setAllDispOpts(    ["", ...(d.data.dispositions || [])]);
        setAllTherapistOpts(["", ...(d.data.therapists  || [])]);
      })
      .catch(()=>{});
  }, [oppCode, fromDate, toDate]);

  // Fall back to page rows if options endpoint not yet loaded
  const ownerOpts    = withAllAndUnassigned(allOwnerOpts.length > 1 ? allOwnerOpts : rows.map(r=>r?.salesOwner));
  const dispOpts     = allDispOpts.length     > 1 ? allDispOpts     : ["", ...new Set(rows.map(r=>r?.disposition||"").filter(Boolean))];
  const therapistOpts= allTherapistOpts.length> 1 ? allTherapistOpts: ["", ...new Set(rows.map(r=>r?.__therapist||"").filter(Boolean))];

  const fuDateRange = useMemo(()=>{
    const today=new Date(); today.setHours(0,0,0,0);
    if (fuMode==="0") { const s=+today; return {from:s,to:s}; }
    if (fuMode==="1") { const t=new Date(today); t.setDate(t.getDate()+1); const s=+t; return {from:s,to:s}; }
    if (fuMode==="2" && fuFrom && fuTo) {
      const f=stamp(toMidnight(fuFrom)), t=stamp(toMidnight(fuTo));
      if (f>t) return {invalid:true};   // From after To → surface error, show no records
      return {from:f,to:t};
    }
    return null;
  }, [fuMode,fuFrom,fuTo]);

  const to24h = (slot) => {
    if (!slot) return "";
    const m=String(slot).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if(!m) return "";
    let h=Number(m[1])%12; if((m[3]||"").toUpperCase()==="PM") h+=12;
    return `${String(h).padStart(2,"0")}:${m[2]}`;
  };
  const filterTFrom = to24h(fuTFrom);
  const filterTTo   = to24h(fuTTo);

  const createdBad = rangeInvalid(createdFrom, createdTo);
  const modBad     = rangeInvalid(modFrom,     modTo);

  const narrowClient = (input) => {
    let list = input.slice();
    // apptDate is server-side for R3/R4; followUp date/time remain client-side
    if (fuDateRange?.invalid) return [];   // FU From date after To date → no records
    if (createdBad || modBad) return [];   // Created / Modified From after To → no records
    if (createdFrom || createdTo)
      list = list.filter(r => inDateRange(r?.createddate ?? r?.createdDate, createdFrom, createdTo));
    if (modFrom || modTo)
      list = list.filter(r => inDateRange(r?.modifieddate ?? r?.modifiedDate, modFrom, modTo));
    if (fuDateRange) list=list.filter(r=>{
      const s=r.__fuStamp; if(isNaN(s)) return false;
      return s>=fuDateRange.from&&s<=fuDateRange.to;
    });
    if (filterTFrom||filterTTo) {
      const fMin=timeToMin(filterTFrom), tMin=timeToMin(filterTTo);
      list=list.filter(r=>{
        if(isNaN(r.__fuMin)) return false;
        if(!isNaN(fMin)&&r.__fuMin<fMin) return false;
        if(!isNaN(tMin)&&r.__fuMin>tMin) return false;
        return true;
      });
    }
    return list;
  };

  const filtered = useMemo(()=>{
    let list = narrowClient(rows);
    if (sort.key) {
      const dir=sort.dir==="asc"?1:-1;
      const numericKey = sort.key==="recid" || sort.key==="leadScore";
      list=[...list].sort((a,b)=>{
        if (numericKey) {
          const an=Number(a?.[sort.key])||0, bn=Number(b?.[sort.key])||0;
          return an<bn?-dir:an>bn?dir:0;
        }
        const av=(a?.[sort.key]??"").toString().toLowerCase();
        const bv=(b?.[sort.key]??"").toString().toLowerCase();
        return av<bv?-dir:av>bv?dir:0;
      });
    }
    return list;
  }, [rows,search,status,owner,disp,therapist,showAppt,apptFrom,apptTo,fuDateRange,filterTFrom,filterTTo,sort,
      createdFrom,createdTo,modFrom,modTo,createdBad,modBad]);

  // ONE level of paging. The server already applies every filter and returns
  // exactly one page, so the rows in hand ARE the page - slicing them again
  // produced the old two-level "batch N of M" behaviour and meant a campaign
  // with 120,000 leads tried to walk 5,000-row batches until it timed out.
  const clientTotalPages = Math.max(1, Math.ceil(serverTotal/pageSize));
  const totalPages = clientTotalPages;
  const paged = filtered;

  /* Backstop for the whole pattern above: every filter is supposed to reset the
     page, but that relies on a hand-maintained dependency list, and one filter
     was missed the moment a new one was added. This catches it structurally —
     if the current page no longer exists after filtering, go back to page 1. */
  useEffect(() => { if (page > clientTotalPages) setPage(1); }, [page, clientTotalPages]);


  // Filter summary for the panel header
  const activeCount = [status,owner,disp,scoreBand,therapist,search,
    showAppt?apptFrom:"", showAppt?apptTo:"", fuMode,
    fuMode==="2"?fuFrom:"", fuMode==="2"?fuTo:"",
    fuTFrom,fuTTo,createdFrom,createdTo,modFrom,modTo].filter(Boolean).length;
  const clearAll = () => {
    setStatus(""); setOwner(""); setDisp(""); setScoreBand(""); setTherapist("");
    setSrchDraft(""); setSearch("");
    setApptFrom(""); setApptTo("");
    setFuMode(""); setFuFrom(""); setFuTo(""); setFuTFrom(""); setFuTTo("");
    setCreatedFrom(""); setCreatedTo(""); setModFrom(""); setModTo("");
  };

  const onSort = (key) => setSort(p => p.key===key?{key,dir:p.dir==="asc"?"desc":"asc"}:{key,dir:"asc"});
  const sortArrow = (k) => sort.key===k?(sort.dir==="asc"?"↑":"↓"):"↕";

  const openRow = (row) => {
    const rc = ruleCode;
    // R1–R4 (transaction rules) all open the No Show detail page
    if (rc==="R1" || rc==="R2" || rc==="R3" || rc==="R4")
      return navigate(`/opportunity/${oppCode}/noshow/${row.custID}`,{state:{row,header,oppCode}});
    // R5/R6 (master rules) → master lead form (customer prefilled, master-transtype dispositions)
    navigate(`/opportunity/master/${oppCode}/lead/${row.custID}`,{state:{row,header,oppCode}});
  };

  const buildCSV = (list) => {
    const hdrs=["ProspectID","CustID","CustName","Mobile","Status","Disposition","LeadScore","LeadType","Doctor/Therapist",
      showAppt?"ApptDate":"","Remarks","SalesOwner","ModifiedBy","ModifiedDate","CreatedDate"].filter(Boolean);
    const esc=(v)=>{const s=String(v??"");return (s.includes(",")||s.includes('"'))?`"${s.replace(/"/g,'""')}"`:s;};
    return [hdrs.join(","),...list.map(r=>[
      fmtProspectId(r.recid),r.custID,r.custName,r.custMobileNo,r.oppStatus,r.disposition,
      r.leadScore ?? "", r.scoreBand ?? "",
      r.__therapist, ...(showAppt?[fmtDate(r.appointmentdatetime)]:[] ),
      r.remarks,ownerLabel(r.salesOwner),r.modifiedBy,fmtDate(r.modifieddate),fmtDate(r.createddate),
    ].map(esc).join(","))].join("\n");
  };

  const fetchExportPage = async (p) => {
    const res = await fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
      method:"POST", headers: authHeaders(),
      body: JSON.stringify({ ...serverFilterBody(), page: p, pageSize: EXPORT_PAGE_SIZE }),
    });
    const d = await res.json();
    return {
      rows:  (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []).map(mapTransRow),
      total: Number(d?.totalCount ?? 0),
    };
  };

  const exportCSV = async () => {
    if (exporting) return;
    setExporting(true); setExportMsg("");
    try {
      const all = [];
      let total = 0, truncated = false, p = 1;
      for (;;) {
        const batch = await fetchExportPage(p);
        if (p === 1) total = batch.total;
        all.push(...batch.rows);
        if (batch.rows.length < EXPORT_PAGE_SIZE) break;
        if (total && all.length >= total) break;
        if (p >= EXPORT_MAX_PAGES) { truncated = true; break; }
        p += 1;
      }
      const list  = narrowClient(all);
      if (!list.length) { setExportMsg("Nothing to export — no records match these filters."); return; }
      const blob  = new Blob([buildCSV(list)],{type:"text/csv;charset=utf-8"});
      const url   = URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download=`${oppCode}-details.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setExportMsg(truncated
        ? `Exported the first ${list.length.toLocaleString()} records — the campaign has more than this export can pull in one go.`
        : `Exported ${list.length.toLocaleString()} record${list.length===1?"":"s"}.`);
    } catch (e) {
      setExportMsg(`Export failed: ${e.message}. Narrow the filters and try again.`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Filters */}
      <FilterPanel activeCount={activeCount} onClear={clearAll}>
        <div className="cd-fg">
          <label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">All</option>
            <option>Open</option>
            <option>Closed</option>
          </select>
        </div>
        <div className="cd-fg">
          <label>Sales Owner</label>
          <select value={owner} onChange={e=>setOwner(e.target.value)}>
            {ownerOpts.map((o,i)=><option key={i} value={o}>{ownerOptionLabel(o)}</option>)}
          </select>
        </div>
        <div className="cd-fg">
          <label>Disposition</label>
          <select value={disp} onChange={e=>setDisp(e.target.value)}>
            {dispOpts.map((d,i)=><option key={i} value={d}>{d||"All"}</option>)}
          </select>
        </div>
        <ScoreFilter value={scoreBand} onChange={setScoreBand} />
        <div className="cd-fg">
          <label>Doctor/Therapist</label>
          <select value={therapist} onChange={e=>setTherapist(e.target.value)}>
            {therapistOpts.map((t,i)=><option key={i} value={t}>{t||"All"}</option>)}
          </select>
        </div>
        <div className="cd-fg">
          <label>Follow Up Date</label>
          <select value={fuMode} onChange={e=>setFuMode(e.target.value)}>
            <option value="">All</option>
            <option value="0">Today</option>
            <option value="1">Tomorrow</option>
            <option value="2">Date Range</option>
          </select>
        </div>
        <div className="cd-fg">
          <label>Follow Up Time</label>
          <div className="cd-timepair">
            <select aria-label="Follow up time from" value={fuTFrom} onChange={e=>setFuTFrom(e.target.value)}>
              <option value="">From —</option>
              {HALF_HOURS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="Follow up time to" value={fuTTo} onChange={e=>setFuTTo(e.target.value)}>
              <option value="">To —</option>
              {HALF_HOURS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <RangeField label="Follow Up Date Range" presets={false}
          disabled={fuMode!=="2"} offNote="Set Follow Up Date to “Date Range” to use this."
          from={fuFrom} to={fuTo} onFrom={setFuFrom} onTo={setFuTo} />
        <RangeField label="Appointment Date" presets={false}
          na={!showAppt} offNote="NA — this campaign type has no appointment date."
          from={apptFrom} to={apptTo} onFrom={setApptFrom} onTo={setApptTo} />
        <RangeField label="Created Date"
          from={createdFrom} to={createdTo} onFrom={setCreatedFrom} onTo={setCreatedTo} />
        <RangeField label="Modified Date"
          from={modFrom} to={modTo} onFrom={setModFrom} onTo={setModTo} />
      </FilterPanel>

      <div className="cd-searchrow">
        <span className="cd-count"><b>{filtered.length.toLocaleString()}</b> record{filtered.length===1?"":"s"}</span>
        <div className="cd-searchwrap">
          <span className="cd-searchicon">⌕</span>
          <input className="cd-search" placeholder="Search ID, name, phone, status…"
            value={srchDraft} onChange={e=>setSrchDraft(e.target.value)} />
          {srchDraft && <button className="cd-searchx" title="Clear search" onClick={()=>setSrchDraft("")}>✕</button>}
        </div>
        <button className="cd-btn-sec" onClick={exportCSV} disabled={exporting}>
          {exporting ? "Exporting…" : "⭳ Export CSV"}
        </button>
        {exportMsg && <span className="cd-fgnote cd-exportmsg">{exportMsg}</span>}
      </div>

      {loading && <Skeleton cols={showAppt?15:14} />}
      {err     && <ErrMsg msg={err} />}
      {!loading && !err && (
        paged.length ? (
          <div className="cd-tablewrap">
            <table className="cd-table">
              <thead><tr>
                <th onClick={()=>onSort("recid")}>Prospect ID {sortArrow("recid")}</th>
                <th onClick={()=>onSort("custID")}>Cust ID {sortArrow("custID")}</th>
                <th onClick={()=>onSort("custName")}>Name {sortArrow("custName")}</th>
                <th onClick={()=>onSort("custMobileNo")}>Mobile {sortArrow("custMobileNo")}</th>
                <th onClick={()=>onSort("oppStatus")}>Status {sortArrow("oppStatus")}</th>
                <th onClick={()=>onSort("disposition")}>Disposition {sortArrow("disposition")}</th>
                <th onClick={()=>onSort("leadScore")}>Lead Score {sortArrow("leadScore")}</th>
                <th>Appointment ID</th>
                <th onClick={()=>onSort("__therapist")}>Doctor/Therapist {sortArrow("__therapist")}</th>
                {showAppt && <th onClick={()=>onSort("appointmentdatetime")}>Appt Date {sortArrow("appointmentdatetime")}</th>}
                <th>Remarks</th>
                <th onClick={()=>onSort("salesOwner")}>Sales Owner {sortArrow("salesOwner")}</th>
                <th onClick={()=>onSort("modifiedBy")}>Modified By {sortArrow("modifiedBy")}</th>
                <th onClick={()=>onSort("modifieddate")}>Modified Date {sortArrow("modifieddate")}</th>
                <th onClick={()=>onSort("createddate")}>Created Date {sortArrow("createddate")}</th>
              </tr></thead>
              <tbody>
                {paged.map((r,i) => (
                  <tr key={`${r.recid||i}-${i}`}>
                    <td><button className="cd-link" onClick={()=>openRow(r)}>{fmtProspectId(r.recid)}</button></td>
                    <td><button className="cd-link" onClick={()=>openRow(r)}>{safe(r.custID)}</button></td>
                    <td>{safe(r.custName)}</td>
                    <td>{safe(r.custMobileNo)}</td>
                    <td><Pill v={r.oppStatus} /></td>
                    <td><Pill v={r.disposition} /></td>
                    <td><ScoreCell row={r} /></td>
                    <td><ApptMapCell leadSource="TRANS" recId={r.recid} custId={r.custID} oppCode={oppCode}
                        apptMandatory={apptMandatory}
                        disposition={r.disposition} mapped={apptMap[String(r.recid)]?.appointmentId}
                        onLinked={(id,aid)=>setApptMap(p=>({...p,[String(id)]:{appointmentId:aid,apptStatus:"Booked"}}))} /></td>
                    <td>{safe(r.__therapist)}</td>
                    {showAppt && <td>{fmtDate(r.appointmentdatetime||r.appointmentDateTime)}</td>}
                    <td><Clamp v={r.remarks} /></td>
                    <td>{ownerLabel(r.salesOwner)}</td>
                    <td>{safe(r.modifiedBy)}</td>
                    <td>{fmtDate(r.modifieddate||r.modifiedDate)}</td>
                    <td>{fmtDate(r.createddate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyNote />
      )}
      <div className="cd-server-pager">
        <span className="cd-count">
          {serverTotal>0
            ? <>showing <b>{((page-1)*pageSize+1).toLocaleString()}–{Math.min(page*pageSize,serverTotal).toLocaleString()}</b> of {serverTotal.toLocaleString()} records</>
            : "no records"}
        </span>
      </div>
      <Pager page={page} totalPages={clientTotalPages} onPage={setPage}
        pageSize={pageSize} onPageSize={setPageSize} />
    </div>
  );
}

// ─── EXTERNAL section (R7) ────────────────────────────────────────────────────

function ExternalSection({ oppCode, churnKey=0, apptMandatory=true }) {
  const [rows,       setRows]       = useState([]);
  const [apptMap,    setApptMap]    = useState({});   // LTR: recid → { appointmentId, apptStatus }
  useEffect(() => {
    const ids = (rows || []).map(r => r && r.recid).filter(Boolean);
    if (!ids.length) { setApptMap({}); return; }
    let alive = true;
    fetchLeadAppointments("EXTERNAL", ids).then(m => { if (alive) setApptMap(m); });
    return () => { alive = false; };
  }, [rows]);
  const [serverTotal,setServerTotal]= useState(0);
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState("");
  const _sf = (() => { try { return JSON.parse(sessionStorage.getItem(`cd:extF:${oppCode}`) || "{}") || {}; } catch { return {}; } })();
  // Paging/scroll live alongside the existing cd:extF filter blob, not inside it.
  const _v  = loadView("ext", oppCode);
  const [page,       setPage]       = useState(Number(_v.page) || 1);
  const mountedRef = useAfterMount();
  const [status,     setStatus]     = useState(_sf.status   ?? "");
  const [owner,      setOwner]      = useState(_sf.owner    ?? "");
  const [disp,       setDisp]       = useState(_sf.disp     ?? "");
  // Lead Score band. Client-side here: the page already pulls the whole campaign
  // and filters it in the browser, so the band goes through the same path.
  const [scoreBand,  setScoreBand]  = useState(_sf.scoreBand ?? "");
  const [doctorFilter, setDoctorFilter] = useState(_sf.doctorFilter ?? "");
  const [srchDraft,  setSrchDraft]  = useState(_sf.search   ?? "");
  const [search,     setSearch]     = useState(_sf.search   ?? "");
  const [fromDate,   setFromDate]   = useState(_sf.fromDate ?? todayISO());   // Created From (server-side)
  const [toDate,     setToDate]     = useState(_sf.toDate   ?? todayISO());   // Created To   (server-side)
  const [modFrom,    setModFrom]    = useState(_sf.modFrom  ?? "");           // Modified From (client-side)
  const [modTo,      setModTo]      = useState(_sf.modTo    ?? "");           // Modified To   (client-side)

  const [fuMode,     setFuMode]     = useState(_sf.fuMode   ?? "");
  const [fuFrom,     setFuFrom]     = useState(_sf.fuFrom   ?? "");
  const [fuTo,       setFuTo]       = useState(_sf.fuTo     ?? "");
  const [fuTFrom,    setFuTFrom]    = useState(_sf.fuTFrom  ?? "");
  const [fuTTo,      setFuTTo]      = useState(_sf.fuTTo    ?? "");

  const [ownerOpts,  setOwnerOpts]  = useState([]);
  const [dispOpts,   setDispOpts]   = useState([]);
  const [pageSize,   setPageSize]   = useState(Number(_v.pageSize) || PAGE_SIZE);

  const navigate = useNavigate();

  useEffect(()=>{
    const t=setTimeout(()=>setSearch(srchDraft),250);
    return()=>clearTimeout(t);
  },[srchDraft]);

  useEffect(() => { saveView("ext", oppCode, { page, pageSize }); }, [oppCode, page, pageSize]);

  useViewScroll("ext", oppCode, !loading && rows.length > 0);

  // Load filter options
  useEffect(()=>{
    if(!oppCode) return;
    fetch(`${API_BASE_URL}/api/Opportunity/GetExternalOppFilterOptions/${encodeURIComponent(oppCode)}`,
      {headers:authHeaders()})
      .then(r=>r.json())
      .then(d=>{setOwnerOpts(d?.owners||[]);setDispOpts(d?.dispositions||[]);})
      .catch(()=>{});
  },[oppCode]);

  // ONE page per request. Loading the whole campaign - first as a single
  // pageSize:5000 call, then as a loop of 5,000-row batches - worked while
  // campaigns were small but times out on the 120,000-lead ones. The server
  // applies search, status, owner and disposition, so the page in hand is the
  // page to show.
  //
  // TRADE-OFF, worth knowing: the follow-up date/time filters and the
  // "unassigned" owner option are applied client-side below and the endpoint
  // has no equivalent, so they now narrow only the current page. Making them
  // whole-campaign filters needs LoadExternalOppDetails to accept them.
  useEffect(()=>{
    if(!oppCode) return;
    let alive=true; setLoading(true); setErr("");

    fetch(`${API_BASE_URL}/api/Opportunity/LoadExternalOppDetails`, {
      method:"POST", headers:authHeaders(),
      body:JSON.stringify({
        oppCode, fromDate, toDate,
        pageNumber: page, pageSize,
        searchTerm:search, statusFilter:status,
        ownerFilter: owner === UNASSIGNED_VALUE ? "" : owner, dispFilter:disp,
      }),
    })
      .then(r=>r.json())
      .then(d=>{
        if(!alive) return;
        const list  = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        const total = d?.totalCount ?? d?.total ?? list.length;
        setServerTotal(total);
        setRows(list.map(x=>{
          // followUpDate: mask 1900 placeholder
          const fuDateRaw = x?.followUpDate || "";
          const fuDateISO = toISODateOnly(fuDateRaw);
          const fuDateClean = fuDateISO && !fuDateISO.startsWith("1900") ? fuDateISO : "";

          // oppStatus: normalize 0/1/2 or string
          const st = x?.oppStatus;
          let oppStatusLabel = "";
          if (st === 0 || st === "0")       oppStatusLabel = "Open";
          else if (st === 2 || st === "2")  oppStatusLabel = "Closed";
          // 0|1 = Open
          else oppStatusLabel = String(st||"").trim() || "Open";

          // custName: prefer nameEnglish if custName looks like a phone number
          const rawName  = String(x?.custName   || "").trim();
          const engName  = String(x?.nameEnglish|| "").trim();
          const isPhone  = /^\d{7,}$/.test(rawName.replace(/\s/g,""));
          const bestName = (!rawName || isPhone) && engName ? engName : rawName;

          return {
            ...x,
            recid:      String(x?.recid || ""),
            oppStatus:  oppStatusLabel,
            custName:   bestName,
            doctor:     String(x?.doctorName || x?.doctor || x?.Doctor
                            || x?.therapistName || x?.therapistname || "").trim(),
            followUpDate: fuDateClean,
            __fuStamp:  fuDateClean ? stamp(toMidnight(fuDateClean)) : NaN,
            __fuMin:    (() => {
              const raw = String(x?.followUptime || x?.followUpTime || "").trim().toUpperCase();
              let m = raw.match(/T(\d{2}):(\d{2})/);
              if (m) return (+m[1]) * 60 + (+m[2]);
              m = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/);
              if (!m) return NaN;
              let h = +m[1];
              const ap = m[3] || String(x?.followUpAMPM || "").trim().toUpperCase();
              if (ap) { h = h % 12; if (ap === "PM") h += 12; }
              return h * 60 + (+m[2]);
            })(),
            __fuLabel:  (() => {
              const raw = String(x?.followUptime || x?.followUpTime || "").trim();
              const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
              if (!m) return "";
              let hh = parseInt(m[1], 10);
              const mm = m[2];
              const ap = (m[3] || String(x?.followUpAMPM || "")).trim().toUpperCase();
              const label = (hh > 12 || hh === 0) ? (hh >= 12 ? "PM" : "AM") : (ap || (hh === 12 ? "PM" : "AM"));
              let h12 = hh % 12; if (h12 === 0) h12 = 12;
              return `${String(h12).padStart(2, "0")}:${mm} ${label}`;
            })(),
          };
        }));
      })
      .catch(e=>{if(alive)setErr(e.message);})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[oppCode,fromDate,toDate,page,pageSize,search,status,owner,disp,churnKey]);

  useEffect(()=>{ if (!mountedRef.current) return; setPage(1); },
    [search,status,owner,disp,scoreBand,doctorFilter,fromDate,toDate,fuMode,fuFrom,fuTo,fuTFrom,fuTTo,modFrom,modTo,pageSize]);

  const fuDateRange = useMemo(()=>{
    const today=new Date(); today.setHours(0,0,0,0);
    if(fuMode==="0"){const s=+today;return{from:s,to:s};}
    if(fuMode==="1"){const t=new Date(today);t.setDate(t.getDate()+1);const s=+t;return{from:s,to:s};}
    if(fuMode==="2"&&fuFrom&&fuTo){
      let f=stamp(toMidnight(fuFrom)),t=stamp(toMidnight(fuTo));
      if(f>t){const tmp=f;f=t;t=tmp;}
      return{from:f,to:t};
    }
    return null;
  },[fuMode,fuFrom,fuTo]);

  const to24h = (slot) => {
    if (!slot) return "";
    const m=String(slot).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if(!m) return "";
    let h=Number(m[1])%12; if((m[3]||"").toUpperCase()==="PM") h+=12;
    return `${String(h).padStart(2,"0")}:${m[2]}`;
  };
  const filterTFrom = to24h(fuTFrom);
  const filterTTo   = to24h(fuTTo);

  const doctorOpts = useMemo(()=>["", ...new Set(rows.map(r=>r?.doctor).filter(Boolean))],[rows]);

  const createdBad = rangeInvalid(fromDate, toDate);
  const modBad     = rangeInvalid(modFrom,  modTo);

  const filtered = useMemo(()=>{
    let list=rows.slice();
    if(createdBad||modBad) return [];   // Created / Modified From after To → no records
    if(owner === UNASSIGNED_VALUE) list=list.filter(r=>isUnassignedOwner(r?.salesOwner));
    if(scoreBand) list=list.filter(r=>matchesScoreBand(r, scoreBand));
    if(doctorFilter) list=list.filter(r=>norm(r?.doctor)===norm(doctorFilter));
    if(modFrom||modTo) list=list.filter(r=>inDateRange(r?.modifieddate ?? r?.modifiedDate, modFrom, modTo));
    if(fuDateRange) list=list.filter(r=>{
      const s=r.__fuStamp; if(isNaN(s)) return false;
      return s>=fuDateRange.from&&s<=fuDateRange.to;
    });
    const fMin=timeToMin(filterTFrom), tMin=timeToMin(filterTTo);
    if(!isNaN(fMin)&&!isNaN(tMin)&&fMin>tMin) return [];   // OPP-012: To earlier than From
    if(!isNaN(fMin)||!isNaN(tMin)) list=list.filter(r=>{
      if(isNaN(r.__fuMin)) return false;
      if(!isNaN(fMin)&&r.__fuMin<fMin) return false;
      if(!isNaN(tMin)&&r.__fuMin>tMin) return false;
      return true;
    });
    return list;
  },[rows,owner,scoreBand,doctorFilter,fuDateRange,filterTFrom,filterTTo,modFrom,modTo,createdBad,modBad]);

  // The server returns one page and reports the campaign total, so paging is
  // driven by serverTotal. `filtered` still applies the client-only follow-up
  // and score filters, which narrow the visible page rather than the campaign.
  const totalPages = Math.max(1, Math.ceil(serverTotal/pageSize));
  const paged = filtered;

  const activeCount = [status,owner,disp,scoreBand,doctorFilter,search,fuMode,
    fuMode==="2"?fuFrom:"", fuMode==="2"?fuTo:"",
    fuTFrom,fuTTo,modFrom,modTo].filter(Boolean).length;
  const clearAll = () => {
    setStatus(""); setOwner(""); setDisp(""); setScoreBand(""); setDoctorFilter(""); setSrchDraft(""); setSearch("");
    setFuMode(""); setFuFrom(""); setFuTo(""); setFuTFrom(""); setFuTTo("");
    setModFrom(""); setModTo("");
  };
  const fuTimeError = !isNaN(timeToMin(filterTFrom)) && !isNaN(timeToMin(filterTTo)) && timeToMin(filterTFrom) > timeToMin(filterTTo);
  useEffect(() => {
    try { sessionStorage.setItem(`cd:extF:${oppCode}`, JSON.stringify({ status, owner, disp, scoreBand, doctorFilter, search, fromDate, toDate, modFrom, modTo, fuMode, fuFrom, fuTo, fuTFrom, fuTTo })); } catch {}
  }, [oppCode, status, owner, disp, scoreBand, doctorFilter, search, fromDate, toDate, modFrom, modTo, fuMode, fuFrom, fuTo, fuTFrom, fuTTo]);

  return (
    <div>
      <FilterPanel activeCount={activeCount} onClear={clearAll}>
        <div className="cd-fg">
          <label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div className="cd-fg">
          <label>Sales Owner</label>
          <SearchableSelect options={withUnassigned(ownerOpts)} value={owner} onChange={setOwner}
            labelOf={(o)=>ownerOptionLabel(o)} placeholder="All Owners" />
        </div>
        <div className="cd-fg">
          <label>Disposition</label>
          <SearchableSelect options={dispOpts} value={disp} onChange={setDisp} placeholder="All Dispositions" />
        </div>
        <ScoreFilter value={scoreBand} onChange={setScoreBand} />
        <div className="cd-fg">
          <label>Doctor/Therapist</label>
          <select value={doctorFilter} onChange={e=>setDoctorFilter(e.target.value)}>
            {doctorOpts.map((d,i)=><option key={i} value={d}>{d||"All"}</option>)}
          </select>
        </div>
        <div className="cd-fg">
          <label>Follow Up Date</label>
          <select value={fuMode} onChange={e=>setFuMode(e.target.value)}>
            <option value="">All</option>
            <option value="0">Today</option><option value="1">Tomorrow</option><option value="2">Date Range</option>
          </select>
        </div>
        <div className="cd-fg">
          <label>Follow Up Time</label>
          <div className="cd-timepair">
            <select aria-label="Follow up time from" value={fuTFrom} onChange={e=>setFuTFrom(e.target.value)}>
              <option value="">From —</option>
              {HALF_HOURS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="Follow up time to" value={fuTTo} onChange={e=>setFuTTo(e.target.value)}>
              <option value="">To —</option>
              {HALF_HOURS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {fuTimeError && <span className="cd-fgnote cd-fgnote-err">“To” is earlier than “From”.</span>}
        </div>
        <RangeField label="Follow Up Date Range" presets={false}
          disabled={fuMode!=="2"} offNote="Set Follow Up Date to “Date Range” to use this."
          from={fuFrom} to={fuTo} onFrom={setFuFrom} onTo={setFuTo} />
        <RangeField label="Appointment Date" presets={false} na
          from="" to="" onFrom={()=>{}} onTo={()=>{}} />
        {/* Created range is applied by the server (LoadExternalOppDetails) and is
            always populated — clearing it would send empty dates. */}
        <RangeField label="Created Date" allowClear={false}
          from={fromDate} to={toDate} onFrom={setFromDate} onTo={setToDate} />
        <RangeField label="Modified Date"
          from={modFrom} to={modTo} onFrom={setModFrom} onTo={setModTo} />
      </FilterPanel>

      <div className="cd-searchrow">
        <span className="cd-count">{serverTotal>0
          ? <>showing <b>{((page-1)*pageSize+1).toLocaleString()}–{Math.min(page*pageSize,serverTotal).toLocaleString()}</b> of {serverTotal.toLocaleString()} records</>
          : "0 records"}</span>
        <div className="cd-searchwrap">
          <span className="cd-searchicon">⌕</span>
          <input className="cd-search" placeholder="Search customer, cust ID, mobile, remarks…"
            value={srchDraft} onChange={e=>setSrchDraft(e.target.value)} />
          {srchDraft && <button className="cd-searchx" title="Clear search" onClick={()=>setSrchDraft("")}>✕</button>}
        </div>
      </div>

      {loading && <Skeleton cols={16} />}
      {err     && <ErrMsg msg={err} />}
      {!loading && !err && (
        filtered.length ? (
          <div className="cd-tablewrap">
            <table className="cd-table">
              <thead><tr>
                <th>Lead ID</th><th>Cust ID</th><th>Lead Name</th><th>Mobile</th><th>Doctor/Therapist</th>
                <th>Status</th><th>Disposition</th><th>Lead Score</th><th>Appointment ID</th>
                <th>Follow Up Date</th><th>Follow Up Time</th>
                <th>Remarks</th><th>Sales Owner</th>
                <th>Modified By</th><th>Modified Date</th><th>Created Date</th>
              </tr></thead>
              <tbody>
                {paged.map((r,i)=>(
                  <tr key={`${r.recid||i}-${i}`}>
                    <td>
                      <button className="cd-link" onClick={()=>navigate(
                        `/opportunity/external/${encodeURIComponent(oppCode)}/lead/${encodeURIComponent(r.recid||"")}`,
                        {state:{oppCode,row:r}}
                      )}>
                        {r.recid?`LD-EX-${fmtProspectId(r.recid,"").replace("—","")||r.recid}`:"—"}
                      </button>
                    </td>
                    <td>
                      {(r.custID || r.custId)
                        ? <button className="cd-link" onClick={()=>navigate(
                            `/opportunity/external/${encodeURIComponent(oppCode)}/lead/${encodeURIComponent(r.recid||"")}`,
                            {state:{oppCode,row:r}}
                          )}>{safe(r.custID || r.custId)}</button>
                        : "—"}
                    </td>
                    <td>{safe(r.custName)}</td>
                    <td>{safe(r.custMobileNo)}</td>
                    <td>{safe(r.doctor)}</td>
                    <td><Pill v={r.oppStatus} /></td>
                    <td><Pill v={r.disposition} /></td>
                    <td><ScoreCell row={r} /></td>
                    <td><ApptMapCell leadSource="EXTERNAL" recId={r.recid} custId={r.custID||r.custId} oppCode={oppCode}
                        apptMandatory={apptMandatory}
                        disposition={r.disposition} mapped={apptMap[String(r.recid)]?.appointmentId}
                        onLinked={(id,aid)=>setApptMap(p=>({...p,[String(id)]:{appointmentId:aid,apptStatus:"Booked"}}))} /></td>
                    <td>{fmtDate(r.followUpDate)}</td>
                    <td>{safe(r.__fuLabel)}</td>
                    <td><Clamp v={r.remarks} /></td>
                    <td>{ownerLabel(r.salesOwner)}</td>
                    <td>{safe(r.modifiedBy)}</td>
                    <td>{fmtDate(r.modifieddate||r.modifiedDate)}</td>
                    <td>{fmtDate(r.createddate||r.createdDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyNote />
      )}
      <Pager page={page} totalPages={totalPages} onPage={setPage}
        pageSize={pageSize} onPageSize={setPageSize} />
    </div>
  );
}

// ─── MANUAL LEAD section ──────────────────────────────────────────────────────

const fetchManualPages = async (campaignId) => {
  const fetchPage = async (n) => {
    const url = `${API_BASE_URL}/api/LeadOpp/List?campaignId=${campaignId}&pageNumber=${n}&pageSize=200`;
    const res = await fetch(url, {headers: authHeaders()});
    return res.json();
  };
  const first = await fetchPage(1);
  const totalPages = Number(first?.totalPages)||1;
  const items = Array.isArray(first?.data)?[...first.data]:[];
  if (totalPages>1) {
    const rest = await Promise.all(Array.from({length:totalPages-1},(_,i)=>fetchPage(i+2)));
    rest.forEach(d=>{ if(Array.isArray(d?.data)) items.push(...d.data); });
  }
  return items;
};

function ManualSection({ oppCode, header, churnKey=0, apptMandatory=true }) {
  // LeadOpp.Campaign_FK = CLINIC_OPPORTUNITYDETAILS.RECID (campaignDetailId)
  // NOT CLINIC_OPPORTUNITYSUMMARY.RECID (recid)
  const campaignRecId = Number(
    header?.campaignDetailId || header?.recid || header?.recId || 0
  );

  const [rows,    setRows]    = useState([]);
  const [apptMap, setApptMap] = useState({});   // LTR: id → { appointmentId, apptStatus }
  useEffect(() => {
    const ids = (rows || []).map(r => r && r.id).filter(Boolean);
    if (!ids.length) { setApptMap({}); return; }
    let alive = true;
    fetchLeadAppointments("MANUAL", ids).then(m => { if (alive) setApptMap(m); });
    return () => { alive = false; };
  }, [rows]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const _v = loadView("manual", oppCode);
  const [page,    setPage]    = useState(Number(_v.page) || 1);

  const [status,  setStatus]  = useState(_v.status ?? "");
  const [owner,   setOwner]   = useState(_v.owner  ?? "");
  const [disp,    setDisp]    = useState(_v.disp   ?? "");
  // Lead Score band. Client-side: this grid fetches every page up front.
  const [scoreBand, setScoreBand] = useState(_v.scoreBand ?? "");
  const [doctorFilter, setDoctorFilter] = useState(_v.doctorFilter ?? "");
  const [fuMode,  setFuMode]  = useState(_v.fuMode ?? "");
  const [fuFrom,  setFuFrom]  = useState(_v.fuFrom ?? "");
  const [fuTo,    setFuTo]    = useState(_v.fuTo   ?? "");
  const [fuTime,  setFuTime]  = useState(_v.fuTime ?? "");
  const [srchDraft,setSrchDraft]=useState(_v.search ?? "");
  const [search,  setSearch]  = useState(_v.search  ?? "");

  // Audit ranges — the manual list is fetched in full, so both are exact.
  const [createdFrom, setCreatedFrom] = useState(_v.createdFrom ?? "");
  const [createdTo,   setCreatedTo]   = useState(_v.createdTo   ?? "");
  const [modFrom,     setModFrom]     = useState(_v.modFrom     ?? "");
  const [modTo,       setModTo]       = useState(_v.modTo       ?? "");
  const [pageSize,    setPageSize]    = useState(Number(_v.pageSize) || PAGE_SIZE);
  const mountedRef = useAfterMount();

  const navigate = useNavigate();

  useEffect(()=>{ const t=setTimeout(()=>setSearch(srchDraft),250); return()=>clearTimeout(t); },[srchDraft]);
  useEffect(()=>{ if (!mountedRef.current) return; setPage(1); },
    [search,status,owner,disp,scoreBand,doctorFilter,fuMode,fuFrom,fuTo,fuTime,createdFrom,createdTo,modFrom,modTo,pageSize]);

  useEffect(() => {
    saveView("manual", oppCode, {
      status, owner, disp, scoreBand, doctorFilter, search,
      fuMode, fuFrom, fuTo, fuTime,
      createdFrom, createdTo, modFrom, modTo, page, pageSize,
    });
  }, [oppCode, status, owner, disp, scoreBand, doctorFilter, search, fuMode, fuFrom, fuTo, fuTime,
      createdFrom, createdTo, modFrom, modTo, page, pageSize]);

  useViewScroll("manual", oppCode, !loading && rows.length > 0);

  useEffect(()=>{
    if(!campaignRecId) return;
    let alive=true; setLoading(true); setErr("");
    fetchManualPages(campaignRecId)
      .then(data=>{
        if(!alive) return;
        setRows(data.map(x=>{
          const _id     = Number(x?.leadOpp_ID||0);
          const _custID = (x?.custID||x?.custId||"").toString();
          const _type   = (x?.type||"").toString().trim().toLowerCase();
          // Prospect Type comes from the stored Type only — a converted lead keeps
          // Type='Lead' even though it now has a Customer ID (LC-CV-003 / LC-BR-006).
          const _prospectType = _type==="opportunity" ? "Opportunity" : "Lead";
          const _doctor     = (x?.doctorName||x?.doctor||"").toString();
          const _prospectId = fmtProspectId(_id,"LD-MN");
          return ({
          id:   _id,
          prospectId:   _prospectId,
          prospectType: _prospectType,
          doctor:       _doctor,
          custID: _custID,
          name:   (x?.customerName||x?.custName||"").toString(),
          mobile: (x?.mobileNumber||x?.mobile||"").toString(),
          status: (x?.status||x?.oppStatus||"").toString(),
          fuDate: x?.followUpDate||x?.followUp||"",
          fuTime: (x?.followUpTime||"").toString(),
          fuTimeLabel: to12hLabel(x?.followUpTime),
          disposition:(x?.disposition||"").toString(),
          leadScore: (x?.leadScore === null || x?.leadScore === undefined) ? null : x.leadScore,
          scoreBand: (x?.scoreBand||"").toString(),
          remark:(x?.remark||x?.remarks||"").toString(),
          owner: (x?.saleOwner||x?.salesOwner||"").toString(),
          modifiedBy:(x?.modifiedBy||"").toString(),
          modifiedDate:x?.modifiedDate||"",
          createdDate: x?.createdDate||"",
          __fuStamp: stamp(toMidnight(x?.followUpDate||"")),
          __q: [_prospectId,_prospectType,_doctor,x?.leadOpp_ID,x?.customerName,x?.custName,x?.custID,x?.mobile,x?.mobileNumber,
            x?.status,x?.disposition,ownerLabel(x?.saleOwner||x?.salesOwner)]
            .map(v=>(v??"").toString().toLowerCase()).join("|"),
        });}));
      })
      .catch(e=>{ if(alive) setErr(e.message); })
      .finally(()=>{ if(alive) setLoading(false); });
    return()=>{alive=false;};
  },[campaignRecId, churnKey]);

  const ownerOpts = useMemo(()=>withAllAndUnassigned(rows.map(r=>r.owner)),[rows]);
  const dispOpts  = useMemo(()=>["", ...new Set(rows.map(r=>r.disposition).filter(Boolean))],[rows]);
  const doctorOpts= useMemo(()=>["", ...new Set(rows.map(r=>r.doctor).filter(Boolean))],[rows]);

  const HALF_HOURS_12 = useMemo(()=>Array.from({length:24},(_,h)=>
    [0,30].map(m=>{ const h12=((h+11)%12)+1; const ap=h<12?"AM":"PM"; return `${String(h12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ap}`; })
  ).flat(),[]);

  const fuDateRange = useMemo(()=>{
    const today=new Date(); today.setHours(0,0,0,0);
    if(fuMode==="0"){const s=+today;return{from:s,to:s};}
    if(fuMode==="1"){const t=new Date(today);t.setDate(t.getDate()+1);const s=+t;return{from:s,to:s};}
    if(fuMode==="2"&&fuFrom&&fuTo){
      let f=stamp(toMidnight(fuFrom)),t=stamp(toMidnight(fuTo));
      if(f>t){const tmp=f;f=t;t=tmp;}
      return{from:f,to:t};
    }
    return null;
  },[fuMode,fuFrom,fuTo]);

  const [sort, setSort] = useState({ key:"", dir:"asc" });
  const onSort = (key) => setSort(p => p.key===key ? {key, dir:p.dir==="asc"?"desc":"asc"} : {key, dir:"asc"});
  const sortArrow = (k) => sort.key===k ? (sort.dir==="asc"?"↑":"↓") : "↕";

  const createdBad = rangeInvalid(createdFrom, createdTo);
  const modBad     = rangeInvalid(modFrom,     modTo);

  const filtered = useMemo(()=>{
    let list=rows.slice();
    if(createdBad||modBad) return [];   // Created / Modified From after To → no records
    if(createdFrom||createdTo) list=list.filter(r=>inDateRange(r.createdDate, createdFrom, createdTo));
    if(modFrom||modTo)         list=list.filter(r=>inDateRange(r.modifiedDate, modFrom, modTo));
    const s=search.trim().toLowerCase();
    if(s)     list=list.filter(r=>(r.__q||"").includes(s));
    if(status)list=list.filter(r=>norm(r.status)===norm(status));
    if(owner) list=list.filter(r=> owner === UNASSIGNED_VALUE
      ? isUnassignedOwner(r.owner)
      : norm(r.owner)===norm(owner));
    if(disp)  list=list.filter(r=>norm(r.disposition)===norm(disp));
    if(scoreBand) list=list.filter(r=>matchesScoreBand(r, scoreBand));
    if(doctorFilter) list=list.filter(r=>norm(r.doctor)===norm(doctorFilter));
    if(fuDateRange)list=list.filter(r=>{
      const s=r.__fuStamp; if(isNaN(s)) return false;
      return s>=fuDateRange.from&&s<=fuDateRange.to;
    });
    if(fuTime)list=list.filter(r=>norm(r.fuTimeLabel)===norm(fuTime));
    if(sort.key){
      const dir=sort.dir==="asc"?1:-1;
      const numericKey=sort.key==="id" || sort.key==="leadScore";
      list=[...list].sort((a,b)=>{
        if(numericKey){const an=Number(a?.[sort.key])||0,bn=Number(b?.[sort.key])||0;return (an-bn)*dir;}
        const av=(a?.[sort.key]??"").toString().toLowerCase();
        const bv=(b?.[sort.key]??"").toString().toLowerCase();
        return av<bv?-1*dir:av>bv?1*dir:0;
      });
    }
    return list;
  },[rows,search,status,owner,disp,scoreBand,doctorFilter,fuDateRange,fuTime,sort,
     createdFrom,createdTo,modFrom,modTo,createdBad,modBad]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const paged=useMemo(()=>filtered.slice((page-1)*pageSize,page*pageSize),[filtered,page,pageSize]);

  /* Backstop for the whole pattern above: every filter is supposed to reset the
     page, but that relies on a hand-maintained dependency list, and one filter
     was missed the moment a new one was added. This catches it structurally —
     if the current page no longer exists after filtering, go back to page 1. */
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);


  const activeCount = [status,owner,disp,scoreBand,doctorFilter,search,fuMode,
    fuMode==="2"?fuFrom:"", fuMode==="2"?fuTo:"", fuTime,
    createdFrom,createdTo,modFrom,modTo].filter(Boolean).length;
  const clearAll = () => {
    setStatus(""); setOwner(""); setDisp(""); setScoreBand(""); setDoctorFilter("");
    setSrchDraft(""); setSearch("");
    setFuMode(""); setFuFrom(""); setFuTo(""); setFuTime("");
    setCreatedFrom(""); setCreatedTo(""); setModFrom(""); setModTo("");
  };

  return (
    <div>
      <FilterPanel activeCount={activeCount} onClear={clearAll} actions={<>
        <button className="cd-btn-pri cd-btn-sm" onClick={()=>navigate(`/manuallead/${oppCode}`,{state:{oppCode,header}})}>
          + Add Lead
        </button>
        <button className="cd-btn-pri cd-btn-sm" onClick={()=>navigate(`/opportunity/customers`,{state:{oppCode,header}})}>
          + Add Opportunity
        </button>
      </>}>
        <div className="cd-fg">
          <label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">All</option>
            <option>Open</option>
            <option>Closed</option>
          </select>
        </div>
        <div className="cd-fg">
          <label>Sales Owner</label>
          <select value={owner} onChange={e=>setOwner(e.target.value)}>
            {ownerOpts.map((o,i)=><option key={i} value={o}>{ownerOptionLabel(o)}</option>)}
          </select>
        </div>
        <div className="cd-fg">
          <label>Disposition</label>
          <select value={disp} onChange={e=>setDisp(e.target.value)}>
            {dispOpts.map((d,i)=><option key={i} value={d}>{d||"All"}</option>)}
          </select>
        </div>
        <ScoreFilter value={scoreBand} onChange={setScoreBand} />
        <div className="cd-fg">
          <label>Doctor/Therapist</label>
          <select value={doctorFilter} onChange={e=>setDoctorFilter(e.target.value)}>
            {doctorOpts.map((d,i)=><option key={i} value={d}>{d||"All"}</option>)}
          </select>
        </div>
        <div className="cd-fg">
          <label>Follow Up Date</label>
          <select value={fuMode} onChange={e=>setFuMode(e.target.value)}>
            <option value="">All</option>
            <option value="0">Today</option><option value="1">Tomorrow</option><option value="2">Date Range</option>
          </select>
        </div>
        <div className="cd-fg">
          <label>Follow Up Time</label>
          <select value={fuTime} onChange={e=>setFuTime(e.target.value)}>
            <option value="">All</option>
            {HALF_HOURS_12.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <RangeField label="Follow Up Date Range" presets={false}
          disabled={fuMode!=="2"} offNote="Set Follow Up Date to “Date Range” to use this."
          from={fuFrom} to={fuTo} onFrom={setFuFrom} onTo={setFuTo} />
        <RangeField label="Appointment Date" presets={false} na
          from="" to="" onFrom={()=>{}} onTo={()=>{}} />
        <RangeField label="Created Date"
          from={createdFrom} to={createdTo} onFrom={setCreatedFrom} onTo={setCreatedTo} />
        <RangeField label="Modified Date"
          from={modFrom} to={modTo} onFrom={setModFrom} onTo={setModTo} />
      </FilterPanel>

      <div className="cd-searchrow">
        <span className="cd-count"><b>{filtered.length.toLocaleString()}</b> of {rows.length.toLocaleString()} record{rows.length===1?"":"s"}</span>
        <div className="cd-searchwrap">
          <span className="cd-searchicon">⌕</span>
          <input className="cd-search" placeholder="Search prospect, customer, status, owner…"
            value={srchDraft} onChange={e=>setSrchDraft(e.target.value)} />
          {srchDraft && <button className="cd-searchx" title="Clear search" onClick={()=>setSrchDraft("")}>✕</button>}
        </div>
      </div>

      {(loading || !campaignRecId) && <Skeleton cols={17} />}
      {err     && <ErrMsg msg={err} />}
      {!loading && campaignRecId && !err && (
        paged.length ? (
          <div className="cd-tablewrap">
            <table className="cd-table">
              <thead><tr>
                <th onClick={()=>onSort("id")}>Prospect ID {sortArrow("id")}</th><th onClick={()=>onSort("prospectType")}>Prospect Type {sortArrow("prospectType")}</th><th onClick={()=>onSort("custID")}>Cust ID {sortArrow("custID")}</th><th onClick={()=>onSort("name")}>Name {sortArrow("name")}</th><th onClick={()=>onSort("mobile")}>Mobile {sortArrow("mobile")}</th><th onClick={()=>onSort("doctor")}>Doctor/Therapist {sortArrow("doctor")}</th>
                <th onClick={()=>onSort("status")}>Status {sortArrow("status")}</th><th onClick={()=>onSort("fuDate")}>Follow Up Date {sortArrow("fuDate")}</th><th onClick={()=>onSort("fuTimeLabel")}>Follow Up Time {sortArrow("fuTimeLabel")}</th>
                <th onClick={()=>onSort("disposition")}>Disposition {sortArrow("disposition")}</th><th onClick={()=>onSort("leadScore")}>Lead Score {sortArrow("leadScore")}</th><th>Appointment ID</th><th onClick={()=>onSort("remark")}>Remarks {sortArrow("remark")}</th><th onClick={()=>onSort("owner")}>Sales Owner {sortArrow("owner")}</th>
                <th onClick={()=>onSort("modifiedBy")}>Modified By {sortArrow("modifiedBy")}</th><th onClick={()=>onSort("modifiedDate")}>Modified Date {sortArrow("modifiedDate")}</th><th onClick={()=>onSort("createdDate")}>Created Date {sortArrow("createdDate")}</th>
              </tr></thead>
              <tbody>
                {paged.map((r,i)=>(
                  <tr key={`${r.id||i}-${i}`}>
                    <td>
                      <button className="cd-link" onClick={()=>navigate(`/manuallead/edit/${r.id}`,{state:{oppCode,header,leadOpp_ID:r.id}})}>
                        {fmtProspectId(r.id,"LD-MN")}
                      </button>
                    </td>
                    <td>{safe(r.prospectType)}</td>
                    <td>{safe(r.custID)}</td>
                    <td>{safe(r.name)}</td>
                    <td>{safe(r.mobile)}</td>
                    <td>{safe(r.doctor)}</td>
                    <td><Pill v={r.status} /></td>
                    <td>{fmtDate(r.fuDate)}</td>
                    <td>{safe(r.fuTimeLabel)}</td>
                    <td><Pill v={r.disposition} /></td>
                    <td><ScoreCell row={r} /></td>
                    <td><ApptMapCell leadSource="MANUAL" recId={r.id} custId={r.custID} oppCode={oppCode}
                        apptMandatory={apptMandatory}
                        disposition={r.disposition} mapped={apptMap[String(r.id)]?.appointmentId}
                        onLinked={(id,aid)=>setApptMap(p=>({...p,[String(id)]:{appointmentId:aid,apptStatus:"Booked"}}))} /></td>
                    <td><Clamp v={r.remark} /></td>
                    <td>{ownerLabel(r.owner)}</td>
                    <td>{safe(r.modifiedBy)}</td>
                    <td>{fmtDate(r.modifiedDate)}</td>
                    <td>{fmtDate(r.createdDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyNote />
      )}
      <Pager page={page} totalPages={totalPages} onPage={setPage}
        pageSize={pageSize} onPageSize={setPageSize} />
    </div>
  );
}

// ─── Main CampaignDetails page ────────────────────────────────────────────────

export default function CampaignDetails() {
  const { oppCode }  = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const state        = location.state || {};

  const [toast,    setToast]    = useState("");
  const [churning, setChurning] = useState(false);
  const [churnKey, setChurnKey] = useState(0); // increment to force section re-fetch after churn
  const [assignOpen, setAssignOpen] = useState(false);

  const showToast = (msg, type="success") => {
    setToast({ msg, type }); setTimeout(()=>setToast(""), 4000);
  };

  /* Arriving back from a conversion booking (the appointment page hands over
     state.ltrReturn). Confirming here rather than on the screen the agent was
     leaving means they read the outcome where they land. History state is
     cleared straight after so a refresh does not replay the toast. */
  useEffect(() => {
    const r = location.state && location.state.ltrReturn;
    if (!r) return;
    if (r.booked) {
      const who = r.customerName ? ` for ${r.customerName}` : "";
      const ref = r.appointmentId ? ` (${r.appointmentId})` : "";
      showToast(`✓ Appointment booked${who}.`);
    } else {
      showToast("Booking cancelled — the lead is back in WIP.", "error");
    }
    try { window.history.replaceState({}, document.title); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Load campaign header
  const { header: apiHeader, loading: hdrLoading, err: hdrErr } = useCampaignHeader(oppCode);

  const handleGetLatestData = async () => {
    if (churning) return;
    setChurning(true);
    try {
      const res  = await fetch(
        `${API_BASE_URL}/api/Opportunity/GetLatestData/${encodeURIComponent(oppCode)}`,
        { headers: authHeaders() }
      );
      const json = await res.json();
      if (json.success) {
        const newRows = json.data?.newRows ?? json.data?.newRows ?? 0;
        showToast(`✓ Latest data loaded. ${newRows > 0 ? `${newRows} new record(s) added.` : "No new records."}`);
        setChurnKey(k => k + 1); // triggers re-fetch in child section
      } else {
        showToast(json.message || "Churn completed with errors.", "error");
        setChurnKey(k => k + 1);
      }
    } catch (e) {
      showToast(e.message || "Failed to get latest data.", "error");
    } finally {
      setChurning(false);
    }
  };

  // Merge with state (dashboard may pass some fields)
  const header = useMemo(()=>({
    oppCode:   oppCode,
    oppName:   state?.oppName  || apiHeader?.oppName  || "—",
    oRuleCode: state?.oRuleCode|| apiHeader?.oRuleCode|| "",
    oRuleDetails: state?.oRuleDetails || apiHeader?.oRuleDetails || "",
    fromDate:  state?.fromDate || apiHeader?.fromDate || apiHeader?.oppCampStartDate || "",
    toDate:    state?.toDate   || apiHeader?.toDate   || apiHeader?.oppCampEndDate   || "",
    recid:     apiHeader?.recid|| apiHeader?.recId || "",
    ...(apiHeader||{}),
  }), [apiHeader, state, oppCode]);

  const ruleCode = String(header.oRuleCode||"").trim().toUpperCase();
  const kind     = detectKind(ruleCode);
  const ruleLabel = RULE_LABELS[ruleCode] || ruleCode || "—";

  const fromDate = toISODateOnly(header.fromDate) || todayISO();
  const toDate   = toISODateOnly(header.toDate)   || todayISO();

  // Where the campaign sits against today — shown as a chip beside the name
  const periodState = useMemo(() => {
    const today = stamp(new Date());
    const f = stamp(toMidnight(fromDate));
    const t = stamp(toMidnight(toDate));
    // Only a STATIC campaign has a real end date. Dynamic campaigns report a
    // rolling to-date, so they must never be judged Ended by it.
    const isStatic = Number(header.oppRuleType) === 1;
    const hasEnd   = isStatic && !isNaN(t) && toMidnight(toDate).getFullYear() > 1900;
    if (!isNaN(f) && today < f) return { label:"Scheduled", tone:"warn" };
    if (hasEnd && today > t)    return { label:"Ended",     tone:"off"  };
    return { label:"Active", tone:"ok" };
  }, [fromDate, toDate, header.oppRuleType]);

  // Campaign's "Appt Booking Mandatory" flag (CLINIC_OPPORTUNITYDETAILS.ApptBookingMandatory,
  // returned by getCampaign as 0/1). Absent while the header loads → treat as Yes,
  // the same default the lead forms and the repositories use.
  const apptMandatory = header.apptBookingMandatory !== 0 && header.apptBookingMandatory !== false;

  const sourceLabel = kind==="manual" ? "Manual Lead"
                    : kind==="external" ? "External Source"
                    : "Transaction";

  return (
    <>
      <div className="cd-container">
        {/* Breadcrumb */}
        <div className="cd-breadcrumb">
          <span className="cd-bclink" onClick={()=>navigate("/opportunity")}>Opportunity</span>
          {" › "}
          <span className="cd-bccur">{safe(header.oppCode, "Campaign Details")}</span>
        </div>

        <div className="cd-card">
          {/* Header */}
          <div className="cd-header">
            <div className="cd-headerleft">
              <div className="cd-titlerow">
                <h2 className="cd-title">{safe(header.oppName)}</h2>
                <span className={`cd-tag cd-tag-${periodState.tone}`}>{periodState.label}</span>
              </div>
              <div className="cd-metagrid">
                <div className="cd-meta">
                  <span className="cd-lbl">Campaign Code</span>
                  <span className="cd-pill">{safe(header.oppCode)}</span>
                </div>
                <div className="cd-meta">
                  <span className="cd-lbl">Rule Type</span>
                  <span className="cd-metaval" title={ruleLabel}>
                    {ruleCode && ruleCode !== "MANUAL LEAD" ? `${ruleCode} · ${ruleLabel}` : ruleLabel}
                  </span>
                </div>
                <div className="cd-meta">
                  <span className="cd-lbl">Campaign Period</span>
                  <span className="cd-metaval">{fmtDate(fromDate)} → {fmtDate(toDate)}</span>
                </div>
                <div className="cd-meta">
                  <span className="cd-lbl">Prospect Source</span>
                  <span className="cd-metaval">{sourceLabel}</span>
                </div>
              </div>
              {hdrLoading && <div className="cd-hint">Loading campaign…</div>}
              {hdrErr     && <div className="cd-hint cd-hint-err">{hdrErr}</div>}
            </div>
            <div className="cd-headerright">
              <button className="cd-btn-pri" onClick={handleGetLatestData} disabled={churning}
                title="Re-run the campaign rule and pull any new matching records">
                {churning ? "⟳ Loading…" : "↻ Get Latest Data"}
              </button>
              <button className="cd-btn-pri" onClick={()=>setAssignOpen(true)}>Assign</button>
              <button className="cd-btn-sec" onClick={()=>navigate(-1)}>← Back</button>
            </div>
          </div>

          {/* Section — swapped by kind */}
          {kind === "transaction" && (
            <TransactionSection
              oppCode={oppCode}
              header={header}
              fromDate={fromDate}
              toDate={toDate}
              churnKey={churnKey}
              apptMandatory={apptMandatory}
            />
          )}
          {kind === "external" && (
            <ExternalSection oppCode={oppCode} churnKey={churnKey} apptMandatory={apptMandatory} />
          )}
          {kind === "manual" && (
            <ManualSection oppCode={oppCode} header={header} churnKey={churnKey} apptMandatory={apptMandatory} />
          )}
        </div>
      </div>

      <Toast msg={toast} />

      <AssignmentModal
        open={assignOpen}
        onClose={()=>setAssignOpen(false)}
        oppCode={oppCode}
        kind={kind}
        centerCode={header.centerCode || header.CENTERCODE || ""}
        onConfirmed={()=>{ setChurnKey(k=>k+1); showToast("Assignment confirmed. Refreshing…"); }}
      />

      <style>{`
        .cd-container { padding:0; }

        /* Breadcrumb */
        .cd-breadcrumb { font-size:12.5px; color:#85A2AA; margin-bottom:12px; }
        .cd-bclink { color:#18396E; font-weight:800; cursor:pointer; }
        .cd-bclink:hover { text-decoration:underline; }
        .cd-bccur  { color:#94a3b8; font-weight:700; }

        .cd-card { background:#fff; border:1px solid #edf1f7; border-radius:14px; padding:22px 24px 24px;
          box-shadow:0 1px 2px rgba(5,34,76,.05), 0 10px 28px rgba(5,34,76,.06); }

        /* Header */
        .cd-header { display:flex; justify-content:space-between; align-items:flex-start; gap:20px;
          margin-bottom:18px; padding-bottom:18px; border-bottom:1px solid #eef2f8; }
        .cd-headerleft { flex:1; min-width:0; }
        .cd-headerright { display:flex; gap:8px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; }
        .cd-titlerow { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
        .cd-title { margin:0; font-size:20px; line-height:1.2; font-weight:800; color:#05224C; letter-spacing:-.2px; }
        .cd-metagrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px 22px; }
        .cd-meta { display:flex; flex-direction:column; gap:3px; min-width:0; }
        .cd-lbl { font-size:10.5px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:#85A2AA; }
        .cd-metaval { font-size:13.5px; font-weight:600; color:#1f2a3d; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .cd-pill { align-self:flex-start; background:#eef3ff; color:#18396E; padding:3px 10px; border-radius:20px;
          font-size:12.5px; font-weight:800; letter-spacing:.3px; }
        .cd-pair { font-size:14px; color:#333; display:flex; gap:10px; align-items:baseline; }
        .cd-hint { font-size:12px; color:#64748b; margin-top:10px; }
        .cd-hint-err { color:#c0392b; }

        /* Filter panel */
        .cd-filters { background:linear-gradient(180deg,#fbfcfe,#f6f8fc); border:1px solid #e6eaf2;
          border-radius:12px; margin-bottom:14px; }
        .cd-filters-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; }
        .cd-filters-toggle { display:flex; align-items:center; gap:8px; background:none; border:0; padding:0;
          cursor:pointer; font-size:13px; font-weight:800; color:#05224C; letter-spacing:.2px; }
        .cd-caret { display:inline-block; color:#85A2AA; font-size:11px; transition:transform .18s ease; }
        .cd-caret-open { transform:rotate(90deg); }
        .cd-badge { display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px;
          padding:0 6px; border-radius:20px; background:#18396E; color:#fff; font-size:11px; font-weight:800; }
        .cd-filters-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .cd-linkbtn { background:none; border:0; color:#c9573f; font-size:12px; font-weight:800; cursor:pointer;
          padding:4px 6px; border-radius:6px; }
        .cd-linkbtn:hover { background:#fdeeea; }
        .cd-linkbtn-sm { font-size:11px; padding:2px 4px; }

        .cd-fgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px 14px;
          padding:2px 14px 16px; align-items:start; }
        .cd-fg { display:flex; flex-direction:column; gap:5px; min-width:0; }
        .cd-fg label { font-size:10.5px; font-weight:800; letter-spacing:.4px; text-transform:uppercase; color:#5b6b82; }
        .cd-fg input, .cd-fg select { height:36px; width:100%; box-sizing:border-box; border:1px solid #dde3ee;
          border-radius:8px; padding:0 9px; font-size:13px; color:#1f2a3d; background:#fff;
          transition:border-color .15s ease, box-shadow .15s ease; }
        .cd-fg input:focus, .cd-fg select:focus { outline:none; border-color:#18396E; box-shadow:0 0 0 3px rgba(24,57,110,.12); }
        .cd-frow { display:flex; flex-wrap:wrap; gap:12px 16px; align-items:flex-end; }
        .cd-wide { grid-column:span 2; }
        .cd-timepair { display:flex; gap:6px; }
        .cd-timepair select { flex:1; min-width:0; }
        .cd-daterange { display:flex; gap:6px; align-items:center; }
        .cd-daterange input { flex:1; min-width:0; }

        /* From → To range control (Created / Modified / Appointment / Follow Up) */
        .cd-range { background:#fff; border:1px solid #e6eaf2; border-radius:10px; padding:9px 10px 10px; gap:0; }
        .cd-range-on  { border-color:#b9cbe6; box-shadow:0 0 0 3px rgba(24,57,110,.06); }
        .cd-range-bad { border-color:#e8b4ae; box-shadow:0 0 0 3px rgba(221,119,102,.14); }
        .cd-range-head { display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:6px; }
        .cd-range-body { display:flex; align-items:center; gap:6px; }
        .cd-range-body input { flex:1; min-width:0; }
        .cd-range-sep { color:#85A2AA; font-size:12px; }
        .cd-chiprow { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
        .cd-chip { border:1px solid #e2e8f2; background:#f8fafd; color:#5b6b82; border-radius:20px; padding:3px 9px;
          font-size:11px; font-weight:700; cursor:pointer; transition:all .15s ease; }
        .cd-chip:hover { border-color:#b9cbe6; color:#18396E; }
        .cd-chip-on { background:#18396E; border-color:#18396E; color:#fff; }
        .cd-fgnote { display:block; margin-top:6px; font-size:11px; color:#7b8798; }
        .cd-fgnote-err { color:#c0392b; font-weight:700; }
        .cd-fgnote-off { color:#98a4b6; font-style:italic; }
        .cd-exportmsg { margin-top:0; flex-basis:100%; }
        .cd-btn-sec:disabled { opacity:.6; cursor:progress; }

        /* Inert / NA filter slots */
        .cd-fg-off { opacity:.75; }
        .cd-fg-off label { color:#8b97a8; }
        .cd-fg input:disabled, .cd-fg select:disabled { background:#f3f6fb; border-color:#e6eaf2;
          color:#98a4b6; cursor:not-allowed; }
        .cd-natag { display:inline-flex; align-items:center; height:15px; padding:0 5px; border-radius:4px;
          background:#eef1f7; color:#8b97a8; font-size:9.5px; font-weight:800; letter-spacing:.5px; }

        /* Search row */
        .cd-searchrow { display:flex; align-items:center; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
        .cd-count { font-size:12.5px; color:#64748b; white-space:nowrap; }
        .cd-count b { color:#05224C; }
        .cd-searchwrap { position:relative; flex:1; min-width:200px; max-width:340px; }
        .cd-searchicon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#85A2AA;
          font-size:16px; pointer-events:none; }
        .cd-search { width:100%; box-sizing:border-box; height:36px; border:1px solid #dde3ee; border-radius:8px;
          padding:0 28px 0 28px; font-size:13px; color:#1f2a3d; transition:border-color .15s ease, box-shadow .15s ease; }
        .cd-search:focus { outline:none; border-color:#18396E; box-shadow:0 0 0 3px rgba(24,57,110,.12); }
        .cd-searchx { position:absolute; right:8px; top:50%; transform:translateY(-50%); border:0; background:none;
          color:#94a3b8; cursor:pointer; font-size:11px; }
        .cd-searchx:hover { color:#c9573f; }

        /* Buttons */
        .cd-btn-pri { background:#18396E; color:#fff; border:0; border-radius:9px; padding:9px 16px; font-weight:700;
          cursor:pointer; font-size:13px; white-space:nowrap; box-shadow:0 1px 2px rgba(5,34,76,.18);
          transition:background .15s ease, transform .05s ease; }
        .cd-btn-pri:hover:not(:disabled) { background:#05224C; }
        .cd-btn-pri:active:not(:disabled) { transform:translateY(1px); }
        .cd-btn-pri:disabled { opacity:.6; cursor:not-allowed; }
        .cd-btn-sec { background:#fff; color:#18396E; border:1px solid #c9d6e8; border-radius:9px; padding:9px 16px;
          font-weight:700; cursor:pointer; font-size:13px; white-space:nowrap; transition:all .15s ease; }
        .cd-btn-sec:hover { background:#f3f7fd; border-color:#18396E; }
        .cd-btn-sm { padding:6px 12px; font-size:12px; }

        /* Table */
        .cd-tablewrap { overflow:auto; max-height:70vh; border:1px solid #e8edf5; border-radius:12px; background:#fff; }
        .cd-table { width:100%; min-width:960px; border-collapse:separate; border-spacing:0; }
        .cd-table thead th { position:sticky; top:0; z-index:2; background:#f4f7fb; padding:10px 13px; text-align:left;
          font-size:10.5px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:#4a5c75;
          border-bottom:1px solid #e2e8f2; white-space:nowrap; cursor:pointer; user-select:none; }
        .cd-table thead th:hover { background:#eaf0f9; color:#18396E; }
        .cd-table tbody td { padding:10px 13px; font-size:13px; color:#2b3648; border-bottom:1px solid #f1f4f9;
          vertical-align:middle; white-space:nowrap; background:#fff; }
        .cd-table tbody tr:nth-child(even) td { background:#fcfdff; }
        .cd-table tbody tr:hover td { background:#f4f8ff; }
        .cd-table tbody tr:last-child td { border-bottom:0; }
        .cd-link { background:none; border:none; padding:0; color:#18396E; font-weight:800; cursor:pointer;
          font-size:13px; text-align:left; }
        .cd-link:hover { color:#05224C; text-decoration:underline; }
        .cd-dash { color:#b6c0cf; }
        .cd-clamp { display:inline-block; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          vertical-align:bottom; }
        .cd-tag { display:inline-block; max-width:190px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          vertical-align:middle; padding:2px 9px; border-radius:20px; font-size:11.5px; font-weight:800;
          background:#eef2f8; color:#4a5c75; border:1px solid #e2e8f2; }
        .cd-tag-ok   { background:#eaf6f1; color:#136f4f; border-color:#cbe9dd; }
        .cd-tag-on   { background:#eaf1fb; color:#18396E; border-color:#cfdff5; }
        .cd-tag-off  { background:#fdeeea; color:#a03c2c; border-color:#f6d6cf; }
        .cd-tag-warn { background:#fdf6e6; color:#8a6410; border-color:#f2e4c0; }

        /* Loading skeleton */
        .cd-sk { display:block; height:12px; border-radius:6px;
          background:linear-gradient(90deg,#eef1f6 25%,#f8fafd 37%,#eef1f6 63%); background-size:400% 100%;
          animation:cd-shimmer 1.3s ease-in-out infinite; }
        @keyframes cd-shimmer { 0% { background-position:100% 50%; } 100% { background-position:0 50%; } }

        /* Pager */
        .cd-server-pager { display:flex; align-items:center; gap:10px; margin-top:12px; padding:9px 14px;
          background:#f7f9fc; border:1px solid #e6eaf2; border-radius:10px; flex-wrap:wrap; }
        .cd-pager { display:flex; align-items:center; gap:8px; margin-top:14px; justify-content:flex-end; flex-wrap:wrap; }
        .cd-pgsize { display:flex; align-items:center; gap:6px; margin-right:auto; font-size:12.5px; font-weight:700; color:#5b6b82; }
        .cd-pgsize select { height:32px; border:1px solid #dde3ee; border-radius:7px; background:#fff; font-size:12.5px; padding:0 6px; }
        .cd-pgbtn { height:32px; padding:0 12px; border:1px solid #dde3ee; border-radius:8px; background:#fff;
          font-weight:700; cursor:pointer; font-size:12.5px; color:#334b71; transition:all .15s ease; }
        .cd-pgbtn:hover:not(:disabled) { border-color:#18396E; color:#18396E; background:#f5f8fd; }
        .cd-pgbtn:disabled { opacity:.45; cursor:not-allowed; }
        .cd-pginfo { font-size:12.5px; color:#5b6b82; padding:0 6px; }

        /* Misc */
        .cd-empty { padding:28px 20px; text-align:center; font-size:13px; color:#8a97a8; background:#fbfcfe;
          border:1px dashed #e2e8f0; border-radius:12px; margin-top:12px; }
        .cd-loading { padding:30px; text-align:center; font-size:15px; color:#64748b; }
        .cd-err { padding:13px 15px; background:#fdf3f2; border:1px solid #f2cfc9; border-radius:10px; color:#a03c2c;
          margin-top:10px; font-size:13px; font-weight:600; }
        .cd-toast { position:fixed; left:0; right:0; top:28%; margin:0 auto; max-width:480px; background:#0d3d1a;
          color:#fff; padding:18px 24px; border-radius:12px; font-weight:700; box-shadow:0 12px 32px rgba(0,0,0,.22);
          z-index:99999; text-align:center; }

        /* SearchableSelect */
        .ss-wrap { position:relative; width:100%; }
        .ss-ctrl { display:flex; align-items:center; justify-content:space-between; height:36px; border:1px solid #dde3ee;
          border-radius:8px; padding:0 10px; background:#fff; cursor:pointer; font-size:13px; user-select:none; box-sizing:border-box; }
        .ss-ctrl.ss-open { border-color:#18396E; box-shadow:0 0 0 3px rgba(24,57,110,.12); }
        .ss-ph { color:#94a3b8; }
        .ss-acts { display:flex; align-items:center; gap:6px; color:#85A2AA; font-size:10px; }
        .ss-x { font-size:11px; color:#94a3b8; cursor:pointer; }
        .ss-x:hover { color:#c9573f; }
        .ss-drop { position:absolute; top:calc(100% + 3px); left:0; right:0; background:#fff; border:1px solid #dde3ee;
          border-radius:10px; box-shadow:0 10px 26px rgba(5,34,76,.14); z-index:9999; overflow:hidden; }
        .ss-search { width:100%; box-sizing:border-box; height:34px; border:none; border-bottom:1px solid #eef2f8;
          padding:0 10px; font-size:13px; outline:none; }
        .ss-list { max-height:210px; overflow-y:auto; }
        .ss-item { padding:8px 12px; font-size:13px; cursor:pointer; }
        .ss-item:hover { background:#f1f5ff; }
        .ss-active { background:#eef3ff; color:#18396E; font-weight:800; }
        .ss-no { padding:10px 12px; font-size:13px; color:#94a3b8; }

        /* Narrow screens */
        @media (max-width: 900px) {
          .cd-card { padding:18px 16px 20px; }
          .cd-header { flex-direction:column; }
          .cd-headerright { width:100%; justify-content:flex-start; }
          .cd-fgrid { grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); }
          .cd-range { grid-column:span 1 !important; }
          .cd-tablewrap { max-height:none; }
          .cd-searchwrap { max-width:none; }
        }
      `}</style>
    </>
  );
}