"use client";

import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { API_BASE_URL } from "../../config";

const PAGE_SIZE = 10;

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

const CaseDetailedReport = () => {
  // ---------- Filters (arrays for multi-select) ----------
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",

    categoryCodes: [],          // [{value, label}]
    subCategoryCodes: [],       // depends on categories
    subSubCategoryCodes: [],    // depends on subcategories (+ categories)

    caseStatuses: [],           // ["Open", ...]
    caseMediums: [],            // text names from API
    caseSources: [],            // codes from API (depends on category + medium)
    caseDispositions: [],       // freeform; using Creatable
    caseSpecificResolutions: [],// from category (names)
    clientThreats: [],          // ["Legal", ...]
    therapists: [],             // doctor codes
  });

  const handleMulti = (field) => (selected) =>
    setFilters((p) => ({ ...p, [field]: selected || [] }));

  const handleDate = (field) => (e) =>
    setFilters((p) => ({ ...p, [field]: e.target.value }));

  // ---------- Raw option stores ----------
  const [categoriesRaw, setCategoriesRaw] = useState([]);
  const [subCatsRaw, setSubCatsRaw] = useState([]);       // merged from selected categories
  const [subSubCatsRaw, setSubSubCatsRaw] = useState([]); // merged from selected subcats(+cats)
  const [mediumsRaw, setMediumsRaw] = useState([]);
  const [sourcesRaw, setSourcesRaw] = useState([]);       // merged from selected categories+mediums
  const [specificResRaw, setSpecificResRaw] = useState([]);// merged from categories
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
    () => ["Open", "WIP", "Closed", "Resolved"].map((s) => ({ value: s, label: s })),
    []
  );
  const clientThreatOptions = useMemo(
    () => ["Legal", "Verbal", "Written", "Physical"].map((s) => ({ value: s, label: s })),
    []
  );

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB"); // dd/MM/yyyy
  };
  const safe = (v) => (v == null ? "" : String(v));

  // ---------- Load fundamentals on mount ----------
  useEffect(() => {
    // Categories
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/CaseCategory/CaseCategory`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const d = await r.json();
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
        const d = await r.json();
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
        const d = await r.json();
        const list = Array.isArray(d) ? d : (d ? [d] : []);
        setTherapistsRaw(
          list
            .filter((doc) => doc?.code && doc?.name && doc.name !== "< - Select one - >")
            .map((doc) => ({ code: doc.code, name: doc.name }))
        );
      } catch (e) {
        console.error("Failed to load therapists", e);
        setTherapistsRaw([]);
      }
    })();
  }, []);

  // ---------- Multi-cascade: Category -> SubCategory + SpecificRes + (maybe) Sources ----------
  useEffect(() => {
    const cats = filters.categoryCodes.map((o) => o.value);
    // Reset dependents when categories change
    setSubCatsRaw([]);
    setSubSubCatsRaw([]);
    setSpecificResRaw([]);
    setSourcesRaw([]);
    setFilters((p) => ({
      ...p,
      subCategoryCodes: [],
      subSubCategoryCodes: [],
      caseSpecificResolutions: [],
      caseSources: [],
    }));
    if (cats.length === 0) return;

    (async () => {
      try {
        // Fetch subcategories for each selected category; merge unique by code
        const subcatArrays = await Promise.all(
          cats.map(async (code) => {
            try {
              const r = await fetch(
                `${API_BASE_URL}/api/CaseCategory/CaseSubCategory?CategoryCode=${encodeURIComponent(
                  code
                )}`,
                { credentials: "include", headers: { "Content-Type": "application/json" } }
              );
              const d = await r.json();
              return Array.isArray(d) ? d : [];
            } catch {
              return [];
            }
          })
        );
        const mergedSub = uniqBy(
          subcatArrays.flat(),
          (x) => x?.subCategoryCode ?? x?.subCategoryName
        );
        setSubCatsRaw(mergedSub);
      } catch (e) {
        console.error("Failed to merge subcategories", e);
        setSubCatsRaw([]);
      }

      try {
        // Specific resolutions per category
        const specArrays = await Promise.all(
          cats.map(async (code) => {
            try {
              const r = await fetch(
                `${API_BASE_URL}/api/CaseDropDown/Medium/SpecificResolution?CategoryCode=${encodeURIComponent(
                  code
                )}`,
                { credentials: "include", headers: { "Content-Type": "application/json" } }
              );
              const d = await r.json();
              const list = Array.isArray(d) ? d : (d ? [d] : []);
              return list.filter((x) => x?.name).map((x) => x.name.trim());
            } catch {
              return [];
            }
          })
        );
        const mergedSpec = Array.from(new Set(specArrays.flat()));
        setSpecificResRaw(mergedSpec);
      } catch (e) {
        console.error("Failed to merge specific resolutions", e);
        setSpecificResRaw([]);
      }

      // If we already have mediums selected, refresh Sources too
      if (filters.caseMediums.length > 0) {
        await refreshSources(cats, filters.caseMediums.map((m) => m.value));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.categoryCodes]);

  // ---------- Multi-cascade: SubCategory -> SubSubCategory ----------
  useEffect(() => {
    const cats = filters.categoryCodes.map((o) => o.value);
    const subs = filters.subCategoryCodes.map((o) => o.value);

    setSubSubCatsRaw([]);
    setFilters((p) => ({ ...p, subSubCategoryCodes: [] }));

    if (cats.length === 0 || subs.length === 0) return;

    (async () => {
      try {
        // For each (category, subCat) combination, fetch subSub; merge unique
        const combos = [];
        for (const c of cats) for (const s of subs) combos.push({ c, s });
        const subsubArrays = await Promise.all(
          combos.map(async ({ c, s }) => {
            try {
              const r = await fetch(
                `${API_BASE_URL}/api/CaseCategory/CaseSubSubCategory?CategoryCode=${encodeURIComponent(
                  c
                )}&SubCategoryCode=${encodeURIComponent(s)}`,
                { credentials: "include", headers: { "Content-Type": "application/json" } }
              );
              const d = await r.json();
              return Array.isArray(d) ? d : [];
            } catch {
              return [];
            }
          })
        );
        const merged = uniqBy(
          subsubArrays.flat(),
          (x) => x?.subCategoryCode ?? x?.subSubCategoryName
        );
        setSubSubCatsRaw(merged);
      } catch (e) {
        console.error("Failed to merge sub-sub categories", e);
        setSubSubCatsRaw([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.subCategoryCodes]);

  // ---------- Multi-cascade: Category + Medium -> Sources ----------
  useEffect(() => {
    const cats = filters.categoryCodes.map((o) => o.value);
    const meds = filters.caseMediums.map((o) => o.value);
    setSourcesRaw([]);
    setFilters((p) => ({ ...p, caseSources: [] }));

    if (cats.length === 0 || meds.length === 0) return;

    refreshSources(cats, meds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.caseMediums]);

  const refreshSources = async (cats, meds) => {
    try {
      const pairs = [];
      for (const c of cats) for (const m of meds) pairs.push({ c, m });
      const arrays = await Promise.all(
        pairs.map(async ({ c, m }) => {
          try {
            const r = await fetch(
              `${API_BASE_URL}/api/CaseDropDown/Medium/Source?CategoryCode=${encodeURIComponent(
                c
              )}&MediumCode=${encodeURIComponent(m)}`,
              { credentials: "include", headers: { "Content-Type": "application/json" } }
            );
            const d = await r.json();
            return Array.isArray(d) ? d : [];
          } catch {
            return [];
          }
        })
      );
      const merged = uniqBy(arrays.flat(), (x) => x?.code ?? x?.name);
      setSourcesRaw(merged);
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
  const mediumOptions = useMemo(
    () =>
      (Array.isArray(mediumsRaw) ? mediumsRaw : []).map((m) => ({
        value: (m.name ?? "").trim(),
        label: (m.name ?? "").trim(),
      })),
    [mediumsRaw]
  );
  const sourceOptions = useMemo(
    () => toOptions(sourcesRaw, "code", "name").map((o) => ({ ...o, label: o.label.trim() })),
    [sourcesRaw]
  );
  const specificResOptions = useMemo(
    () => Array.from(new Set(specificResRaw)).map((n) => ({ value: n, label: n })),
    [specificResRaw]
  );
  const therapistOptions = useMemo(
    () => toOptions(therapistsRaw, "code", "name"),
    [therapistsRaw]
  );

  // ---------- View (POST) ----------
  const handleView = async () => {
    setLoading(true);
    setShowResults(false);
    setReportData([]);
    setCurrentPage(1);

    const hasDates = Boolean(filters.fromDate && filters.toDate);

    const payload = {
      categoryCode: filters.categoryCodes.map((o) => o.value).join(","),
      subCategoryCode: filters.subCategoryCodes.map((o) => o.value).join(","),
      subSubCategoryCode: filters.subSubCategoryCodes.map((o) => o.value).join(","),
      caseStatus: filters.caseStatuses.map((o) => o.value).join(","),
      caseMedium: filters.caseMediums.map((o) => o.value).join(","),
      caseSource: filters.caseSources.map((o) => o.value).join(","),
      caseDisposition: filters.caseDispositions.map((o) => o.value).join(","), // creatable
      caseSpecificResolution: filters.caseSpecificResolutions.map((o) => o.value).join(","),
      clientThreat: filters.clientThreats.map((o) => o.value).join(","),
      therapist: filters.therapists.map((o) => o.value).join(","),
      fromDate: hasDates ? new Date(filters.fromDate).toISOString() : "",
      todate: hasDates ? new Date(filters.toDate).toISOString() : "",
      dateFlag: hasDates ? "1" : "0",
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseDetailedReport`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await res.json();
      const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setReportData(rows);
      setShowResults(true);
    } catch (e) {
      console.error("Failed to load Case Detailed Report", e);
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
      categoryCodes: [],
      subCategoryCodes: [],
      subSubCategoryCodes: [],
      caseStatuses: [],
      caseMediums: [],
      caseSources: [],
      caseDispositions: [],
      caseSpecificResolutions: [],
      clientThreats: [],
      therapists: [],
    });
    setSubCatsRaw([]);
    setSubSubCatsRaw([]);
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
    if (totalPages <= maxBtns) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2)
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
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
            <label>From Date</label>
            <input type="date" value={filters.fromDate} onChange={handleDate("fromDate")} />
          </div>
          <div className="fg">
            <label>To Date</label>
            <input type="date" value={filters.toDate} onChange={handleDate("toDate")} />
          </div>
        </div>

        <div className="filters-grid">
          <div className="fg">
            <label>Category</label>
            <Select
              isMulti
              options={categoryOptions}
              value={filters.categoryCodes}
              onChange={handleMulti("categoryCodes")}
              placeholder="Select category..."
            />
          </div>

          <div className="fg">
            <label>Sub Category</label>
            <Select
              isMulti
              isDisabled={filters.categoryCodes.length === 0}
              options={subCategoryOptions}
              value={filters.subCategoryCodes}
              onChange={handleMulti("subCategoryCodes")}
              placeholder="Select sub category..."
            />
          </div>

          <div className="fg">
            <label>Sub Sub Category</label>
            <Select
              isMulti
              isDisabled={filters.categoryCodes.length === 0 || filters.subCategoryCodes.length === 0}
              options={subSubCategoryOptions}
              value={filters.subSubCategoryCodes}
              onChange={handleMulti("subSubCategoryCodes")}
              placeholder="Select sub sub category..."
            />
          </div>

          <div className="fg">
            <label>Case Medium</label>
            <Select
              isMulti
              options={mediumOptions}
              value={filters.caseMediums}
              onChange={handleMulti("caseMediums")}
              placeholder="Select medium..."
            />
          </div>

          <div className="fg">
            <label>Case Source</label>
            <Select
              isMulti
              isDisabled={
                filters.caseMediums.length === 0 || filters.categoryCodes.length === 0 || sourceOptions.length === 0
              }
              options={sourceOptions}
              value={filters.caseSources}
              onChange={handleMulti("caseSources")}
              placeholder="Select source..."
            />
          </div>

          <div className="fg">
            <label>Case Status</label>
            <Select
              isMulti
              options={statusOptions}
              value={filters.caseStatuses}
              onChange={handleMulti("caseStatuses")}
              placeholder="Select status..."
            />
          </div>

          <div className="fg">
            <label>Case Disposition</label>
            <CreatableSelect
              isMulti
              options={[]} // supply options if/when available
              value={filters.caseDispositions}
              onChange={handleMulti("caseDispositions")}
              placeholder="Type or select disposition..."
            />
          </div>

          <div className="fg">
            <label>Specific Resolution</label>
            <Select
              isMulti
              isDisabled={filters.categoryCodes.length === 0 || specificResOptions.length === 0}
              options={specificResOptions}
              value={filters.caseSpecificResolutions}
              onChange={handleMulti("caseSpecificResolutions")}
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
          <button className="secondary" onClick={handleExport} disabled={!reportData.length}>
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
                    <th>Case No</th>
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
                      <td colSpan={15} style={{ textAlign: "center", padding: 16 }}>
                        No data
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r, i) => (
                      <tr key={(r.caseNo || "") + "-" + (startIndex + i)}>
                        <td>{safe(r.caseNo)}</td>
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
        .breadcrumb { font-size: 14px; margin-bottom: 14px; color: #666; }
        .breadcrumb-link { color: #1e88e5; cursor: default; }
        .filters-card, .results-card {
          background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06);
          padding: 16px; margin-bottom: 16px;
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
        .fg { display: flex; flex-direction: column; }
        label { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        input[type="date"] {
          height: 38px; border: 1px solid #d8dee8; border-radius: 8px; padding: 0 10px; outline: none;
          background: #fff;
        }
        .filter-actions { display: flex; gap: 10px; margin-top: 14px; }
        .filter-actions button {
          border: none; border-radius: 8px; padding: 10px 18px; font-weight: 700; cursor: pointer;
          background: #e2e8f0; color: #0f172a;
        }
        .filter-actions .primary { background: #1d2c43; color: #fff; }
        .filter-actions .secondary { background: #334b71; color: #fff; }

        .results-header { margin-bottom: 10px; color: #334155; }
        .table-wrap { overflow: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          text-align: left; background: #f8fafc; color: #0f172a; font-size: 13px; padding: 10px;
          border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 1;
        }
        tbody td { font-size: 13px; padding: 10px; border-bottom: 1px solid #f1f5f9; }
        .status-pill {
          display: inline-block; padding: 2px 8px; border-radius: 999px; font-weight: 600; font-size: 12px;
          background: #e2e8f0; color: #0f172a;
        }
        .status-pill.open { background: #cce5ff; color: #004085; }
        .status-pill.wip { background: #fff3cd; color: #856404; }
        .status-pill.closed { background: #d4edda; color: #155724; }
        .status-pill.resolved { background: #e9d8fd; color: #553c9a; }

        .pagination-bar {
          margin-top: 12px;
          display: flex; justify-content: center; gap: 6px; flex-wrap: wrap;
        }
        .pagination-bar button {
          min-width: 34px; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid #cbd5e1;
          background: #fff; cursor: pointer; font-weight: 600;
        }
        .pagination-bar button.active {
          background: #1d2c43; color: #fff; border-color: #1d2c43;
        }
        .pagination-bar button:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 760px) {
          .filters-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default CaseDetailedReport;
