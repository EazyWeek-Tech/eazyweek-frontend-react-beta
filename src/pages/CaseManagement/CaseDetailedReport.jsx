"use client";

import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { API_BASE_URL } from "../../config";

const PAGE_SIZE = 10;

// ✅ Static Specific Resolution options (always show)
const SPECIFIC_RESOLUTION_STATIC = [
  "Doctor meet up appointment given",
  "Refund given",
  "Approval in process (refund /complimentary session)",
  "Client not reachable",
  "Client is fine and will continue with our services",
  "Client might come back later",
  "Retained with complimentary session",
  "Refund cancelled and retained",
  "Refunded into prepaid card to be used in different service",
];

// Helpers
const uniqBy = (arr, keyFn) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
};

const toOptions = (items, valueKey, labelKey) =>
  (Array.isArray(items) ? items : [])
    .filter((x) => x && (x[valueKey] || x[labelKey]))
    .map((x) => ({
      value: String(x[valueKey] ?? x[labelKey]),
      label: String(x[labelKey] ?? x[valueKey]),
      __raw: x,
    }));

// Unwrap a { success, message, data:[...] } envelope into a plain array.
// Handles bare arrays, { data:[...] }, a single { data:{...} } object, and a
// lone record object.
const toArray = (raw) =>
  Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : raw?.data && typeof raw.data === "object"
    ? [raw.data]
    : raw && typeof raw === "object" && !("data" in raw) && !("success" in raw)
    ? [raw]
    : [];

// ---- Session helpers ----
const tryParseJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// Adjust these keys based on what your app stores
const getSessionObj = () => {
  const keysToTry = ["session", "userSession", "sessionData", "loginSession"];
  for (const k of keysToTry) {
    const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
    if (!raw) continue;
    const obj = tryParseJson(raw);
    if (obj && typeof obj === "object") return obj;
  }
  return null;
};

const getLoggedInClinicCode = () => {
  const s = getSessionObj();
  return s?.clinicCode || s?.centerCode || s?.loginCode || s?.topCode || "";
};

