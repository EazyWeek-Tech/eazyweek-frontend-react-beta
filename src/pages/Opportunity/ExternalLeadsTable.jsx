"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/** -----------------------------
 * Date helpers
 * ----------------------------- */
const toISODateOnly = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(s);
  return Number.isNaN(+dt) ? "" : toISODateOnly(dt);
};

const getTodayInputDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDDMMYYYY = (v) => {
  if (!v) return "—";
  const iso = toISODateOnly(v);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
};

const formatDDMMYYYYDash = (v) => {
  if (!v) return "—";
  const iso = toISODateOnly(v);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}-${m}-${y}`;
};

const safe = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : v;

/** -----------------------------
 * Misc helpers
 * ----------------------------- */
const padLeadId = (v, width = 7) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Math.trunc(n)).padStart(width, "0");
};

/** Format time for display: "13:30:00" + "PM" -> "01:30 PM" */
const toTimeLabel12h = (hhmmss, ampm) => {
  const t = String(hhmmss || "").trim();
  const ap = String(ampm || "").trim().toUpperCase();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return ap ? ap : "";
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const labelAmpm = ap || (hh >= 12 ? "PM" : "AM");
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${labelAmpm}`;
};

/**
 * parseDateMidnight — parse various date formats to Date at midnight local.
 * Named uniquely to avoid bundler rename conflicts (toDate2 error).
 * Handles: "17/04/2026" (dd/MM/yyyy from API), "2026-04-17" (ISO), Date objects.
 */
