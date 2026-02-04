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
function toISODateOnly(s) {
  const t = norm(s);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
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
const withLD = (v) => {
  const s = norm(v);
  if (!s) return "";
  return s.toUpperCase().startsWith("LD-") ? s : `LD-${s}`;
};

// ✅ Backend-only default dates (DO NOT show on UI)
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

    // Most common places apps store session json
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

    // If you store it as plain keys instead of JSON
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

  // try exact-ish or contains
  if (a && (l === a || v === a || l.includes(a) || v.includes(a))) return true;
  if (b && (l === b || v === b || l.includes(b) || v.includes(b))) return true;

  return false;
};

/* ===========================
   SearchableDropdown
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
    const arr = Array.isArray(value) ? [...value] : [];
    if (allSelected) {
      onChange(arr.filter((v) => !filtered.some((o) => o.value === v)));
    } else {
      const union = new Set(arr);
      filtered.forEach((o) => union.add(o.value));
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
                />
                <span>{o.label}</span>
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
   Page: Opportunity Detailed Report
   =========================== */
const OPP_DETAIL_ENDPOINT = `${API_BASE_URL}/api/Opportunity/OppDetailReport`;
const OPP_NAMES_ENDPOINT = `${API_BASE_URL}/api/Opportunity/GetOppNames`;

