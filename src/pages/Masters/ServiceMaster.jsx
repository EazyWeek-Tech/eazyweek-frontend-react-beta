"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import ServiceForm from "./ServiceForm";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token");

const ServiceMaster = () => {

  // ── Access rights ─────────────────────────────────────────────────────────
  const _rights = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const role = (u.role || u.userRole || u.securityRole || "").toLowerCase().replace(/\s/g, "");
      const isAdmin       = role === "admin";
      const isEntityLevel = u.isEntityLevel === true;
      const canWrite      = isAdmin && isEntityLevel;
      return { isAdmin, isEntityLevel, canCreate: canWrite, canEdit: canWrite, canDelete: canWrite };
    } catch {
      return { isAdmin:false, isEntityLevel:false, canCreate:false, canEdit:false, canDelete:false };
    }
  })();
  const { isAdmin, isEntityLevel, canCreate, canEdit, canDelete } = _rights;

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

  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/LoadService`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        if (!response.ok) throw new Error("Failed to fetch services");
        const json = await response.json();
        // Node returns { success, data } — handle both shapes
        const data = json.data || json;
        setServiceData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchServiceData();
  }, []);

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

  const handleBackFromForm = () => {
    setShowForm(false);
    setSelectedServiceForEdit(null);
  };

  const columns = [
    { name: "Code",        selector: (row) => row.serviceCode  || row.SERVICECODE,  sortable: true },
    { name: "Name",        selector: (row) => row.serviceName  || row.SERVICENAME,  sortable: true, wrap: true },
    { name: "Category",    selector: (row) => row.categoryName || row.CCODE || "",  sortable: true },
    { name: "Subcategory", selector: (row) => row.subCategoryName || row.CSCODE || "", sortable: true },
    {
      name: "Status",
      selector: (row) => row.status || row.serviceStatus || row.SERVICESTATUS || "",
      cell:     (row) => {
        const s = (row.status || row.serviceStatus || row.SERVICESTATUS || "").toLowerCase();
        return <span className={`status-badge ${s}`}>{s || "active"}</span>;
      },
      sortable: true,
    },
    {
      name: "Action",
      cell: (row) => (
        <button className={canEdit ? "act-btn edit" : "act-btn"} onClick={() => handleEdit(row)} style={{ opacity: canEdit ? 1 : 0.7 }}>
          {detailsLoading ? "…" : (canEdit ? "✏️ Edit" : "👁 View")}
        </button>
      ),
      ignoreRowClick: true, allowOverflow: true, button: true,
    },
  ];

  if (showForm) {
    return <ServiceForm service={selectedServiceForEdit} onBack={handleBackFromForm} mode={formMode} />;
  }

  return (
    <div className="service-master-container">
      <div className="header-section">
        <div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
            <a href="/dashboard" style={{ color: "#334B71", textDecoration: "none" }}>Dashboard</a>
            <span style={{ margin: "0 6px" }}> › </span>
            <span>Manage Services</span>
          </div>
          <h1 className="page-title">Services</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{filteredServices.length} services</p>
        </div>
        {canCreate && <button className="create-btn" onClick={handleCreateNew}>+ Create New Service</button>}
      </div>

      {!isAdmin && (
        <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:10, fontSize:13,
          background:"#f0f4fa", border:"1px solid #c8d5e8", color:"#334b71", fontWeight:600 }}>
          👁 View Only — Only Admins at entity level can make changes.
        </div>
      )}
      <DataTable
        columns={columns}
        data={filteredServices}
        progressPending={loading}
        progressComponent={<div style={{ padding: 40, color: "#6b7280" }}>Loading services...</div>}
        pagination
        paginationPerPage={entriesPerPage}
        paginationRowsPerPageOptions={[10, 25, 50, 100]}
        onChangeRowsPerPage={(n) => { setEntriesPerPage(n); setCurrentPage(1); }}
        onChangePage={(p) => setCurrentPage(p)}
        subHeader
        highlightOnHover
        subHeaderComponent={
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text" placeholder="Search services..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, minWidth: 220, fontSize: 14 }}
            />
            <select value={serviceStatus} onChange={(e) => setServiceStatus(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        }
      />

      <style>{`
        .header-section { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
        .page-title { font-size:24px; font-weight:600; color:#111827; margin:0 0 4px; }
        .create-btn { padding:10px 20px; background:#334B71; color:#fff; border:none; border-radius:8px; font-weight:500; cursor:pointer; font-size:14px; }
        .create-btn:hover { background:#22314f; }
        .status-badge { padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500; background:#d1fae5; color:#065f46; text-transform:capitalize; }
        .status-badge.inactive { background:#fee2e2; color:#991b1b; }
        .act-btn.edit { font-size:13px; padding:5px 12px; border-radius:6px; border:none; background:#fef3c7; color:#92400e; font-weight:500; cursor:pointer; }
        .act-btn.edit:hover { background:#fde68a; }
      `}</style>
    </div>
  );
};

export default ServiceMaster;