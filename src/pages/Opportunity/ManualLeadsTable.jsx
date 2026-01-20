// src/pages/Opportunity/ManualLeadsTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

// ✅ Change this ONLY if your old "Add Opportunity" route is different
const ADD_OPPORTUNITY_ROUTE = "/opportunity/create";

// -----------------------------
// Date helpers
// -----------------------------
const toISODateOnly = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
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

const formatDDMMYYYY = (v) => {
  if (!v) return "—";
  const iso = toISODateOnly(v);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
};

// combine date + time (time should be already a friendly label)
const formatDateTime = (dateVal, timeLabel) => {
  const d = formatDDMMYYYY(dateVal);
  const t = (timeLabel ?? "").toString().trim();
  if (d === "—") return "—";
  return t ? `${d} ${t}` : d;
};

// ✅ Excel export (dynamic import to avoid Vite bundle issues)
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

// optional: nice file name
const exportFileName = (oppCode) => {
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, "0");
  const d = String(ts.getDate()).padStart(2, "0");
  const hh = String(ts.getHours()).padStart(2, "0");
  const mm = String(ts.getMinutes()).padStart(2, "0");
  return `ManualLeads_${oppCode || "All"}_${y}${m}${d}_${hh}${mm}.xlsx`;
};

const buildLeadListUrl = ({ baseUrl, campaignId, pageNumber, pageSize }) => {
  if (!campaignId) throw new Error("campaignId is required for LeadOpp/List");

  const qs = new URLSearchParams();
  qs.set("campaignId", String(campaignId));
  qs.set("pageNumber", String(pageNumber || 1));
  qs.set("pageSize", String(pageSize || 10));
  return `${baseUrl}/api/LeadOpp/List?${qs.toString()}`;
};



// -----------------------------
// Value helpers
// -----------------------------
const safe = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : v;

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";

// Prospect ID: 7-digit with LD- prefix
const toProspectId = (leadOppId) => {
  const n = Number(leadOppId);
  if (!n || Number.isNaN(n)) return "—";
  return `LD-${String(n).padStart(7, "0")}`;
};

// normalize string for lookups
const norm = (v) => String(v ?? "").trim().toLowerCase();

// ✅ Convert "13:30:00" -> "01:30 PM"
// also accepts already formatted label like "01:30 PM"
const toTimeLabel12h = (timeVal) => {
  const s = String(timeVal ?? "").trim();
  if (!s) return "";

  // already in "hh:mm AM/PM"
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(s)) {
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const hh = String(m[1]).padStart(2, "0");
    return `${hh}:${m[2]} ${String(m[3]).toUpperCase()}`;
  }

  // "HH:mm:ss" or "HH:mm"
  const parts = s.split(":");
  const hh24 = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  if (Number.isNaN(hh24) || Number.isNaN(mm)) return "";

  const ampm = hh24 >= 12 ? "PM" : "AM";
  let hh12 = hh24 % 12;
  if (hh12 === 0) hh12 = 12;

  return `${String(hh12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ampm}`;
};

// ✅ Prospect Type rule (UPDATED):
// Prefer API `type` (Lead/Opportunity). If missing, fallback to old custID rule.
const toProspectType = (apiType, custID) => {
  const t = String(apiType ?? "").trim().toLowerCase();
  if (t === "lead") return "Lead";
  if (t === "opportunity") return "Opportunity";
  return isEmpty(custID) ? "Lead" : "Opportunity";
};

const mapManualLeadRow = (x, resolveOwnerRecId, resolveCustIdFromRecId) => {
  const id = Number(x?.leadOpp_ID) || 0;

  // ✅ From List API: custID is actually RECID
  const custRecId = x?.custID ?? x?.custId ?? null;

  // ✅ Actual customerId/custId we want to show/store
  const realCustId = resolveCustIdFromRecId ? resolveCustIdFromRecId(custRecId) : "";

  const followUpDate = x?.followUpDate || x?.followUp || "";
  const followUpTimeRaw =
    (x?.followUpTime ?? x?.followUp_Time ?? x?.followUpT ?? x?.followTime ?? "")?.toString?.() ?? "";
  const followUpTimeLabel = toTimeLabel12h(followUpTimeRaw);

  const saleOwner = (x?.saleOwner ?? x?.salesOwner ?? x?.createdByName ?? "").toString();
  const saleOwnerCode = (x?.saleOwnerCode ?? x?.salesOwnerCode ?? x?.createdByCode ?? "").toString();
  const saleOwnerEmail = (x?.saleOwnerEmail ?? x?.createdByEmail ?? "").toString();

  const saleOwnerRecId = resolveOwnerRecId({
    name: saleOwner,
    code: saleOwnerCode,
    email: saleOwnerEmail,
  });

  const apiType = x?.type;

  return {
    id,
    leadOpp_ID: id,
    prospectId: toProspectId(id),

    // ✅ Prospect Type should use REAL custId, not custRecId
    prospectType: toProspectType(apiType, realCustId),
    apiType: (apiType ?? "").toString(),

    // ✅ Keep both
    custRecId,
    custID: realCustId,

    customerName: (x?.customerName ?? x?.custName ?? "").toString(),
    mobileNumber: (x?.mobileNumber ?? x?.mobile ?? x?.phone ?? "").toString(),
    status: (x?.status ?? x?.oppStatus ?? "").toString(),

    followUpDate,
    followUpTimeRaw: followUpTimeRaw.toString(),
    followUpTimeLabel,

    disposition: (x?.disposition ?? "").toString(),
    remark: (x?.remark ?? x?.remarks ?? "").toString(),

    saleOwner,
    saleOwnerCode,
    saleOwnerEmail,
    saleOwnerRecId,

    modifiedBy: (x?.modifiedBy ?? "").toString(),
    modifiedDate: x?.modifiedDate || "",
    createdDate: x?.createdDate || "",

    customerMsg: (x?.customerMsg ?? x?.customerMessage ?? "").toString(),

    __q: [
      toProspectId(id),
      toProspectType(apiType, realCustId),
      apiType,
      realCustId,
      custRecId,
      x?.customerName,
      x?.custName,
      x?.mobileNumber,
      x?.mobile,
      x?.phone,
      x?.status,
      x?.oppStatus,
      followUpDate,
      followUpTimeRaw,
      followUpTimeLabel,
      x?.disposition,
      x?.remark,
      x?.remarks,
      saleOwner,
      saleOwnerCode,
      saleOwnerEmail,
      saleOwnerRecId,
      x?.modifiedBy,
      x?.modifiedDate,
      x?.createdDate,
    ]
      .map((t) => (t ?? "").toString().toLowerCase())
      .join(" | "),
  };
};


