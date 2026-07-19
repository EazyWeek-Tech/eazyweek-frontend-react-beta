"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import ServiceForm from "./ServiceForm";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import { makeRequireAccess } from "../Settings/masterAccess";

const TOKEN = () => localStorage.getItem("token");

// ── Field accessors (tolerate both camelCase API shape and legacy UPPER shape) ──
const getCode        = (r) => r.serviceCode     || r.SERVICECODE     || "";
const getName        = (r) => r.serviceName     || r.SERVICENAME     || "";
const getCategory    = (r) => r.categoryName    || r.CCODE           || "";
const getSubCategory = (r) => r.subCategoryName  || r.CSCODE          || "";
const getQuickCart   = (r) => r.addToQuickCart  || r.ADDTOQUICKCART  || "No";
const getStatus      = (r) => r.status || r.serviceStatus || r.SERVICESTATUS || "";

// Column config — mirrors PackageMaster's sortable header pattern
const COLUMNS = [
  { label: "Service Code", field: "code",        get: getCode,        kind: "code" },
  { label: "Service Name", field: "name",        get: getName },
  { label: "Category",     field: "category",    get: getCategory,    muted: true },
  { label: "Sub-Category", field: "subcategory", get: getSubCategory, muted: true },
  { label: "Quick Cart",   field: "quickcart",   get: getQuickCart,   kind: "quickcart" },
  { label: "Status",       field: "status",      get: getStatus,      kind: "status" },
  { label: "Actions",      field: null },
];

