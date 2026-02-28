// src/pages/Opportunity/OpportunitySummaryReport.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/* ===========================
   Utils
   =========================== */
const norm = (s) => (s ?? "").toString().trim();

// Normalize to YYYY-MM-DD from ISO or DD/MM/YYYY or DD-MM-YYYY
function toISODateOnly(s) {
  const t = norm(s);
  if (!t) return "";

  // ✅ If it starts with YYYY-MM-DD (with or without time), take date part directly
  const m0 = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m0) return m0[1];

  // dd/MM/yyyy or dd-MM-yyyy -> yyyy-MM-dd
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // fallback
  const d = new Date(t);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}
const atStartOfDayZ = (dateISO) => (dateISO ? `${dateISO}T00:00:00Z` : "");
const atEndOfDayZ = (dateISO) => (dateISO ? `${dateISO}T23:59:59Z` : "");
const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v) !== "") return v;
  }
  return fallback;
};

// ✅ Defaults
const DEFAULT_FROM_DATE_ISO = "2020-01-22";
const todayISODate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** ✅ NEW: session context resolver (loginCode/topCode/userID) */
const getSessionContext = () => {
  try {
    const tryParse = (v) => {
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    };

    const candidates = [
      sessionStorage.getItem("sessionValues"),
      sessionStorage.getItem("session"),
      sessionStorage.getItem("userSession"),
      localStorage.getItem("sessionValues"),
      localStorage.getItem("session"),
      localStorage.getItem("userSession"),
    ]
      .map((x) => (x ? tryParse(x) : null))
      .filter(Boolean);

    const fallback = {
      sessionId: sessionStorage.getItem("sessionId") || localStorage.getItem("sessionId") || "",
      loginCode: sessionStorage.getItem("loginCode") || localStorage.getItem("loginCode") || "",
      topCode: sessionStorage.getItem("topCode") || localStorage.getItem("topCode") || "",
      userID: sessionStorage.getItem("userID") || localStorage.getItem("userID") || "",
    };

    const found = candidates[0] || fallback;
    return {
      sessionId: norm(found?.sessionId),
      loginCode: norm(found?.loginCode),
      topCode: norm(found?.topCode),
      userID: norm(found?.userID),
    };
  } catch {
    return { sessionId: "", loginCode: "", topCode: "", userID: "" };
  }
};

/** ✅ NEW: match center against loginCode/topCode */
const matchesLoginClinic = (centerLabel, centerValue, loginCode, topCode) => {
  const l = norm(centerLabel).toLowerCase();
  const v = norm(centerValue).toLowerCase();
  const a = norm(loginCode).toLowerCase();
  const b = norm(topCode).toLowerCase();

  if (!a && !b) return false;

  if (a && (l === a || v === a || l.includes(a) || v.includes(a))) return true;
  if (b && (l === b || v === b || l.includes(b) || v.includes(b))) return true;

  return false;
};

/* ===========================
   ✅ Excel Export Helpers
   =========================== */
const loadXLSX = async () => {
  const mod = await import("xlsx");
  return mod;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const exportSummaryFileName = ({ fromDate, toDate, oppStatus, oppRule }) => {
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, "0");
  const d = String(ts.getDate()).padStart(2, "0");
  const hh = String(ts.getHours()).padStart(2, "0");
  const mm = String(ts.getMinutes()).padStart(2, "0");

  const f = (fromDate || "").replaceAll("-", "");
  const t = (toDate || "").replaceAll("-", "");

  return `OppSummary_${oppRule || "AllRules"}_${oppStatus || "AllStatus"}_${f || "NA"}-${t || "NA"}_${y}${m}${d}_${hh}${mm}.xlsx`;
};

/* ===========================
   ✅ Querystring builder (supports arrays)
   =========================== */
const buildQS = (obj) => {
  const qs = new URLSearchParams();

  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;

    // ✅ array → repeated query params (CampaignIds=1108&CampaignIds=1102)
    if (Array.isArray(v)) {
      v.forEach((item) => {
        if (item === undefined || item === null) return;
        const s = String(item).trim();
        if (!s) return;
        qs.append(k, s);
      });
      return;
    }

    const s = String(v).trim();
    if (!s) return;
    qs.set(k, s);
  });

  return qs.toString();
};

/* ===========================
   SearchableDropdown (single/multi)
   =========================== */
