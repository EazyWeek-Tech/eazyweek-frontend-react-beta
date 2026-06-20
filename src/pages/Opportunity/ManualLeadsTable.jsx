// src/pages/Opportunity/ManualLeadsTable.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

// Auth: verifyToken needs a Bearer token (cookies aren't accepted).
const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHeaders = () => {
  const t = getAuthToken();
  return { Accept: "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};

// -----------------------------
// Date helpers
// -----------------------------
const toISODateOnly = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, "0");
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

const formatDDMMYYYY = (v) => {
  if (!v) return "—";
  const iso = toISODateOnly(v);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
};

const formatDateTime = (dateVal) => formatDDMMYYYY(dateVal);

// ✅ Excel export (dynamic import to avoid Vite bundle issues)
const loadXLSX = async () => {
  const mod = await import("xlsx");
  return mod;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const exportFileName = (oppCode) => {
  const ts = new Date();
  const y  = ts.getFullYear();
  const m  = String(ts.getMonth() + 1).padStart(2, "0");
  const d  = String(ts.getDate()).padStart(2, "0");
  const hh = String(ts.getHours()).padStart(2, "0");
  const mm = String(ts.getMinutes()).padStart(2, "0");
  return `ManualLeads_${oppCode || "All"}_${y}${m}${d}_${hh}${mm}.xlsx`;
};

const buildLeadListUrl = ({ baseUrl, campaignId, pageNumber, pageSize, skipCount }) => {
  if (!campaignId) throw new Error("campaignId is required for LeadOpp/List");
  const qs = new URLSearchParams();
  qs.set("campaignId", String(campaignId));
  qs.set("pageNumber", String(pageNumber || 1));
  qs.set("pageSize",   String(pageSize   || 10));
  if (skipCount) qs.set("skipCount", "true");
  return `${baseUrl}/api/LeadOpp/List?${qs.toString()}`;
};

// -----------------------------
// Value helpers
// -----------------------------
const safe = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : v;

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";

const toProspectId = (leadOppId) => {
  const n = Number(leadOppId);
  if (!n || Number.isNaN(n)) return "—";
  return `LD-MN-${String(n).padStart(7, "0")}`;
};

const norm = (v) => String(v ?? "").trim().toLowerCase();

const toTimeLabel12h = (timeVal) => {
  const s = String(timeVal ?? "").trim();
  if (!s) return "";
  // already a 12h label like "02:30 PM"
  let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    const hh = String(m[1]).padStart(2, "0");
    return `${hh}:${m[2]} ${String(m[3]).toUpperCase()}`;
  }
  // SQL time serialized as ISO ("1970-01-01T18:30:00.000Z"): take the wall-clock HH:MM
  // from after the "T" directly — do NOT use new Date(), which would TZ-shift it.
  // Falls back to a plain "HH:MM[:SS]" string.
  m = s.match(/T(\d{2}):(\d{2})/) || s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const hh24 = parseInt(m[1], 10);
  const mm   = m[2];
  if (Number.isNaN(hh24)) return "";
  const ampm = hh24 >= 12 ? "PM" : "AM";
  let hh12   = hh24 % 12;
  if (hh12 === 0) hh12 = 12;
  return `${String(hh12).padStart(2, "0")}:${mm} ${ampm}`;
};

const toProspectType = (apiType, custID) => {
  const t = String(apiType ?? "").trim().toLowerCase();
  if (t === "lead")        return "Lead";
  if (t === "opportunity") return "Opportunity";
  return isEmpty(custID) ? "Lead" : "Opportunity";
};

const mapManualLeadRow = (x, resolveOwnerRecId, resolveCustIdFromRecId) => {
  const id = Number(x?.leadOpp_ID) || 0;

  const custRecId  = x?.custID ?? x?.custId ?? null;
  const realCustId = resolveCustIdFromRecId ? resolveCustIdFromRecId(custRecId) : "";

  const followUpDate      = x?.followUpDate || x?.followUp || "";
  const followUpTimeRaw   =
    (x?.followUpTime ?? x?.followUp_Time ?? x?.followUpT ?? x?.followTime ?? "")?.toString?.() ?? "";
  const followUpTimeLabel = toTimeLabel12h(followUpTimeRaw);

  const saleOwner      = (x?.saleOwner      ?? x?.salesOwner     ?? x?.createdByName  ?? "").toString();
  const saleOwnerCode  = (x?.saleOwnerCode  ?? x?.salesOwnerCode ?? x?.createdByCode  ?? "").toString();
  const saleOwnerEmail = (x?.saleOwnerEmail ?? x?.createdByEmail ?? "").toString();
  const saleOwnerRecId = resolveOwnerRecId({ name: saleOwner, code: saleOwnerCode, email: saleOwnerEmail });

  const apiType = x?.type;

  return {
    id,
    leadOpp_ID:        id,
    prospectId:        toProspectId(id),
    prospectType:      toProspectType(apiType, realCustId),
    apiType:           (apiType ?? "").toString(),
    custRecId,
    custID:            realCustId,
    customerName:      (x?.customerName ?? x?.custName  ?? "").toString(),
    mobileNumber:      (x?.mobileNumber ?? x?.mobile    ?? x?.phone ?? "").toString(),
    status:            (x?.status       ?? x?.oppStatus ?? "").toString(),
    followUpDate,
    followUpTimeRaw:   followUpTimeRaw.toString(),
    followUpTimeLabel,
    disposition:       (x?.disposition  ?? "").toString(),
    remark:            (x?.remark       ?? x?.remarks ?? "").toString(),
    saleOwner,
    saleOwnerCode,
    saleOwnerEmail,
    saleOwnerRecId,
    modifiedBy:        (x?.modifiedBy   ?? "").toString(),
    modifiedDate:      x?.modifiedDate  || "",
    createdDate:       x?.createdDate   || "",
    customerMsg:       (x?.customerMsg  ?? x?.customerMessage ?? "").toString(),
    __q: [
      toProspectId(id), toProspectType(apiType, realCustId), apiType,
      realCustId, custRecId,
      x?.customerName, x?.custName, x?.mobileNumber, x?.mobile, x?.phone,
      x?.status, x?.oppStatus, followUpDate, followUpTimeRaw, followUpTimeLabel,
      x?.disposition, x?.remark, x?.remarks,
      saleOwner, saleOwnerCode, saleOwnerEmail, saleOwnerRecId,
      x?.modifiedBy, x?.modifiedDate, x?.createdDate,
    ]
      .map((t) => (t ?? "").toString().toLowerCase())
      .join(" | "),
  };
};

// ─── Session storage helpers ───────────────────────────────────────────────
const SS_ML_FILTER_KEY = (oppCode) => `EW_ML_FILTERS_${oppCode}`;
const readSavedFilters = (oppCode) => {
  try { return JSON.parse(sessionStorage.getItem(SS_ML_FILTER_KEY(oppCode)) || "{}"); }
  catch { return {}; }
};
const saveFilters = (oppCode, filters) => {
  try { sessionStorage.setItem(SS_ML_FILTER_KEY(oppCode), JSON.stringify(filters)); }
  catch { /* privacy mode — ignore */ }
};
const buildFilterSnapshot = ({
  statusFilter, ownerFilter, searchDraft, dispositionFilter,
  followTime, followDateMode, rangeFrom, rangeTo,
}) => ({ statusFilter, ownerFilter, searchDraft, dispositionFilter, followTime, followDateMode, rangeFrom, rangeTo });
// ──────────────────────────────────────────────────────────────────────────

const CLIENT_PAGE_SIZE = 10;
const FETCH_PAGE_SIZE  = 500; // server cap — fewest round-trips for big campaigns

// ✅ Parallel fetch helper
//    Step 1 — fetch page 1 to learn totalPages
//    Step 2 — fan out remaining pages simultaneously with Promise.all
const fetchAllPagesParallel = async (campaignId) => {
  const fetchOnePage = async (pageNumber) => {
    const url  = buildLeadListUrl({ baseUrl: API_BASE_URL, campaignId, pageNumber, pageSize: FETCH_PAGE_SIZE, skipCount: pageNumber > 1 });
    const res  = await fetch(url, { method: "GET", headers: authHeaders(), credentials: "include" });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
    return JSON.parse(text);
  };

  // Fetch page 1 first — we need totalPages before we can fan out
  const first      = await fetchOnePage(1);
  const totalPages = Number(first?.totalPages) || 1;
  const items      = Array.isArray(first?.data) ? [...first.data] : [];

  if (totalPages > 1) {
    // ✅ Fire all remaining pages in parallel — no sequential waiting
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => fetchOnePage(i + 2))
    );
    rest.forEach((d) => {
      if (Array.isArray(d?.data)) items.push(...d.data);
    });
  }

  return items;
};

export default function ManualLeadsTable({ oppCode, header, onToast }) {
  const navigate       = useNavigate();
  const params         = useParams();
  const oppCodeFromUrl = params?.oppCode || params?.OppCode || "";

  const effectiveOppCode = (oppCode || header?.oppCode || oppCodeFromUrl || "").toString().trim();

  const fromDateFromUrl = params?.fromDate || params?.FromDate || params?.from || params?.From || "";
  const toDateFromUrl   = params?.toDate   || params?.ToDate   || params?.to   || params?.To   || "";

  const mlFrom = useMemo(() => toISODateOnly(fromDateFromUrl), [fromDateFromUrl]);
  const mlTo   = useMemo(() => toISODateOnly(toDateFromUrl),   [toDateFromUrl]);

  const mlQs = useMemo(() => {
    const qs = new URLSearchParams();
    if (mlFrom) qs.set("fromDate", mlFrom);
    if (mlTo)   qs.set("toDate",   mlTo);
    const s = qs.toString();
    return s ? `?${s}` : "";
  }, [mlFrom, mlTo]);

  // campaign header
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignErr,     setCampaignErr]     = useState("");
  const [campaignHeader,  setCampaignHeader]  = useState(null);

  // pagination (client-side)
  const [pageNumber, setPageNumber] = useState(1);

  // data
  const [loading,      setLoading]      = useState(false);
  const [err,          setErr]          = useState("");
  const [allRows,      setAllRows]      = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [exporting,    setExporting]    = useState(false);

  // lookups
  const [empLoading, setEmpLoading] = useState(false);
  const [employees,  setEmployees]  = useState([]);
  const [custLoading, setCustLoading] = useState(false);
  const [custErr,     setCustErr]     = useState("");
  const [customers,   setCustomers]   = useState([]);

  // ─── Saved filters ────────────────────────────────────────────────────────
  const _saved = useMemo(() => readSavedFilters(effectiveOppCode), [effectiveOppCode]);

  const [statusFilter,      setStatusFilter]     = useState(_saved.statusFilter      ?? "");
  const [ownerFilter,       setOwnerFilter]       = useState(_saved.ownerFilter       ?? "");
  const [searchDraft,       setSearchDraft]       = useState(_saved.searchDraft       ?? "");
  const [searchTerm,        setSearchTerm]        = useState(_saved.searchDraft       ?? "");
  const [dispositionFilter, setDispositionFilter] = useState(_saved.dispositionFilter ?? "");
  const [followTime,        setFollowTime]        = useState(_saved.followTime        ?? "");
  const [followDateMode,    setFollowDateMode]    = useState(_saved.followDateMode    ?? "");
  const [rangeFrom,         setRangeFrom]         = useState(_saved.rangeFrom         ?? "");
  const [rangeTo,           setRangeTo]           = useState(_saved.rangeTo           ?? "");

  useEffect(() => {
    if (!effectiveOppCode) return;
    saveFilters(effectiveOppCode, buildFilterSnapshot({
      statusFilter, ownerFilter, searchDraft, dispositionFilter,
      followTime, followDateMode, rangeFrom, rangeTo,
    }));
  }, [effectiveOppCode, statusFilter, ownerFilter, searchDraft, dispositionFilter, followTime, followDateMode, rangeFrom, rangeTo]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchDraft), 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // reset page on filter change
  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, statusFilter, ownerFilter, dispositionFilter, followDateMode, rangeFrom, rangeTo, followTime]);

  // ─── Fetch Campaign Header ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!effectiveOppCode) return;
      setCampaignLoading(true);
      setCampaignErr("");
      try {
        const res  = await fetch(
          `${API_BASE_URL}/api/LeadOpp/getCampaign/${encodeURIComponent(effectiveOppCode)}`,
          { method: "GET", headers: authHeaders(), credentials: "include" }
        );
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
        if (!alive) return;
        setCampaignHeader(JSON.parse(text) || null);
      } catch (e) {
        console.error("Campaign header load failed", e);
        if (!alive) return;
        setCampaignHeader(null);
        setCampaignErr("Failed to load campaign details.");
      } finally {
        if (alive) setCampaignLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [effectiveOppCode]);

  const uiHeader  = campaignHeader || header || {};
  const uiOppCode = (uiHeader?.oppCode || effectiveOppCode || "").toString().trim();
  const uiRecId   = Number(uiHeader?.recid ?? uiHeader?.recId) || 0;
  const isR7      = String(uiHeader?.oRuleCode || "").trim().toUpperCase() === "R7";

  // ─── Fetch Employees ──────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const run = async () => {
      setEmpLoading(true);
      try {
        const res  = await fetch(`${API_BASE_URL}/api/Employees`, { method: "GET", headers: authHeaders(), credentials: "include" });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
        const data = JSON.parse(text);
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        if (!alive) return;
        setEmployees(list);
      } catch (e) {
        console.error("Employees load failed", e);
        if (!alive) return;
        setEmployees([]);
      } finally {
        if (alive) setEmpLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, []);

  // ─── Fetch Customers ──────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const run = async () => {
      setCustLoading(true);
      setCustErr("");
      try {
        const res  = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers`, { method: "GET", headers: authHeaders(), credentials: "include" });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
        const data = JSON.parse(text);
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        if (!alive) return;
        setCustomers(list);
      } catch (e) {
        console.error("Customers load failed", e);
        if (!alive) return;
        setCustomers([]);
        setCustErr("Failed to load customers.");
      } finally {
        if (alive) setCustLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, []);

  // ─── Lookup maps ──────────────────────────────────────────────────────────
  const empLookup = useMemo(() => {
    const byName = new Map(), byCode = new Map(), byEmail = new Map();
    for (const e of employees) {
      const recId = e?.recId;
      if (!recId && recId !== 0) continue;
      const nameKey  = norm(e?.employeeName);
      const codeKey  = norm(e?.employeeCode);
      const emailKey = norm(e?.emailID);
      if (nameKey)  byName.set(nameKey,   recId);
      if (codeKey)  byCode.set(codeKey,   recId);
      if (emailKey) byEmail.set(emailKey, recId);
    }
    return { byName, byCode, byEmail };
  }, [employees]);

  const custLookup = useMemo(() => {
    const byRecId = new Map();
    for (const c of customers) {
      const recId  = c?.recId  ?? c?.RECID  ?? c?.RecID;
      const custId = c?.custId ?? c?.CUSTID ?? c?.customerID ?? c?.customerId;
      if (recId !== null && recId !== undefined && recId !== "" && custId)
        byRecId.set(String(recId), String(custId));
    }
    return { byRecId };
  }, [customers]);

  // ✅ Stable resolvers via useCallback
  //    When empLookup/custLookup change (employees/customers finish loading),
  //    these callbacks get a new reference — which triggers the fetch effect below.
  //    But they only change when the DATA actually changes, not on every render.
  const resolveOwnerRecId = useCallback(({ name, code, email }) => {
    const ck = norm(code);
    if (ck && empLookup.byCode.has(ck))  return empLookup.byCode.get(ck);
    const ek = norm(email);
    if (ek && empLookup.byEmail.has(ek)) return empLookup.byEmail.get(ek);
    const nk = norm(name);
    if (nk && empLookup.byName.has(nk))  return empLookup.byName.get(nk);
    return "";
  }, [empLookup]);

  const resolveCustomerIdFromRecId = useCallback((recIdLike) => {
    const key = String(recIdLike ?? "").trim();
    if (!key) return "";
    return custLookup.byRecId.get(key) || "";
  }, [custLookup]);

  // ─── Time options ─────────────────────────────────────────────────────────
  const TIME_OPTIONS = useMemo(() => {
    const out = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour12 = ((h + 11) % 12) + 1;
        const ampm   = h < 12 ? "AM" : "PM";
        const mm     = String(m).padStart(2, "0");
        out.push(`${String(hour12).padStart(2, "0")}:${mm} ${ampm}`);
      }
    }
    return out;
  }, []);

  // ─── Fetch ALL leads (parallel) ───────────────────────────────────────────
  // ✅ Dependencies:
  //   - uiRecId          : which campaign to load
  //   - resolveOwnerRecId / resolveCustomerIdFromRecId : stable via useCallback,
  //     only change when lookup DATA changes (not on every render)
  // ✅ This guarantees:
  //   - Single fetch on mount (when uiRecId first becomes available)
  //   - Re-fetch if employees or customers finish loading AFTER the initial fetch
  //     (so names/IDs are correctly resolved on the already-loaded raw data)
  //   - NO spurious extra fetches caused by function-reference churn
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!uiRecId) {
        setAllRows([]);
        setTotalRecords(0);
        setErr("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr("");

      try {
        // ✅ Parallel fetch — dramatically faster than sequential
        const raw    = await fetchAllPagesParallel(uiRecId);
        if (!alive) return;

        const mapped = raw.map((x) =>
          mapManualLeadRow(x, resolveOwnerRecId, resolveCustomerIdFromRecId)
        );

        setAllRows(mapped);
        setTotalRecords(mapped.length);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setAllRows([]);
        setTotalRecords(0);
        setErr("Failed to load manual leads.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => { alive = false; };
  }, [uiRecId, resolveOwnerRecId, resolveCustomerIdFromRecId]);

  // Reset page when campaign changes
  useEffect(() => {
    if (uiRecId) setPageNumber(1);
  }, [uiRecId]);

  // ─── Derived dropdown options ─────────────────────────────────────────────
  const ownerOptions = useMemo(() => {
    const set = new Set();
    allRows.forEach((r) => { const n = String(r?.saleOwner || "").trim(); if (n) set.add(n); });
    return ["", ...Array.from(set)];
  }, [allRows]);

  const dispositionOptions = useMemo(() => {
    const set = new Set();
    allRows.forEach((r) => { const d = String(r?.disposition || "").trim(); if (d) set.add(d); });
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [allRows]);

  // ─── Client-side filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allRows.slice();

    const s = searchTerm.trim().toLowerCase();
    if (s) list = list.filter((r) => (r.__q || "").includes(s));

    if (statusFilter) {
      const st = statusFilter.toLowerCase();
      list = list.filter((r) => String(r?.status || "").toLowerCase() === st);
    }
    if (ownerFilter) {
      const ow = ownerFilter.toLowerCase();
      list = list.filter((r) => String(r?.saleOwner || "").toLowerCase() === ow);
    }
    if (dispositionFilter) {
      const dd = dispositionFilter.toLowerCase();
      list = list.filter((r) => String(r?.disposition || "").toLowerCase() === dd);
    }

    if (followDateMode === "0") {
      const today = toISODateOnly(new Date());
      list = list.filter((r) => toISODateOnly(r?.followUpDate) === today);
    } else if (followDateMode === "1") {
      const t = new Date(); t.setDate(t.getDate() + 1);
      const tomorrow = toISODateOnly(t);
      list = list.filter((r) => toISODateOnly(r?.followUpDate) === tomorrow);
    } else if (followDateMode === "2" && rangeFrom && rangeTo) {
      const f = +new Date(rangeFrom);
      const t = +new Date(rangeTo);
      list = list.filter((r) => {
        const stamp = +new Date(toISODateOnly(r?.followUpDate));
        return !Number.isNaN(stamp) && stamp >= f && stamp <= t;
      });
    }

    if (followTime) {
      const ft = norm(followTime);
      list = list.filter((r) => norm(r?.followUpTimeLabel) === ft);
    }

    return list;
  }, [allRows, searchTerm, statusFilter, ownerFilter, followDateMode, dispositionFilter, rangeFrom, rangeTo, followTime]);

  // ─── Client-side pagination ───────────────────────────────────────────────
  const clientTotalPages = Math.max(1, Math.ceil(filtered.length / CLIENT_PAGE_SIZE));

  const pagedRows = useMemo(() => {
    const start = (pageNumber - 1) * CLIENT_PAGE_SIZE;
    return filtered.slice(start, start + CLIENT_PAGE_SIZE);
  }, [filtered, pageNumber]);

  const isFiltering = useMemo(() => Boolean(
    (searchTerm && searchTerm.trim()) || statusFilter || ownerFilter ||
    dispositionFilter || followDateMode ||
    (followDateMode === "2" && (rangeFrom || rangeTo)) || followTime
  ), [searchTerm, statusFilter, ownerFilter, dispositionFilter, followDateMode, rangeFrom, rangeTo, followTime]);

  const displayedRecordCount = isFiltering ? filtered.length : totalRecords;

  // ─── Navigation ───────────────────────────────────────────────────────────
  const openManualLead = (row) => {
    navigate(`/manuallead/edit/${row?.leadOpp_ID}`, {
      state: {
        oppCode: uiOppCode, header: uiHeader,
        leadOpp_ID: row?.leadOpp_ID, custID: row.custID,
        row, isManual: true, salesOwnerRecId: row.saleOwnerRecId,
      },
    });
  };

  // ─── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (!uiRecId) { alert("Campaign not loaded yet.."); return; }

      const excelRows = allRows.map((r) => ({
        "Prospect ID":        r.prospectId    || "",
        "Prospect Type":      r.prospectType  || "",
        "LeadOpp ID":         r.leadOpp_ID    || "",
        "CustID":             r.custID        || "",
        "Customer/Lead Name": r.customerName  || "",
        "Mobile":             r.mobileNumber  || "",
        "Status":             r.status        || "",
        "Follow Up Date":     formatDDMMYYYY(r.followUpDate)  || "",
        "Follow Up Time":     r.followUpTimeLabel              || "",
        "Disposition":        r.disposition   || "",
        "Remarks":            r.remark        || "",
        "Sales Owner":        r.saleOwner     || "",
        "Modified By":        r.modifiedBy    || "",
        "Modified Date":      formatDDMMYYYY(r.modifiedDate)  || "",
        "Created Date":       formatDDMMYYYY(r.createdDate)   || "",
      }));

      const XLSX = await loadXLSX();
      const ws   = XLSX.utils.json_to_sheet(excelRows);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Manual Leads");

      const out  = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      downloadBlob(blob, exportFileName(uiOppCode));
      onToast?.(`Exported ${excelRows.length} rows`);
    } catch (e) {
      console.error("Export failed", e);
      alert(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
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
              <span className="value">{safe(uiHeader?.oRuleDetails || uiHeader?.oRuleCode)}</span>
            </div>

            {(uiHeader?.oppCampStartDate || uiHeader?.oppCampEndDate) && (
              <div className="pair">
                <span className="label">Campaign Period :</span>
                <span className="value">
                  {mlFrom && mlTo ? `${formatDDMMYYYY(mlFrom)} - ${formatDDMMYYYY(mlTo)}` : "—"}
                </span>
              </div>
            )}

            {campaignLoading && <div style={{ fontSize: 12, color: "#64748b" }}>Loading campaign…</div>}
            {campaignErr     && <div style={{ fontSize: 12, color: "#c33"    }}>{campaignErr}</div>}
            {empLoading      && <div style={{ fontSize: 12, color: "#64748b" }}>Loading employees…</div>}
          </div>

          <div className="header-actions">
            <button className="btn-export" onClick={handleExport} disabled={exporting || loading}>
              {exporting ? "Exporting..." : "Export"}
            </button>
            <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-grid">
            <div className="fgroup">
              <label className="flabel">OppStatus :</label>
              <select className="finput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="fgroup">
              <label className="flabel">Sales Owner :</label>
              <select className="finput" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                {ownerOptions.map((o, i) => <option key={i} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="fgroup">
              <label className="flabel">Follow Up Date :</label>
              <select className="finput" value={followDateMode} onChange={(e) => setFollowDateMode(e.target.value)}>
                <option value="">All</option>
                <option value="0">Today</option>
                <option value="1">Tomorrow</option>
                <option value="2">Date Range</option>
              </select>
            </div>

            {followDateMode === "2" && (
              <>
                <div className="fgroup">
                  <label className="flabel">From :</label>
                  <input type="date" className="finput" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                </div>
                <div className="fgroup">
                  <label className="flabel">To :</label>
                  <input type="date" className="finput" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                </div>
              </>
            )}

            <div className="fgroup">
              <label className="flabel">Follow Up Time :</label>
              <select className="finput" value={followTime} onChange={(e) => setFollowTime(e.target.value)}>
                <option value="">All</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="fgroup">
              <label className="flabel">Disposition :</label>
              <select className="finput" value={dispositionFilter} onChange={(e) => setDispositionFilter(e.target.value)}>
                <option value="">All</option>
                {dispositionOptions.filter((x) => x).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {!isR7 && (
              <>
                <button className="btn-primary" onClick={() => {
                  const code = oppCode || (header?.oppCode ?? "");
                  if (!code) return;
                  navigate(`/manuallead/${code}`, { state: { oppCode: code, header } });
                }}>Add Lead</button>

                <button className="btn-primary" onClick={() => {
                  const code = oppCode || (header?.oppCode ?? "");
                  if (!code) return;
                  navigate(`/opportunity/customers`, { state: { oppCode: code, header } });
                }}>Add Opportunity</button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 12, marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
          <input
            className="finput"
            style={{ width: 320 }}
            placeholder="Search (Prospect, Customer, Status, Owner, Disposition)"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>

        {loading && <div className="loading-msg">Loading…</div>}
        {err     && <div className="loading-msg" style={{ color: "#c33" }}>{err}</div>}

        {!loading && !err && pagedRows.length > 0 && (
          <div className="table-wrap">
            <table className="opptable">
              <thead>
                <tr>
                  <th>Prospect ID</th>
                  <th>Prospect Type</th>
                  <th>Customer ID</th>
                  <th>Customer/Lead Name</th>
                  <th>Mobile Number</th>
                  <th>Status</th>
                  <th>Follow Up Date</th>
                  <th>Follow Up Time</th>
                  <th>Disposition</th>
                  <th>Remarks</th>
                  <th>Sales Owner</th>
                  <th>Modified By</th>
                  <th>Modified Date</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => (
                  <tr key={r.leadOpp_ID}>
                    <td>
                      <button className="linkish" onClick={() => openManualLead(r)}>
                        {safe(r.prospectId)}
                      </button>
                    </td>
                    <td>{safe(r.prospectType)}</td>
                    <td>{safe(r.custID)}</td>
                    <td>{safe(r.customerName)}</td>
                    <td>{safe(r.mobileNumber)}</td>
                    <td>{safe(r.status)}</td>
                    <td>{formatDateTime(r.followUpDate)}</td>
                    <td>{safe(r.followUpTimeLabel || "—")}</td>
                    <td>{safe(r.disposition)}</td>
                    <td>{safe(r.remark)}</td>
                    <td title={r.saleOwnerRecId ? `recId: ${r.saleOwnerRecId}` : "recId not found"}>
                      {safe(r.saleOwner)}
                    </td>
                    <td>{safe(r.modifiedBy)}</td>
                    <td>{formatDDMMYYYY(r.modifiedDate)}</td>
                    <td>{formatDDMMYYYY(r.createdDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !err && pagedRows.length === 0 && (
          <div className="empty-note">No entries found.</div>
        )}

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Total records: <strong>{displayedRecordCount}</strong>
            {isFiltering && (
              <span style={{ marginLeft: 8 }}>
                (Filtered from <strong>{totalRecords}</strong>)
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-export" style={{ padding: "8px 12px" }}
              onClick={() => setPageNumber(1)} disabled={pageNumber <= 1}>First</button>
            <button className="btn-export" style={{ padding: "8px 12px" }}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Prev</button>
            <div style={{ fontSize: 13, color: "#334155" }}>
              Page <strong>{pageNumber}</strong> / <strong>{clientTotalPages}</strong>
            </div>
            <button className="btn-export" style={{ padding: "8px 12px" }}
              onClick={() => setPageNumber((p) => Math.min(clientTotalPages, p + 1))} disabled={pageNumber >= clientTotalPages}>Next</button>
            <button className="btn-export" style={{ padding: "8px 12px" }}
              onClick={() => setPageNumber(clientTotalPages)} disabled={pageNumber >= clientTotalPages}>Last</button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .details-card { background: #fff; padding: 24px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .details-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .title-col { display: grid; gap: 8px; }
        .pair { font-size: 16px; color: #333; }
        .label { display: inline-block; font-weight: 600; color: #555; margin-right: 8px; min-width: 180px; }
        .value { color: #222; }
        .pill { background: #eef3ff; color: #334b71; padding: 4px 10px; border-radius: 20px; font-size: 14px; }
        .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        .btn-back { background: #14233c; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; font-weight: 600; cursor: pointer; }
        .btn-back:hover { opacity: .95; }

        .btn-export { background: #223b63; color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
        .btn-export:hover { opacity: .95; }
        .btn-export[disabled] { opacity: .55; cursor: not-allowed; }

        .btn-primary { white-space: nowrap; background: #0f2445; color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
        .btn-primary:hover { opacity: .95; }

        .filters-card { background: #f7f9fc; border: 1px solid #e6eaf2; border-radius: 10px; padding: 16px; margin-top: 10px; }
        .filters-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px 16px; align-items: end; }
        .fgroup { grid-column: span 4; }
        .flabel { display: block; font-size: 13px; color: #475569; margin-bottom: 6px; font-weight: 600; }
        .finput { width: 100%; height: 36px; border: 1px solid #d7ddea; border-radius: 6px; padding: 6px 10px; background: #fff; color: #222; }

        .table-wrap { margin-top: 16px; overflow-x: auto; border-radius: 10px; }
        .opptable { width: 100%; border-collapse: collapse; min-width: 1500px; }
        .opptable thead th { text-align: left; font-weight: 600; font-size: 14px; color: #445; background: #f6f8fb; padding: 12px 14px; border-bottom: 1px solid #e8edf5; white-space: nowrap; user-select: none; }
        .opptable tbody td { font-size: 14px; color: #333; padding: 12px 14px; border-bottom: 1px solid #f0f2f6; vertical-align: middle; white-space: nowrap; }
        .opptable tbody tr:hover { background: #fafbfe; }

        .linkish { background: none; border: none; padding: 0; color: #2b5ec2; cursor: pointer; font-weight: 600; }
        .empty-note { margin-top: 12px; padding: 14px; background: #f9fafc; border: 1px dashed #e6eaf2; border-radius: 8px; color: #5c6b7a; font-size: 14px; }
        .loading-msg { padding: 40px; text-align: center; font-size: 18px; color: #666; }
      `}</style>
    </>
  );
}