export default function ManualLeadsTable({ oppCode, header, onToast }) {
  const navigate = useNavigate();

  // ✅ read oppCode from URL:
  // e.g. /opportunity/details/Bright-00522  => params.oppCode = "Bright-00522"
  const params = useParams();
  const oppCodeFromUrl = params?.oppCode || params?.OppCode || "";

  // ✅ single source of truth for oppCode
  const effectiveOppCode = (oppCode || header?.oppCode || oppCodeFromUrl || "").toString().trim();

  // ✅ campaign header (top section)
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignErr, setCampaignErr] = useState("");
  const [campaignHeader, setCampaignHeader] = useState(null);

  // server paging
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(50);

  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [exporting, setExporting] = useState(false);

  // api data
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // employees lookup
  const [empLoading, setEmpLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // client filters
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [followTime, setFollowTime] = useState("");

  const [followDateMode, setFollowDateMode] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchDraft), 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // -----------------------------
  // ✅ Fetch Campaign Header by OppCode (TOP SECTION)
  // GET /api/LeadOpp/getCampaign/{OppCode}
  // -----------------------------
  useEffect(() => {
    let alive = true;

    const run = async () => {
      const code = effectiveOppCode;
      if (!code) return;

      setCampaignLoading(true);
      setCampaignErr("");

      try {
        const res = await fetch(`${API_BASE_URL}/api/LeadOpp/getCampaign/${encodeURIComponent(code)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);

        const data = JSON.parse(text);

        if (!alive) return;

        // ✅ if API returns object directly like you showed
        // {
        //   oppCode, oppName, oRuleDetails, oRuleCode, ...
        // }
        setCampaignHeader(data || null);
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
    return () => {
      alive = false;
    };
  }, [effectiveOppCode]);

  // ✅ choose header for UI (priority: campaignHeader -> prop header)
  const uiHeader = campaignHeader || header || {};
  const uiOppCode = (uiHeader?.oppCode || effectiveOppCode || "").toString().trim();

  // ✅ campaign recid (comes from /getCampaign/{OppCode})
const uiRecId = Number(uiHeader?.recid ?? uiHeader?.recId) || 0;

// ✅ this is what you will put in URL in place of oppCode
// fallback to oppCode if recid not available (avoids broken navigation)
const navId = uiRecId || uiOppCode;

const isR7 = String(uiHeader?.oRuleCode || "")
  .trim()
  .toUpperCase() === "R7";



  // -----------------------------
  // ✅ Fetch employees (recId mapping)
  // -----------------------------
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setEmpLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/Employees`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

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
    return () => {
      alive = false;
    };
  }, []);

  // Build lookup maps
  const empLookup = useMemo(() => {
    const byName = new Map();
    const byCode = new Map();
    const byEmail = new Map();

    for (const e of employees) {
      const recId = e?.recId;
      if (!recId && recId !== 0) continue;

      const nameKey = norm(e?.employeeName);
      const codeKey = norm(e?.employeeCode);
      const emailKey = norm(e?.emailID);

      if (nameKey) byName.set(nameKey, recId);
      if (codeKey) byCode.set(codeKey, recId);
      if (emailKey) byEmail.set(emailKey, recId);
    }

    return { byName, byCode, byEmail };
  }, [employees]);

  // Resolver: tries code -> email -> name
  const resolveOwnerRecId = ({ name, code, email }) => {
    const ck = norm(code);
    if (ck && empLookup.byCode.has(ck)) return empLookup.byCode.get(ck);

    const ek = norm(email);
    if (ek && empLookup.byEmail.has(ek)) return empLookup.byEmail.get(ek);

    const nk = norm(name);
    if (nk && empLookup.byName.has(nk)) return empLookup.byName.get(nk);

    return "";
  };

  // customers lookup (recId -> custId)
const [custLoading, setCustLoading] = useState(false);
const [custErr, setCustErr] = useState("");
const [customers, setCustomers] = useState([]);

// ✅ Load customers (for mapping recId -> custId)
useEffect(() => {
  let alive = true;

  const run = async () => {
    setCustLoading(true);
    setCustErr("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);

      const data = JSON.parse(text);

      // adjust if your API wraps in {data:[...]}
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
  return () => {
    alive = false;
  };
}, []);


const custLookup = useMemo(() => {
  const byRecId = new Map();
  for (const c of customers) {
    const recId = c?.recId ?? c?.RECID ?? c?.RecID;
    const custId = c?.custId ?? c?.CUSTID ?? c?.customerID ?? c?.customerId;

    if (recId !== null && recId !== undefined && recId !== "" && custId) {
      byRecId.set(String(recId), String(custId));
    }
  }
  return { byRecId };
}, [customers]);

const resolveCustomerIdFromRecId = (recIdLike) => {
  const key = String(recIdLike ?? "").trim();
  if (!key) return "";
  return custLookup.byRecId.get(key) || "";
};


  // -----------------------------
  // Time helpers (12:00 AM -> 11:30 PM, 30-min steps)
  // -----------------------------
  const TIME_OPTIONS = useMemo(() => {
    const out = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour12 = ((h + 11) % 12) + 1;
        const ampm = h < 12 ? "AM" : "PM";
        const mm = String(m).padStart(2, "0");
        out.push(`${String(hour12).padStart(2, "0")}:${mm} ${ampm}`);
      }
    }
    return out;
  }, []);

  // -----------------------------
// Fetch manual leads
// -----------------------------
useEffect(() => {
  let alive = true;

  const run = async () => {
    // ✅ HARD GUARD: never call list API without campaignId
    if (!uiRecId) {
      setRows([]);
      setTotalPages(1);
      setTotalRecords(0);
      setErr(""); // or "Campaign not loaded yet"
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const url = buildLeadListUrl({
        baseUrl: API_BASE_URL,
        campaignId: uiRecId,   // ✅ always present now
        pageNumber,
        pageSize,
      });

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);

      const data = JSON.parse(text);
      const list = Array.isArray(data?.data) ? data.data : [];

      if (!alive) return;

      setRows(list.map((x) => mapManualLeadRow(x, resolveOwnerRecId, resolveCustomerIdFromRecId)));

      setTotalPages(Number(data?.totalPages) || 1);
      setTotalRecords(Number(data?.totalRecords) || list.length);
    } catch (e) {
      console.error(e);
      if (!alive) return;
      setRows([]);
      setTotalPages(1);
      setTotalRecords(0);
      setErr("Failed to load manual leads.");
    } finally {
      if (alive) setLoading(false);
    }
  };

  run();
  return () => {
    alive = false;
  };
}, [uiRecId, pageNumber, pageSize, empLookup, custLookup]); // ✅ include uiRecId


useEffect(() => {
  if (uiRecId) setPageNumber(1);
}, [uiRecId]);


  // owner options from current page (still showing name)
  const ownerOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const n = String(r?.saleOwner || "").trim();
      if (n) set.add(n);
    });
    return ["", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows.slice();

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

    // ✅ Follow Up Date filters
    if (followDateMode === "0") {
      const today = toISODateOnly(new Date());
      list = list.filter((r) => toISODateOnly(r?.followUpDate) === today);
    } else if (followDateMode === "1") {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      const tomorrow = toISODateOnly(t);
      list = list.filter((r) => toISODateOnly(r?.followUpDate) === tomorrow);
    } else if (followDateMode === "2") {
      if (rangeFrom && rangeTo) {
        const f = +new Date(rangeFrom);
        const t = +new Date(rangeTo);
        list = list.filter((r) => {
          const stamp = +new Date(toISODateOnly(r?.followUpDate));
          return !Number.isNaN(stamp) && stamp >= f && stamp <= t;
        });
      }
    }

    // ✅ Follow Up Time filter
    if (followTime) {
      const ft = norm(followTime);
      list = list.filter((r) => norm(r?.followUpTimeLabel) === ft);
    }

    return list;
  }, [rows, searchTerm, statusFilter, ownerFilter, followDateMode, rangeFrom, rangeTo, followTime]);

  const openManualLead = (row) => {
    const leadId = row?.leadOpp_ID;

    navigate(`/manuallead/edit/${leadId}`, {
      state: {
        oppCode: uiOppCode,
        header: uiHeader,
        leadOpp_ID: leadId,
        custID: row.custID,
        row,
        isManual: true,
        salesOwnerRecId: row.saleOwnerRecId,
      },
    });
  };

  const fetchAllLeads = async (campaignId) => {
  const exportPageSize = 200;
  let page = 1;
  let total = 1;
  const all = [];

  while (page <= total) {
    const url = buildLeadListUrl({
      baseUrl: API_BASE_URL,
      campaignId,
      pageNumber: page,
      pageSize: exportPageSize,
    });

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);

    const data = JSON.parse(text);
    const list = Array.isArray(data?.data) ? data.data : [];

    total = Number(data?.totalPages) || 1;
    all.push(...list);
    page += 1;
  }

  return all;
};


  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      if (!uiRecId) {
  alert("Campaign not loaded yet..");
  return;
}
const raw = await fetchAllLeads(uiRecId);

      const mapped = raw.map((x) => mapManualLeadRow(x, resolveOwnerRecId));

      const exportRows = mapped;

      const excelRows = exportRows.map((r) => ({
        "Prospect ID": r.prospectId || "",
        "Prospect Type": r.prospectType || "",
        "LeadOpp ID": r.leadOpp_ID || "",
        "CustID": r.custID || "",
        "Customer Name": r.customerName || "",
        "Mobile": r.mobileNumber || "",
        "Status": r.status || "",
        "Follow Up Date": formatDDMMYYYY(r.followUpDate) || "",
        "Disposition": r.disposition || "",
        "Remarks": r.remark || "",
        "Sales Owner": r.saleOwner || "",
        "Modified By": r.modifiedBy || "",
        "Modified Date": formatDDMMYYYY(r.modifiedDate) || "",
        "Created Date": formatDDMMYYYY(r.createdDate) || "",
      }));

      const XLSX = await loadXLSX();
      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Manual Leads");

      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      downloadBlob(blob, exportFileName(uiOppCode));
      onToast?.(`Exported ${excelRows.length} rows`);
    } catch (e) {
      console.error("Export failed", e);
      alert(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

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

            {/* ✅ Optional: show campaign dates from API */}
            {uiHeader?.oppCampStartDate || uiHeader?.oppCampEndDate ? (
              <div className="pair">
                <span className="label">Campaign Period :</span>
                <span className="value">
                  {formatDDMMYYYY(uiHeader?.oppCampStartDate)} - {formatDDMMYYYY(uiHeader?.oppCampEndDate)}
                </span>
              </div>
            ) : null}

            {campaignLoading ? <div style={{ fontSize: 12, color: "#64748b" }}>Loading campaign…</div> : null}
            {campaignErr ? <div style={{ fontSize: 12, color: "#c33" }}>{campaignErr}</div> : null}

            {empLoading ? <div style={{ fontSize: 12, color: "#64748b" }}>Loading employees…</div> : null}
          </div>

          <div className="header-actions">
           <button className="btn-export" onClick={handleExport} disabled={exporting || loading}>
  {exporting ? "Exporting..." : "Export"}
</button>


            <button className="btn-back" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>

        <div className="filters-card">
          <div className="filters-grid">
            <div className="fgroup">
              <label className="flabel">OppStatus :</label>
              <select className="finput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="fgroup">
              <label className="flabel">Sales Owner :</label>
              <select className="finput" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                <option value="">- &lt; Select one &gt; -</option>
                {ownerOptions.map((o, i) => (
                  <option key={i} value={o}>
                    {o || "(Unassigned)"}
                  </option>
                ))}
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
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

           {!isR7 && (
  <>
    <button
      className="btn-primary"
      onClick={() => {
        const code = oppCode || (header?.oppCode ?? "");
        if (!code) return;
        navigate(`/manuallead/${code}`, { state: { oppCode: code, header } });
      }}
    >
      Add Lead
    </button>

    <button
      className="btn-primary"
      onClick={() => {
        const code = oppCode || (header?.oppCode ?? "");
        if (!code) return;
        navigate(`/opportunity/customers`, { state: { oppCode: code, header } });
      }}
    >
      Add Opportunity
    </button>
  </>
)}

          </div>
        </div>

        <div style={{ marginTop: 12, marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
          <input
            className="finput"
            style={{ width: 320 }}
            placeholder="Search (Prospect, Customer, Status, Owner, Disposition)"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>

        {loading ? <div className="loading-msg">Loading…</div> : null}
        {err ? (
          <div className="loading-msg" style={{ color: "#c33" }}>
            {err}
          </div>
        ) : null}

        {!loading && !err && filtered.length ? (
          <div className="table-wrap">
            <table className="opptable">
              <thead>
                <tr>
                  <th>Prospect ID</th>
                  <th>Prospect Type</th>
                  <th>Customer ID</th>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th>Status</th>
                  <th>Follow Up Date</th>
                  <th>Disposition</th>
                  <th>Remarks</th>
                  <th>Sales Owner</th>
                  <th>Modified By</th>
                  <th>Modified Date</th>
                  <th>Created Date</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r) => (
                  <tr key={r.leadOpp_ID}>
                    <td>
                      <button className="linkish" onClick={() => openManualLead(r)}>
                        {safe(r.prospectId)}
                      </button>
                    </td>

                    {/* ✅ Type now comes from API */}
                    <td>{safe(r.prospectType)}</td>

                    <td>{safe(r.custID)}</td>
                    <td>{safe(r.customerName)}</td>
                    <td>{safe(r.mobileNumber)}</td>
                    <td>{safe(r.status)}</td>

                    {/* ✅ date + time */}
                    <td>{formatDateTime(r.followUpDate, r.followUpTimeLabel)}</td>

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
        ) : null}

        {!loading && !err && !filtered.length ? <div className="empty-note">No  entries found.</div> : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Total records: <strong>{totalRecords}</strong>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-export" style={{ padding: "8px 12px" }} onClick={() => setPageNumber(1)} disabled={pageNumber <= 1}>
              First
            </button>
            <button className="btn-export" style={{ padding: "8px 12px" }} onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
              Prev
            </button>
            <div style={{ fontSize: 13, color: "#334155" }}>
              Page <strong>{pageNumber}</strong> / <strong>{totalPages}</strong>
            </div>
            <button className="btn-export" style={{ padding: "8px 12px" }} onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))} disabled={pageNumber >= totalPages}>
              Next
            </button>
            <button className="btn-export" style={{ padding: "8px 12px" }} onClick={() => setPageNumber(totalPages)} disabled={pageNumber >= totalPages}>
              Last
            </button>
          </div>
        </div>
      </div>

      <style jsx>
        {`
          .details-card {
            background: #fff;
            padding: 24px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          }
          .details-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }
          .title-col {
            display: grid;
            gap: 8px;
          }
          .pair {
            font-size: 16px;
            color: #333;
          }
          .label {
            display: inline-block;
            font-weight: 600;
            color: #555;
            margin-right: 8px;
            min-width: 180px;
          }
          .value {
            color: #222;
          }
          .pill {
            background: #eef3ff;
            color: #334b71;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 14px;
          }
          .header-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .btn-back {
            background: #14233c;
            color: #fff;
            border: 0;
            border-radius: 8px;
            padding: 10px 18px;
            font-weight: 600;
            cursor: pointer;
          }
          .btn-back:hover {
            opacity: 0.95;
          }

          .btn-export {
            background: #223b63;
            color: #fff;
            border: 0;
            border-radius: 8px;
            padding: 10px 16px;
            font-weight: 600;
            cursor: pointer;
          }
          .btn-export:hover {
            opacity: 0.95;
          }
          .btn-export[disabled] {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .btn-primary {
            white-space: nowrap;
            background: #0f2445;
            color: #fff;
            border: 0;
            border-radius: 8px;
            padding: 10px 16px;
            font-weight: 700;
            cursor: pointer;
          }
          .btn-primary:hover {
            opacity: 0.95;
          }

          .filters-card {
            background: #f7f9fc;
            border: 1px solid #e6eaf2;
            border-radius: 10px;
            padding: 16px;
            margin-top: 10px;
          }
          .filters-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 12px 16px;
            align-items: end;
          }
          .fgroup {
            grid-column: span 3;
          }

          .flabel {
            display: block;
            font-size: 13px;
            color: #475569;
            margin-bottom: 6px;
            font-weight: 600;
          }
          .finput {
            width: 100%;
            height: 36px;
            border: 1px solid #d7ddea;
            border-radius: 6px;
            padding: 6px 10px;
            background: #fff;
            color: #222;
          }

          .table-wrap {
            margin-top: 16px;
            overflow-x: auto;
            border-radius: 10px;
          }
          .opptable {
            width: 100%;
            border-collapse: collapse;
            min-width: 1500px;
          }
          .opptable thead th {
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            color: #445;
            background: #f6f8fb;
            padding: 12px 14px;
            border-bottom: 1px solid #e8edf5;
            white-space: nowrap;
            user-select: none;
          }
          .opptable tbody td {
            font-size: 14px;
            color: #333;
            padding: 12px 14px;
            border-bottom: 1px solid #f0f2f6;
            vertical-align: middle;
            white-space: nowrap;
          }
          .opptable tbody tr:hover {
            background: #fafbfe;
          }

          .linkish {
            background: none;
            border: none;
            padding: 0;
            color: #2b5ec2;
            cursor: pointer;
            font-weight: 600;
          }

          .empty-note {
            margin-top: 12px;
            padding: 14px;
            background: #f9fafc;
            border: 1px dashed #e6eaf2;
            border-radius: 8px;
            color: #5c6b7a;
            font-size: 14px;
          }
          .loading-msg {
            padding: 40px;
            text-align: center;
            font-size: 18px;
            color: #666;
          }
        `}
      </style>
    </>
  );
}