const ServiceMaster = () => {

  const { has, guard, notifyDenied } = usePermissions();
  const requireAccess = makeRequireAccess({ has, guard, notifyDenied });

  const [serviceData, setServiceData]                   = useState([]);
  const [searchTerm, setSearchTerm]                     = useState("");
  const [entriesPerPage, setEntriesPerPage]             = useState(10);
  const [currentPage, setCurrentPage]                   = useState(1);
  const [loading, setLoading]                           = useState(true);
  const [serviceStatus, setServiceStatus]               = useState("");
  const [showForm, setShowForm]                         = useState(false);
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState(null);
  const [formMode, setFormMode]                         = useState("create");
  const [detailsLoading, setDetailsLoading]             = useState(false);
  const [sortField, setSortField]                       = useState(null);
  const [sortDir, setSortDir]                           = useState("asc");

  const fetchServiceData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Master/LoadService`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      if (!response.ok) throw new Error("Failed to fetch services");
      const json = await response.json();
      const data = json.data || json;
      // Sort: most recently updated/created first
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const ta = a.updatedAt || a.createdAt || a.MODIFIEDDATE || a.CREATEDDATE || "";
        const tb = b.updatedAt || b.createdAt || b.MODIFIEDDATE || b.CREATEDDATE || "";
        if (ta && tb) return new Date(tb) - new Date(ta);
        // Fallback: put newly-seen codes at top by RECID descending
        return (b.recID || b.RECID || 0) - (a.recID || a.RECID || 0);
      });
      setServiceData(list);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServiceData(); }, [fetchServiceData]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return serviceData.filter((s) => {
      const name        = (s.serviceName  || s.SERVICENAME  || "").toLowerCase();
      const code        = (s.serviceCode  || s.SERVICECODE  || "").toLowerCase();
      const category    = (s.categoryName || s.CCODE        || "").toLowerCase();
      const subCategory = (s.subCategoryName || s.CSCODE    || "").toLowerCase();
      const status      = (s.status || s.serviceStatus || s.SERVICESTATUS || "").toLowerCase();
      const matchesTerm = !term || name.includes(term) || code.includes(term) || category.includes(term) || subCategory.includes(term);
      const matchesStatus = !serviceStatus || status === serviceStatus.toLowerCase();
      return matchesTerm && matchesStatus;
    });
  }, [serviceData, searchTerm, serviceStatus]);

  // Column sort layered on top of the default recency sort from fetch
  const sortedServices = useMemo(() => {
    if (!sortField) return filteredServices;
    const col = COLUMNS.find((c) => c.field === sortField);
    if (!col?.get) return filteredServices;
    const arr = [...filteredServices];
    arr.sort((a, b) => {
      const va = String(col.get(a) ?? "").toLowerCase();
      const vb = String(col.get(b) ?? "").toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredServices, sortField, sortDir]);

  // Reset to first page whenever the visible set changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, serviceStatus, entriesPerPage, sortField, sortDir]);

  const totalPages    = Math.max(1, Math.ceil(sortedServices.length / entriesPerPage));
  const safePage      = Math.min(currentPage, totalPages);
  const pagedServices = sortedServices.slice((safePage - 1) * entriesPerPage, safePage * entriesPerPage);

  const toggleSort = (field) => {
    if (!field) return;
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleCreateNew = () => {
    setSelectedServiceForEdit(null);
    setFormMode("create");
    setShowForm(true);
  };

  const normalizeDetails = (d) => {
    if (!d || typeof d !== "object") return null;
    const toYesNo = (v) => {
      const s = String(v ?? "").trim().toLowerCase();
      return ["1","y","yes","true"].includes(s) ? "Yes" : "No";
    };
    const toBool = (v) => {
      const s = String(v ?? "").trim().toLowerCase();
      return ["1","y","yes","true"].includes(s);
    };

    // Node returns already-shaped data from our controller
    const pricingData = Array.isArray(d.pricingJson)
      ? d.pricingJson.map((p) => ({
          centerCode:   p.centerCode  || "",
          centerName:   p.centerName  || "",
          price:        String(p.price || "0"),
          taxIncluded:  toYesNo(p.taxIncluded),
          taxPercent:   String(p.taxPercent || "0"),
          storeRelease: toBool(p.storeRelease),
          memberPrice:    p.memberPrice    != null ? String(p.memberPrice)    : "",
          memberDiscount: p.memberDiscount != null ? String(p.memberDiscount) : "",
        }))
      : [];

    const bomItems = Array.isArray(d.consumablesJson)
      ? d.consumablesJson.filter(Boolean).map((b, i) => ({
          id:       i + 1,
          code:     b.code || "",
          name:     b.name || "",
          qty:      String(b.qty || "1.00"),
          uom:      b.uom  || "",
          selected: false,
        }))
      : [];

    const doctorMappings = Array.isArray(d.doctorsJson)
      ? d.doctorsJson.filter(Boolean).map((m, i) => ({
          id:          i + 1,
          doctorCode:  m.doctorCode  || "",
          doctorName:  m.doctorName  || "",
          clinicCode:  m.clinicCode  || "",
          clinicName:  m.clinicName  || "",
          selected:    false,
        }))
      : [];

    const nurseMappings = Array.isArray(d.nursesJson)
      ? d.nursesJson.filter(Boolean).map((m, i) => ({
          id:         i + 1,
          nurseCode:  m.nurseCode || "",
          nurseName:  m.nurseName || "",
          clinicCode: m.clinicCode || "",
          clinicName: m.clinicName || "",
          selected:   false,
        }))
      : [];

    return {
      code:             d.serviceCode             || "",
      name:             d.serviceName             || "",
      arabicName:       d.arabicServiceName       || "",
      description:      d.serviceDescription      || "",
      category:         d.serviceCategoryCode     || "",
      subcategory:      d.serviceSubCategoryCode  || "",
      subSubcategory:   d.serviceSubSubCategoryCode || "",
      time:             d.serviceTime             || " ",
      allowIdealBOM:        toYesNo(d.allowIdealBOMConsumption),
      allowBOMIntervention: toYesNo(d.allowBOMConsumptionWithIntervention),
      allowLoyaltyAccrual:  toYesNo(d.allowLoyalityAccrual),
      allowLoyaltyRedemption: toYesNo(d.allowLoyalityRedemption),
      additionalField1: d.additionalField1 || "",
      additionalField2: d.additionalField2 || "",
      additionalField3: d.additionalField3 || "",
      additionalField4: d.additionalField4 || "",
      additionalField5: d.additionalField5 || "",
      status:           d.status || "Active",
      pricingData,
      bomItems,
      doctorMappings,
      nurseMappings,
      formsData: {
        stageForFormCompletion: d.stageForFormCompletionCode || "form-not-required",
        blockFromProceeding:    d.blockFromProceedingListIfFormNotFilled || "Yes",
        form:                   d.form || "",
      },
      miscellaneousData: {
        optionalField1: d.optionalField1 || "",
        optionalField2: d.optionalField2 || "",
        optionalField3: d.optionalField3 || "",
        optionalField4: d.optionalField4 || "",
        optionalField5: d.optionalField5 || "",
      },
    };
  };

  const handleEdit = async (row) => {
    try {
      setDetailsLoading(true);
      const serviceCode = row.serviceCode || row.SERVICECODE || "";
      const recId       = row.recID       || row.RECID       || 0;
      const url         = `${API_BASE_URL}/api/Master/FetchServiceDetails/${encodeURIComponent(serviceCode)}/${encodeURIComponent(recId)}`;
      const res = await fetch(url, {
        method:  "POST",
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json    = await res.json();
      const details = json.data || json;
      setSelectedServiceForEdit(normalizeDetails(details) ?? { code: serviceCode, name: row.serviceName || row.SERVICENAME || "", status: "Active" });
      setFormMode("edit");
      setShowForm(true);
    } catch (e) {
      console.error(e);
      setSelectedServiceForEdit({ code: row.serviceCode || row.SERVICECODE || "", name: row.serviceName || row.SERVICENAME || "", status: "Active" });
      setFormMode("edit");
      setShowForm(true);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBackFromForm = (shouldRefresh = false) => {
    setShowForm(false);
    setSelectedServiceForEdit(null);
    if (shouldRefresh) {
      // Small delay so the DB write completes before we re-fetch
      setTimeout(() => fetchServiceData(), 400);
    }
  };

  // ── Cell renderers (match PackageMaster pill styling) ────────────────────────
  const quickCartBadge = (val) => {
    const isYes = ["yes","1","true"].includes(String(val ?? "").toLowerCase());
    return (
      <span style={{ background: isYes ? "#e6f4ef" : "#f1f5f9", color: isYes ? "#2e7d5e" : "#94a3b8",
        borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
        {isYes ? "Yes" : "No"}
      </span>
    );
  };

  const statusBadge = (s) => {
    const norm = String(s ?? "").trim().toLowerCase() || "active";
    const cfg  = norm === "active"
      ? { bg: "#e6f4ef", color: "#2e7d5e" }
      : { bg: "#f1f5f9", color: "#475569" };
    const disp = norm.charAt(0).toUpperCase() + norm.slice(1);
    return (
      <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
        {disp}
      </span>
    );
  };

  if (showForm) {
    return <ServiceForm service={selectedServiceForEdit} onBack={handleBackFromForm} mode={formMode} />;
  }

  // ── List View (themed to match PackageMaster) ────────────────────────────────
  return (
    <div style={{ padding: 10, fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#0f172a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>Service Master</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => fetchServiceData()}
            style={{ height: 40, padding: "0 16px", background: "#fff", color: "#334b71", border: "1.5px solid #e2e8f0",
              borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ↻ Refresh
          </button>
          <button onClick={() => requireAccess("MDM.SERVICES_CREATE", handleCreateNew)}
            style={{ height: 40, padding: "0 20px", background: "#334b71", color: "#fff", border: "none",
              borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + Create New Service
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by code, name or category…"
          style={{ flex: 1, height: 40, padding: "0 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13 }} />
        <select value={serviceStatus} onChange={(e) => setServiceStatus(e.target.value)}
          style={{ height: 40, padding: "0 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, background: "#fff" }}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading services…</div>
      ) : (
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#334b71" }}>
                {COLUMNS.map((col) => (
                  <th key={col.label} onClick={() => toggleSort(col.field)}
                    style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#fff",
                      borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: ".06em",
                      cursor: col.field ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                    {col.label}
                    {col.field && (
                      <span style={{ marginLeft: 6, color: sortField === col.field ? "#fff" : "#cbd5e1", fontSize: 10 }}>
                        {sortField === col.field ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedServices.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>No services found.</td></tr>
              ) : pagedServices.map((row, i) => (
                <tr key={getCode(row) || i} style={{ borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8faff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: "#334b71" }}>{getCode(row)}</td>
                  <td style={{ padding: "12px 14px" }}>{getName(row)}</td>
                  <td style={{ padding: "12px 14px", color: "#64748b" }}>{getCategory(row)}</td>
                  <td style={{ padding: "12px 14px", color: "#64748b" }}>{getSubCategory(row)}</td>
                  <td style={{ padding: "12px 14px" }}>{quickCartBadge(getQuickCart(row))}</td>
                  <td style={{ padding: "12px 14px" }}>{statusBadge(getStatus(row))}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <button onClick={() => requireAccess("MDM.SERVICES_EDIT", () => handleEdit(row))}
                      style={{ padding: "4px 12px", border: "1px solid #334b71", borderRadius: 6, background: "#fff",
                        color: "#334b71", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                      {detailsLoading ? "…" : "Edit"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && sortedServices.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
            <span>Rows per page:</span>
            <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              style={{ height: 32, padding: "0 8px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff" }}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ marginLeft: 8 }}>
              {(safePage - 1) * entriesPerPage + 1}–{Math.min(safePage * entriesPerPage, sortedServices.length)} of {sortedServices.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
              style={{ height: 32, padding: "0 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff",
                color: safePage <= 1 ? "#cbd5e1" : "#334b71", fontWeight: 700, fontSize: 13, cursor: safePage <= 1 ? "not-allowed" : "pointer" }}>
              ‹ Prev
            </button>
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Page {safePage} of {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              style={{ height: 32, padding: "0 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff",
                color: safePage >= totalPages ? "#cbd5e1" : "#334b71", fontWeight: 700, fontSize: 13, cursor: safePage >= totalPages ? "not-allowed" : "pointer" }}>
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceMaster;