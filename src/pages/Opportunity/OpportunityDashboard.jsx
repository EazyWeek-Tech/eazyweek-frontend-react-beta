// src/pages/Opportunity/OpportunityDashboard.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import OpportunityForm from "./OpportunityForm";
import CreateRuleForm from "./CreateRuleForm";
import EditOpportunityForm from "./EditOpportunityForm";
import { API_BASE_URL } from "../../config";
import OpportunityDetails from "./OpportunityDetails";
import { useNavigate } from "react-router-dom";

/* charts */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

/* ---- Color system ---- */
const COLORS = {
  total: "#334b71",
  open: "#cc6b5c",
  wip: "#F3DCB0",
  closed: "#8da0b8",
  converted: "#A7D1CD",
  grid: "#eef2f7",
  axis: "#6e7b8f",
};


const RULE_KEYS = {
  MANUAL: "MANUAL",
  PAID_X_NOT_Y: "PAID_X_NOT_Y",
  NO_SHOW: "NO_SHOW",
  PAID_X_CAT: "PAID_X_CAT",
  CUSTOMER_SPECIAL_DAY: "CUSTOMER_SPECIAL_DAY",
  CANCELLED_APPT: "CANCELLED_APPT",
  EXTERNAL: "EXTERNAL",
};

const detectRuleKey = (row) => {
  if (isManualLeadRow(row)) return RULE_KEYS.MANUAL;
  if (isExternalLeadRow(row)) return RULE_KEYS.EXTERNAL;

  const code = String(row?.oRuleCode ?? row?.ruleCode ?? "").trim().toUpperCase();
  const name = String(row?.oppName ?? row?.oRuleDetails ?? "").toLowerCase();

  // ✅ confirmed from your API data
  if (code === "R3") return RULE_KEYS.NO_SHOW;        // No Show
  if (code === "R4") return RULE_KEYS.CANCELLED_APPT; // Cancelled

  // unknown / not confirmed yet (keep if you have them)
  if (code === "R1") return RULE_KEYS.PAID_X_NOT_Y;
  if (code === "R2") return RULE_KEYS.PAID_X_CAT;
  if (code === "R5") return RULE_KEYS.CUSTOMER_SPECIAL_DAY;

  // fallback by text
  if (name.includes("paid") && name.includes("not")) return RULE_KEYS.PAID_X_NOT_Y;
  if (name.includes("no show")) return RULE_KEYS.NO_SHOW;
  if (name.includes("category") && name.includes("paid")) return RULE_KEYS.PAID_X_CAT;
  if (name.includes("special day")) return RULE_KEYS.CUSTOMER_SPECIAL_DAY;
  if (name.includes("cancel")) return RULE_KEYS.CANCELLED_APPT;

  return "";
};



/** Convert Date | 'yyyy-MM-dd' | 'dd/MM/yyyy' -> 'yyyy-MM-dd' (date-only) */
const toISODateOnly = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    if (Number.isNaN(+d)) return "";
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

/** ✅ detect manual lead row robustly */
const isManualLeadRow = (row) => {
  return (
    String(row?.oRuleCode || "").trim().toLowerCase() === "manual lead"
  );
};

  /** ✅ detect external lead row robustly (R7) */
const isExternalLeadRow = (row) => {
  // try multiple places where backend might send rule identity
  const ruleCode = String(row?.ruleCode ?? row?.oRuleCode ?? row?.rule ?? "").trim().toUpperCase();
  const ruleType = String(row?.ruleType ?? row?.oRuleType ?? row?.rule_Type ?? "").trim().toUpperCase();
  const ruleName = String(row?.oRuleName ?? row?.ruleName ?? row?.oRuleDetails ?? "").trim().toLowerCase();

  // helpful debug (remove later)
  // console.log("External Detect:", { ruleCode, ruleType, ruleName, row });

  // detect by code OR by name
  return (
    ruleCode === "R7" ||
    ruleType === "R7" ||
    ruleName.includes("external") // e.g. "External Lead", "External Leads"
  );
};


