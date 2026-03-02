// src/pages/Opportunity/OpportunityDetailedReport.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/* ===========================
   Utils
   =========================== */
const norm = (s) => (s ?? "").toString().trim();

// Normalize to YYYY-MM-DD from ISO or DD-MM-YYYY / DD/MM/YYYY
// Normalize to YYYY-MM-DD from ISO (with/without time) or DD-MM-YYYY / DD/MM/YYYY
function toISODateOnly(s) {
  const t = norm(s);
  if (!t) return "";

  // ✅ IMPORTANT: if it starts with YYYY-MM-DD (even with time), take date part directly
  const m0 = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m0) return m0[1];

  // dd/MM/yyyy or dd-MM-yyyy -> yyyy-MM-dd
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // fallback (only for weird formats)
  const d = new Date(t);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

const atStartOfDayZ = (dateISO) => (dateISO ? `${dateISO}T00:00:00Z` : "");
const atEndOfDayZ = (dateISO) => (dateISO ? `${dateISO}T23:59:59Z` : "");

const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;

    if (Array.isArray(v)) {
      const s = v.map((x) => norm(x)).filter(Boolean).join(", ");
      if (s) return s;
      continue;
    }

    if (typeof v === "object") {
      const s = norm(v?.label ?? v?.name ?? v?.value ?? "");
      if (s) return s;
      continue;
    }

    const s = norm(v);
    if (s) return s;
  }
  return fallback;
};

// get value by key, case-insensitive and ignoring _ and spaces
const getKeyCI = (obj, key) => {
  if (!obj || !key) return undefined;

  const target = norm(key).toLowerCase().replace(/[_\s]/g, "");

  if (obj[key] !== undefined) return obj[key];

  for (const k of Object.keys(obj)) {
    const kk = norm(k).toLowerCase().replace(/[_\s]/g, "");
    if (kk === target) return obj[k];
  }
  return undefined;
};

const pickCI = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = getKeyCI(obj, k);
    if (v === undefined || v === null) continue;

    if (Array.isArray(v)) {
      const s = v.map((x) => norm(x)).filter(Boolean).join(", ");
      if (s) return s;
      continue;
    }

    if (typeof v === "object") {
      const s = norm(v?.label ?? v?.name ?? v?.value ?? v?.text ?? "");
      if (s) return s;
      continue;
    }

    const s = norm(v);
    if (s) return s;
  }
  return fallback;
};

const padLeadId = (v, width = 7) => {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Math.trunc(n)).padStart(width, "0");
};

const formatLeadId = (leadIdRaw, ruleCodeRaw) => {
  const raw = norm(leadIdRaw);
  if (!raw) return "";

  // If backend already sends a formatted lead id, keep it as-is
  const upper = raw.toUpperCase();
  if (upper.startsWith("LD-EX-") || upper.startsWith("LD-MN-") || upper.startsWith("LD-")) return raw;

  // Numeric -> pad
  const padded = padLeadId(raw, 7);
  if (!padded) return "";

  const rule = norm(ruleCodeRaw).toUpperCase();

  // ✅ Manual Lead => LD-MN-#######
  if (rule === "MANUAL LEAD") return `LD-MN-${padded}`;

  // ✅ External Source (R7) => LD-EX-#######
  if (rule === "R7") return `LD-EX-${padded}`;

  // ✅ All other rules => LD-#######
  return `LD-${padded}`;
};

// Backend-only default dates (DO NOT show on UI)
const DEFAULT_FROM_DATE_ISO = "2020-01-22";
const todayISODate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** NEW: session context resolver (loginCode/topCode/userID) */
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
      localStorage.getItem("sessionValues"),
      localStorage.getItem("session"),
      localStorage.getItem("userSession"),
      sessionStorage.getItem("sessionValues"),
      sessionStorage.getItem("session"),
      sessionStorage.getItem("userSession"),
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

/** NEW: match center against loginCode/topCode */
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
   Querystring builder (supports arrays)
   =========================== */