function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "None selected",
  multiple = false,
  disabled = false,
  width = "100%",
  maxMenuHeight = 280,
  showSelectAll = true,

  // ✅ NEW: disable specific option values (no UI change, just behavior)
  disabledValues = [],
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query).toLowerCase();
    if (!q) return options;
    return options.filter((o) => norm(o.label).toLowerCase().includes(q));
  }, [options, query]);

  const isDisabledOption = (val) =>
    Array.isArray(disabledValues) && disabledValues.includes(val);

  const isSelected = (val) =>
    multiple ? Array.isArray(value) && value.includes(val) : value === val;

  const displayText = useMemo(() => {
    if (multiple) {
      const vals = Array.isArray(value) ? value : [];
      if (!vals.length) return placeholder;
      const labels = vals
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .filter(Boolean);
      return labels.join(", ");
    } else {
      if (!value) return placeholder;
      return options.find((o) => o.value === value)?.label || value;
    }
  }, [value, options, multiple, placeholder]);

  const toggleItem = (val) => {
    if (isDisabledOption(val)) return; // ✅ guard

    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      onChange(arr);
    } else {
      onChange(val);
      setOpen(false);
    }
  };

  const clearSearch = () => setQuery("");

  const allSelected =
    multiple &&
    Array.isArray(value) &&
    filtered.length > 0 &&
    filtered.every((o) => value.includes(o.value));

  const toggleSelectAll = () => {
    if (!multiple) return;

    // ✅ when some values are disabled, select-all should ignore disabled options
    const selectable = filtered.filter((o) => !isDisabledOption(o.value));

    const arr = Array.isArray(value) ? [...value] : [];
    const allSelectableSelected =
      selectable.length > 0 && selectable.every((o) => arr.includes(o.value));

    if (allSelectableSelected) {
      onChange(arr.filter((v) => !selectable.some((o) => o.value === v)));
    } else {
      const union = new Set(arr);
      selectable.forEach((o) => union.add(o.value));
      onChange(Array.from(union));
    }
  };

  return (
    <div className={`dd-wrap ${disabled ? "disabled" : ""}`} style={{ width }} ref={wrapRef}>
      <button
        type="button"
        className="dd-input"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`dd-text ${displayText === placeholder ? "muted" : ""}`}>
          {displayText}
        </span>
        <span className="dd-caret">▾</span>
      </button>

      {open && (
        <div className="dd-menu" style={{ maxHeight: maxMenuHeight }}>
          <div className="dd-search">
            <span className="ico">🔍</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
            {query && (
              <button className="clear" onClick={clearSearch} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          {multiple && showSelectAll && (
            <label className="dd-option select-all">
              <input type="checkbox" checked={!!allSelected} onChange={toggleSelectAll} />
              <span>Select all</span>
            </label>
          )}

          <div className="dd-list" role="listbox" aria-multiselectable={multiple}>
            {filtered.map((o) => (
              <label key={o.value} className="dd-option">
                <input
                  type="checkbox"
                  checked={!!isSelected(o.value)}
                  onChange={() => toggleItem(o.value)}
                  disabled={isDisabledOption(o.value)}
                />
                <span style={isDisabledOption(o.value) ? { opacity: 0.6 } : undefined}>
                  {o.label}
                </span>
              </label>
            ))}
            {!filtered.length && <div className="dd-empty">No matches</div>}
          </div>
        </div>
      )}

      <style jsx>{`
        .dd-wrap { position: relative; }
        .dd-wrap.disabled { opacity: .6; pointer-events: none; }
        .dd-input {
          width: 100%; height: 36px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
          background: #fff; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; cursor: pointer;
        }
        .dd-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dd-text.muted { color: #98a1b3; }
        .dd-caret { color: #5a6270; font-size: 12px; }
        .dd-menu {
          position: absolute; left: 0; right: 0; z-index: 30; background: #fff;
          border: 1px solid #e6ebf2; box-shadow: 0 8px 26px rgba(0,0,0,.08); border-radius: 8px; margin-top: 6px; overflow: auto; width: 280px;
        }
        .dd-search {
          display: grid; grid-template-columns: 20px 1fr 22px; align-items: center; gap: 6px;
          padding: 8px 10px; border-bottom: 1px solid #eef1f6;
        }
        .dd-search input { height: 28px; border: 1px solid #e3e8f1; border-radius: 6px; padding: 0 8px; outline: none; }
        .dd-search .ico { text-align: center; color: #7a8599; }
        .dd-search .clear { background: none; border: none; font-size: 18px; line-height: 1; color: #7a8599; cursor: pointer; }
        .dd-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; user-select: none; }
        .dd-option + .dd-option { border-top: 1px solid #f6f7fb; }
        .dd-option:hover { background: #f7f9fc; }
        .dd-option input { width: 16px; height: 16px; }
        .dd-empty { padding: 12px; color: #8a94a7; text-align: center; }
        .select-all { font-weight: 700; }
      `}</style>
    </div>
  );
}