/** ✅ Manual lead API helpers */
const MANUAL_LEAD_API = `${API_BASE_URL}/api/LeadOpp/getCapaignListByManualLead`;

// extract array safely from unknown API shapes
const asArray = (data) => {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  // common wrappers
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;
  return [data];
};

const normalizeCounts = (it) => ({
  oppCode: String(it?.oppCode || "").trim().toUpperCase(),

  totalOpportunities: it?.totalOpportunities ?? 0,

  noOfOpenOpportunities: it?.openOpportunities ?? 0,

  noOfClosedOpportunities: it?.closedOpportunities ?? 0,

  noOfConvertedOutOfClosed: it?.convertedOpportunities ?? 0,
});



const OpportunityDashboard = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedOppDetails, setSelectedOppDetails] = useState(null);
  const [opportunityData, setOpportunityData] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("1");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userRoleName, setUserRoleName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
  // Adjust this based on where you store login user details
  // Example: localStorage key "user" or "loggedInUser"
  const raw =
    localStorage.getItem("user") ||
    localStorage.getItem("loggedInUser") ||
    sessionStorage.getItem("user") ||
    sessionStorage.getItem("loggedInUser");

  if (raw) {
    try {
      const u = JSON.parse(raw);
      setUserRoleName(String(u?.roleName || "").trim());
    } catch (e) {
      setUserRoleName("");
    }
  } else {
    // If you already have user object from props/context, set it here instead
    setUserRoleName("");
  }
}, []);