const CaseDetailedReport = () => {
  // ---------- Filters ----------
  // Single-select: Category, SubCategory, SubSubCategory, SubSubSubCategory, Medium, Source, Status, Resolution
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",

    categoryCode: null,
    subCategoryCode: null,
    subSubCategoryCode: null,
    subSubSubCategoryCode: null,

    caseStatus: null,
    caseMedium: null,
    caseSource: null,

    caseDispositions: [], // keep multi (creatable)
    caseSpecificResolution: null, // single

    clientThreats: [], // keep multi
    therapists: [], // keep multi
  });

  const handleMulti = (field) => (selected) =>
    setFilters((p) => ({
      ...p,
      [field]: Array.isArray(selected) ? selected : selected ? [selected] : [],
    }));

  const handleSingle = (field) => (selected) =>
    setFilters((p) => ({ ...p, [field]: selected || null }));

  const handleDate = (field) => (e) =>
    setFilters((p) => ({ ...p, [field]: e.target.value }));

  // ---------- Raw option stores ----------
  const [categoriesRaw, setCategoriesRaw] = useState([]);
  const [subCatsRaw, setSubCatsRaw] = useState([]);
  const [subSubCatsRaw, setSubSubCatsRaw] = useState([]);
  const [subSubSubCatsRaw, setSubSubSubCatsRaw] = useState([]); // if you add API later
  const [mediumsRaw, setMediumsRaw] = useState([]);
  const [sourcesRaw, setSourcesRaw] = useState([]);
  const [specificResRaw, setSpecificResRaw] = useState([]);
  const [therapistsRaw, setTherapistsRaw] = useState([]);

  // ---------- Data / UI ----------
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(reportData.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, reportData.length);
  const pageRows = reportData.slice(startIndex, endIndex);

  // ---------- Static options ----------
  const statusOptions = useMemo(
    () => ["Open", "WIP", "Closed"].map((s) => ({ value: s, label: s })),
    []
  );
  const clientThreatOptions = useMemo(
    () =>
      ["Legal", "Verbal", "Written", "Physical", "NA"].map((s) => ({
        value: s,
        label: s,
      })),
    []
  );

  const dispositionOptions = useMemo(
    () =>
      ["No Solution", "Resolved", "Unresolved"].map((d) => ({
        value: d,
        label: d,
      })),
    []
  );

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB"); // dd/MM/yyyy
  };
  const safe = (v) => (v == null ? "" : String(v));

  // ---- date formatting for payload ----
  const pad2 = (n) => String(n).padStart(2, "0");
  const formatDDMMYYYY_Dash = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt)) return "";
    return `${pad2(dt.getDate())}-${pad2(dt.getMonth() + 1)}-${dt.getFullYear()}`;
  };
  const todayDDMMYYYY = () => formatDDMMYYYY_Dash(new Date());

  // ---------- Load fundamentals on mount ----------
  useEffect(() => {
    // Categories
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/CaseCategory/CaseCategory`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const d = toArray(await r.json());
        setCategoriesRaw(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error("Failed to load categories", e);
        setCategoriesRaw([]);
      }
    })();

    // Mediums
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/CaseDropDown/Medium`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const d = toArray(await r.json());
        const clean = (Array.isArray(d) ? d : []).filter(
          (m) => m.code !== "< - Select one - >"
        );
        setMediumsRaw(clean);
      } catch (e) {
        console.error("Failed to load mediums", e);
        setMediumsRaw([]);
      }
    })();

    // Therapists
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/CaseDropDown/Medium/Doctors`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const d = toArray(await r.json());
        const list = d;
        setTherapistsRaw(
          list
            .filter(
              (doc) =>
                doc?.code && doc?.name && doc.name !== "< - Select one - >"
            )
            .map((doc) => ({ code: doc.code, name: doc.name }))
        );
      } catch (e) {
        console.error("Failed to load therapists", e);
        setTherapistsRaw([]);
      }
    })();
  }, []);

  // ---------- Single-cascade: Category -> SubCategory + SpecificRes + reset others ----------
  useEffect(() => {
    const cat = filters.categoryCode?.value || "";

    // Reset dependents when category changes
    setSubCatsRaw([]);
    setSubSubCatsRaw([]);
    setSubSubSubCatsRaw([]);
    setSpecificResRaw([]);
    setSourcesRaw([]);

    setFilters((p) => ({
      ...p,
      subCategoryCode: null,
      subSubCategoryCode: null,
      subSubSubCategoryCode: null,
      caseSpecificResolution: null,
      caseSource: null,
    }));

    if (!cat) return;

    (async () => {
      // Subcategories
      try {
        const r = await fetch(
          `${API_BASE_URL}/api/CaseCategory/CaseSubCategory?CategoryCode=${encodeURIComponent(
            cat
          )}`,
          {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const d = toArray(await r.json());
        setSubCatsRaw(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error("Failed to load subcategories", e);
        setSubCatsRaw([]);
      }

      // Specific resolutions
      try {
        const r = await fetch(
          `${API_BASE_URL}/api/CaseDropDown/Medium/SpecificResolution?CategoryCode=${encodeURIComponent(
            cat
          )}`,
          {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const d = toArray(await r.json());
        const list = d;
        const mergedSpec = Array.from(
          new Set(list.filter((x) => x?.name).map((x) => x.name.trim()))
        );
        setSpecificResRaw(mergedSpec);
      } catch (e) {
        console.error("Failed to load specific resolutions", e);
        setSpecificResRaw([]);
      }

      // If medium already selected, refresh sources
      if (filters.caseMedium?.value) {
        await refreshSources(cat, filters.caseMedium.value);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.categoryCode]);

  // ---------- Single-cascade: SubCategory -> SubSubCategory ----------
  useEffect(() => {
    const cat = filters.categoryCode?.value || "";
    const sub = filters.subCategoryCode?.value || "";

    setSubSubCatsRaw([]);
    setSubSubSubCatsRaw([]);

    setFilters((p) => ({
      ...p,
      subSubCategoryCode: null,
      subSubSubCategoryCode: null,
    }));

    if (!cat || !sub) return;

    (async () => {
      try {
        const r = await fetch(
          `${API_BASE_URL}/api/CaseCategory/CaseSubSubCategory?CategoryCode=${encodeURIComponent(
            cat
          )}&SubCategoryCode=${encodeURIComponent(sub)}`,
          {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const d = toArray(await r.json());
        setSubSubCatsRaw(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error("Failed to load sub-sub categories", e);
        setSubSubCatsRaw([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.subCategoryCode]);

  // ---------- Single-cascade: Category + Medium -> Sources ----------
  useEffect(() => {
    const cat = filters.categoryCode?.value || "";
    const med = filters.caseMedium?.value || "";

    setSourcesRaw([]);
    setFilters((p) => ({ ...p, caseSource: null }));

    if (!cat || !med) return;

    refreshSources(cat, med);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.caseMedium]);

  const refreshSources = async (cat, med) => {
    try {
      const r = await fetch(
        `${API_BASE_URL}/api/CaseDropDown/Medium/Source?CategoryCode=${encodeURIComponent(
          cat
        )}&MediumCode=${encodeURIComponent(med)}`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const d = toArray(await r.json());
      setSourcesRaw(Array.isArray(d) ? d : []);
    } catch (e) {
      console.error("Failed to load sources", e);
      setSourcesRaw([]);
    }
  };

  // ---------- Options (react-select) ----------
  const categoryOptions = useMemo(
    () => toOptions(categoriesRaw, "categoryCode", "categoryName"),
    [categoriesRaw]
  );
  const subCategoryOptions = useMemo(
    () => toOptions(subCatsRaw, "subCategoryCode", "subCategoryName"),
    [subCatsRaw]
  );
  const subSubCategoryOptions = useMemo(
    () => toOptions(subSubCatsRaw, "subCategoryCode", "subSubCategoryName"),
    [subSubCatsRaw]
  );
  const subSubSubCategoryOptions = useMemo(
    () =>
      toOptions(subSubSubCatsRaw, "subCategoryCode", "subSubSubCategoryName"),
    [subSubSubCatsRaw]
  );

  const mediumOptions = useMemo(
    () =>
      (Array.isArray(mediumsRaw) ? mediumsRaw : []).map((m) => ({
        value: (m.name ?? "").trim(),
        label: (m.name ?? "").trim(),
      })),
    [mediumsRaw]
  );

  const sourceOptions = useMemo(
    () =>
      toOptions(sourcesRaw, "code", "name").map((o) => ({
        ...o,
        label: (o.label || "").trim(),
      })),
    [sourcesRaw]
  );

  // ✅ UPDATED: merge static + API specific resolutions (dedupe case-insensitive)
  const specificResOptions = useMemo(() => {
    const apiList = Array.isArray(specificResRaw) ? specificResRaw : [];
    const merged = [...SPECIFIC_RESOLUTION_STATIC, ...apiList]
      .map((x) => (x ?? "").toString().trim())
      .filter(Boolean);

    const out = [];
    const seen = new Set();
    for (const item of merged) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: item, label: item });
    }
    return out;
  }, [specificResRaw]);

  // AFTER — preserve raw code exactly as-is, no String() coercion
const therapistOptions = useMemo(
  () =>
    (Array.isArray(therapistsRaw) ? therapistsRaw : [])
      .filter((doc) => doc?.code && doc?.name)
      .map((doc) => ({
        value: doc.code,   // ← raw value, no String() wrapping
        label: doc.name,
      })),
  [therapistsRaw]
);

  // ---------- View (POST) ----------
  const handleView = async () => {

     if (!filters.fromDate || !filters.toDate) {
    alert("Please select both From Date and To Date.");
    return;
  }

  if (new Date(filters.toDate) < new Date(filters.fromDate)) {
    alert("To Date cannot be earlier than From Date.");
    return;
  }

    setLoading(true);
    setShowResults(false);
    setReportData([]);
    setCurrentPage(1);

    try {
    const clinicCode = getLoggedInClinicCode();

    // rule:
    // if user didn't select -> send defaults, keep UI empty
    const hasDates = Boolean(filters.fromDate && filters.toDate);

    const fromDateToSend = hasDates
      ? new Date(filters.fromDate).toISOString()
      : new Date("1900-01-01T00:00:00.000Z").toISOString();

    const toDateToSend = hasDates
      ? new Date(filters.toDate).toISOString()
      : new Date().toISOString();

    const payload = {
      // if backend needs clinic filtering, add it here
      clinicCode: clinicCode,
      centerCode: clinicCode,

      categoryCode: filters.categoryCode?.value || "",
      subCategoryCode: filters.subCategoryCode?.value || "",
      subSubCategoryCode: filters.subSubCategoryCode?.value || "",
      subSubSubCategoryCode: filters.subSubSubCategoryCode?.value || "",

      caseStatus: filters.caseStatus?.value || "",
      caseMedium: filters.caseMedium?.value || "",
      caseSource: filters.caseSource?.value || "",

      caseDisposition: (Array.isArray(filters.caseDispositions) ? filters.caseDispositions : []).map((o) => o.value).join(","), // creatable multi
      caseSpecificResolution: filters.caseSpecificResolution?.value || "",

      clientThreat: (Array.isArray(filters.clientThreats) ? filters.clientThreats : []).map((o) => o.value).join(","), // multi
      therapist: (Array.isArray(filters.therapists) ? filters.therapists : []).map((o) => o.value).join(","), // multi

      fromDate: fromDateToSend,
      todate: toDateToSend,
      dateFlag: hasDates ? "1" : "0",
    };

      const res = await fetch(
        `${API_BASE_URL}/api/CaseOperation/CaseDetailedReport`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();

      // normalize response so table always receives an array
      const rows = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object"
        ? [raw]
        : [];

      // support wrapped responses { data: [...] } or { result: [...] }
      const normalizedRows = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.result)
        ? raw.result
        : rows;

      // Remove message-only objects if backend returns { message: "Success" } without row keys
      const cleanRows = normalizedRows.filter((x) => x && x.caseNo);

      // Optional UI fallback filtering by clinic if rows include clinicCode/centerCode/loginCode
      const filteredRows = clinicCode
        ? cleanRows.filter((x) => {
            const rowClinic = String(
              x?.clinicCode || x?.centerCode || x?.loginCode || ""
            ).toLowerCase();
            return rowClinic
              ? rowClinic === String(clinicCode).toLowerCase()
              : true;
          })
        : cleanRows;

      setReportData(filteredRows);
      setShowResults(true);
    } catch (e) {
      console.error("Failed to load Case Detailed Report", e);
      alert("Failed to load report. " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // ---------- Export (all rows) ----------
  const handleExport = () => {
    if (!reportData.length) {
      alert("No data to export.");
      return;
    }
    const headers = [
      "Case No",
      "Created Date",
      "Owner",
      "Assigned To",
      "Category",
      "Sub Category",
      "Sub Sub Category",
      "Sub Sub Sub Category",
      "Case Medium",
      "Case Source",
      "Case Disposition",
      "Case Status",
      "Specific Resolution",
      "Client Threat",
      "Therapist",
    ];
    const lines = reportData.map((r) =>
      [
        safe(r.caseNo),
        fmtDate(r.createdDate),
        safe(r.owners),
        safe(r.assignedto),
        safe(r.categoryName),
        safe(r.subCategoryName),
        safe(r.subSubCategoryName),
        safe(r.subSubSubCategoryName),
        safe(r.caseMedium),
        safe(r.caseSource),
        safe(r.caseDisposition),
        safe(r.caseStatus),
        safe(r.categorySpecificResolution),
        safe(r.clientThreat),
        safe(r.therapist),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case_detailed_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Clear ----------
  const handleClear = () => {
    setFilters({
      fromDate: "",
      toDate: "",

      categoryCode: null,
      subCategoryCode: null,
      subSubCategoryCode: null,
      subSubSubCategoryCode: null,

      caseStatus: null,
      caseMedium: null,
      caseSource: null,

      caseDispositions: [],
      caseSpecificResolution: null,

      clientThreats: [],
      therapists: [],
    });

    setSubCatsRaw([]);
    setSubSubCatsRaw([]);
    setSubSubSubCatsRaw([]);
    setSourcesRaw([]);
    setSpecificResRaw([]);
    setReportData([]);
    setShowResults(false);
    setCurrentPage(1);
  };

  // Pagination controls
  const goFirst = () => setCurrentPage(1);
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setCurrentPage(totalPages);

  // Render up to 5 numbered buttons around current page
  const pageNumbers = useMemo(() => {
    const maxBtns = 5;
    if (totalPages <= maxBtns)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2)
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];
  }, [currentPage, totalPages]);

  return (
    <div className="case-detailed-report">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link">Case Dashboard</span>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Case Detailed Report</span>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="date-grid">
          <div className="fg">
            <label>From Date <span className="req">*</span></label>
           <input
  type="date"
  required
  value={filters.fromDate}
  onChange={handleDate("fromDate")}
/>

          </div>
          <div className="fg">
            <label>To Date <span className="req">*</span></label>
            
<input
  type="date"
  required
  min={filters.fromDate || undefined} // prevents To < From
  value={filters.toDate}
  onChange={handleDate("toDate")}
/>
          </div>
        </div>

        <div className="filters-grid">
          <div className="fg">
            <label>Category</label>
            <Select
            isClearable
              options={categoryOptions}
              value={filters.categoryCode}
              onChange={handleSingle("categoryCode")}
              placeholder="Select category..."
            />
          </div>

          <div className="fg">
            <label>Sub Category</label>
            <Select
            isClearable
              isDisabled={!filters.categoryCode}
              options={subCategoryOptions}
              value={filters.subCategoryCode}
              onChange={handleSingle("subCategoryCode")}
              placeholder="Select sub category..."
            />
          </div>

          <div className="fg">
            <label>Sub Sub Category</label>
            <Select
            isClearable
              isDisabled={!filters.categoryCode || !filters.subCategoryCode}
              options={subSubCategoryOptions}
              value={filters.subSubCategoryCode}
              onChange={handleSingle("subSubCategoryCode")}
              placeholder="Select sub sub category..."
            />
          </div>

          {/* If/when you add a Sub Sub Sub Category dropdown from API, enable this */}
          {/* <div className="fg">
            <label>Sub Sub Sub Category</label>
            <Select
              isDisabled={!filters.subSubCategoryCode}
              options={subSubSubCategoryOptions}
              value={filters.subSubSubCategoryCode}
              onChange={handleSingle("subSubSubCategoryCode")}
              placeholder="Select sub sub sub category..."
            />
          </div> */}

          <div className="fg">
            <label>Case Medium</label>
            <Select
            isClearable
              options={mediumOptions}
              value={filters.caseMedium}
              onChange={handleSingle("caseMedium")}
              placeholder="Select medium..."
            />
          </div>

          <div className="fg">
            <label>Case Source</label>
            <Select
            isClearable
              isDisabled={
                !filters.caseMedium ||
                !filters.categoryCode ||
                sourceOptions.length === 0
              }
              options={sourceOptions}
              value={filters.caseSource}
              onChange={handleSingle("caseSource")}
              placeholder="Select source..."
            />
          </div>

          <div className="fg">
            <label>Case Status</label>
            <Select
            isClearable
              options={statusOptions}
              value={filters.caseStatus}
              onChange={handleSingle("caseStatus")}
              placeholder="Select status..."
            />
          </div>

          <div className="fg">
            <label>Case Disposition</label>
            <CreatableSelect
              isMulti
              options={dispositionOptions}
              value={filters.caseDispositions}
              onChange={handleMulti("caseDispositions")}
              placeholder="Select or type disposition..."
              isClearable
            />
          </div>

          <div className="fg">
            <label>Specific Resolution</label>
            <Select
            isClearable
              isDisabled={!filters.categoryCode || specificResOptions.length === 0}
              options={specificResOptions}
              value={filters.caseSpecificResolution}
              onChange={handleSingle("caseSpecificResolution")}
              placeholder="Select specific resolution..."
            />
          </div>

          <div className="fg">
            <label>Client Threat</label>
            <Select
              isMulti
              options={clientThreatOptions}
              value={filters.clientThreats}
              onChange={handleMulti("clientThreats")}
              placeholder="Select client threat..."
            />
          </div>

          <div className="fg">
            <label>Therapist</label>
            <Select
              isMulti
              options={therapistOptions}
              value={filters.therapists}
              onChange={handleMulti("therapists")}
              placeholder="Select therapist..."
            />
          </div>
        </div>

        <div className="filter-actions">
          <button className="primary" onClick={handleView} disabled={loading}>
            {loading ? "Loading..." : "View"}
          </button>
          <button
            className="secondary"
            onClick={handleExport}
            disabled={!reportData.length}
          >
            Export
          </button>
          <button onClick={handleClear}>Clear</button>
        </div>
      </div>

      {/* Results */}
      <div className="results-card">
        <div className="results-header">
          <strong>Total Records:</strong> {reportData.length}
          {showResults && reportData.length > 0 && (
            <span style={{ marginLeft: 10 }}>
              | Showing {reportData.length ? startIndex + 1 : 0}–{endIndex}
            </span>
          )}
        </div>

        {showResults && (
          <>
            <div className="table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    {/* FIRST COLUMN STICKY */}
                    <th className="sticky-col">Case No</th>
                    <th>Created Date</th>
                    <th>Owner</th>
                    <th>Assigned To</th>
                    <th>Category</th>
                    <th>Sub Category</th>
                    <th>Sub Sub Category</th>
                    <th>Sub Sub Sub Category</th>
                    <th>Case Medium</th>
                    <th>Case Source</th>
                    <th>Case Disposition</th>
                    <th>Case Status</th>
                    <th>Specific Resolution</th>
                    <th>Client Threat</th>
                    <th>Therapist</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={15}
                        style={{ textAlign: "center", padding: 16 }}
                      >
                        No data
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r, i) => (
                      <tr key={(r.caseNo || "") + "-" + (startIndex + i)}>
                        {/* FIRST COLUMN STICKY */}
                        <td className="sticky-col">{safe(r.caseNo)}</td>
                        <td>{fmtDate(r.createdDate)}</td>
                        <td>{safe(r.owners)}</td>
                        <td>{safe(r.assignedto)}</td>
                        <td>{safe(r.categoryName)}</td>
                        <td>{safe(r.subCategoryName)}</td>
                        <td>{safe(r.subSubCategoryName)}</td>
                        <td>{safe(r.subSubSubCategoryName)}</td>
                        <td>{safe(r.caseMedium)}</td>
                        <td>{safe(r.caseSource)}</td>
                        <td>{safe(r.caseDisposition)}</td>
                        <td>
                          <span
                            className={`status-pill ${safe(r.caseStatus)
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {safe(r.caseStatus)}
                          </span>
                        </td>
                        <td>{safe(r.categorySpecificResolution)}</td>
                        <td>{safe(r.clientThreat)}</td>
                        <td>{safe(r.therapist)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {reportData.length > PAGE_SIZE && (
              <div className="pagination-bar">
                <button onClick={goFirst} disabled={currentPage === 1}>
                  «
                </button>
                <button onClick={goPrev} disabled={currentPage === 1}>
                  ‹
                </button>

                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    className={n === currentPage ? "active" : ""}
                    onClick={() => setCurrentPage(n)}
                  >
                    {n}
                  </button>
                ))}

                <button onClick={goNext} disabled={currentPage === totalPages}>
                  ›
                </button>
                <button onClick={goLast} disabled={currentPage === totalPages}>
                  »
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Styles (scoped) */}
      <style jsx>{`
        .breadcrumb {
          font-size: 14px;
          margin-bottom: 14px;
          color: #666;
        }
        .breadcrumb-link {
          color: var(--secft-color);
          cursor: default;
        }
        .filters-card,
        .results-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          padding: 16px;
          margin-bottom: 16px;
        }
        .date-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px 16px;
          margin-bottom: 10px;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px 16px;
          align-items: end;
        }
        .fg {
          display: flex;
          flex-direction: column;
        }
        label {
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }
        .req { color: #dc2626; font-weight: 700; }
        input[type="date"] {
          height: 38px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          padding: 0 10px;
          outline: none;
          background: #fff;
        }
        .filter-actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }
        .filter-actions button {
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-weight: 700;
          cursor: pointer;
          background: #e2e8f0;
          color: #0f172a;
        }
        .filter-actions .primary {
          background: #1d2c43;
          color: #fff;
        }
        .filter-actions .secondary {
          background: #334b71;
          color: #fff;
        }

        .results-header {
          margin-bottom: 10px;
          color: #334155;
        }

        /* Scrollable container */
        .table-wrap {
          overflow: auto;
          position: relative;
        }

        /* Table + sticky header */
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        thead th {
          text-align: left;
          background: #f8fafc;
          color: #0f172a;
          font-size: 13px;
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 0;
        }
        tbody td {
          font-size: 13px;
          padding: 10px;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
        }

        /* Freeze FIRST column (header + body) */
        .report-table .sticky-col {
          position: sticky;
          left: 0;
          background: #fff;
          min-width: 200px;
          box-shadow: 2px 2px 10px rgb(152, 156, 166);
        }

        .report-table thead .sticky-col {
          background: #f9fafb;
        }

        .report-table td {
          white-space: nowrap;
          padding: 12px;
        }

        .status-pill {
          display: inline-block;
          padding: 6px 8px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          background: #e2e8f0;
          color: #0f172a;
        }
        .status-pill.open {
          background: rgba(238, 106, 106, 0.1);
          color: rgba(238, 106, 106, 1);
        }
        .status-pill.wip {
          background: rgba(84, 92, 87, 0.1);
          color: rgba(84, 92, 87, 1);
        }
        .status-pill.closed {
          background: rgba(38, 200, 106, 0.1);
          color: rgba(38, 200, 106, 1);
        }
        .status-pill.resolved {
          background: #e9d8fd;
          color: #553c9a;
        }

        .pagination-bar {
          margin-top: 12px;
          display: flex;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .pagination-bar button {
          min-width: 34px;
          height: 34px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #fff;
          cursor: pointer;
          font-weight: 600;
        }
        .pagination-bar button.active {
          background: #1d2c43;
          color: #fff;
          border-color: #1d2c43;
        }
        .pagination-bar button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CaseDetailedReport;