/* ===========================
   Page: Opportunity Summary Report
   =========================== */

// ✅ FIX: endpoint with NO extra space
const OPP_SUMMARY_ENDPOINT = `${API_BASE_URL}/api/Opportunity/ OppSummaryReport`;
const OPP_NAMES_ENDPOINT = `${API_BASE_URL}/api/Opportunity/GetOppNames`;

// ✅ Manual Lead Summary API (query params)
const MANUAL_LEAD_SUMMARY_ENDPOINT = `${API_BASE_URL}/api/LeadOpp/report/leadopps/Summary`;

export default function OpportunitySummaryReport() {
  const navigate = useNavigate();
  const { state } = useLocation() || {};

  // dates
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // filters
  const [campaignStatusCode, setCampaignStatusCode] = useState("");

  /** ✅ Campaign Rule MULTI */
  const [oppRuleCodes, setOppRuleCodes] = useState([]);

  const MANUAL_RULE_VALUE = "Manual Lead";

  const isManualSelected = useMemo(
    () => Array.isArray(oppRuleCodes) && oppRuleCodes.includes(MANUAL_RULE_VALUE),
    [oppRuleCodes]
  );

  /** ✅ session-based clinic behavior */
  const sessionCtx = useMemo(() => getSessionContext(), []);
  const isCentriq = norm(sessionCtx?.loginCode).toLowerCase() === "centriq clinics";
  const [userRoleName, setUserRoleName] = useState("");

  useEffect(() => {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("loggedInUser") ||
      sessionStorage.getItem("user") ||
      sessionStorage.getItem("loggedInUser");

    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUserRoleName(String(u?.roleName || "").trim());
      } catch {
        setUserRoleName("");
      }
    }
  }, []);

  const role = (userRoleName || "").toLowerCase();

  const canExport =
    role !== "team member" &&
    role !== "clinic manager" &&
    role !== "finance reviwer";

  const canView =
    role !== "clinic manager" &&
    role !== "finance reviwer";

  const [clinicCode, setClinicCode] = useState(""); // single mode (value = code string)
  const [clinicCodes, setClinicCodes] = useState([]); // Centriq multi mode (value = code strings)

  // ✅ IMPORTANT: oppNames now stores selected CampaignIds (recid) as strings
  const [oppNames, setOppNames] = useState([]);

  // options
  const campaignStatusOptions = [
    { value: "1", label: "Active" },
    { value: "2", label: "Expired" },
  ];

  const oppRuleOptions = [
    { value: "R1", label: "Paid for X but not for Y" },
    {
      value: "R2",
      label: "Paid for X Category in Y days and No future appointment in Z days for Category P",
    },
    { value: "R3", label: "No show appointment for X days" },
    { value: "R4", label: "Cancelled appointment for X days" },
    { value: "Manual Lead", label: "Manual Lead" },
    { value: "R5", label: "Customer Special Day" },
    { value: "R6", label: "Customer Type" },
    { value: "R7", label: "External Source" },
  ];

  // ✅ If manual selected, disable all other rules
  const disabledRuleValues = useMemo(() => {
    if (!isManualSelected) return [];
    return oppRuleOptions.map((x) => x.value).filter((v) => v !== MANUAL_RULE_VALUE);
  }, [isManualSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const [clinics, setClinics] = useState([]); // each option: { value, label, recid }
  const [oppNameOptions, setOppNameOptions] = useState([]); // each option: { value: recidStr, label: oppName, oppcode, recid }

  // table
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOppNames, setLoadingOppNames] = useState(false);

  // exporting
  const [exporting, setExporting] = useState(false);

  const [toast, setToast] = useState(null);

  // paging
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ✅ Manual server paging meta
  const [manualMeta, setManualMeta] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 1,
  });

  const pageCount = useMemo(() => {
    return isManualSelected
      ? Math.max(1, Number(manualMeta?.totalPages || 1))
      : Math.max(1, Math.ceil(rows.length / pageSize));
  }, [isManualSelected, manualMeta, rows.length, pageSize]);

  const pageRows = useMemo(() => {
    if (isManualSelected) return rows; // server already paged
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [isManualSelected, rows, page, pageSize]);

  const showToast = (message, type = "error", ms = 2200) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  // ✅ Map campaignId (recid) -> oppcode (for manual click navigation)
  const campaignIdToOppCode = useMemo(() => {
    const m = new Map();
    (oppNameOptions || []).forEach((o) => {
      if (o?.value && o?.oppcode) m.set(String(o.value), String(o.oppcode));
    });
    return m;
  }, [oppNameOptions]);

  // ✅ derive OppName CSV for non-manual API (from selected recids)
  const selectedOppNameCSV = useMemo(() => {
    const selectedIds = Array.isArray(oppNames) ? oppNames.map(String) : [];
    return selectedIds
      .map((id) => oppNameOptions.find((o) => String(o.value) === String(id))?.label)
      .filter(Boolean)
      .join(",");
  }, [oppNames, oppNameOptions]);

  // ✅ resolve clinicCentreId from selected clinic (centers dropdown)
  const getSelectedClinicCentreId = () => {
    // Non-centriq: single locked clinic
    if (!isCentriq) {
      const opt = clinics.find((c) => norm(c.value) === norm(clinicCode));
      const id = opt?.recid;
      return id !== "" && id !== undefined && id !== null ? Number(id) : undefined;
    }

    // Centriq multi: manual API supports SINGLE clinicCentreId -> only send if exactly 1 selected
    const selected = Array.isArray(clinicCodes) ? clinicCodes : [];
    if (selected.length !== 1) return undefined;

    const opt = clinics.find((c) => norm(c.value) === norm(selected[0]));
    const id = opt?.recid;
    return id !== "" && id !== undefined && id !== null ? Number(id) : undefined;
  };

  /* ---- Load clinics only ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          credentials: "include",
        });
        const d = await r.json();

        // ✅ include recid for clinicCentreId
        const listAll = (Array.isArray(d) ? d : d ? [d] : []).map((x) => ({
          value: norm(x.code ?? x.centerCode ?? x.name), // keep for existing API clinicCode
          label: x.name ?? x.centerName ?? (x.code ?? ""),
          recid: x.recid ?? x.recId ?? x.id ?? "",
        }));

        let list = listAll;

        if (!isCentriq) {
          const loginCode = sessionCtx?.loginCode;
          const topCode = sessionCtx?.topCode;

          const filtered = listAll.filter((c) =>
            matchesLoginClinic(c.label, c.value, loginCode, topCode)
          );

          list = filtered;

          const only = filtered[0]?.value || "";
          setClinicCode(only);
          setClinicCodes([]);
        } else {
          setClinicCode("");
          setClinicCodes([]);
        }

        setClinics(list);
      } catch {
        setClinics([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================================================
     ✅ Campaign Names: when status + (multi) rules selected
     - GetOppNames returns: { oppName, oppcode, recid }
     - store dropdown value = recid (CampaignId)
     ========================================================== */
  useEffect(() => {
    const status = norm(campaignStatusCode);
    const rules = Array.isArray(oppRuleCodes) ? oppRuleCodes.map(norm).filter(Boolean) : [];

    if (!status || !rules.length) {
      setOppNameOptions([]);
      setOppNames([]);
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoadingOppNames(true);
      try {
        const results = await Promise.all(
          rules.map(async (rule) => {
            const body = { campStatus: status, ruleCode: rule };
            const r = await fetch(OPP_NAMES_ENDPOINT, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              signal: ac.signal,
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            return Array.isArray(d) ? d : d ? [d] : [];
          })
        );

        const flat = results.flat();

        // ✅ value = recid (CampaignId)
        const uniq = Array.from(
          new Map(
            flat
              .map((x) => ({
                oppName: norm(x?.oppName),
                recid: x?.recid,
                oppcode: norm(x?.oppcode),
              }))
              .filter((x) => x.oppName && x.recid !== undefined && x.recid !== null)
              .map((x) => [
                String(x.recid),
                {
                  value: String(x.recid),
                  label: x.oppName,
                  oppcode: x.oppcode,
                  recid: x.recid,
                },
              ])
          ).values()
        ).sort((a, b) => a.label.localeCompare(b.label));

        setOppNameOptions(uniq);

        // keep only allowed selected values
        setOppNames((prev) => {
          const prevArr = Array.isArray(prev) ? prev : [];
          if (!prevArr.length) return [];
          const allowed = new Set(uniq.map((o) => o.value));
          return prevArr.filter((v) => allowed.has(String(v)));
        });
      } catch (e) {
        if (e?.name === "AbortError") return;
        console.error(e);
        setOppNameOptions([]);
        setOppNames([]);
        showToast("Failed to load campaign names");
      } finally {
        setLoadingOppNames(false);
      }
    })();

    return () => ac.abort();
  }, [campaignStatusCode, oppRuleCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ===========================
     Manual fetch helper
     - Pass CampaignIds (recids) and clinicCentreId (center recid)
     =========================== */
  const fetchManualPage = async (pageNumber, size) => {
    const effectiveFromISO = toISODateOnly(fromDate) || DEFAULT_FROM_DATE_ISO;
    const effectiveToISO = toISODateOnly(toDate) || todayISODate();

    const clinicCSV = isCentriq
      ? (Array.isArray(clinicCodes) ? clinicCodes : []).map(norm).filter(Boolean).join(",")
      : clinicCode || "";

    const oppStatusInt =
      campaignStatusCode !== "" && !Number.isNaN(Number(campaignStatusCode))
        ? Number(campaignStatusCode)
        : undefined;

    const clinicCentreId = getSelectedClinicCentreId();

    const selectedCampaignIds = Array.isArray(oppNames)
      ? oppNames
          .map((x) => Number(x))
          .filter((n) => typeof n === "number" && !Number.isNaN(n))
      : [];

    // optional: send OppName CSV also (backend said works with any one property)
    const selectedOppNameCSVLocal = (Array.isArray(oppNames) ? oppNames : [])
      .map((id) => oppNameOptions.find((o) => String(o.value) === String(id))?.label)
      .filter(Boolean)
      .join(",");

    const qs = buildQS({
      FromDate: atStartOfDayZ(effectiveFromISO),
      ToDate: atEndOfDayZ(effectiveToISO),
      OppStatus: oppStatusInt,
      ClinicCode: clinicCSV || "",
      ORuleCode: MANUAL_RULE_VALUE,

      // ✅ required for manual
      CampaignIds: selectedCampaignIds,
      clinicCentreId: clinicCentreId,

      // optional
      OppName: selectedOppNameCSVLocal,
      DateFlag: "0",
      PageNumber: pageNumber,
      PageSize: size,
    });

    const r = await fetch(`${MANUAL_LEAD_SUMMARY_ENDPOINT}?${qs}`, {
      method: "GET",
      credentials: "include",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };

  /* ---- Fetch summary (only on View, plus server-side page for manual) ---- */
  const loadSummary = async (pageOverride) => {
    setLoading(true);

    // ✅ For manual, page can change via next/prev calls
    const requestedPage = isManualSelected ? Number(pageOverride || 1) : 1;
    setPage(requestedPage);

    try {
      const effectiveFromISO = toISODateOnly(fromDate) || DEFAULT_FROM_DATE_ISO;
      const effectiveToISO = toISODateOnly(toDate) || todayISODate();
      const df = "0";

      const rulesCSV = (Array.isArray(oppRuleCodes) ? oppRuleCodes : [])
        .map(norm)
        .filter(Boolean)
        .join(",");

      const clinicCSV = isCentriq
        ? (Array.isArray(clinicCodes) ? clinicCodes : []).map(norm).filter(Boolean).join(",")
        : clinicCode || "";

      const body = {
        fromDate: atStartOfDayZ(effectiveFromISO),
        toDate: atEndOfDayZ(effectiveToISO),
        oppStatus: campaignStatusCode || "",
        clinicCode: clinicCSV || "",
        oppRule: rulesCSV || "",
        // ✅ Non-manual API expects oppName string CSV
        oppName: selectedOppNameCSV,
        dateFlag: df,
      };

      let d;

      if (isManualSelected) {
        // ✅ Manual: server-side paging
        d = await fetchManualPage(requestedPage, pageSize);

        setManualMeta({
          pageNumber: Number(d?.pageNumber || requestedPage || 1),
          pageSize: Number(d?.pageSize || pageSize),
          totalRecords: Number(d?.totalRecords || 0),
          totalPages: Number(d?.totalPages || 1),
        });
      } else {
        // ✅ Existing API: unchanged
        const r = await fetch(OPP_SUMMARY_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        d = await r.json();

        // reset manual meta
        setManualMeta({ pageNumber: 1, pageSize, totalRecords: 0, totalPages: 1 });
      }

      const arr = isManualSelected
        ? Array.isArray(d?.data)
          ? d.data
          : []
        : Array.isArray(d)
        ? d
        : d
        ? [d]
        : [];

      const fmt = (s) => {
        const iso = toISODateOnly(s);
        if (!iso) return "";
        const dt = new Date(iso);
        return isNaN(dt)
          ? ""
          : new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(dt);
      };

      // ✅ Keep columns consistent:
      // For Manual response: show CreatedDate in both From & To columns
      const normalized = arr.map((x, i) => {
        const created = pick(x, ["createdDate", "createdOn", "fromDate", "campaignFromDate"]);
        const createdFmt = fmt(created);

        const campId = pick(x, ["camp_id", "campId", "campaignId", "recid", "id"]);
        const resolvedOppCode = campaignIdToOppCode.get(String(campId));

        return {
          key: pick(x, ["oppCode", "opportunityCode", "code", "id", "recid", "camp_id"], `row-${i}`),

          // ✅ manual doesn't have oppCode; resolve from GetOppNames using campaignId
          oppCode: isManualSelected ? (resolvedOppCode || "") : pick(x, ["oppCode", "opportunityCode", "code"]),

          fromDate: isManualSelected
            ? createdFmt
            : fmt(pick(x, ["fromDate", "campaignFromDate", "createdDate", "createdOn"])),
          toDate: isManualSelected
            ? createdFmt
            : fmt(pick(x, ["toDate", "campaignToDate", "createdDate", "createdOn"])),

          oppName: pick(x, ["oppName", "opportunityName", "nameOfOpp"]),
          campaignStatus: isManualSelected
  ? (String(pick(x, ["oppStatus", "campaignStatus", "oppStatusCode"])) === "1" ? "Active" : "Expired")
  : pick(x, ["campaignStatus", "campaignState", "statusCampaign", "oppStatus"]),
          clinic: pick(x, ["clinicName", "centerName", "clinicName", "center", "ClinicCode", "clinicCode"]),

          totalOpportunities: pick(x, ["totalOpportunities", "totalOpp", "total", "totalOpportunitiesABC"]),
          closedA: pick(x, ["closed", "closedA", "closedOpportunities", "noOfClosedOpportunities"]),
          openB: pick(x, ["open", "openB", "openOpportunities", "noOfOpenOpportunities"]),
         // wipC: pick(x, ["wip", "wipC", "wipOpportunities", "wipCount"]),
         wipC: pick(x, ["open", "openB", "openOpportunities", "noOfOpenOpportunities"]),
        // openB:'0',
          convertedCount: pick(x, [
            "noOfOppConverted",
            "convertedCount",
            "converted",
            "convertedOpportunities",
            "noOfConvertedoutofClosed",
          ]),
        };
      });

      setRows(normalized);
    } catch (e) {
      console.error(e);
      showToast("Failed to load opportunity summary");
      setRows([]);
      setManualMeta({ pageNumber: 1, pageSize, totalRecords: 0, totalPages: 1 });
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  function onClickOpp(code) {
    const c = norm(code);
    if (!c) return;
    navigate(`/opportunity/view/${encodeURIComponent(c)}`, { state: { from: "opp-summary" } });
  }

  /* ===========================
     Excel Export
     =========================== */
  const exportExcel = async () => {
    if (exporting) return;
    if (!rows.length) return;

    setExporting(true);
    try {
      let exportSourceRows = rows;

      // ✅ Manual export should fetch ALL records (all pages)
      if (isManualSelected) {
        const all = [];
        const first = await fetchManualPage(1, pageSize);
        const totalPages = Number(first?.totalPages || 1);

        const firstData = Array.isArray(first?.data) ? first.data : [];
        all.push(...firstData);

        for (let p = 2; p <= totalPages; p++) {
          const next = await fetchManualPage(p, pageSize);
          const data = Array.isArray(next?.data) ? next.data : [];
          all.push(...data);
        }

        // normalize to same row shape (CreatedDate into From/To)
        exportSourceRows = all.map((x, i) => {
          const created = pick(x, ["createdDate", "createdOn"]);
          const createdFmt = (() => {
            const iso = toISODateOnly(created);
            if (!iso) return "";
            const dt = new Date(iso);
            return isNaN(dt)
              ? ""
              : new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(dt);
          })();

          const campId = pick(x, ["camp_id", "campId", "campaignId", "recid", "id"]);
          const resolvedOppCode = campaignIdToOppCode.get(String(campId));

          return {
            key: pick(x, ["camp_id", "oppCode", "id"], `m-${i}`),
            oppCode: resolvedOppCode || "",
            fromDate: createdFmt,
            toDate: createdFmt,
            oppName: pick(x, ["oppName"]),
            campaignStatus: pick(x, ["oppStatus"]),
            totalOpportunities: pick(x, ["totalOpp"]),
            closedA: pick(x, ["closed"]),
            openB: pick(x, ["open"]),
            wipC: pick(x, ["wip"]),
            convertedCount: pick(x, ["converted"]),
            clinic: pick(x, ["clinicName"]),
          };
        });
      }

      const excelRows = exportSourceRows.map((r) => ({
        "Created From Date": r.fromDate || "",
        "Created To Date": r.toDate || "",
        OppName: r.oppName || "",
        "Campaign Status": r.campaignStatus || "",
        "Total Opportunities(A+B)": r.totalOpportunities ?? "",
        "Closed(A)": r.closedA ?? "",
        "Open(B)": r.openB ?? "",
        "WIP(C)": r.wipC ?? "",
        "No.Of Opp Converted": r.convertedCount ?? "",
        Clinic: r.clinic || "",
        "Opp Code": r.oppCode || "",
      }));

      const XLSX = await loadXLSX();
      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Opportunity Summary");

      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const rulesCSV = (Array.isArray(oppRuleCodes) ? oppRuleCodes : [])
        .map(norm)
        .filter(Boolean)
        .join(",");

      downloadBlob(
        blob,
        exportSummaryFileName({
          fromDate: toISODateOnly(fromDate),
          toDate: toISODateOnly(toDate),
          oppStatus: campaignStatusCode,
          oppRule: rulesCSV,
        })
      );

      showToast(`Exported ${excelRows.length} rows`, "success");
    } catch (e) {
      console.error("Export failed", e);
      showToast(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="wrap">
      <h1 className="title">Opportunity Summary Report</h1>

      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("/")}>
          DashBoard
        </span>
        <span className="sep"> &gt; </span>
        <span className="crumb-dim">Opportunity Summary Report</span>
      </div>

      <div className="filters">
        <div className="grid">
          <div className="frow">
            <label>Created From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(toISODateOnly(e.target.value))}
            />
          </div>

          <div className="frow">
            <label>Created To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(toISODateOnly(e.target.value))}
            />
          </div>

          <div className="frow">
            <label>Campaign Status</label>
            <SearchableDropdown
              options={campaignStatusOptions}
              value={campaignStatusCode}
              onChange={setCampaignStatusCode}
              multiple={false}
              placeholder="None selected"
            />
          </div>

          <div className="frow">
            <label>Campaign Rule</label>
            <SearchableDropdown
              options={oppRuleOptions}
              value={oppRuleCodes}
              onChange={(next) => {
                const arr = Array.isArray(next) ? next : [];
                const hasManual = arr.includes(MANUAL_RULE_VALUE);

                // ✅ If Manual selected → lock to only manual
                if (hasManual) setOppRuleCodes([MANUAL_RULE_VALUE]);
                else setOppRuleCodes(arr.filter((v) => v !== MANUAL_RULE_VALUE));
              }}
              multiple
              showSelectAll
              placeholder="None selected"
              disabledValues={disabledRuleValues}
            />
          </div>

          <div className="frow">
            <label>Campaign Name</label>
            <SearchableDropdown
              options={oppNameOptions}
              value={oppNames}
              onChange={setOppNames}
              multiple
              placeholder={
                !campaignStatusCode || !(oppRuleCodes || []).length
                  ? "Select status & rule first"
                  : "None selected"
              }
              disabled={!campaignStatusCode || !(oppRuleCodes || []).length || loadingOppNames}
            />
            {loadingOppNames && <small className="hint">Loading campaign names…</small>}
          </div>

          <div className="frow">
            <label>Clinic</label>

            {/* ✅ Centriq: multi + select all */}
            {isCentriq ? (
              <SearchableDropdown
                options={clinics}
                value={clinicCodes}
                onChange={setClinicCodes}
                multiple
                showSelectAll
                placeholder="None selected"
              />
            ) : (
              // ✅ Non-centriq: locked to only clinic
              <SearchableDropdown
                options={clinics}
                value={clinicCode}
                onChange={setClinicCode}
                multiple={false}
                disabled={true}
                showSelectAll={false}
                placeholder="None selected"
              />
            )}
          </div>
        </div>

        <div className="actions">
          {canView && (
            <button className="btn" onClick={() => loadSummary(1)} disabled={loading}>
              View
            </button>
          )}

          {canExport && (
            <button className="btn" onClick={exportExcel} disabled={!rows.length}>
              Export
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Created From Date</th>
              <th>Created To Date</th>
              <th>OppName</th>
              <th>Campaign Status</th>
              <th>
  {isManualSelected
    ? "Total Opportunities (A+B)"
    : "Total Opportunities (A+B+C)"}
</th>
              <th>Closed(A)</th>
              <th>Open(B)</th>
              <th>WIP(C)</th>
              <th>No.Of Opp Converted</th>
              <th>Clinic</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="loading">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && !pageRows.length && (
              <tr>
                <td colSpan={10} className="empty">
                  No data
                </td>
              </tr>
            )}

            {!loading &&
              pageRows.map((r, idx) => (
                <tr key={`${r.key}-${idx}`}>
                  <td>
                    <button className="link" onClick={() => onClickOpp(r.oppCode)}>
                      {r.fromDate}
                    </button>
                  </td>
                  <td>
                    <button className="link" onClick={() => onClickOpp(r.oppCode)}>
                    {r.toDate}</button></td>

                  <td>
                    <button className="link" onClick={() => onClickOpp(r.oppCode)}>
                      {r.oppName}
                    </button>
                  </td>

                  <td>{r.campaignStatus}</td>
                  <td>{r.totalOpportunities}</td>
                  <td>{r.closedA}</td>
                  <td>{r.openB}</td>
                  <td>{r.wipC}</td>
                  <td>{r.convertedCount}</td>
                  <td>{r.clinic}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="pager">
          <button
            className="pagebtn"
            disabled={page <= 1}
            onClick={() => {
              if (isManualSelected) loadSummary(page - 1);
              else setPage((p) => p - 1);
            }}
          >
            Prev
          </button>
          <span className="pageno">{page}</span>
          <button
            className="pagebtn"
            disabled={page >= pageCount}
            onClick={() => {
              if (isManualSelected) loadSummary(page + 1);
              else setPage((p) => p + 1);
            }}
          >
            Next
          </button>
          <span className="pagecount">/ {pageCount}</span>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .title { font-size: 22px; font-weight: 700; color: #0b1f3a; margin: 0 0 6px; }
        .breadcrumb { color: #5e6a7b; margin: 18px 0; }
        .crumb-link { color: #2e5aac; cursor: pointer; }
        .crumb-dim { color: #8893a5; }
        .sep { margin: 0 6px; }

        .filters { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 16px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px 18px; }
        .frow { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 14px; font-weight: 700; color: #5a6270; }
        input[type="date"] { height: 36px; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; outline: none; background: #fff; }

        .hint { color: #6b7280; font-size: 12px; margin-top: 2px; }

        .actions { margin-top: 10px; display: flex; gap: 12px; justify-content: flex-end; }
        .btn { background: #112032; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
        .btn[disabled] { opacity: .55; cursor: not-allowed; }

        .table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 10px 0; }
        table.tbl { width: 100%; border-collapse: separate; border-spacing: 0 0; }
        .tbl thead th { text-align: left; font-size: 13px; color: #6c7688; font-weight: 700; padding: 10px 14px; border-bottom: 1px solid #eef1f6; }
        .tbl tbody td { font-size: 14px; color: #1b2636; padding: 12px 14px; border-bottom: 1px solid #f1f4f9; vertical-align: middle; }

        .link { background: none; border: none; padding: 0; color: #2e5aac; cursor: pointer; font-weight: 600; text-align: left; }
        .link:hover { text-decoration: underline; }

        .loading, .empty { text-align: center; color: #6b7280; padding: 18px; }

        .pager { display: flex; align-items: center; gap: 8px; justify-content: flex-end; padding: 10px 14px; }
        .pagebtn { background: #0f1f33; color: white; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
        .pageno, .pagecount { color: #4b5563; font-weight: 600; }

        .toast { position: fixed; bottom: 16px; right: 16px; color:#fff; background:#d7263d; padding:10px 14px; border-radius:8px; font-weight:600; box-shadow:0 6px 18px rgba(0,0,0,0.15); z-index:9999; }
        .toast.success { background:#138a36; }

        @media (max-width: 1100px) { .grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}