export default function OpportunityDetailedReport() {
  const navigate = useNavigate();
  const { state } = useLocation() || {};

  // ✅ Dates: DO NOT show defaults on UI
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // filters
  const [campaignStatusCode, setCampaignStatusCode] = useState("");

  /** ✅ CHANGED: Campaign Rule is MULTI */
  const [oppRuleCodes, setOppRuleCodes] = useState([]);

  /** ✅ CHANGED: clinic can be single or multi (Centriq) */
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

  const [clinicCode, setClinicCode] = useState(""); // string (single mode)
  const [clinicCodes, setClinicCodes] = useState([]); // array (Centriq mode)

  const [oppNames, setOppNames] = useState(
    Array.isArray(state?.oppNames)
      ? state.oppNames.map(norm)
      : state?.oppName
      ? [norm(state.oppName)]
      : []
  );

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

  const [clinics, setClinics] = useState([]);
  const [oppNameOptions, setOppNameOptions] = useState([]);

  // table
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOppNames, setLoadingOppNames] = useState(false);

  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const showToast = (message, type = "error", ms = 2200) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  /* ---- Load clinics ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const r = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          credentials: "include",
        });
        const d = await r.json();

        const listAll = (Array.isArray(d) ? d : d ? [d] : []).map((x) => ({
          value: norm(x.code ?? x.centerCode ?? x.name),
          label: x.name ?? x.centerName ?? (x.code ?? ""),
        }));

        /** ✅ NEW: apply session-based restriction */
        let list = listAll;

        if (!isCentriq) {
          const loginCode = sessionCtx?.loginCode;
          const topCode = sessionCtx?.topCode;

          const filtered = listAll.filter((c) =>
            matchesLoginClinic(c.label, c.value, loginCode, topCode)
          );

          list = filtered;

          // default & lock to only clinic (if found)
          const only = filtered[0]?.value || "";
          setClinicCode(only);
          setClinicCodes([]); // not used in single mode
        } else {
          // Centriq: show all, allow multi (select all)
          setClinicCode("");
          setClinicCodes([]); // user selects
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
     ✅ Campaign Name list when status + (multi) rule are selected
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
        // Call API once per rule (safe if backend expects single ruleCode)
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
              .map((x) => ({ oppName: norm(x?.oppName) }))
              .filter((x) => x.oppName)
              .map((x) => [x.oppName, { value: x.oppName, label: x.oppName }])
          ).values()
        ).sort((a, b) => a.label.localeCompare(b.label));

        setOppNameOptions(uniq);

        // keep selected names if still valid
        setOppNames((prev) => {
          const prevArr = Array.isArray(prev) ? prev : [];
          if (!prevArr.length) return [];
          const allowed = new Set(uniq.map((o) => o.value));
          return prevArr.filter((v) => allowed.has(norm(v)));
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
  }, [campaignStatusCode, oppRuleCodes]);

  /* ---- Fetch report (only on View) ---- */
  const loadDetailed = async () => {
    setLoading(true);
    setPage(1);
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
        : (clinicCode || "");

      const body = {
        fromDate: atStartOfDayZ(effectiveFromISO),
        toDate: atEndOfDayZ(effectiveToISO),
        oppStatus: campaignStatusCode || "",
        clinicCode: clinicCSV || "",
        oppRule: rulesCSV || "",
        oppName: (oppNames || []).join(","), // CSV
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
      const arr = Array.isArray(d) ? d : d ? [d] : [];

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
        const fromRaw = pick(x, ["fromDate", "campaignFromDate"]);
        const toRaw = pick(x, ["toDate", "campaignToDate"]);
        const createdRaw = pick(x, ["createdDate", "createdOn"]);

        return {
          key: pick(x, ["oppCode", "opportunityCode", "code", "id"], `row-${i}`),
          oppCode: pick(x, ["oppCode", "opportunityCode", "code"]),
          fromDate: fmt(fromRaw),
          toDate: fmt(toRaw),
          createdDate: fmt(createdRaw),

          leadId: withLD(pick(x, ["leadId", "leadID", "leadCode", "customerId", "custId", "id"])),

          leadName: pick(x, ["leadName", "customerName", "custName", "name"]),

          oppName: pick(x, ["oppName", "opportunityName", "nameOfOpp"]),
          campaignStatus: pick(x, ["campaignStatus", "campaignState", "statusCampaign"]),
          converted: yesNo(pick(x, ["converted", "isConverted"])),
          oppStatus: pick(x, ["statusName", "oppStatus", "status"]),
          createdBy: pick(x, ["createdByName", "createdBy", "ownerName"]),
          closedBy: pick(x, ["closedByName", "closedBy"]),
          wip: yesNo(pick(x, ["wip", "isWip"])),
          clinic: pick(x, ["centerName", "clinicName", "center"]),
        };
      });

      setRows(normalized);
    } catch (e) {
      console.error(e);
      showToast("Failed to load opportunity report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  function onClickOpp(code) {
    if (!code) return;
    navigate(`/opportunity/view/${encodeURIComponent(code)}`, { state: { from: "opp-detail" } });
  }

  /* ===========================
     Export to Excel (.xlsx)
     =========================== */
  async function exportExcel() {
    if (!rows.length) return;

    const headers = [
      "From Date",
      "To Date",
      "Created Date",
      "Lead ID",
      "Lead Name",
      "Campaign Name",
      "Campaign Status",
      "Converted",
      "OppStatus",
      "Created By",
      "Closed By",
      "WIP",
      "Clinic",
      "Campaign Code",
    ];

    const aoa = [
      headers,
      ...rows.map((r) => [
        r.fromDate,
        r.toDate,
        r.createdDate,
        r.leadId ?? "",
        r.leadName ?? "",
        r.oppName ?? "",
        r.campaignStatus ?? "",
        r.converted ?? "",
        r.oppStatus ?? "",
        r.createdBy ?? "",
        r.closedBy ?? "",
        r.wip ?? "",
        r.clinic ?? "",
        r.oppCode ?? "",
      ]),
    ];

    const XLSXMod = await import("xlsx");
    const XLSX = XLSXMod.default || XLSXMod;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = headers.map((h, idx) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) =>
          String(
            [
              r.fromDate,
              r.toDate,
              r.createdDate,
              r.leadId,
              r.leadName,
              r.oppName,
              r.campaignStatus,
              r.converted,
              r.oppStatus,
              r.createdBy,
              r.closedBy,
              r.wip,
              r.clinic,
              r.oppCode,
            ][idx] ?? ""
          ).length
        )
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
            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(toISODateOnly(e.target.value))}
            />
          </div>

          <div className="frow">
            <label>To Date</label>
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
              placeholder="None selected"
              multiple={false}
            />
          </div>

          <div className="frow">
            <label>Campaign Rule</label>
            <SearchableDropdown
              options={oppRuleOptions}
              value={oppRuleCodes}
              onChange={setOppRuleCodes}
              placeholder="None selected"
              multiple
              showSelectAll
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
                placeholder="None selected"
                multiple
                showSelectAll
              />
            ) : (
              // ✅ Non-centriq: locked single clinic
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
    <button className="btn" onClick={loadDetailed} disabled={loading}>
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
              <th>From Date</th>
              <th>To Date</th>
              <th>Created Date</th>
              <th>Lead ID</th>
              <th>Lead Name</th>
              <th>Campaign Name</th>
              <th>Campaign Status</th>
              <th>Converted</th>
              <th>Lead Status</th>
              <th>Created By</th>
              <th>Closed By</th>
              <th>WIP</th>
              <th>Clinic</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={13} className="loading">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && !pageRows.length && (
              <tr>
                <td colSpan={13} className="empty">
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
                  <td>{r.toDate}</td>
                  <td>{r.createdDate}</td>
                  <td>{r.leadId}</td>
                  <td>{r.leadName}</td>
                  <td>
                    <button className="link" onClick={() => onClickOpp(r.oppCode)}>
                      {r.oppName}
                    </button>
                  </td>
                  <td>{r.campaignStatus}</td>
                  <td>{r.converted}</td>
                  <td>
                    <button className="link" onClick={() => onClickOpp(r.oppCode)}>
                      {r.oppStatus}
                    </button>
                  </td>
                  <td>{r.createdBy}</td>
                  <td>{r.closedBy}</td>
                  <td>{r.wip}</td>
                  <td>{r.clinic}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="pager">
          <button className="pagebtn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span className="pageno">{page}</span>
          <button
            className="pagebtn"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
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
        input[type="date"] {
          height: 36px; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; outline: none; background: #fff;
        }

        .hint { color: #6b7280; font-size: 12px; margin-top: 2px; }

        .actions { margin-top: 10px; display: flex; gap: 12px; justify-content: flex-end; }
        .btn { background: #112032; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
        .btn[disabled] { opacity: .55; cursor: not-allowed; }

        .table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 10px 0; }
        table.tbl { width: 100%; border-collapse: separate; border-spacing: 0 0; }
        .tbl thead th {
          text-align: left; font-size: 13px; color: #6c7688; font-weight: 700;
          padding: 10px 14px; border-bottom: 1px solid #eef1f6; position: sticky; top: 0; background: #fff; z-index: 1;
        }
        .tbl tbody td { font-size: 14px; color: #1b2636; padding: 12px 14px; border-bottom: 1px solid #f1f4f9; vertical-align: top; line-height: 1.35; }

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