const canManageCampaigns = userRoleName.toLowerCase() === "admin";

  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  /**
   * ✅ On page load (and whenever status changes), call BOTH:
   *  1) /api/Opportunity/LoadOpprotunityList/{Status}  -> base list
   *  2) /api/LeadOpp/getCapaignListByManualLead?pageNumber=1&pageSize=10 (or larger)
   *     -> ONLY patch counts for manual-lead rows present in base list
   */
  const fetchOpportunities = async (status = "1") => {
    setLoading(true);

    try {
      // --- 1) base list fetch ---
      const baseFetch = fetch(
        `${API_BASE_URL}/api/Opportunity/LoadOpprotunityList/${status}`,
        { credentials: "include" }
      ).then(async (r) => {
        if (!r.ok) throw new Error(`LoadOpprotunityList failed: HTTP ${r.status}`);
        return r.json();
      });

    

      // --- 2) manual lead list fetch (patch-only) ---
      // using bigger pageSize to cover most/manual rows, but still "pageNumber=1"
      const manualFetch = fetch(`${MANUAL_LEAD_API}?pageNumber=1&pageSize=500`, {
        credentials: "include",
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`getCapaignListByManualLead failed: HTTP ${r.status}`);
          return r.json();
        })
        .catch(() => null); // manual lead patch is optional; base list still renders

      const [baseJson, manualJson] = await Promise.all([baseFetch, manualFetch]);

      const baseArr = asArray(baseJson);
      const manualArr = asArray(manualJson);

      // build a map: oppCode -> counts (from manual lead API)
      const manualMap = new Map();
      manualArr.forEach((it) => {
        const n = normalizeCounts(it);
        if (n.oppCode) manualMap.set(n.oppCode, n);
      });

      const normalizeBase = (it) => {
        const normalized = {
          ...it,
          clinic: it.clinic ?? it.centerName ?? "",
          totalOpportunities: it.totalOpportunities ?? it.totalopportunities ?? 0,
          noOfOpenOpportunities:
            it.noOfOpenOpportunities ?? it.noOfOpenopportunities ?? it.noOfOpen ?? 0,
          noOfClosedOpportunities:
            it.noOfClosedOpportunities ?? it.noOfClosedopportunities ?? it.noOfClosed ?? 0,
              recordswithoutSalesOwner: it.recordswithoutSalesOwner ?? it.recordsWithoutSalesOwner ?? it.records_without_sales_owner ?? 0,

          noOfConvertedOutOfClosed:
            it.noOfConvertedOutOfClosed ??
            it.noOfConvertedoutofClosed ??
            it.noOfConvertedOutofClosed ??
            0,
        };

        // ✅ PATCH ONLY manual lead campaigns
        if (isManualLeadRow(normalized)) {
  const code = String(normalized.oppCode || "").trim().toUpperCase();
  const ml = manualMap.get(code);

  if (ml) {
    normalized.totalOpportunities = ml.totalOpportunities;
    normalized.noOfOpenOpportunities = ml.noOfOpenOpportunities;
    normalized.noOfClosedOpportunities = ml.noOfClosedOpportunities;
    normalized.noOfConvertedOutOfClosed = ml.noOfConvertedOutOfClosed;
  }
}
       return normalized;
      };

      setOpportunityData(baseArr.map(normalizeBase));
    } catch (error) {
      console.error("Failed to load opportunities:", error);
      setOpportunityData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const data = currentView === "dashboard" ? opportunityData : [];

  // If you want to fetch details inline (not used when navigating)
  const handleViewDetails = async (oppCode, fromDate, toDate) => {
    try {
      const payload = {
        oppCode,
        fromDate: toISODateOnly(fromDate),
        toDate: toISODateOnly(toDate),
      };
      const response = await fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const resData = await response.json();
      setSelectedOppDetails(resData?.[0]);
      setCurrentView("details");
    } catch (error) {
      console.error("Failed to load opportunity details:", error);
      showToast("Failed to load details", "error");
    }
  };

  const safeNum = (v) => (Number.isFinite(+v) ? +v : 0);

const summarizeRows = (rows) => {
  const total = rows.reduce((s, r) => s + safeNum(r.totalOpportunities), 0);
  const open = rows.reduce((s, r) => s + safeNum(r.noOfOpenOpportunities), 0);
  const closed = rows.reduce((s, r) => s + safeNum(r.noOfClosedOpportunities), 0);
  const converted = rows.reduce((s, r) => s + safeNum(r.noOfConvertedOutOfClosed), 0);

  const wip = Math.max(0, total - open - closed);

  return { total, open, wip, closed, converted };
};

const simpleStatusDataset = (sum) => ([
  { label: "Total", value: sum.total, fill: COLORS.total },
  { label: "Open", value: sum.open, fill: COLORS.open },
  { label: "WIP", value: sum.wip, fill: COLORS.wip },
  { label: "Closed", value: sum.closed, fill: COLORS.closed },
  { label: "Converted", value: sum.converted, fill: COLORS.converted },
]);

const buildStackedByClinic = (rows) => {
  const map = new Map();

  rows.forEach((r) => {
    const clinic = String(r.clinic || r.centerName || "Unknown").trim() || "Unknown";

    const cur = map.get(clinic) || { name: clinic, Total: 0, Open: 0, WIP: 0, Closed: 0, Converted: 0 };

    cur.Total += safeNum(r.totalOpportunities);
    cur.Open += safeNum(r.noOfOpenOpportunities);
    cur.Closed += safeNum(r.noOfClosedOpportunities);
    cur.Converted += safeNum(r.noOfConvertedOutOfClosed);

    map.set(clinic, cur);
  });

  // finalize WIP after sums
  const out = Array.from(map.values()).map((x) => ({
    ...x,
    WIP: Math.max(0, safeNum(x.Total) - safeNum(x.Open) - safeNum(x.Closed)),
  }));

  // optional: sort by Total desc
  out.sort((a, b) => safeNum(b.Total) - safeNum(a.Total));
  return out;
};

const rowsByRule = useMemo(() => {
  const grouped = {
    [RULE_KEYS.MANUAL]: [],
    [RULE_KEYS.PAID_X_NOT_Y]: [],
    [RULE_KEYS.NO_SHOW]: [],
    [RULE_KEYS.PAID_X_CAT]: [],
    [RULE_KEYS.CUSTOMER_SPECIAL_DAY]: [],
    [RULE_KEYS.CANCELLED_APPT]: [],
    [RULE_KEYS.EXTERNAL]: [],
  };

  (opportunityData || []).forEach((r) => {
    const key = detectRuleKey(r);
    if (key && grouped[key]) grouped[key].push(r);
  });

  return grouped;
}, [opportunityData]);

const STATUS_DATA_MANUAL_LEAD = useMemo(
  () => simpleStatusDataset(summarizeRows(rowsByRule[RULE_KEYS.MANUAL])),
  [rowsByRule]
);

const STATUS_DATA_EXTERNAL_SOURCE = useMemo(
  () => simpleStatusDataset(summarizeRows(rowsByRule[RULE_KEYS.EXTERNAL])),
  [rowsByRule]
);

const STATUS_DATA_NO_SHOW = useMemo(
  () => simpleStatusDataset(summarizeRows(rowsByRule[RULE_KEYS.NO_SHOW])),
  [rowsByRule]
);

const STATUS_DATA_CANCELLED_APPT = useMemo(
  () => simpleStatusDataset(summarizeRows(rowsByRule[RULE_KEYS.CANCELLED_APPT])),
  [rowsByRule]
);

const STATUS_DATA_CUSTOMER_SPECIAL_DAY = useMemo(
  () => simpleStatusDataset(summarizeRows(rowsByRule[RULE_KEYS.CUSTOMER_SPECIAL_DAY])),
  [rowsByRule]
);

const STATUS_DATA_PAID_X_NOT_Y = useMemo(
  () => simpleStatusDataset(summarizeRows(rowsByRule[RULE_KEYS.PAID_X_NOT_Y])),
  [rowsByRule]
);

const STATUS_DATA_PAID_X_CAT = useMemo(
  () => simpleStatusDataset(summarizeRows(rowsByRule[RULE_KEYS.PAID_X_CAT])),
  [rowsByRule]
);


  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      const s = searchTerm.toLowerCase();
      return (
        (item.oppCode || "").toLowerCase().includes(s) ||
        (item.oppName || "").toLowerCase().includes(s) ||
        (item.centerName || "").toLowerCase().includes(s) || // legacy
        (item.clinic || "").toLowerCase().includes(s) || // normalized
        (item.segmentType || "").toLowerCase().includes(s)
      );
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [searchTerm, sortConfig, data]);

  const totalPages = Math.ceil(filteredAndSortedData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  // below other handlers, e.g., after handleEditSave / handleRefresh
  const handleCreateNewCampaign = () => {
    navigate("/opportunity/create");
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(currentData.map((item) => item.recID || item.oppCode));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]));
  };

  const handleEditOppName = () => {
    if (selectedRows.length === 0) return alert("Please select at least one opportunity to edit");
    if (selectedRows.length > 1) return alert("Please select only one opportunity to edit");

    const selectedOpp = opportunityData.find((item) => (item.recID || item.oppCode) === selectedRows[0]);
    if (selectedOpp) {
      setSelectedOpportunity(selectedOpp);
      setCurrentView("edit-opportunity");
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedOpportunity(null);
    setSelectedOppDetails(null);
  };

  const handleOpportunityNext = () => setCurrentView("create-rule");
  const handleRuleBack = () => setCurrentView("create-opportunity");
  const handleRuleSave = () => alert("Rule saved successfully!");
  const handleRuleActivate = () => {
    alert("Rule activated successfully!");
    setCurrentView("dashboard");
  };

  const handleExpireCampaign = async () => {
    if (selectedRows.length === 0) {
      showToast("Please select at least one opportunity to expire", "error");
      return;
    }
    const confirmExpire = window.confirm("Are you sure you want to expire the selected opportunities?");
    if (!confirmExpire) return;

    const payload = {
      expireOpp: "Expired by user",
      oppCodeListJson: selectedRows.map((code) => ({ oppCode: code })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/Opportunity/ExpireOpportunity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to expire opportunity");

      showToast("Selected opportunities expired successfully!", "success");
      setSelectedRows([]);
      setCurrentPage(1);
      setStatusFilter("1");
      await fetchOpportunities("1");
    } catch (error) {
      console.error("Expire error:", error);
      showToast("Error expiring opportunities.", "error");
    }
  };

  const handleEditSave = (updatedOpportunity) => {
    setOpportunityData((prev) =>
      prev.map((item) =>
        (item.recID || item.oppCode) === (updatedOpportunity.recID || updatedOpportunity.oppCode)
          ? updatedOpportunity
          : item
      )
    );
    alert("Opportunity name updated successfully!");
    setCurrentView("dashboard");
    setSelectedRows([]);
  };

  const handleRefresh = async () => {
    const oppCode = 123; // ✅ as per your requirement

    setLoading(true);
    try {
      // 1) Call GetLatestData first
      const res1 = await fetch(`${API_BASE_URL}/api/Opportunity/GetLatestData/${oppCode}`, {
        credentials: "include",
      });

      if (!res1.ok) {
        const errText = await res1.text();
        throw new Error(`GetLatestData failed: HTTP ${res1.status} - ${errText.slice(0, 180)}`);
      }

      // 2) After GetLatestData completes, reload list with status = 1
      setStatusFilter("1"); // keep UI in sync (Active)
      setCurrentPage(1);
      await fetchOpportunities("1"); // ✅ now also patches Manual Lead counts

      showToast("Latest data loaded successfully!", "success");
    } catch (e) {
      console.error("Get Latest Data error:", e);
      showToast(e?.message || "Failed to get latest data", "error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to /opportunity/details/{oppCode}
   * Pass along extra fields for the header fallback when details API is empty.
   */
  const handleOpportunityClick = (row) => {
  if (!row) return;

  const oppCode = String(row?.oppCode || "").trim();
  if (!oppCode) return;

  // ✅ decide from/to (use row dates if present, else fallback)
  const now = new Date();
  const fallbackFrom = toISODateOnly(new Date(new Date().setDate(now.getDate() - 13)));
  const fallbackTo = toISODateOnly(new Date());

  const from = toISODateOnly(row?.fromDate) || fallbackFrom;
  const to = toISODateOnly(row?.toDate) || fallbackTo;

  // ✅ External Leads route (R7) with from/to BEFORE oppCode
  if (isExternalLeadRow(row)) {
    navigate(
      `/opportunity/external/${encodeURIComponent(from)}/${encodeURIComponent(
        to
      )}/${encodeURIComponent(oppCode)}`,
      {
        state: {
          oppName: row?.oppName || undefined,
          fromDate: from,
          toDate: to,
          externalLead: true,
        },
      }
    );
    return;
  }

  // ✅ Normal route (details) with from/to BEFORE oppCode
  navigate(
    `/opportunity/details/${encodeURIComponent(from)}/${encodeURIComponent(
      to
    )}/${encodeURIComponent(oppCode)}`,
    {
      state: {
        oppName: row?.oppName || undefined,
        oRuleDetails: row?.oRuleDetails || undefined,
        oRuleXvalue: row?.oRuleXvalue || undefined,
        fromDate: from,
        toDate: to,
        manualLead: isManualLeadRow(row),
      },
    }
  );
};


  /* -------------------- CHART CARDS -------------------- */
  const SimpleBarCard = ({ title, dataset }) => {
  const hasAny = Array.isArray(dataset) && dataset.some((d) => Number(d?.value) > 0);

  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>

      {!hasAny ? (
        <div
          style={{
            width: "100%",
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.axis,
            fontSize: 13,
          }}
        >
          No data
        </div>
      ) : (
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={dataset} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLORS.axis, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {dataset.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};


  const StackedByClinicCard = ({ title, dataset }) => (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={dataset} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: COLORS.axis, fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 12 }} />
            <Legend verticalAlign="top" height={24} />
            <Tooltip />
            <Bar dataKey="Total" stackId="a" fill={COLORS.total} />
            <Bar dataKey="Open" stackId="a" fill={COLORS.open} />
            <Bar dataKey="WIP" stackId="a" fill={COLORS.wip} />
            <Bar dataKey="Closed" stackId="a" fill={COLORS.closed} />
            <Bar dataKey="Converted" stackId="a" fill={COLORS.converted} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  /* -------------------- VIEW SWITCHERS -------------------- */
  if (currentView === "details" && selectedOppDetails) {
    return <OpportunityDetails details={selectedOppDetails} onBack={handleBackToDashboard} />;
  }
  if (currentView === "create-opportunity") {
    return <OpportunityForm onBack={handleBackToDashboard} onNext={handleOpportunityNext} mode="create" />;
  }
  if (currentView === "create-rule") {
    return (
      <CreateRuleForm
        opportunityData={opportunityData}
        onBack={handleRuleBack}
        onSave={handleRuleSave}
        onActivate={handleRuleActivate}
      />
    );
  }
  if (currentView === "edit-opportunity") {
    return (
      <EditOpportunityForm opportunityData={selectedOpportunity} onBack={handleBackToDashboard} onSave={handleEditSave} />
    );
  }

  /* -------------------- DASHBOARD -------------------- */
  return (
    <>
      <style jsx="true">{`
        .dashboard-container { min-height: 100vh; }
        .page-header { margin-bottom: 30px; }
        .page-title { font-size: 24px; font-weight: 600; color: #333; margin: 0 0 10px 0; }
        .breadcrumb { font-size: 14px; color: #6c757d; }
        .loader-wrapper {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(255, 255, 255, 0.7); z-index: 9998; display: flex; justify-content: center; align-items: center;
        }
        .data-table th, .data-table td { white-space: nowrap; font-size: 13px; }
        .loader { border: 6px solid #f3f3f3; border-top: 6px solid #334b71; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .breadcrumb-link { color: #334b71; text-decoration: none; cursor: pointer; }
        .breadcrumb-link:hover { text-decoration: underline; }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .chart-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #dee2e6; }
        .chart-title { font-size: 12px; line-height: 18px; font-weight: 600; color: #333; margin-bottom: 15px; }

        .action-section { background: white; border-radius: 0; padding: 0; box-shadow: none; margin-bottom: 20px; }
        .action-buttons { display: flex; gap: 15px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .button-group { display: flex; gap: 15px; flex-wrap: wrap; }
        .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; }
        .btn-primary { background-color: #334b71; color: white; }
        .btn-primary:hover { background-color: #2a3f5f; transform: translateY(-1px); }
        .btn-secondary { background-color: #6c757d; color: white; }
        .btn-secondary:hover { background-color: #5a6268; transform: translateY(-1px); }
        .btn-refresh { background-color: #334b71; color: white; font-weight: 700; cursor: pointer; padding: 8px 12px; border: none; border-radius:4px; height: 40px; display: flex; align-items: center; justify-content: center;font-size: 14px; }

        .controls-section { background: white; border-radius: 0; padding: 20px 0; box-shadow: none; margin-bottom: 20px; }
        .controls-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .control-group { display: flex; align-items: center; gap: 10px; }
        .control-label { font-size: 14px; color: #495057; font-weight: 500; }
        .control-select, .control-input { padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; }
        .control-select:focus, .control-input:focus { outline: none; border-color: #334b71; box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25); }

        .table-container { background: white; box-shadow: none; border-radius: 0; overflow: hidden; }
        .table-wrapper { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 20px; }
        .data-table th, .data-table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .data-table th { background-color: #f8f9fa; font-weight: 600; color: #495057; cursor: pointer; user-select: none; }
        .data-table th:hover { background-color: #e9ecef; }
        .data-table tbody tr:hover { background-color: #f8f9fa; }
        .data-table tbody tr:nth-child(even) { background-color: #fdfdfd; }
        .sort-indicator { margin-left: 5px; font-size: 12px; color: #6c757d; }
        .checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #334b71; }
        .opp-code-link { color: #334b71; text-decoration: none; cursor: pointer; background: none; border: none; white-space: nowrap; font-weight: 600; }
        .opp-code-link:hover { text-decoration: underline; }
        .segment-badge { padding: 4px 8px; border-radius: 12px; font-size: 14px; font-weight: 500; }
        .segment-static { background-color: #e3f2fd; color: #1976d2; }
        .segment-dynamic { background-color: #f3e5f5; color: #7b1fa2; }

        .pagination-section { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #dee2e6; flex-wrap: wrap; gap: 15px; }
        .pagination-info { font-size: 14px; color: #6c757d; }
        .pagination-controls { display: flex; gap: 5px; align-items: center; }
        .pagination-btn { padding: 8px 12px; border: 1px solid #dee2e6; background: white; cursor: pointer; font-size: 14px; border-radius: 4px; transition: all 0.2s ease; }
        .pagination-btn:hover:not(:disabled) { background-color: #f8f9fa; border-color: #334b71; }
        .pagination-btn.active { background-color: #334b71; color: white; border-color: #334b71; }
        .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 768px) {
          .dashboard-container { padding: 15px; }
          .charts-grid { grid-template-columns: 1fr; }
          .controls-row { flex-direction: column; align-items: stretch; }
          .control-group { justify-content: space-between; }
          .button-group { justify-content: center; }
          .pagination-section { flex-direction: column; text-align: center; }
        }
      `}</style>

      <div className="dashboard-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Opportunity Dashboard</h1>
          <div className="breadcrumb">
            <span className="breadcrumb-link">Opportunity</span>
          </div>
        </div>

        <div className="charts-grid">
  <SimpleBarCard title="Rule: Manual Lead" dataset={STATUS_DATA_MANUAL_LEAD} />
  <SimpleBarCard title="Rule: External Source (R7)" dataset={STATUS_DATA_EXTERNAL_SOURCE} />

  <SimpleBarCard title="Rule: No show appointment for X days" dataset={STATUS_DATA_NO_SHOW} />
  <SimpleBarCard title="Rule: Cancelled appointment for X days" dataset={STATUS_DATA_CANCELLED_APPT} />
  <SimpleBarCard title="Rule: Customer Special Day" dataset={STATUS_DATA_CUSTOMER_SPECIAL_DAY} />

  {/* enable later when data exists */}
  {/* <SimpleBarCard title="Rule: Paid for X but not for Y" dataset={STATUS_DATA_PAID_X_NOT_Y} /> */}
  {/* <SimpleBarCard title="Rule: Paid X Category..." dataset={STATUS_DATA_PAID_X_CAT} /> */}
</div>


        {/* Actions */}
        <div className="action-section">
  <div className="action-buttons">
    <div className="button-group">
      {canManageCampaigns && (
        <>
          <button className="btn btn-secondary" onClick={handleEditOppName}>
            Edit Opp Name
          </button>

          <button className="btn btn-secondary" onClick={handleExpireCampaign}>
            Expire Campaign
          </button>

          <button className="btn btn-primary" onClick={handleCreateNewCampaign}>
            Create New Campaign
          </button>
        </>
      )}
    </div>

    <button className="btn-refresh" onClick={handleRefresh} title="Refresh">
      Get Latest Data
    </button>
  </div>
</div>

        {/* Controls */}
        <div className="controls-section">
          <div className="controls-row">
            <div className="control-group">
              <label className="control-label">Status:</label>
              <select className="control-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="1">Active</option>
                <option value="0">Draft</option>
                <option value="2">Expired</option>
              </select>
            </div>
            <div className="control-group">
              <label className="control-label">Show</label>
              <select
                className="control-select"
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="control-label">entries per page</span>
            </div>
            <div className="control-group">
              <label className="control-label">Search:</label>
              <input
                type="text"
                className="control-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search opportunities..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedRows.length === currentData.length && currentData.length > 0}
                    />
                  </th>
                  <th onClick={() => handleSort("oppCode")}>
                    Campaign Code
                    <span className="sort-indicator">
                      {sortConfig.key === "oppCode" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("oppName")}>
                    Campaign Name
                    <span className="sort-indicator">
                      {sortConfig.key === "oppName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("clinic")}>
                    Clinic
                    <span className="sort-indicator">
                      {sortConfig.key === "clinic" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("fromDate")}>
                    From Date
                    <span className="sort-indicator">
                      {sortConfig.key === "fromDate" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("toDate")}>
                    To Date
                    <span className="sort-indicator">
                      {sortConfig.key === "toDate" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("totalOpportunities")}>
                    Total Opportunities
                    <span className="sort-indicator">
                      {sortConfig.key === "totalOpportunities"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("noOfOpenOpportunities")}>
                    No.Of Open Opportunities
                    <span className="sort-indicator">
                      {sortConfig.key === "noOfOpenOpportunities"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("noOfClosedOpportunities")}>
                    No.Of Closed Opportunities
                    <span className="sort-indicator">
                      {sortConfig.key === "noOfClosedOpportunities"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("recordswithoutSalesOwner")}>
  Records without Sales Owner
  <span className="sort-indicator">
    {sortConfig.key === "recordswithoutSalesOwner"
      ? sortConfig.direction === "asc"
        ? "↑"
        : "↓"
      : "↕"}
  </span>
</th>

                  <th onClick={() => handleSort("noOfConvertedOutOfClosed")}>
                    No.Of Converted out of Closed
                    <span className="sort-indicator">
                      {sortConfig.key === "noOfConvertedOutOfClosed"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th onClick={() => handleSort("segmentType")}>
                    Segment Type
                    <span className="sort-indicator">
                      {sortConfig.key === "segmentType" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((item) => (
                  <tr key={item.recID || item.oppCode}>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedRows.includes(item.recID || item.oppCode)}
                        onChange={() => handleSelectRow(item.recID || item.oppCode)}
                      />
                    </td>
                    <td>
                      {/* Navigate to details; pass entire row for fallback header */}
                      <button onClick={() => handleOpportunityClick(item)} className="opp-code-link">
                        {item.oppCode}
                      </button>
                    </td>
                    <td>{item.oppName}</td>
                    <td>{item.clinic}</td>
                    <td>{item.fromDate}</td>
                    <td>{item.toDate}</td>
                    <td>{item.totalOpportunities}</td>
                    <td>{item.noOfOpenOpportunities}</td>
                    <td>{item.noOfClosedOpportunities}</td>
                    <td>{item.recordswithoutSalesOwner ?? 0}</td>

                    <td>{item.noOfConvertedOutOfClosed}</td>
                    <td>
                      <span className={`segment-badge segment-${(item.segmentType || "").toLowerCase()}`}>
                        {item.segmentType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-section">
            <div className="pagination-info">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedData.length)} of{" "}
              {filteredAndSortedData.length} entries
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="pagination-btn">...</span>}
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: toast.type === "success" ? "#28a745" : "#dc3545",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "4px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 9999,
          }}
        >
          {toast.message}
        </div>
      )}

      {loading && (
        <div className="loader-wrapper">
          <div className="loader"></div>
        </div>
      )}
    </>
  );
};

export default OpportunityDashboard;
