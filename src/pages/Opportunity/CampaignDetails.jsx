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

const fmtProspectId = (n, prefix="LD") => {
  const x = Number(n);
  if (!Number.isFinite(x)||x<=0) return "—";
  return `${prefix}-${String(Math.trunc(x)).padStart(7,"0")}`;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
function SearchableSelect({ options=[], value, onChange, placeholder="All" }) {
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
    return s ? options.filter(o => o.toLowerCase().includes(s)) : options;
  }, [options, q]);

  return (
    <div className="ss-wrap" ref={ref}>
      <div className={`ss-ctrl ${open?"ss-open":""}`} onClick={() => setOpen(o=>!o)}>
        <span className={!value?"ss-ph":""}>{value||placeholder}</span>
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
                {o}
              </div>
            ))}
            {!filtered.length && <div className="ss-no">No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// Pagination row
const Pager = ({ page, totalPages, onPage }) => (
  <div className="cd-pager">
    <button className="cd-pgbtn" disabled={page<=1} onClick={()=>onPage(1)}>First</button>
    <button className="cd-pgbtn" disabled={page<=1} onClick={()=>onPage(p=>Math.max(1,p-1))}>Prev</button>
    <span className="cd-pginfo">Page <b>{page}</b> / <b>{totalPages}</b></span>
    <button className="cd-pgbtn" disabled={page>=totalPages} onClick={()=>onPage(p=>Math.min(totalPages,p+1))}>Next</button>
    <button className="cd-pgbtn" disabled={page>=totalPages} onClick={()=>onPage(totalPages)}>Last</button>
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

const HALF_HOURS = Array.from({length:24},(_, h) =>
  [0,30].map(m => `${String(((h+11)%12)+1).padStart(2,"0")}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`)
).flat();

function TransactionSection({ oppCode, header, fromDate, toDate, churnKey=0 }) {
  const ruleCode = String(header?.oRuleCode||"").trim().toUpperCase();
  const showAppt = ruleCode==="R3" || ruleCode==="R4";

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  // Filters
  const [status,  setStatus]  = useState("");
  const [owner,   setOwner]   = useState("");
  const [disp,    setDisp]    = useState("");
  const [therapist,setTherapist] = useState("");
  const [search,  setSearch]  = useState("");
  const [srchDraft,setSrchDraft] = useState("");

  const [apptFrom, setApptFrom] = useState("");
  const [apptTo,   setApptTo]   = useState("");

  const [fuMode,  setFuMode]  = useState("");
  const [fuFrom,  setFuFrom]  = useState("");
  const [fuTo,    setFuTo]    = useState("");
  const [fuTFrom, setFuTFrom] = useState("");
  const [fuTFrMer,setFuTFrMer]= useState("AM");
  const [fuTTo,   setFuTTo]   = useState("");
  const [fuTToMer,setFuTToMer]= useState("AM");

  const [sort, setSort] = useState({ key:"", dir:"asc" });
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  // debounce search
  useEffect(() => {
    const t = setTimeout(()=>setSearch(srchDraft), 250);
    return ()=>clearTimeout(t);
  }, [srchDraft]);

  const [serverTotal, setServerTotal] = useState(0);
  const SERVER_PAGE_SIZE = 100; // rows per server request
  const [serverPage, setServerPage] = useState(1);

  // Fetch current page — ALL filters sent to server
  useEffect(() => {
    if (!oppCode||!fromDate||!toDate) return;
    let alive = true;
    setLoading(true); setErr("");
    fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
      method:"POST", headers: authHeaders(),
      body: JSON.stringify({
        oppCode, fromDate, toDate,
        page: serverPage, pageSize: SERVER_PAGE_SIZE,
        search, status, owner, disp, therapist,
        apptFrom: showAppt ? apptFrom : "",
        apptTo:   showAppt ? apptTo   : "",
      }),
    })
      .then(r=>r.json())
      .then(d => {
        if (!alive) return;
        const arr = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setServerTotal(d?.totalCount ?? arr.length);
        setRows(arr.map(r => ({
          ...r,
          __therapist: (r?.therapistname||r?.therapistName||r?.THERAPISTNAME||"").toString().trim(),
          __apptStamp: stamp(toMidnight(r?.appointmentdatetime||r?.appointmentDateTime||"")),
          __fuStamp:   stamp(toMidnight(r?.followUpDate||r?.followupdate||"")),
          __fuMin:     timeToMin((r?.followUptime||r?.followUpTime||"").toString().replace(/[APM]/gi,"")),
          __q: [r?.custID,r?.custName,r?.custMobileNo,r?.oppStatus,r?.salesOwner,r?.disposition,
                r?.therapistname,r?.therapistName].map(x=>(x??"").toString().toLowerCase()).join("|"),
        })));
      })
      .catch(e=>{ if(alive) setErr(e.message); })
      .finally(()=>{ if(alive) setLoading(false); });
    return()=>{ alive=false; };
  }, [oppCode, fromDate, toDate, serverPage, search, status, owner, disp, therapist, apptFrom, apptTo, churnKey]);

  // Reset to page 1 when server-side filters change
  useEffect(()=>{ setServerPage(1); setPage(1); }, [search, status, owner, disp, therapist, apptFrom, apptTo]);
  // Reset display page when client filters change
  useEffect(()=>setPage(1), [disp,therapist,apptFrom,apptTo,fuMode,fuFrom,fuTo,fuTFrom,fuTTo]);

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
  const ownerOpts    = allOwnerOpts.length    > 1 ? allOwnerOpts    : ["", ...new Set(rows.map(r=>r?.salesOwner||"").filter(Boolean))];
  const dispOpts     = allDispOpts.length     > 1 ? allDispOpts     : ["", ...new Set(rows.map(r=>r?.disposition||"").filter(Boolean))];
  const therapistOpts= allTherapistOpts.length> 1 ? allTherapistOpts: ["", ...new Set(rows.map(r=>r?.__therapist||"").filter(Boolean))];

  const fuDateRange = useMemo(()=>{
    const today=new Date(); today.setHours(0,0,0,0);
    if (fuMode==="0") { const s=+today; return {from:s,to:s}; }
    if (fuMode==="1") { const t=new Date(today); t.setDate(t.getDate()+1); const s=+t; return {from:s,to:s}; }
    if (fuMode==="2" && fuFrom && fuTo) {
      let f=stamp(toMidnight(fuFrom)), t=stamp(toMidnight(fuTo));
      if (f>t){const tmp=f;f=t;t=tmp;}
      return {from:f,to:t};
    }
    return null;
  }, [fuMode,fuFrom,fuTo]);

  const to24h = (slot,mer) => {
    if (!slot) return "";
    const [hh,mm]=slot.split(":").map(Number);
    const b=hh%12; const h=mer==="PM"?b+12:b;
    return `${String(h).padStart(2,"0")}:${mm}`;
  };
  const filterTFrom = to24h(fuTFrom, fuTFrMer);
  const filterTTo   = to24h(fuTTo,   fuTToMer);

  const filtered = useMemo(()=>{
    let list = rows.slice();
    // apptDate is server-side for R3/R4; followUp date/time remain client-side
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
    if (sort.key) {
      const dir=sort.dir==="asc"?1:-1;
      list=[...list].sort((a,b)=>{
        const av=(a?.[sort.key]??"").toString().toLowerCase();
        const bv=(b?.[sort.key]??"").toString().toLowerCase();
        return av<bv?-dir:av>bv?dir:0;
      });
    }
    return list;
  }, [rows,search,status,owner,disp,therapist,showAppt,apptFrom,apptTo,fuDateRange,filterTFrom,filterTTo,sort]);

  // Server drives total count; client pages within returned batch
  const totalPages = Math.max(1, Math.ceil(serverTotal/SERVER_PAGE_SIZE));
  const clientTotalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE));
  const paged = useMemo(()=>filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE), [filtered,page]);

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

  const exportCSV = () => {
    const hdrs=["ProspectID","CustID","CustName","Mobile","Status","Disposition","Therapist",
      showAppt?"ApptDate":"","Remarks","SalesOwner","ModifiedBy","ModifiedDate","CreatedDate"].filter(Boolean);
    const esc=(v)=>{const s=String(v??"");return (s.includes(",")||s.includes('"'))?`"${s.replace(/"/g,'""')}"`:s;};
    const lines=[hdrs.join(","),...filtered.map(r=>[
      fmtProspectId(r.recid),r.custID,r.custName,r.custMobileNo,r.oppStatus,r.disposition,
      r.__therapist, ...(showAppt?[fmtDate(r.appointmentdatetime)]:[] ),
      r.remarks,r.salesOwner,r.modifiedBy,fmtDate(r.modifieddate),fmtDate(r.createddate),
    ].map(esc).join(","))];
    const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`${oppCode}-details.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Filters */}
      <div className="cd-filters">
        <div className="cd-frow">
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
              {ownerOpts.map((o,i)=><option key={i} value={o}>{o||"All"}</option>)}
            </select>
          </div>
          <div className="cd-fg">
            <label>Disposition</label>
            <select value={disp} onChange={e=>setDisp(e.target.value)}>
              {dispOpts.map((d,i)=><option key={i} value={d}>{d||"All"}</option>)}
            </select>
          </div>
          <div className="cd-fg">
            <label>Therapist</label>
            <select value={therapist} onChange={e=>setTherapist(e.target.value)}>
              {therapistOpts.map((t,i)=><option key={i} value={t}>{t||"All"}</option>)}
            </select>
          </div>
          {showAppt && (
            <div className="cd-fg cd-wide">
              <label>Appointment Date</label>
              <div className="cd-daterange">
                <input type="date" value={apptFrom} onChange={e=>setApptFrom(e.target.value)} />
                <span>–</span>
                <input type="date" value={apptTo}   onChange={e=>setApptTo(e.target.value)} />
              </div>
            </div>
          )}
          <div className="cd-fg">
            <label>Follow Up Date</label>
            <select value={fuMode} onChange={e=>setFuMode(e.target.value)}>
              <option value="">All</option>
              <option value="0">Today</option>
              <option value="1">Tomorrow</option>
              <option value="2">Date Range</option>
            </select>
          </div>
          {fuMode==="2" && (<>
            <div className="cd-fg"><label>FU From</label><input type="date" value={fuFrom} onChange={e=>setFuFrom(e.target.value)} /></div>
            <div className="cd-fg"><label>FU To</label><input type="date" value={fuTo} onChange={e=>setFuTo(e.target.value)} /></div>
          </>)}
          <div className="cd-fg cd-wide">
            <label>Follow Up Time From</label>
            <div className="cd-timepair">
              <select value={fuTFrom} onChange={e=>setFuTFrom(e.target.value)}>
                <option value="">—</option>
                {HALF_HOURS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="cd-fg cd-wide">
            <label>Follow Up Time To</label>
            <div className="cd-timepair">
              <select value={fuTTo} onChange={e=>setFuTTo(e.target.value)}>
                <option value="">—</option>
                {HALF_HOURS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="cd-searchrow">
        <span className="cd-count">{filtered.length} record(s)</span>
        <input className="cd-search" placeholder="Search (ID, Name, Phone, Status…)"
          value={srchDraft} onChange={e=>setSrchDraft(e.target.value)} />
        <button className="cd-btn-sec" onClick={exportCSV}>Export CSV</button>
      </div>

      {loading && <Loading />}
      {err     && <ErrMsg msg={err} />}
      {!loading && !err && (
        paged.length ? (
          <div className="cd-tablewrap">
            <table className="cd-table">
              <thead><tr>
                <th>Prospect ID</th>
                <th onClick={()=>onSort("custID")}>Cust ID {sortArrow("custID")}</th>
                <th onClick={()=>onSort("custName")}>Name {sortArrow("custName")}</th>
                <th onClick={()=>onSort("custMobileNo")}>Mobile {sortArrow("custMobileNo")}</th>
                <th onClick={()=>onSort("oppStatus")}>Status {sortArrow("oppStatus")}</th>
                <th onClick={()=>onSort("disposition")}>Disposition {sortArrow("disposition")}</th>
                <th>Therapist</th>
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
                    <td>{safe(r.oppStatus)}</td>
                    <td>{safe(r.disposition)}</td>
                    <td>{safe(r.__therapist)}</td>
                    {showAppt && <td>{fmtDate(r.appointmentdatetime||r.appointmentDateTime)}</td>}
                    <td>{safe(r.remarks)}</td>
                    <td>{safe(r.salesOwner)}</td>
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
      {/* Batch navigation for large campaigns */}
      <div className="cd-server-pager">
        <span className="cd-count">
          {serverTotal.toLocaleString()} total · showing {
            ((serverPage-1)*SERVER_PAGE_SIZE+1).toLocaleString()}–{
            Math.min(serverPage*SERVER_PAGE_SIZE, serverTotal).toLocaleString()}
        </span>
        {serverTotal > SERVER_PAGE_SIZE && (<>
          <button className="cd-pgbtn" disabled={serverPage<=1}
            onClick={()=>setServerPage(p=>p-1)}>← Prev</button>
          <span style={{fontSize:13,color:"#475569"}}>
            Page {serverPage} / {Math.ceil(serverTotal/SERVER_PAGE_SIZE)}
          </span>
          <button className="cd-pgbtn" disabled={serverPage>=Math.ceil(serverTotal/SERVER_PAGE_SIZE)}
            onClick={()=>setServerPage(p=>p+1)}>Next →</button>
        </>)}
      </div>
      <Pager page={page} totalPages={clientTotalPages} onPage={setPage} />
    </div>
  );
}

// ─── EXTERNAL section (R7) ────────────────────────────────────────────────────

function ExternalSection({ oppCode, churnKey=0 }) {
  const [rows,       setRows]       = useState([]);
  const [serverTotal,setServerTotal]= useState(0);
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState("");
  const [page,       setPage]       = useState(1);

  const [status,     setStatus]     = useState("");
  const [owner,      setOwner]      = useState("");
  const [disp,       setDisp]       = useState("");
  const [srchDraft,  setSrchDraft]  = useState("");
  const [search,     setSearch]     = useState("");
  const [fromDate,   setFromDate]   = useState(todayISO());
  const [toDate,     setToDate]     = useState(todayISO());

  const [fuMode,     setFuMode]     = useState("");
  const [fuFrom,     setFuFrom]     = useState("");
  const [fuTo,       setFuTo]       = useState("");
  const [fuTFrom,    setFuTFrom]    = useState("");
  const [fuTTo,      setFuTTo]      = useState("");

  const [ownerOpts,  setOwnerOpts]  = useState([]);
  const [dispOpts,   setDispOpts]   = useState([]);

  const navigate = useNavigate();

  useEffect(()=>{
    const t=setTimeout(()=>setSearch(srchDraft),250);
    return()=>clearTimeout(t);
  },[srchDraft]);

  // Load filter options
  useEffect(()=>{
    if(!oppCode) return;
    fetch(`${API_BASE_URL}/api/Opportunity/GetExternalOppFilterOptions/${encodeURIComponent(oppCode)}`,
      {headers:authHeaders()})
      .then(r=>r.json())
      .then(d=>{setOwnerOpts(d?.owners||[]);setDispOpts(d?.dispositions||[]);})
      .catch(()=>{});
  },[oppCode]);

  // Fetch page
  useEffect(()=>{
    if(!oppCode) return;
    let alive=true; setLoading(true); setErr("");
    fetch(`${API_BASE_URL}/api/Opportunity/LoadExternalOppDetails`, {
      method:"POST", headers:authHeaders(),
      body:JSON.stringify({
        oppCode, fromDate, toDate,
        pageNumber:page, pageSize:PAGE_SIZE,
        searchTerm:search, statusFilter:status,
        ownerFilter:owner, dispFilter:disp,
      }),
    })
      .then(r=>r.json())
      .then(d=>{
        if(!alive) return;
        const list=Array.isArray(d?.data)?d.data:Array.isArray(d)?d:[];
        const total=d?.totalCount??d?.total??list.length;
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
            followUpDate: fuDateClean,
            __fuStamp:  fuDateClean ? stamp(toMidnight(fuDateClean)) : NaN,
            __fuMin:    (() => {
              const t = String(x?.followUpTime || "").trim().toUpperCase();
              let h, mm;
              let m = t.match(/T(\d{2}):(\d{2})/);           // SQL time as ISO -> 24h wall clock
              if (m) { h = +m[1]; mm = +m[2]; }
              else {
                m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/); // "02:30 PM" label or "14:30"
                if (!m) return NaN;
                h = +m[1]; mm = +m[2];
                if (m[3] === "PM" && h < 12) h += 12;
                if (m[3] === "AM" && h === 12) h = 0;
              }
              return h * 60 + mm;
            })(),
            __fuLabel:  to12hLabel(x?.followUpTime),
          };
        }));
        setServerTotal(total);
      })
      .catch(e=>{if(alive)setErr(e.message);})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[oppCode,fromDate,toDate,page,search,status,owner,disp,churnKey]);

  useEffect(()=>setPage(1),[search,status,owner,disp,fromDate,toDate,fuMode,fuFrom,fuTo,fuTFrom,fuTTo]);

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

  const filtered = useMemo(()=>{
    let list=rows.slice();
    if(fuDateRange) list=list.filter(r=>{
      const s=r.__fuStamp; if(isNaN(s)) return false;
      return s>=fuDateRange.from&&s<=fuDateRange.to;
    });
    const fMin=timeToMin(fuTFrom), tMin=timeToMin(fuTTo);
    if(!isNaN(fMin)||!isNaN(tMin)) list=list.filter(r=>{
      if(isNaN(r.__fuMin)) return false;
      if(!isNaN(fMin)&&r.__fuMin<fMin) return false;
      if(!isNaN(tMin)&&r.__fuMin>tMin) return false;
      return true;
    });
    return list;
  },[rows,fuDateRange,fuTFrom,fuTTo]);

  const totalPages = Math.max(1,Math.ceil(serverTotal/PAGE_SIZE));

  return (
    <div>
      <div className="cd-filters">
        <div className="cd-frow">
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
            <SearchableSelect options={ownerOpts} value={owner} onChange={setOwner} placeholder="All Owners" />
          </div>
          <div className="cd-fg">
            <label>Disposition</label>
            <SearchableSelect options={dispOpts} value={disp} onChange={setDisp} placeholder="All Dispositions" />
          </div>
          <div className="cd-fg"><label>Created From</label><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
          <div className="cd-fg"><label>Created To</label><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
          <div className="cd-fg">
            <label>Follow Up Date</label>
            <select value={fuMode} onChange={e=>setFuMode(e.target.value)}>
              <option value="">All</option>
              <option value="0">Today</option><option value="1">Tomorrow</option><option value="2">Date Range</option>
            </select>
          </div>
          {fuMode==="2" && (<>
            <div className="cd-fg"><label>FU From</label><input type="date" value={fuFrom} onChange={e=>setFuFrom(e.target.value)} /></div>
            <div className="cd-fg"><label>FU To</label><input type="date" value={fuTo} onChange={e=>setFuTo(e.target.value)} /></div>
          </>)}
          <div className="cd-fg"><label>FU Time From</label><input type="time" value={fuTFrom} onChange={e=>setFuTFrom(e.target.value)} /></div>
          <div className="cd-fg"><label>FU Time To</label><input type="time" value={fuTTo} onChange={e=>setFuTTo(e.target.value)} /></div>
        </div>
      </div>

      <div className="cd-searchrow">
        <span className="cd-count">{serverTotal} record(s)</span>
        <input className="cd-search" placeholder="Search (Customer, Mobile, Remarks…)"
          value={srchDraft} onChange={e=>setSrchDraft(e.target.value)} />
      </div>

      {loading && <Loading />}
      {err     && <ErrMsg msg={err} />}
      {!loading && !err && (
        filtered.length ? (
          <div className="cd-tablewrap">
            <table className="cd-table">
              <thead><tr>
                <th>Lead ID</th><th>Lead Name</th><th>Mobile</th>
                <th>Status</th><th>Disposition</th>
                <th>Follow Up Date</th><th>Follow Up Time</th>
                <th>Remarks</th><th>Sales Owner</th>
                <th>Modified By</th><th>Modified Date</th><th>Created Date</th>
              </tr></thead>
              <tbody>
                {filtered.map((r,i)=>(
                  <tr key={`${r.recid||i}-${i}`}>
                    <td>
                      <button className="cd-link" onClick={()=>navigate(
                        `/opportunity/external/${encodeURIComponent(oppCode)}/lead/${encodeURIComponent(r.recid||"")}`,
                        {state:{oppCode,row:r}}
                      )}>
                        {r.recid?`LD-EX-${fmtProspectId(r.recid,"").replace("—","")||r.recid}`:"—"}
                      </button>
                    </td>
                    <td>{safe(r.custName)}</td>
                    <td>{safe(r.custMobileNo)}</td>
                    <td>{safe(r.oppStatus)}</td>
                    <td>{safe(r.disposition)}</td>
                    <td>{fmtDate(r.followUpDate)}</td>
                    <td>{safe(r.__fuLabel)}</td>
                    <td>{safe(r.remarks)}</td>
                    <td>{safe(r.salesOwner)}</td>
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
      <Pager page={page} totalPages={totalPages} onPage={setPage} />
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

function ManualSection({ oppCode, header, churnKey=0 }) {
  // LeadOpp.Campaign_FK = CLINIC_OPPORTUNITYDETAILS.RECID (campaignDetailId)
  // NOT CLINIC_OPPORTUNITYSUMMARY.RECID (recid)
  const campaignRecId = Number(
    header?.campaignDetailId || header?.recid || header?.recId || 0
  );

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [page,    setPage]    = useState(1);

  const [status,  setStatus]  = useState("");
  const [owner,   setOwner]   = useState("");
  const [disp,    setDisp]    = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [fuMode,  setFuMode]  = useState("");
  const [fuFrom,  setFuFrom]  = useState("");
  const [fuTo,    setFuTo]    = useState("");
  const [fuTime,  setFuTime]  = useState("");
  const [srchDraft,setSrchDraft]=useState("");
  const [search,  setSearch]  = useState("");

  const navigate = useNavigate();

  useEffect(()=>{ const t=setTimeout(()=>setSearch(srchDraft),250); return()=>clearTimeout(t); },[srchDraft]);
  useEffect(()=>setPage(1),[search,status,owner,disp,doctorFilter,fuMode,fuFrom,fuTo,fuTime]);

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
          const _prospectType = _type==="opportunity" ? "Opportunity"
                              : _type==="lead"        ? "Lead"
                              : (_custID.trim()===""  ? "Lead" : "Opportunity");
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
          remark:(x?.remark||x?.remarks||"").toString(),
          owner: (x?.saleOwner||x?.salesOwner||"").toString(),
          modifiedBy:(x?.modifiedBy||"").toString(),
          modifiedDate:x?.modifiedDate||"",
          createdDate: x?.createdDate||"",
          __fuStamp: stamp(toMidnight(x?.followUpDate||"")),
          __q: [_prospectId,_prospectType,_doctor,x?.leadOpp_ID,x?.customerName,x?.custName,x?.custID,x?.mobile,x?.mobileNumber,
            x?.status,x?.disposition,x?.saleOwner,x?.salesOwner]
            .map(v=>(v??"").toString().toLowerCase()).join("|"),
        });}));
      })
      .catch(e=>{ if(alive) setErr(e.message); })
      .finally(()=>{ if(alive) setLoading(false); });
    return()=>{alive=false;};
  },[campaignRecId, churnKey]);

  const ownerOpts = useMemo(()=>["", ...new Set(rows.map(r=>r.owner).filter(Boolean))],[rows]);
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

  const filtered = useMemo(()=>{
    let list=rows.slice();
    const s=search.trim().toLowerCase();
    if(s)     list=list.filter(r=>(r.__q||"").includes(s));
    if(status)list=list.filter(r=>norm(r.status)===norm(status));
    if(owner) list=list.filter(r=>norm(r.owner)===norm(owner));
    if(disp)  list=list.filter(r=>norm(r.disposition)===norm(disp));
    if(doctorFilter) list=list.filter(r=>norm(r.doctor)===norm(doctorFilter));
    if(fuDateRange)list=list.filter(r=>{
      const s=r.__fuStamp; if(isNaN(s)) return false;
      return s>=fuDateRange.from&&s<=fuDateRange.to;
    });
    if(fuTime)list=list.filter(r=>norm(r.fuTimeLabel)===norm(fuTime));
    return list;
  },[rows,search,status,owner,disp,doctorFilter,fuDateRange,fuTime]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paged=useMemo(()=>filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),[filtered,page]);

  return (
    <div>
      <div className="cd-filters">
        <div className="cd-frow">
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
              {ownerOpts.map((o,i)=><option key={i} value={o}>{o||"All"}</option>)}
            </select>
          </div>
          <div className="cd-fg">
            <label>Disposition</label>
            <select value={disp} onChange={e=>setDisp(e.target.value)}>
              {dispOpts.map((d,i)=><option key={i} value={d}>{d||"All"}</option>)}
            </select>
          </div>
          <div className="cd-fg">
            <label>Doctor</label>
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
          {fuMode==="2"&&(<>
            <div className="cd-fg"><label>FU From</label><input type="date" value={fuFrom} onChange={e=>setFuFrom(e.target.value)} /></div>
            <div className="cd-fg"><label>FU To</label><input type="date" value={fuTo} onChange={e=>setFuTo(e.target.value)} /></div>
          </>)}
          <div className="cd-fg">
            <label>Follow Up Time</label>
            <select value={fuTime} onChange={e=>setFuTime(e.target.value)}>
              <option value="">All</option>
              {HALF_HOURS_12.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:10}}>
          <button className="cd-btn-pri" onClick={()=>navigate(`/manuallead/${oppCode}`,{state:{oppCode,header}})}>
            + Add Lead
          </button>
          <button className="cd-btn-pri" onClick={()=>navigate(`/opportunity/customers`,{state:{oppCode,header}})}>
            + Add Opportunity
          </button>
        </div>
      </div>

      <div className="cd-searchrow">
        <span className="cd-count">{filtered.length} / {rows.length} record(s)</span>
        <input className="cd-search" placeholder="Search (Prospect, Customer, Status, Owner…)"
          value={srchDraft} onChange={e=>setSrchDraft(e.target.value)} />
      </div>

      {(loading || !campaignRecId) && <Loading />}
      {err     && <ErrMsg msg={err} />}
      {!loading && campaignRecId && !err && (
        paged.length ? (
          <div className="cd-tablewrap">
            <table className="cd-table">
              <thead><tr>
                <th>Prospect ID</th><th>Prospect Type</th><th>Cust ID</th><th>Name</th><th>Mobile</th><th>Doctor</th>
                <th>Status</th><th>Follow Up Date</th><th>Follow Up Time</th>
                <th>Disposition</th><th>Remarks</th><th>Sales Owner</th>
                <th>Modified By</th><th>Modified Date</th><th>Created Date</th>
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
                    <td>{safe(r.status)}</td>
                    <td>{fmtDate(r.fuDate)}</td>
                    <td>{safe(r.fuTimeLabel)}</td>
                    <td>{safe(r.disposition)}</td>
                    <td>{safe(r.remark)}</td>
                    <td>{safe(r.owner)}</td>
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
      <Pager page={page} totalPages={totalPages} onPage={setPage} />
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

  return (
    <>
      <div className="cd-container">
        {/* Breadcrumb */}
        <div className="cd-breadcrumb">
          <span className="cd-bclink" onClick={()=>navigate("/opportunity")}>Opportunity</span>
          {" › "}
          <span className="cd-bccur">Campaign Details</span>
        </div>

        <div className="cd-card">
          {/* Header */}
          <div className="cd-header">
            <div className="cd-headerleft">
              <div className="cd-pair">
                <span className="cd-lbl">Campaign Code</span>
                <span className="cd-pill">{safe(header.oppCode)}</span>
              </div>
              <div className="cd-pair">
                <span className="cd-lbl">Campaign Name</span>
                <span>{safe(header.oppName)}</span>
              </div>
              <div className="cd-pair">
                <span className="cd-lbl">Rule Type</span>
                <span>{ruleLabel}</span>
              </div>
              <div className="cd-pair">
                <span className="cd-lbl">Campaign Period</span>
                <span>{fmtDate(fromDate)} – {fmtDate(toDate)}</span>
              </div>
              {hdrLoading && <div className="cd-hint">Loading campaign…</div>}
              {hdrErr     && <div className="cd-hint cd-hint-err">{hdrErr}</div>}
            </div>
            <div className="cd-headerright">
              <button className="cd-btn-pri" onClick={handleGetLatestData} disabled={churning}
                style={{ minWidth:160, opacity: churning ? 0.7 : 1 }}>
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
            />
          )}
          {kind === "external" && (
            <ExternalSection oppCode={oppCode} churnKey={churnKey} />
          )}
          {kind === "manual" && (
            <ManualSection oppCode={oppCode} header={header} churnKey={churnKey} />
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
        .cd-container { padding: 20px; }
        .cd-breadcrumb { font-size:13px; color:#64748b; margin-bottom:14px; }
        .cd-bclink { color:#334b71; font-weight:700; cursor:pointer; }
        .cd-bclink:hover { text-decoration:underline; }
        .cd-bccur  { color:#94a3b8; }

        .cd-card { background:#fff; border-radius:12px; padding:24px; box-shadow:0 2px 10px rgba(0,0,0,.07); }

        .cd-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #e8edf5; }
        .cd-headerleft { display:grid; gap:8px; }
        .cd-headerright { display:flex; gap:10px; flex-shrink:0; }
        .cd-pair { font-size:14px; color:#333; display:flex; gap:10px; align-items:baseline; }
        .cd-lbl { font-weight:700; color:#475569; min-width:150px; }
        .cd-pill { background:#eef3ff; color:#334b71; padding:3px 10px; border-radius:20px; font-size:13px; font-weight:700; }
        .cd-hint { font-size:12px; color:#64748b; }
        .cd-hint-err { color:#c33; }

        /* Filters */
        .cd-filters { background:#f7f9fc; border:1px solid #e6eaf2; border-radius:10px; padding:16px; margin-bottom:14px; }
        .cd-frow { display:flex; flex-wrap:wrap; gap:12px 16px; align-items:flex-end; }
        .cd-fg { display:flex; flex-direction:column; gap:5px; min-width:160px; flex:1; max-width:220px; }
        .cd-fg label { font-size:12px; font-weight:700; color:#475569; }
        .cd-fg input, .cd-fg select { height:36px; border:1px solid #d7ddea; border-radius:7px; padding:0 10px; font-size:13px; color:#222; background:#fff; width:100%; box-sizing:border-box; }
        .cd-wide { max-width:280px; }
        .cd-daterange { display:flex; gap:6px; align-items:center; }
        .cd-daterange input { flex:1; min-width:0; }
        .cd-timepair { display:flex; gap:6px; }
        .cd-timepair select { flex:1; }

        /* Search row */
        .cd-searchrow { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
        .cd-count { font-size:13px; color:#64748b; white-space:nowrap; }
        .cd-search { flex:1; max-width:320px; height:36px; border:1px solid #d7ddea; border-radius:7px; padding:0 12px; font-size:13px; color:#222; }

        /* Buttons */
        .cd-btn-pri { background:#0f2445; color:#fff; border:0; border-radius:8px; padding:8px 16px; font-weight:700; cursor:pointer; font-size:13px; white-space:nowrap; }
        .cd-btn-pri:hover { opacity:.9; }
        .cd-btn-sec { background:#334b71; color:#fff; border:0; border-radius:8px; padding:8px 16px; font-weight:700; cursor:pointer; font-size:13px; white-space:nowrap; }
        .cd-btn-sec:hover { opacity:.9; }

        /* Table */
        .cd-tablewrap { overflow-x:auto; border-radius:10px; border:1px solid #e8edf5; }
        .cd-table { width:100%; border-collapse:collapse; min-width:900px; }
        .cd-table thead th { background:#f6f8fb; padding:11px 13px; text-align:left; font-size:12px; font-weight:700; color:#475569; border-bottom:1px solid #e8edf5; white-space:nowrap; cursor:pointer; user-select:none; }
        .cd-table tbody td { padding:11px 13px; font-size:13px; color:#333; border-bottom:1px solid #f0f2f6; vertical-align:middle; white-space:nowrap; }
        .cd-table tbody tr:hover { background:#fafbfe; }
        .cd-link { background:none; border:none; padding:0; color:#2b5ec2; font-weight:700; cursor:pointer; font-size:13px; }

        /* Pager */
        .cd-server-pager { display:flex; align-items:center; gap:10px; margin-top:12px;
          padding:10px 14px; background:#f7f9fc; border:1px solid #e6eaf2; border-radius:8px; }
        .cd-pager { display:flex; align-items:center; gap:8px; margin-top:14px; justify-content:flex-end; }
        .cd-pgbtn { height:32px; padding:0 12px; border:1px solid #d7ddea; border-radius:7px; background:#fff; font-weight:600; cursor:pointer; font-size:13px; }
        .cd-pgbtn:disabled { opacity:.5; cursor:not-allowed; }
        .cd-pginfo { font-size:13px; color:#475569; padding:0 6px; }

        /* Misc */
        .cd-empty { padding:20px; text-align:center; color:#94a3b8; background:#f9fafc; border:1px dashed #e2e8f0; border-radius:8px; margin-top:12px; }
        .cd-loading { padding:30px; text-align:center; font-size:16px; color:#64748b; }
        .cd-err { padding:14px; background:#fdf3f3; border:1px solid #f0c4c0; border-radius:8px; color:#b91c1c; margin-top:10px; font-size:13px; }
        .cd-toast { position:fixed; left:0; right:0; top:28%; margin:0 auto; max-width:480px; background:#0d3d1a; color:#fff; padding:18px 24px; border-radius:10px; font-weight:700; box-shadow:0 8px 24px rgba(0,0,0,.2); z-index:99999; text-align:center; }

        /* SearchableSelect */
        .ss-wrap { position:relative; width:100%; }
        .ss-ctrl { display:flex; align-items:center; justify-content:space-between; height:36px; border:1px solid #d7ddea; border-radius:7px; padding:0 10px; background:#fff; cursor:pointer; font-size:13px; user-select:none; box-sizing:border-box; }
        .ss-ctrl.ss-open { border-color:#334b71; }
        .ss-ph { color:#94a3b8; }
        .ss-acts { display:flex; align-items:center; gap:6px; }
        .ss-x { font-size:11px; color:#94a3b8; cursor:pointer; }
        .ss-x:hover { color:#c33; }
        .ss-drop { position:absolute; top:calc(100% + 3px); left:0; right:0; background:#fff; border:1px solid #d7ddea; border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,.1); z-index:9999; }
        .ss-search { width:100%; box-sizing:border-box; height:32px; border:none; border-bottom:1px solid #e8edf5; padding:0 10px; font-size:13px; outline:none; }
        .ss-list { max-height:200px; overflow-y:auto; }
        .ss-item { padding:8px 12px; font-size:13px; cursor:pointer; }
        .ss-item:hover { background:#f1f5ff; }
        .ss-active { background:#eef3ff; color:#334b71; font-weight:700; }
        .ss-no { padding:10px 12px; font-size:13px; color:#94a3b8; }
      `}</style>
    </>
  );
}