const buildQS = (obj) => {
  const qs = new URLSearchParams();

  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;

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

const isManualLeadRule = (ruleCodeRaw) =>
  norm(ruleCodeRaw).toLowerCase() === "manual lead";
const normStatus = (v) => norm(v).toLowerCase().replace(/\s+/g, " ");

const manualConvertedYesNo = (leadStatusRaw) => {
  const s = normStatus(leadStatusRaw);
  return s === "converted" ? "YES" : "NO";
};

const manualClosedBy = (leadStatusRaw, modifiedByRaw) => {
  const s = normStatus(leadStatusRaw);
  if (s === "converted" || s === "not converted") return norm(modifiedByRaw);
  return "";
};

/* ===========================
   SearchableDropdown (with disabling option values)
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
    if (isDisabledOption(val)) return;

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
   Endpoints
   =========================== */
const OPP_DETAIL_ENDPOINT = `${API_BASE_URL}/api/Opportunity/OppDetailReport`;
const OPP_NAMES_ENDPOINT = `${API_BASE_URL}/api/Opportunity/GetOppNames`;

// ✅ Manual Detailed list API
const MANUAL_LEAD_LIST_ENDPOINT = `${API_BASE_URL}/api/LeadOpp/report/leadopps/list`;

export default function OpportunityDetailedReport() {
  const navigate = useNavigate();
  const { state } = useLocation() || {};

  // Dates
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // filters
  const [campaignStatusCode, setCampaignStatusCode] = useState("");

  /** Campaign Rule MULTI */
  const [oppRuleCodes, setOppRuleCodes] = useState([]);

  const MANUAL_RULE_VALUE = "Manual Lead";
  const isManualSelected = useMemo(
    () => Array.isArray(oppRuleCodes) && oppRuleCodes.includes(MANUAL_RULE_VALUE),
    [oppRuleCodes]
  );

  /** clinic can be single or multi (Centriq) */
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
  const canExport = role !== "team member" && role !== "clinic manager" && role !== "finance reviwer";
  const canView = role !== "clinic manager" && role !== "finance reviwer";

  const [clinicCode, setClinicCode] = useState(""); // string (single mode)
  const [clinicCodes, setClinicCodes] = useState([]); // array (Centriq mode)

  // ✅ store selected CampaignIds (recid) as strings
  const [oppNames, setOppNames] = useState([]);

  // options
  const campaignStatusOptions = [
    { value: "1", label: "Active" },
    { value: "2", label: "Expired" },
  ];

  const oppRuleOptions = [
    { value: "R1", label: "Paid for X but not for Y" },
    { value: "R2", label: "Paid for X Category in Y days and No future appointment in Z days for Category P" },
    { value: "R3", label: "No show appointment for X days" },
    { value: "R4", label: "Cancelled appointment for X days" },
    { value: "Manual Lead", label: "Manual Lead" },
    { value: "R5", label: "Customer Special Day" },
    { value: "R6", label: "Customer Type" },
    { value: "R7", label: "External Source" },
  ];

  // ✅ if manual selected -> disable all other rule options
  const disabledRuleValues = useMemo(() => {
    if (!isManualSelected) return [];
    return oppRuleOptions.map((x) => x.value).filter((v) => v !== MANUAL_RULE_VALUE);
  }, [isManualSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ include recid on centers
  const [clinics, setClinics] = useState([]); // { value, label, recid }
  // ✅ GetOppNames: { oppName, oppcode, recid } => option value = recid
  const [oppNameOptions, setOppNameOptions] = useState([]); // { value: recidStr, label: oppName, oppcode }

  // table
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOppNames, setLoadingOppNames] = useState(false);

  const [toast, setToast] = useState(null);

  // paging
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // manual server paging meta
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

  const isExternalSelected = useMemo(() => {
    const rules = Array.isArray(oppRuleCodes) ? oppRuleCodes : [];
    return rules.map(norm).some((r) => r.toUpperCase() === "R7");
  }, [oppRuleCodes]);

  // ✅ Map campaignId (recid) -> oppcode (for manual click navigation + export)
  const campaignIdToOppCode = useMemo(() => {
    const m = new Map();
    (oppNameOptions || []).forEach((o) => {
      if (o?.value && o?.oppcode) m.set(String(o.value), String(o.oppcode));
    });
    return m;
  }, [oppNameOptions]);

  // ✅ CSV of selected oppName labels (for old API)
  const selectedOppNameCSV = useMemo(() => {
    const selectedIds = Array.isArray(oppNames) ? oppNames.map(String) : [];
    return selectedIds
      .map((id) => oppNameOptions.find((o) => String(o.value) === String(id))?.label)
      .filter(Boolean)
      .join(",");
  }, [oppNames, oppNameOptions]);

  // ✅ resolve clinicCentreId from selected clinic (center recid)
  const getSelectedClinicCentreId = () => {
    if (!isCentriq) {
      const opt = clinics.find((c) => norm(c.value) === norm(clinicCode));
      const id = opt?.recid;
      return id !== "" && id !== undefined && id !== null ? Number(id) : undefined;
    }
    const selected = Array.isArray(clinicCodes) ? clinicCodes : [];
    if (selected.length !== 1) return undefined;
    const opt = clinics.find((c) => norm(c.value) === norm(selected[0]));
    const id = opt?.recid;
    return id !== "" && id !== undefined && id !== null ? Number(id) : undefined;
  };

  /* ---- Load clinics ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, { credentials: "include" });
        const d = await r.json();

        const listAll = (Array.isArray(d) ? d : d ? [d] : []).map((x) => ({
          value: norm(x.code ?? x.centerCode ?? x.name),
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
      } catch (e) {
        console.error(e);
        setClinics([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================================================
     Campaign names: when status + rules selected
     - GetOppNames returns recid (CampaignId)
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
     Manual API: fetch one page
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

      // ✅ required fields
      CampaignIds: selectedCampaignIds,
      clinicCentreId: clinicCentreId,

      // optional
      OppName: selectedOppNameCSVLocal,
      DateFlag: "0",
      PageNumber: pageNumber,
      PageSize: size,
    });

    const r = await fetch(`${MANUAL_LEAD_LIST_ENDPOINT}?${qs}`, {
      method: "GET",
      credentials: "include",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };

  /* ===========================
     Load report
     - Manual uses /leadopps/list (GET + server paging)
     - Others uses /api/Opportunity/OppDetailReport (existing POST logic stays same)
     =========================== */
  const loadDetailed = async (pageOverride) => {
    setLoading(true);

    const requestedPage = isManualSelected ? Number(pageOverride || 1) : 1;
    setPage(requestedPage);

    try {
      const effectiveFromISO = toISODateOnly(fromDate) || DEFAULT_FROM_DATE_ISO;
      const effectiveToISO = toISODateOnly(toDate) || todayISODate();
      const df = "0";

      const clinicCSV = isCentriq
        ? (Array.isArray(clinicCodes) ? clinicCodes : []).map(norm).filter(Boolean).join(",")
        : clinicCode || "";

      let arr = [];
      let manualResp = null;

      if (isManualSelected) {
        manualResp = await fetchManualPage(requestedPage, pageSize);
        arr = Array.isArray(manualResp?.data) ? manualResp.data : [];

        setManualMeta({
          pageNumber: Number(manualResp?.pageNumber || requestedPage || 1),
          pageSize: Number(manualResp?.pageSize || pageSize),
          totalRecords: Number(manualResp?.totalRecords || 0),
          totalPages: Number(manualResp?.totalPages || 1),
        });
      } else {
        // existing logic for OppDetailReport remains same
        const rulesCSV = (Array.isArray(oppRuleCodes) ? oppRuleCodes : [])
          .map(norm)
          .filter(Boolean)
          .join(",");

        const body = {
          fromDate: atStartOfDayZ(effectiveFromISO),
          toDate: atEndOfDayZ(effectiveToISO),
          oppStatus: campaignStatusCode || "",
          clinicCode: clinicCSV || "",
          oppRule: rulesCSV || "",
          oppName: selectedOppNameCSV, // CSV of names
          dateFlag: df,
        };

        const r = await fetch(OPP_DETAIL_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const d = await r.json();
        arr = Array.isArray(d) ? d : d ? [d] : [];

        setManualMeta({ pageNumber: 1, pageSize, totalRecords: 0, totalPages: 1 });
      }

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

      const yesNo = (v) => {
        const s = String(v ?? "").toLowerCase();
        if (["1", "true", "y", "yes"].includes(s)) return "YES";
        if (["0", "false", "n", "no"].includes(s)) return "NO";
        return s ? "YES" : "NO";
      };

      const normalized = arr.map((x, i) => {
        // Manual data shape:
        // leadOpp_ID, customerName, status, oppName, oRuleCode, camp_id, clinicCentre_FK,
        // oppStatus, disposition, remark, customerMsg, saleOwner, modifiedBy, createdDate, clinicName
        const createdRaw = pick(x, ["createdDate", "createdOn"]);
        const leadOppIdRaw = pick(x, ["leadOpp_ID", "leadOppId", "id", "leadID", "leadId"]);
        const ruleCodeRaw = pick(x, ["oRuleCode", "ruleCode", "oppRule", "oRule", "rule"]);
        const campId = pick(x, ["camp_id", "campId", "campaignId", "recid"]);
        const resolvedOppCode = campaignIdToOppCode.get(String(campId));

      if (isManualSelected) {
  // status = Campaign Status (Open/Closed)
  const campaignStatusRaw = pick(x, ["status", "campaignStatus", "campaignState"]);

  // disposition = Lead Status (WIP/Converted/Not Converted)
  const leadStatusRaw = pick(x, ["disposition", "leadStatus", "oppStatus", "statusName"]);

  const modifiedByRaw = pick(x, ["modifiedBy", "modifiedByName"]);
  const mobileNo = norm(pickCI(x, ["mobile", "mobileNo", "mobileNumber", "phone", "phoneNo"]));

  return {
    key: pick(x, ["leadOpp_ID", "id"], `m-${i}`),
    oppCode: resolvedOppCode || "",

    createdDate: fmt(createdRaw),
    leadId: formatLeadId(leadOppIdRaw, ruleCodeRaw),
    leadName: pick(x, ["customerName", "leadName", "custName", "name"]),

    oppName: pick(x, ["oppName"]),
    campaignStatus: campaignStatusRaw,

    // ✅ Converted depends on LEAD STATUS (Converted => YES)
    converted: manualConvertedYesNo(leadStatusRaw),

    // ✅ Lead Status column should show disposition
    oppStatus: leadStatusRaw || campaignStatusRaw,

    mobileNo: mobileNo,

    salesOwner: pick(x, ["saleOwner", "salesOwner", "salesowner"]),
  //  reasons: pick(x, ["remark", "reasons", "reason", "Remarks"]),
    reasons:'',
    createdBy: pick(x, ["saleOwner", "salesOwner", "salesowner"]),

    // ✅ Closed By only when Lead Status is Converted or Not Converted
    closedBy: manualClosedBy(leadStatusRaw, modifiedByRaw),

    clinic: pick(x, ["clinicName", "centerName", "clinic"]),
  };
}

        // Existing API shape (unchanged)
        const leadIdRaw = pick(x, ["leadID", "leadId", "leadid", "leadCode", "id", "custId", "customerId"]);
        const fromRaw = pick(x, ["fromDate", "campaignFromDate"]);
        const toRaw = pick(x, ["toDate", "campaignToDate"]);
        const ruleRaw = pick(x, ["ruleCode", "oppRule", "oRuleCode", "rule"]);
        const apptRaw = pick(x, ["appointmentDate", "apptDate", "appointment_date", "AppointmentDate"]);
const isExternalRow = norm(ruleRaw).toUpperCase() === "R7";
const therapistNameRaw = pick(x, [
  "therapistName",
  "therapist",
  "providerName",
  "doctorName",
]);

// ✅ MOBILE: handle keys like mobileNo / mobileNo / MobileNo / mobile_no / mobileNumber etc
const mobileRaw = pickCI(x, [
  "mobileNo",
  "mobile",
  "mobileNumber",
  "phone",
  "phoneNo",
  "phoneNumber",
  "mobile_no",
  "mobile_no.",
  "customerMobile",
  "customerMobileNo",
  "custMobile",
]);
const mobileNo = norm(mobileRaw);

        return {
          key: pick(x, ["oppCode", "opportunityCode", "code", "id"], `row-${i}`),
          oppCode: pick(x, ["oppCode", "opportunityCode", "code"]),
          fromDate: fmt(fromRaw),
          toDate: fmt(toRaw),
          createdDate: fmt(pick(x, ["createdDate", "createdOn"])),
          appointmentDate: isExternalRow ? "" : fmt(apptRaw),
          mobileNo: mobileNo,

          leadId: formatLeadId(leadIdRaw, ruleRaw),
          therapistName: therapistNameRaw,
          ruleCode: ruleRaw,

          salesOwner: pickCI(x, [
            "salesOwner",
            "salesowner",
            "SalesOwner",
            "sales_owner",
            "salesOwnerName",
            "salesOwnerFullName",
            "salesOwnerEmpCode",
            "salesOwnerEmployeeCode",
            "ownerName",
            "owner",
          ]),
          reasons: pickCI(x, [
            "reasons",
            "Reasons",
            "reason",
            "reasonName",
            "reasonText",
            "reasonDesc",
            "remarksReason",
            "remarks",
          ]),

          leadName: pick(x, ["leadName", "customerName", "custName", "name"]),
          oppName: pick(x, ["oppName", "opportunityName", "nameOfOpp"]),
          campaignStatus: pick(x, ["campaignStatus", "campaignState", "statusCampaign"]),
          converted: yesNo(pick(x, ["converted", "isConverted"])),
          oppStatus: pick(x, ["statusName", "oppStatus", "status"]),
          createdBy: pick(x, ["createdByName", "createdBy", "ownerName"]),
          closedBy: pick(x, ["closedByName", "closedBy"]),
          clinic: pick(x, ["centerName", "clinicName", "center"]),
        };
      });

      setRows(normalized);
    } catch (e) {
      console.error(e);
      showToast("Failed to load opportunity report");
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
    navigate(`/opportunity/view/${encodeURIComponent(c)}`, { state: { from: "opp-detail" } });
  }

  /* ===========================
     Export to Excel (.xlsx)
     - Manual export fetches all pages from manual API
     - Non-manual export uses current rows (existing behavior)
     =========================== */
  async function exportExcel() {
    if (!rows.length) return;

    let exportRows = rows;

    if (isManualSelected) {
      try {
        const first = await fetchManualPage(1, pageSize);
        const totalPages = Number(first?.totalPages || 1);
        const all = [];

        const pushData = (resp) => {
          const data = Array.isArray(resp?.data) ? resp.data : [];
          all.push(...data);
        };

        pushData(first);

        for (let p = 2; p <= totalPages; p++) {
          const next = await fetchManualPage(p, pageSize);
          pushData(next);
        }

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

        exportRows = all.map((x, i) => {
  const createdRaw = pick(x, ["createdDate", "createdOn"]);
  const leadOppIdRaw = pick(x, ["leadOpp_ID", "leadOppId", "id"]);
  const ruleCodeRaw = pick(x, ["oRuleCode", "ruleCode", "oppRule", "oRule", "rule"]);
  const campId = pick(x, ["camp_id", "campId", "campaignId", "recid"]);
  const resolvedOppCode = campaignIdToOppCode.get(String(campId));

  const statusRaw = pick(x, ["status"]);
  const modifiedByRaw = pick(x, ["modifiedBy"]);

  

  const campaignStatusRaw = pick(x, ["status"]); // Open/Closed
const leadStatusRaw = pick(x, ["disposition"]) || campaignStatusRaw; // Converted/Not Converted/...


  return {
    createdDate: fmt(createdRaw),
    leadId: formatLeadId(leadOppIdRaw, ruleCodeRaw),
    leadName: pick(x, ["customerName"]),
    oppName: pick(x, ["oppName"]),
    campaignStatus: campaignStatusRaw,
mobileNo: norm(pickCI(x, ["mobile", "mobileNo", "mobileNumber", "phone", "phoneNo"])),
therapistName: "",

    // ✅ Manual rules for export too
    converted: manualConvertedYesNo(leadStatusRaw),

   oppStatus: leadStatusRaw || campaignStatusRaw,
  mobileNo: norm(pickCI(x, ["mobile", "mobileNo", "mobileNumber", "phone", "phoneNo"])),


    salesOwner: pick(x, ["saleOwner", "salesOwner"]),
    reasons: pick(x, ["remark"]),
    createdBy: pick(x, ["createdBy", "createdByName"]) || modifiedByRaw,
    closedBy: manualClosedBy(leadStatusRaw, modifiedByRaw),

    clinic: pick(x, ["clinicName"]),
    oppCode: resolvedOppCode || "",
  };
});
      } catch (e) {
        console.error(e);
        showToast("Manual export failed");
        return;
      }
    }

    // Keep headers aligned with table columns
    const headers = [
      "Created Date",
      "Lead ID",
      "Lead Name",
      "Campaign Name",
      "Appointment Date",
      "Therapist Name", 
      "Mobile",
      "Campaign Status",
      "Converted",
      "Lead Status",
      "Sales Owner",
      "Reasons",
      "Created By",
      "Closed By",
      "Clinic",
      "Campaign Code",
    ];

    const aoa = [
      headers,
      ...exportRows.map((r) => [
        r.createdDate ?? "",
        r.leadId ?? "",
        r.leadName ?? "",
        r.oppName ?? "",
        r.appointmentDate ?? "",
        r.therapistName ?? "",
        r.mobileNo ?? "",
        r.campaignStatus ?? "",
        r.converted ?? "",
        r.oppStatus ?? "",
        r.salesOwner ?? "",
        r.reasons ?? "",
        r.createdBy ?? "",
        r.closedBy ?? "",
        r.clinic ?? "",
        r.oppCode ?? "",
        r.appointmentDate ?? ""
      ]),
    ];

    const XLSXMod = await import("xlsx");
    const XLSX = XLSXMod.default || XLSXMod;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = headers.map((h, cIdx) => {
      const maxLen = Math.max(
        h.length,
        ...aoa.slice(1).map((row) => String(row?.[cIdx] ?? "").length)
      );
      return { wch: Math.min(Math.max(12, maxLen + 2), 40) };
    });

    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: aoa.length - 1, c: headers.length - 1 },
      }),
    };

    XLSX.utils.book_append_sheet(wb, ws, "Opportunity Detail");
    const fname = `Opportunity_Detailed_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  return (
    <div className="wrap">
      <h1 className="title">Opportunity Detail Report</h1>

      <div className="breadcrumb">
        <span className="crumb-link" onClick={() => navigate("/")}>
          DashBoard
        </span>
        <span className="sep"> &gt; </span>
        <span className="crumb-dim">Opportunity Detail</span>
      </div>

      <div className="filters">
        <div className="grid">
          <div className="frow">
            <label>Created From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(toISODateOnly(e.target.value))} />
          </div>

          <div className="frow">
            <label>Created To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(toISODateOnly(e.target.value))} />
          </div>

          <div className="frow">
            <label>Campaign Status</label>
            <SearchableDropdown
              options={campaignStatusOptions}
              value={campaignStatusCode}
              onChange={setCampaignStatusCode}
              placeholder="None selected"
              multiple={false}
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

                // ✅ Manual selected -> disable all others (lock to manual)
                if (hasManual) setOppRuleCodes([MANUAL_RULE_VALUE]);
                else setOppRuleCodes(arr.filter((v) => v !== MANUAL_RULE_VALUE));
              }}
              placeholder="None selected"
              multiple
              showSelectAll
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

            {isCentriq ? (
              <SearchableDropdown
                options={clinics}
                value={clinicCodes}
                onChange={setClinicCodes}
                placeholder="None selected"
                multiple
                showSelectAll
              />
            ) : (
              <SearchableDropdown
                options={clinics}
                value={clinicCode}
                onChange={setClinicCode}
                placeholder="None selected"
                multiple={false}
                disabled={true}
                showSelectAll={false}
              />
            )}
          </div>
        </div>

        <div className="actions">
          {canView && (
            <button className="btn" onClick={() => loadDetailed(1)} disabled={loading}>
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
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Created Date</th>
                <th>Lead ID</th>
                <th>Lead Name</th>
                <th>Campaign Name</th>
                <th>Appointment Date</th>
                <th>Therapist Name</th>
                <th>Mobile No</th>
                <th>Campaign Status</th>
                <th>Converted</th>
                <th>Lead Status</th>
                <th>Sales Owner</th>
                <th>Reasons</th>
                <th>Created By</th>
                <th>Closed By</th>
                <th>Clinic</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={12} className="loading">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && !pageRows.length && (
                <tr>
                  <td colSpan={12} className="empty">
                    No data
                  </td>
                </tr>
              )}

              {!loading &&
                pageRows.map((r, idx) => (
                  <tr key={`${r.key}-${idx}`}>
                    <td>{r.createdDate}</td>
                    <td>{r.leadId}</td>
                    <td>{r.leadName}</td>
                    <td>
                      <button className="link" onClick={() => onClickOpp(r.oppCode)}>
                        {r.oppName}
                      </button>
                    </td>
                    <td>
                      {r.appointmentDate}
                    </td>
                    <td>{r.therapistName}</td> 
                    <td>{r.mobileNo}</td>
                    <td>{r.campaignStatus}</td>
                    <td>{r.converted}</td>
                    <td>
                      <button className="link" onClick={() => onClickOpp(r.oppCode)}>
                        {r.oppStatus}
                      </button>
                    </td>
                    <td>{r.salesOwner}</td>
                    <td>{r.reasons}</td>
                    <td>{r.createdBy}</td>
                    <td>{r.closedBy}</td>
                    <td>{r.clinic}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <button
            className="pagebtn"
            disabled={page <= 1}
            onClick={() => {
              if (isManualSelected) loadDetailed(page - 1);
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
              if (isManualSelected) loadDetailed(page + 1);
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
        label { font-size: 12px; font-weight: 700; color: #5a6270; }
        input[type="date"] {
          height: 36px; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; outline: none; background: #fff;
        }
        .hint { color: #6b7280; font-size: 12px; margin-top: 2px; }

        .actions { margin-top: 10px; display: flex; gap: 12px; justify-content: flex-end; }
        .btn { background: #112032; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
        .btn[disabled] { opacity: .55; cursor: not-allowed; }

        .table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 10px 0; }
        .table-scroll { max-height: 420px; overflow: auto; }
        table.tbl { width: 100%; min-width: 1200px; border-collapse: separate; border-spacing: 0; }
        .tbl thead th {
          position: sticky; top: 0; background: #fff; z-index: 2;
          text-align: left; font-size: 13px; color: #6c7688; font-weight: 700;
          padding: 10px 14px; border-bottom: 1px solid #eef1f6; white-space: nowrap;
        }
        .tbl tbody td {
          font-size: 12px; color: #1b2636; padding: 6px 14px; border-bottom: 1px solid #f1f4f9; vertical-align: top; line-height: 1.35;
        }

        .link { background: none; border: none; padding: 0; font-size: 12px; color: #2e5aac; cursor: pointer; font-weight: 600; text-align: left; }
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