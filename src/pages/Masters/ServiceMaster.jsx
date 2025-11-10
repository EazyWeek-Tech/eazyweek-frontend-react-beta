"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import ServiceForm from "./ServiceForm";
import { API_BASE_URL } from "../../config";

const ServiceMaster = () => {
  const [serviceData, setServiceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState(null);
  const [formMode, setFormMode] = useState("create");
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ---- load list
  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/LoadService`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch services");
        const data = await response.json();
        setServiceData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchServiceData();
  }, []);

  // ---- robust search/filter (fix)
  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return serviceData.filter((s) => {
      const name = (s.serviceName || "").toLowerCase();
      const code = (s.serviceCode || "").toLowerCase();
      const category = (s.categoryName || "").toLowerCase();
      const subCategory = (s.subCategoryName || "").toLowerCase();
      const status = (s.status || "").toLowerCase();

      const matchesTerm =
        !term ||
        name.includes(term) ||
        code.includes(term) ||
        category.includes(term) ||
        subCategory.includes(term) ||
        status.includes(term);

      const matchesStatus =
        !serviceStatus || status === serviceStatus.toLowerCase();

      return matchesTerm && matchesStatus;
    });
  }, [serviceData, searchTerm, serviceStatus]);

  const handleCreateNew = () => {
    setSelectedServiceForEdit(null);
    setFormMode("create");
    setShowForm(true);
  };

  // ---- normalize details API -> ServiceForm shape
  // ---- normalize details API -> ServiceForm shape
const normalizeDetails = (d) => {
  if (!d || typeof d !== "object") return null;

  // helpers
  const toYesNo = (v) => {
    const s = String(v ?? "").trim().toLowerCase();
    if (["1", "y", "yes", "true"].includes(s)) return "Yes";
    return "No";
  };
  const toBool = (v) => {
    const s = String(v ?? "").trim().toLowerCase();
    return ["1", "y", "yes", "true"].includes(s);
  };

  // PRICING
  const pricingData = Array.isArray(d.pricingJson)
    ? d.pricingJson.map((p) => ({
        centerCode: p.centerCode ?? "",
        centerName: p.centerName ?? "",
        price: String(p.price ?? "0"),
        // convert "0"/"1" or "YES"/"NO" to "Yes"/"No" for the select
        taxIncluded: toYesNo(p.taxIncluded),
        taxPercent: String(p.taxPercent ?? "0"),
        // checkbox expects boolean
        storeRelease: toBool(p.storeRelease),
      }))
    : [];

  // BOM (consumables)
  const bomItems = Array.isArray(d.consumablesJson)
    ? d.consumablesJson
        .filter(Boolean)
        .map((b, i) => ({
          id: b.id ?? i + 1,
          code: b.code ?? b.productCode ?? "",
          name: b.name ?? b.productName ?? "",
          qty: String(b.qty ?? "1.00"),
          uom: b.uom ?? "",
          selected: false,
        }))
    : [];

  // PRACTITIONERS
  const doctorMappings = Array.isArray(d.doctorsJson)
    ? d.doctorsJson
        .filter(Boolean)
        .map((m, i) => ({
          id: m.id ?? i + 1,
          doctorCode: m.doctorCode ?? m.id ?? "",
          doctorName: m.doctorName ?? m.name ?? "",
          clinicCode: m.clinicCode ?? "",
          clinicName: m.clinicName ?? "",
          selected: false,
        }))
    : [];

  const nurseMappings = Array.isArray(d.nursesJson)
    ? d.nursesJson
        .filter(Boolean)
        .map((m, i) => ({
          id: m.id ?? i + 1,
          nurseCode: m.nurseCode ?? m.id ?? "",
          nurseName: m.nurseName ?? m.name ?? "",
          clinicCode: m.clinicCode ?? "",
          clinicName: m.clinicName ?? "",
          selected: false,
        }))
    : [];

  // FORMS + MISC
  const formsData = {
    // your form expects these exact keys
    stageForFormCompletion: d.stageForFormCompletionCode || "form-not-required",
    blockFromProceeding:
      d.blockFromProceedingListIfFormNotFilled || "Yes",
    form: d.form || "",
  };

  const miscellaneousData = {
    optionalField1: d.optionalField1 || "",
    optionalField2: d.optionalField2 || "",
    optionalField3: d.optionalField3 || "",
    optionalField4: d.optionalField4 || "",
    optionalField5: d.optionalField5 || "",
  };

  // GENERAL
  return {
    code: d.serviceCode ?? "",
    name: d.serviceName ?? "",
    arabicName: d.arabicServiceName ?? "", // key in response is 'arabicServiceName'
    description: d.serviceDescription ?? "",
    category: d.serviceCategoryCode ?? "",
    subcategory: d.serviceSubCategoryCode ?? "",
    subSubcategory: d.serviceSubSubCategoryCode ?? "",
    time: d.serviceTime || " ", // keep placeholder if empty
    allowIdealBOM: toYesNo(d.allowIdealBOMConsumption),
    allowBOMIntervention: toYesNo(d.allowBOMConsumptionWithIntervention),
    allowLoyaltyAccrual: toYesNo(d.allowLoyalityAccrual),
    allowLoyaltyRedemption: toYesNo(d.allowLoyalityRedemption),
    status: d.status || "Active",

    // tab-specific state
    pricingData,
    bomItems,
    doctorMappings,
    nurseMappings,
    formsData,
    miscellaneousData,
  };
};


  // ---- edit: fetch details, open form
  const handleEdit = async (row) => {
  try {
    setDetailsLoading(true);
    const url = `${API_BASE_URL}/api/Master/FetchServiceDetails/${encodeURIComponent(
      row.serviceCode
    )}/${encodeURIComponent(row.recID)}`;

    // POST instead of GET
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error(`Failed to fetch details: ${res.status}`);
    const details = await res.json();
    const normalized = normalizeDetails(details) ?? {
      code: row.serviceCode,
      name: row.serviceName,
      status: row.status,
    };

    setSelectedServiceForEdit(normalized);
    setFormMode("edit");
    setShowForm(true);
  } catch (e) {
    console.error(e);
    // fallback if API fails
    setSelectedServiceForEdit({
      code: row.serviceCode,
      name: row.serviceName,
      status: row.status,
    });
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
    { name: "Code", selector: (row) => row.serviceCode, sortable: true },
    { name: "Name", selector: (row) => row.serviceName, sortable: true, wrap: true },
    { name: "Category", selector: (row) => row.categoryName, sortable: true },
    { name: "Subcategory", selector: (row) => row.subCategoryName, sortable: true },
    {
      name: "Status",
      selector: (row) => row.status,
      cell: (row) => (
        <span className={`status-badge ${row.status?.toLowerCase()}`}>{row.status}</span>
      ),
      sortable: true,
    },
    {
      name: "Action",
      cell: (row) => (
        <button className="act-btn edit" onClick={() => handleEdit(row)} title="Edit">
          {detailsLoading ? "…" : "✏️ Edit"}
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  if (showForm) {
    return (
      <ServiceForm
        service={selectedServiceForEdit}
        onBack={handleBackFromForm}
        mode={formMode}
      />
    );
  }

  return (
    <div className="service-master-container">
      <div className="header-section">
        <h1 className="page-title">Manage Services</h1>
        <div className="action-buttons">
          <button className="create-btn" onClick={handleCreateNew}>
            Create New Service
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredServices}
        progressPending={loading}
        progressComponent={
          <div className="loader-wrapper">
            <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
          </div>
        }
        pagination
        paginationPerPage={entriesPerPage}
        paginationRowsPerPageOptions={[10, 25, 50, 100]}
        onChangeRowsPerPage={(newPerPage) => {
          setEntriesPerPage(newPerPage);
          setCurrentPage(1);
        }}
        onChangePage={(page) => setCurrentPage(page)}
        subHeader
        highlightOnHover
        subHeaderComponent={
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                minWidth: "200px",
              }}
            />
            <select
              value={serviceStatus}
              onChange={(e) => setServiceStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        }
      />

      <style>{`
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .page-title { font-size: 24px; font-weight: 600; }
        .create-btn {
          padding: 10px 20px; background-color: #334B71; color: #fff;
          border: none; border-radius: 4px; font-weight: 500; cursor: pointer;
        }
        .create-btn:hover { background-color: #22314f; }
        .status-badge {
          padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;
          background-color: #d4edda; color: #155724; text-transform: capitalize;
        }
        .status-badge.inactive { background-color: #f8d7da; color: #721c24; }
        .act-btn.edit {
          font-size: 13px; padding: 6px 10px; border-radius: 4px; border: none;
          background-color: #fff3cd; color: #856404; font-weight: 500; cursor: pointer;
        }
        .act-btn.edit:hover { background-color: #ffe8a1; }
        .loader-wrapper { display: flex; justify-content: center; align-items: center; padding: 40px; }
        .lds-ring { display: inline-block; position: relative; width: 64px; height: 64px; }
        .lds-ring div {
          box-sizing: border-box; display: block; position: absolute; width: 48px; height: 48px;
          margin: 8px; border: 4px solid #334B71; border-radius: 50%;
          animation: lds-ring 1.2s linear infinite; border-color: #334B71 transparent transparent transparent;
        }
        .lds-ring div:nth-child(1) { animation-delay: -0.45s; }
        .lds-ring div:nth-child(2) { animation-delay: -0.3s; }
        .lds-ring div:nth-child(3) { animation-delay: -0.15s; }
        @keyframes lds-ring { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ServiceMaster;