const parseDateMidnight = (v) => {
  if (!v) return null;
  if (v instanceof Date) {
    if (Number.isNaN(+v)) return null;
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }
  const s = String(v).trim();
  if (!s) return null;
  // yyyy-MM-dd
  const isoOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoOnly) return new Date(+isoOnly[1], +isoOnly[2] - 1, +isoOnly[3]);
  // dd/MM/yyyy  <-- API response format e.g. "17/04/2026"
  const dmySlash = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s|T|$)/);
  if (dmySlash) return new Date(+dmySlash[3], +dmySlash[2] - 1, +dmySlash[1]);
  // dd-MM-yyyy
  const dmyDash = s.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s|T|$)/);
  if (dmyDash) return new Date(+dmyDash[3], +dmyDash[2] - 1, +dmyDash[1]);
  const d = new Date(s);
  if (Number.isNaN(+d)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Convert a Date to a numeric midnight timestamp for fast comparison. */
const dateToStamp = (d) => {
  if (!d) return NaN;
  return +new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * Convert API followUptime ("13:30:00") to total minutes since midnight.
 * The API sends 24h time — AMPM field is for display only.
 */
const rowTimeToMinutes = (hhmmss) => {
  const t = String(hhmmss || "").trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return NaN;
  return h * 60 + min;
};

/**
 * Convert an <input type="time"> value ("HH:mm") to total minutes.
 * Returns NaN when empty/invalid.
 */
const inputTimeToMinutes = (hhmm) => {
  if (!hhmm) return NaN;
  const parts = String(hhmm).split(":");
  if (parts.length !== 2) return NaN;
  const h = Number(parts[0]);
  const min = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(min)) return NaN;
  return h * 60 + min;
};

// ─── Session storage helpers (keyed by oppCode) ───────────────────────────
const SS_EXT_FILTER_KEY = (oppCode) => `EW_EXT_FILTERS_${oppCode}`;

const readSavedFilters = (oppCode) => {
  try {
    return JSON.parse(sessionStorage.getItem(SS_EXT_FILTER_KEY(oppCode)) || "{}");
  } catch {
    return {};
  }
};

const saveFilters = (oppCode, filters) => {
  try {
    sessionStorage.setItem(SS_EXT_FILTER_KEY(oppCode), JSON.stringify(filters));
  } catch {
    // sessionStorage unavailable in some privacy modes — fail silently
  }
};

const buildFilterSnapshot = ({
  statusFilter, ownerFilter, dispositionFilter, searchDraft,
  fromDate, toDate,
  followDateMode, followUpFromDate, followUpToDate, followUpFromTime, followUpToTime,
}) => ({
  statusFilter, ownerFilter, dispositionFilter, searchDraft,
  fromDate, toDate,
  followDateMode, followUpFromDate, followUpToDate, followUpFromTime, followUpToTime,
});
// ─────────────────────────────────────────────────────────────────────────

/** -----------------------------
 * SearchableSelect component
 * ----------------------------- */
function SearchableSelect({ options = [], value, onChange, placeholder = "All" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (opt) => { onChange(opt); setOpen(false); setQuery(""); };
  const handleClear = (e) => { e.stopPropagation(); onChange(""); setOpen(false); setQuery(""); };

  return (
    <div className="ss-wrap" ref={wrapRef}>
      <div
        className={`ss-control ${open ? "ss-open" : ""}`}
        onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        <span className={`ss-value ${!value ? "ss-placeholder" : ""}`}>{value || placeholder}</span>
        <span className="ss-actions">
          {value && <span className="ss-clear" onClick={handleClear} title="Clear">✕</span>}
          <span className="ss-arrow">{open ? "▲" : "▼"}</span>
        </span>
      </div>
      {open && (
        <div className="ss-dropdown">
          <div className="ss-search-wrap">
            <input
              ref={inputRef}
              className="ss-search"
              placeholder="Type to search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="ss-list">
            <div className={`ss-item ${!value ? "ss-item-active" : ""}`} onClick={() => handleSelect("")}>All</div>
            {filtered.length === 0 && <div className="ss-no-results">No results</div>}
            {filtered.map((opt, i) => (
              <div key={i} className={`ss-item ${value === opt ? "ss-item-active" : ""}`} onClick={() => handleSelect(opt)}>
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** -----------------------------
 * API URLs
 * ----------------------------- */
const GET_CAMPAIGN_URL = (oppCode) =>
  `${API_BASE_URL}/api/LeadOpp/getCampaign/${encodeURIComponent(oppCode)}`;

const GET_FILTER_OPTIONS_URL = (oppCode) =>
  `${API_BASE_URL}/api/Opportunity/GetExternalOppFilterOptions/${encodeURIComponent(oppCode)}`;

/**
 * Fetch one page from the server.
 * Status / owner / disposition / search / created-date are server-side filters.
 * Follow-up date & time are NOT sent — they are filtered client-side.
 */
const fetchOppDetails = async ({
  oppCode, fromISO, toISO,
  page = 1, pageSize = 10,
  searchTerm = "", statusFilter = "", ownerFilter = "", dispFilter = "",
}) => {
  const code = String(oppCode || "").trim();
  const from = fromISO ? toISODateOnly(fromISO) : getTodayInputDate();
  const to   = toISO   ? toISODateOnly(toISO)   : getTodayInputDate();

  const payload = {
    oppCode: code,
    fromDate: from,
    toDate: to,
    pageNumber: page,
    pageSize,
    searchTerm,
    statusFilter,
    ownerFilter,
    dispFilter,
  };

  const res  = await fetch(`${API_BASE_URL}/api/Opportunity/LoadExternalOppDetails`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
  const data = JSON.parse(text);

  if (data?.data && Array.isArray(data.data))
    return { rows: data.data, totalCount: data.totalCount ?? data.data.length };
  if (Array.isArray(data))
    return { rows: data, totalCount: data.length };
  return { rows: [], totalCount: 0 };
};

/** -----------------------------
 * Row mapper
 * Pre-computes __followUpStamp and __followUpMinutes for client-side filtering.
 *
 * API shape:
 *   followUpDate : "17/04/2026"  (dd/MM/yyyy)
 *   followUptime : "13:30:00"    (HH:mm:ss — already 24h)
 *   followUpAMPM : "PM"          (display only)
 * ----------------------------- */
const normalizeOppStatus = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "1") return "Open";
  if (s === "2") return "Closed";
  const t = s.toLowerCase();
  if (t === "open") return "Open";
  if (t === "closed" || t === "close") return "Closed";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const mapExternalRow = (x) => {
  const oppStatus       = normalizeOppStatus(x?.oppStatus);
  const followUpDateRaw = (x?.followUpDate ?? "").toString().trim(); // "17/04/2026"
  const followUpTimeRaw = (x?.followUptime ?? "").toString().trim(); // "13:30:00"
  const followUpAMPM    = (x?.followUpAMPM ?? "").toString().trim(); // "PM"

  const followUpDateObj   = parseDateMidnight(followUpDateRaw);
  const __followUpStamp   = followUpDateObj ? dateToStamp(followUpDateObj) : NaN;
  const __followUpMinutes = rowTimeToMinutes(followUpTimeRaw); // 24h minutes

  return {
    recid:              x?.recid ?? x?.recId ?? "",
    custID:             (x?.custID        ?? "").toString(),
    custName:           (x?.custName      ?? "").toString(),
    custMobileNo:       (x?.custMobileNo  ?? "").toString(),
    therapistCode:      (x?.therapistCode ?? "").toString().trim(),
    therapistname:      (x?.therapistname ?? x?.therapistName ?? "").toString().trim(),
    interestedInCode:   (x?.interestedInCode   ?? "").toString().trim(),
    interestedInName:   (x?.interestedInName   ?? "").toString().trim(),
    dispositionCode:    (x?.dispositionCode    ?? "").toString().trim(),
    disposition:        (x?.disposition        ?? "").toString().trim(),
    subDispositionCode: (x?.subDispositionCode ?? "").toString().trim(),
    subDisposition:     (x?.subDisposition     ?? "").toString().trim(),
    followUpDate:       followUpDateRaw,
    medium:             (x?.medium    ?? "").toString().trim(),
    subMedium:          (x?.subMedium ?? "").toString().trim(),
    source:             (x?.source    ?? "").toString().trim(),
    subSource:          (x?.subSource ?? "").toString().trim(),
    followUptime:       followUpTimeRaw,
    followUpAMPM,
    followUpTimeLabel:  toTimeLabel12h(followUpTimeRaw, followUpAMPM),
    modifieddate:       x?.modifieddate ?? x?.modifiedDate ?? "",
    modifiedBy:         x?.modifiedBy ?? "",
    oppStatus,
    remarks:            (x?.remarks    ?? "").toString(),
    salesOwner:         (x?.salesOwner ?? "").toString(),
    createddate:        x?.createddate ?? x?.createdDate ?? "",
    // Internal — used for filtering only
    __followUpStamp,
    __followUpMinutes,
  };
};

/** -----------------------------
 * Main component
 * ----------------------------- */
export default function ExternalLeadsTable({ oppCode, header, onToast }) {
  const navigate  = useNavigate();
  const params    = useParams();
  const location  = useLocation();

  const segmentTypeFromState = location?.state?.segmentType || "";
  const segmentTypeFromUrl   = params?.segmentType || "";
  const segmentType          = String(segmentTypeFromState || segmentTypeFromUrl || "").trim();
  const isStaticSegment      = segmentType.toLowerCase() === "static";

  const fromDateFromUrl = params?.fromDate || "";
  const toDateFromUrl   = params?.toDate   || "";
  const oppCodeFromUrl  = params?.oppCode  || params?.OppCode || "";

  const effectiveOppCode = (oppCode || header?.oppCode || oppCodeFromUrl || "").toString().trim();

  const _saved = useMemo(() => readSavedFilters(effectiveOppCode), [effectiveOppCode]);

  // ── Pagination ────────────────────────────────────────────────────────
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // ── Campaign header ───────────────────────────────────────────────────
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignErr,     setCampaignErr]     = useState("");
  const [campaignHeader,  setCampaignHeader]  = useState(null);

  // ── Filter options from API ───────────────────────────────────────────
  const [ownerOptions,       setOwnerOptions]       = useState([]);
  const [dispositionOptions, setDispositionOptions] = useState([]);
  const [optionsLoading,     setOptionsLoading]     = useState(false);

  // ── All rows fetched from server (accumulated across all pages) ───────
  const [loading,     setLoading]     = useState(false);
  const [err,         setErr]         = useState("");
  const [allRows,     setAllRows]     = useState([]);
  const [serverTotal, setServerTotal] = useState(0);

  // ── Server-side filters ───────────────────────────────────────────────
  const [statusFilter,      setStatusFilter]      = useState(_saved.statusFilter      ?? "");
  const [ownerFilter,       setOwnerFilter]        = useState(_saved.ownerFilter       ?? "");
  const [dispositionFilter, setDispositionFilter]  = useState(_saved.dispositionFilter ?? "");
  const [searchDraft,       setSearchDraft]        = useState(_saved.searchDraft       ?? "");
  const [searchTerm,        setSearchTerm]         = useState(_saved.searchDraft       ?? "");

  const [fromDate, setFromDate] = useState(() => {
    if (_saved.fromDate != null) return _saved.fromDate;
    return isStaticSegment ? "" : getTodayInputDate();
  });
  const [toDate, setToDate] = useState(() => {
    if (_saved.toDate != null) return _saved.toDate;
    return isStaticSegment ? "" : getTodayInputDate();
  });
  const [dateTouched, setDateTouched] = useState(false);

  // ── Client-side follow-up date/time filters ───────────────────────────
  const [followDateMode,   setFollowDateMode]   = useState(_saved.followDateMode   ?? "");
  const [followUpFromDate, setFollowUpFromDate] = useState(_saved.followUpFromDate ?? "");
  const [followUpToDate,   setFollowUpToDate]   = useState(_saved.followUpToDate   ?? "");
  const [followUpFromTime, setFollowUpFromTime] = useState(_saved.followUpFromTime ?? "");
  const [followUpToTime,   setFollowUpToTime]   = useState(_saved.followUpToTime   ?? "");

  // ── Sorting ───────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  // ── Derive follow-up stamp range from mode ────────────────────────────
  const followDateRange = useMemo(() => {
    if (!followDateMode) return null;

    const today    = new Date();
    const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (followDateMode === "0") {
      const s = dateToStamp(midnight(today));
      return { from: s, to: s };
    }
    if (followDateMode === "1") {
      const tom = new Date(today);
      tom.setDate(today.getDate() + 1);
      const s = dateToStamp(midnight(tom));
      return { from: s, to: s };
    }
    if (followDateMode === "2") {
      if (!followUpFromDate || !followUpToDate) return null;
      const f = parseDateMidnight(followUpFromDate);
      const t = parseDateMidnight(followUpToDate);
      if (!f || !t) return null;
      let fs = dateToStamp(f);
      let ts = dateToStamp(t);
      if (fs > ts) { const tmp = fs; fs = ts; ts = tmp; }
      return { from: fs, to: ts };
    }
    return null;
  }, [followDateMode, followUpFromDate, followUpToDate]);

  // ── Persist filters ───────────────────────────────────────────────────
  useEffect(() => {
    if (!effectiveOppCode) return;
    saveFilters(effectiveOppCode, buildFilterSnapshot({
      statusFilter, ownerFilter, dispositionFilter, searchDraft,
      fromDate, toDate,
      followDateMode, followUpFromDate, followUpToDate, followUpFromTime, followUpToTime,
    }));
  }, [
    effectiveOppCode,
    statusFilter, ownerFilter, dispositionFilter, searchDraft,
    fromDate, toDate,
    followDateMode, followUpFromDate, followUpToDate, followUpFromTime, followUpToTime,
  ]);

  useEffect(() => {
    if (isStaticSegment) {
      setFromDate((p) => (_saved.fromDate != null ? p : ""));
      setToDate((p)   => (_saved.toDate   != null ? p : ""));
    } else {
      setFromDate((p) => (_saved.fromDate != null ? p : (p || getTodayInputDate())));
      setToDate((p)   => (_saved.toDate   != null ? p : (p || getTodayInputDate())));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaticSegment]);

  // 250 ms search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchDraft), 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // ── Load campaign header ──────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!effectiveOppCode) return;
      setCampaignLoading(true);
      setCampaignErr("");
      try {
        const res  = await fetch(GET_CAMPAIGN_URL(effectiveOppCode), {
          method: "GET", headers: { Accept: "application/json" }, credentials: "include",
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
        const data = JSON.parse(text);
        if (!alive) return;
        setCampaignHeader(data ? {
          oppCode:          (data.oppCode   ?? "").toString().trim(),
          oppName:          (data.oppName   ?? "").toString().trim(),
          oRuleCode:        (data.oRuleCode ?? "").toString().trim(),
          type:             (data.oRuleDetails ?? data.oRuleCode ?? "").toString().trim(),
          oppCampStartDate: data.oppCampStartDate ?? "",
          oppCampEndDate:   data.oppCampEndDate   ?? "",
        } : null);
      } catch (e) {
        console.error("Campaign header load failed", e);
        if (alive) { setCampaignHeader(null); setCampaignErr("Failed to load campaign details."); }
      } finally {
        if (alive) setCampaignLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [effectiveOppCode]);

  const uiHeader  = campaignHeader || header || {};
  const uiOppCode = (uiHeader?.oppCode || effectiveOppCode || "").toString().trim();
  const isR7      = String(uiHeader?.oRuleCode || "").trim().toUpperCase() === "R7";

  // ── Load filter options ───────────────────────────────────────────────
  useEffect(() => {
    if (!uiOppCode || !isR7) return;
    let alive = true;
    (async () => {
      setOptionsLoading(true);
      try {
        const res  = await fetch(GET_FILTER_OPTIONS_URL(uiOppCode), {
          method: "GET", headers: { Accept: "application/json" }, credentials: "include",
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = JSON.parse(text);
        if (!alive) return;
        setOwnerOptions(data?.owners ?? []);
        setDispositionOptions(data?.dispositions ?? []);
      } catch (e) {
        console.error("Filter options load failed", e);
      } finally {
        if (alive) setOptionsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [uiOppCode, isR7]);

  // ── Load ALL leads from server, then filter client-side ───────────────
  // Fetches all pages in parallel so follow-up date/time filters work
  // across the full result set — not just the current page.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uiOppCode) return;
      if (campaignHeader && !isR7) {
        setAllRows([]); setServerTotal(0); setErr(""); setLoading(false);
        return;
      }

      setLoading(true);
      setErr("");
      setAllRows([]);
      setServerTotal(0);

      try {
        const apiFrom = isStaticSegment ? (fromDate || "2000-01-01") : (fromDate || getTodayInputDate());
        const apiTo   = isStaticSegment ? (toDate   || "2900-01-01") : (toDate   || getTodayInputDate());

        // Page 1 — gives us totalCount so we know how many more pages to fetch
        const first = await fetchOppDetails({
          oppCode: uiOppCode, fromISO: apiFrom, toISO: apiTo,
          page: 1, pageSize: PAGE_SIZE,
          searchTerm, statusFilter, ownerFilter, dispFilter: dispositionFilter,
        });

        if (!alive) return;

        const total    = first.totalCount;
        const totalPgs = Math.ceil(total / PAGE_SIZE);
        let accumulated = (first.rows || []).map(mapExternalRow);

        // Fetch remaining pages in parallel
        if (totalPgs > 1) {
          const rest = [];
          for (let p = 2; p <= totalPgs; p++) rest.push(p);

          const pages = await Promise.all(
            rest.map((p) =>
              fetchOppDetails({
                oppCode: uiOppCode, fromISO: apiFrom, toISO: apiTo,
                page: p, pageSize: PAGE_SIZE,
                searchTerm, statusFilter, ownerFilter, dispFilter: dispositionFilter,
              })
                .then((r) => (r.rows || []).map(mapExternalRow))
                .catch(() => [])
            )
          );

          pages.forEach((pageRows) => { accumulated = accumulated.concat(pageRows); });
        }

        if (!alive) return;
        setAllRows(accumulated);
        setServerTotal(total);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setAllRows([]); setServerTotal(0);
        setErr(e?.message || "Failed to load external leads.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [
    uiOppCode, isR7, campaignHeader,
    fromDate, toDate, isStaticSegment,
    searchTerm, statusFilter, ownerFilter, dispositionFilter,
  ]);

  // Reset to page 1 whenever any filter/sort changes
  useEffect(() => {
    setPage(1);
  }, [
    searchTerm, statusFilter, ownerFilter, dispositionFilter,
    fromDate, toDate,
    followDateMode, followUpFromDate, followUpToDate, followUpFromTime, followUpToTime,
    sortKey, sortDir,
  ]);

  // ── Client-side: follow-up date/time filter + sort (all rows) ─────────
  const filteredRows = useMemo(() => {
    let list = allRows.slice();

    // 1) Follow-up DATE filter
    if (followDateRange) {
      list = list.filter((r) => {
        const stamp = r.__followUpStamp;
        if (Number.isNaN(stamp)) return false;
        return stamp >= followDateRange.from && stamp <= followDateRange.to;
      });
    }

    // 2) Follow-up TIME filter (24h comparison)
    const fromMin = inputTimeToMinutes(followUpFromTime);
    const toMin   = inputTimeToMinutes(followUpToTime);

    if (!Number.isNaN(fromMin) || !Number.isNaN(toMin)) {
      list = list.filter((r) => {
        const rMin = r.__followUpMinutes;
        if (Number.isNaN(rMin)) return false;
        if (!Number.isNaN(fromMin) && rMin < fromMin) return false;
        if (!Number.isNaN(toMin)   && rMin > toMin)   return false;
        return true;
      });
    }

    // 3) Sort
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        if (sortKey === "followUpDate") {
          const sa = a.__followUpStamp, sb = b.__followUpStamp;
          const ha = Number.isFinite(sa), hb = Number.isFinite(sb);
          if (ha && hb) return (sa - sb) * dir;
          if (ha) return -1 * dir;
          if (hb) return  1 * dir;
          return 0;
        }
        const av = (a?.[sortKey] ?? "").toString().toLowerCase();
        const bv = (b?.[sortKey] ?? "").toString().toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return  1 * dir;
        return 0;
      });
    }

    return list;
  }, [allRows, followDateRange, followUpFromTime, followUpToTime, sortKey, sortDir]);

  // ── Pagination over filteredRows ──────────────────────────────────────
  const totalFiltered = filteredRows.length;
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage      = Math.min(Math.max(page, 1), totalPages);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const toggleSort = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const SortMark = ({ k }) => (
    <span className="sort" title="Sort" onClick={() => toggleSort(k)} role="button">↕</span>
  );

  const renderPageButtons = () => {
    const windowSize = 5;
    let start = Math.max(1, safePage - Math.floor(windowSize / 2));
    let end   = Math.min(totalPages, start + windowSize - 1);
    start     = Math.max(1, end - windowSize + 1);
    const nodes = [];
    if (start > 1) {
      nodes.push(<button key="p1" className="pager-num" onClick={() => setPage(1)}>1</button>);
      if (start > 2) nodes.push(<span key="dots1" className="pager-dots">…</span>);
    }
    for (let i = start; i <= end; i++) {
      nodes.push(
        <button key={`p${i}`} className={`pager-num ${i === safePage ? "active" : ""}`} onClick={() => setPage(i)}>
          {i}
        </button>
      );
    }
    if (end < totalPages) {
      if (end < totalPages - 1) nodes.push(<span key="dots2" className="pager-dots">…</span>);
      nodes.push(
        <button key={`p${totalPages}`} className="pager-num" onClick={() => setPage(totalPages)}>
          {totalPages}
        </button>
      );
    }
    return nodes;
  };

  const goToExternalLeadForm = (row) => {
    const leadOppId = row?.recid || row?.recId || "";
    navigate(
      `/opportunity/external/${encodeURIComponent(uiOppCode)}/lead/${encodeURIComponent(leadOppId)}`,
      { state: { oppCode: uiOppCode, header: uiHeader, row, leadKind: "External", leadOppId } }
    );
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate("/opportunity")}>Opportunity</span>
        {" > "}
        <span className="breadcrumb-current">Details</span>
      </div>

      <div className="details-card">
        <div className="details-header">
          <div className="title-col">
            <div className="pair">
              <span className="label">Opportunity Code :</span>
              <span className="value pill">{safe(uiHeader?.oppCode || uiOppCode)}</span>
            </div>
            <div className="pair">
              <span className="label">Opportunity Name :</span>
              <span className="value">{safe(uiHeader?.oppName)}</span>
            </div>
            <div className="pair">
              <span className="label">Rule Details :</span>
              <span className="value">External Source</span>
            </div>
            {(fromDateFromUrl || toDateFromUrl) ? (
              <div className="pair">
                <span className="label">Campaign Period :</span>
                <span className="value">
                  {formatDDMMYYYYDash(fromDateFromUrl)} - {formatDDMMYYYYDash(toDateFromUrl)}
                </span>
              </div>
            ) : null}
            {campaignLoading ? <div style={{ fontSize: 12, color: "#64748b" }}>Loading campaign…</div> : null}
            {campaignErr     ? <div style={{ fontSize: 12, color: "#c33"    }}>{campaignErr}</div>     : null}
            {!campaignLoading && campaignHeader && !isR7 ? (
              <div style={{ fontSize: 12, color: "#c33" }}>
                This page is only for External Rule <strong>R7</strong>.
              </div>
            ) : null}
          </div>
          <div className="header-actions">
            <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="filters-card">
          <div className="filters-grid">

            {/* Status — server-side */}
            <div className="fgroup">
              <label className="flabel">Status :</label>
              <select className="finput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Sales Owner — server-side */}
            <div className="fgroup">
              <label className="flabel">
                Sales Owner :
                {optionsLoading && <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>loading…</span>}
              </label>
              <SearchableSelect options={ownerOptions} value={ownerFilter} onChange={setOwnerFilter} placeholder="All Owners" />
            </div>

            {/* Created From — server-side */}
            <div className="fgroup">
              <label className="flabel">From :</label>
              <input type="date" className="finput" value={fromDate}
                onChange={(e) => { setDateTouched(true); setFromDate(e.target.value); }} />
            </div>

            {/* Created To — server-side */}
            <div className="fgroup">
              <label className="flabel">To :</label>
              <input type="date" className="finput" value={toDate}
                onChange={(e) => { setDateTouched(true); setToDate(e.target.value); }} />
            </div>

            {/* Disposition — server-side */}
            <div className="fgroup">
              <label className="flabel">
                Disposition :
                {optionsLoading && <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>loading…</span>}
              </label>
              <SearchableSelect options={dispositionOptions} value={dispositionFilter} onChange={setDispositionFilter} placeholder="All Dispositions" />
            </div>

            {/* Follow Up Date — CLIENT-SIDE, same pattern as OpportunityDetails */}
            <div className="fgroup">
              <label className="flabel">Follow Up Date :</label>
              <select className="finput" value={followDateMode} onChange={(e) => setFollowDateMode(e.target.value)}>
                <option value="">All</option>
                <option value="0">Today</option>
                <option value="1">Tomorrow</option>
                <option value="2">Date Range</option>
              </select>
            </div>

            {/* Date range inputs — only when "Date Range" selected */}
            {followDateMode === "2" && (
              <>
                <div className="fgroup">
                  <label className="flabel">Follow Up From :</label>
                  <input type="date" className="finput" value={followUpFromDate}
                    onChange={(e) => setFollowUpFromDate(e.target.value)} />
                </div>
                <div className="fgroup">
                  <label className="flabel">Follow Up To :</label>
                  <input type="date" className="finput" value={followUpToDate}
                    onChange={(e) => setFollowUpToDate(e.target.value)} />
                </div>
              </>
            )}

            {/* Follow Up Time From — CLIENT-SIDE */}
            <div className="fgroup">
              <label className="flabel">Follow Up From Time :</label>
              <div className="time-wrap">
                <input type="time" className="finput time-input" value={followUpFromTime}
                  onChange={(e) => setFollowUpFromTime(e.target.value)} />
                {followUpFromTime && (
                  <button className="time-clear" onClick={() => setFollowUpFromTime("")} title="Clear">✕</button>
                )}
              </div>
            </div>

            {/* Follow Up Time To — CLIENT-SIDE */}
            <div className="fgroup">
              <label className="flabel">Follow Up To Time :</label>
              <div className="time-wrap">
                <input type="time" className="finput time-input" value={followUpToTime}
                  onChange={(e) => setFollowUpToTime(e.target.value)} />
                {followUpToTime && (
                  <button className="time-clear" onClick={() => setFollowUpToTime("")} title="Clear">✕</button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 12, marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
          <input
            className="finput"
            style={{ width: 320 }}
            placeholder="Search (Customer, Mobile, Remarks)"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>

        {loading ? <div className="loading-msg">Loading…</div> : null}
        {err     ? <div className="loading-msg" style={{ color: "#c33" }}>{err}</div> : null}

        {!loading && !err && pagedRows.length ? (
          <>
            <div className="table-wrap">
              <table className="opptable">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("recid")}>Lead ID <SortMark k="recid" /></th>
                    <th onClick={() => toggleSort("custName")}>Lead Name <SortMark k="custName" /></th>
                    <th onClick={() => toggleSort("custMobileNo")}>Mobile No <SortMark k="custMobileNo" /></th>
                    <th onClick={() => toggleSort("oppStatus")}>Status <SortMark k="oppStatus" /></th>
                    <th onClick={() => toggleSort("disposition")}>Disposition <SortMark k="disposition" /></th>
                    <th onClick={() => toggleSort("followUpDate")}>Follow Up Date <SortMark k="followUpDate" /></th>
                    <th onClick={() => toggleSort("followUpTimeLabel")}>Follow Up Time <SortMark k="followUpTimeLabel" /></th>
                    <th onClick={() => toggleSort("remarks")}>Remarks <SortMark k="remarks" /></th>
                    <th onClick={() => toggleSort("salesOwner")}>Sales Owner <SortMark k="salesOwner" /></th>
                    <th onClick={() => toggleSort("modifiedBy")}>Modified By <SortMark k="modifiedBy" /></th>
                    <th onClick={() => toggleSort("modifieddate")}>Modified Date <SortMark k="modifieddate" /></th>
                    <th onClick={() => toggleSort("createddate")}>Created Date <SortMark k="createddate" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r, idx) => (
                    <tr key={`${r.recid || "x"}-${idx}`}>
                      <td>
                        <span
                          className="leadLink"
                          role="button"
                          tabIndex={0}
                          onClick={() => goToExternalLeadForm(r)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") goToExternalLeadForm(r); }}
                          title="Open Lead"
                        >
                          {r.recid ? `LD-EX-${padLeadId(r.recid)}` : "—"}
                        </span>
                      </td>
                      <td>{safe(r.custName)}</td>
                      <td>{safe(r.custMobileNo)}</td>
                      <td>{safe(r.oppStatus)}</td>
                      <td>{safe(r.disposition)}</td>
                      <td>{formatDDMMYYYY(r.followUpDate)}</td>
                      <td>{safe(r.followUpTimeLabel)}</td>
                      <td>{safe(r.remarks)}</td>
                      <td>{safe(r.salesOwner)}</td>
                      <td>{safe(r.modifiedBy)}</td>
                      <td>{formatDDMMYYYY(r.modifieddate)}</td>
                      <td>{formatDDMMYYYY(r.createddate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination — driven by filteredRows, not server total */}
            <div className="pager">
              <div className="pager-left">
                Showing{" "}
                <strong>{totalFiltered ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, totalFiltered)}</strong>{" "}
                of <strong>{totalFiltered}</strong>
                {totalFiltered !== serverTotal ? (
                  <span style={{ color: "#94a3b8", marginLeft: 6 }}>(filtered from {serverTotal})</span>
                ) : null}
              </div>
              <div className="pager-right">
                <button className="pager-btn" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                {renderPageButtons()}
                <button className="pager-btn" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
              </div>
            </div>
          </>
        ) : null}

        {!loading && !err && !pagedRows.length ? (
          <div className="empty-note">No entries found.</div>
        ) : null}
      </div>

      <style jsx>{`
        .details-card { background: #fff; padding: 24px 0; }

        .leadLink { color: #334b71; font-weight: 700; cursor: pointer; }
        .leadLink:hover { opacity: 0.85; }

        .details-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .title-col { display: grid; gap: 8px; }
        .pair { font-size: 16px; color: #333; }
        .label { display: inline-block; font-weight: 600; color: #555; margin-right: 8px; min-width: 180px; }
        .value { color: #222; }
        .pill { background: #eef3ff; color: #334b71; padding: 4px 10px; border-radius: 20px; font-size: 14px; }
        .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-back { background: #14233c; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; font-weight: 600; cursor: pointer; }
        .btn-back:hover { opacity: 0.95; }

        .filters-card { background: #f7f9fc; border: 1px solid #e6eaf2; border-radius: 10px; padding: 16px; margin-top: 10px; }
        .filters-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px 16px; align-items: end; }
        .fgroup { grid-column: span 3; position: relative; }
        .flabel { display: block; font-size: 13px; color: #475569; margin-bottom: 6px; font-weight: 600; }
        .finput { width: 100%; height: 36px; border: 1px solid #d7ddea; border-radius: 6px; padding: 6px 10px; background: #fff; color: #222; box-sizing: border-box; }

        .time-wrap { position: relative; display: flex; align-items: center; }
        .time-input { padding-right: 28px; }
        .time-clear { position: absolute; right: 8px; background: none; border: none; color: #94a3b8; font-size: 11px; cursor: pointer; line-height: 1; padding: 2px 0; }
        .time-clear:hover { color: #c33; }

        .ss-wrap { position: relative; width: 100%; }
        .ss-control { display: flex; align-items: center; justify-content: space-between; height: 36px; border: 1px solid #d7ddea; border-radius: 6px; padding: 0 10px; background: #fff; cursor: pointer; font-size: 14px; color: #222; box-sizing: border-box; user-select: none; }
        .ss-control.ss-open { border-color: #334b71; box-shadow: 0 0 0 2px #eef3ff; }
        .ss-value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ss-placeholder { color: #94a3b8; }
        .ss-actions { display: flex; align-items: center; gap: 6px; margin-left: 6px; flex-shrink: 0; }
        .ss-clear { font-size: 11px; color: #94a3b8; cursor: pointer; line-height: 1; padding: 2px; }
        .ss-clear:hover { color: #c33; }
        .ss-arrow { font-size: 10px; color: #64748b; }
        .ss-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid #d7ddea; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 9999; overflow: hidden; }
        .ss-search-wrap { padding: 8px; border-bottom: 1px solid #f0f2f6; }
        .ss-search { width: 100%; height: 32px; border: 1px solid #d7ddea; border-radius: 6px; padding: 4px 10px; font-size: 13px; color: #222; box-sizing: border-box; outline: none; }
        .ss-search:focus { border-color: #334b71; }
        .ss-list { max-height: 220px; overflow-y: auto; }
        .ss-item { padding: 9px 12px; font-size: 13px; color: #333; cursor: pointer; transition: background 0.12s; }
        .ss-item:hover { background: #f1f5ff; }
        .ss-item-active { background: #eef3ff; color: #334b71; font-weight: 600; }
        .ss-no-results { padding: 10px 12px; font-size: 13px; color: #94a3b8; }

        .table-wrap { margin-top: 16px; overflow-x: auto; border-radius: 10px; }
        .opptable { width: 100%; border-collapse: collapse; min-width: 1400px; }
        .opptable thead th { text-align: left; font-weight: 600; font-size: 14px; color: #445; background: #f6f8fb; padding: 12px 14px; border-bottom: 1px solid #e8edf5; white-space: nowrap; user-select: none; cursor: pointer; }
        .opptable tbody td { font-size: 14px; color: #333; padding: 12px 14px; border-bottom: 1px solid #f0f2f6; vertical-align: middle; white-space: nowrap; }
        .opptable tbody tr:hover { background: #fafbfe; }
        .sort { margin-left: 8px; opacity: 0.7; cursor: pointer; }

        .empty-note { margin-top: 12px; padding: 14px; background: #f9fafc; border: 1px dashed #e6eaf2; border-radius: 8px; color: #5c6b7a; font-size: 14px; }
        .loading-msg { padding: 40px; text-align: center; font-size: 18px; color: #666; }

        .pager { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .pager-left { font-size: 13px; color: #64748b; }
        .pager-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .pager-btn { height: 34px; padding: 0 12px; border: 1px solid #d7ddea; background: #fff; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .pager-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pager-num { height: 34px; min-width: 34px; padding: 0 10px; border: 1px solid #d7ddea; background: #fff; border-radius: 8px; cursor: pointer; }
        .pager-num.active { background: #14233c; color: #fff; border-color: #14233c; }
        .pager-dots { padding: 0 6px; color: #64748b; }

        .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 12px; }
        .breadcrumb-link { cursor: pointer; color: #334b71; font-weight: 600; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-current { color: #64748b; }
      `}</style>
    </>
  );
}