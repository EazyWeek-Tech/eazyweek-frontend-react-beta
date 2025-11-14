// src/pages/Opportunity/OpportunityDetails.jsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";

/** Date | 'yyyy-MM-dd' | 'dd/MM/yyyy' -> 'yyyy-MM-dd' */
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

/** 'dd/MM/yyyy' | ISO | Date -> JS Date (midnight) */
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const s = String(v).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return Number.isNaN(+d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Extract "HH:mm" from row. Tries followUpTime, appointmentdatetime, or createddate (24h) */
const getRowTimeHHmm = (row) => {
  const tryFields = [
    row?.followUpTime,
    row?.followuptime,
    row?.appointmentdatetime,
    row?.appointmentDateTime,
    row?.createddate,
  ].filter(Boolean);
  for (const f of tryFields) {
    const s = String(f);
    const mm = s.match(/\b(\d{1,2}):(\d{2})\b/);
    if (mm) {
      const h = String(Number(mm[1])).padStart(2, "0");
      const m = mm[2];
      return `${h}:${m}`;
    }
    const d = new Date(s);
    if (!Number.isNaN(+d)) {
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
  }
  return "";
};

/** Extract follow-up DATE from row (prefers explicit followUpDate) */
const getRowFollowUpDate = (row) => {
  const tryFields = [
    row?.followUpDate,
    row?.followupdate,
    row?.follow_up_date,
    row?.appointmentdatetime,
    row?.appointmentDateTime,
  ].filter(Boolean);
  for (const f of tryFields) {
    const d = toDate(f);
    if (d) return d;
  }
  return null;
};

/** Build half-hour slots from 01:00 -> 07:30 (used in UI filters) */
const HALF_HOURS_1_TO_730 = [
  "01:00","01:30",
  "02:00","02:30",
  "03:00","03:30",
  "04:00","04:30",
  "05:00","05:30",
  "06:00","06:30",
  "07:00","07:30",
];

/** Convert '01:30' + 'PM' -> '13:30' (12h -> 24h) */
const to24h = (slot, meridiem) => {
  if (!slot || !meridiem) return "";
  const [hh, mm] = slot.split(":").map(Number);
  const base = hh % 12; // 12 -> 0
  const h = meridiem === "PM" ? base + 12 : base;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

// robust recId getter (API casing can vary)
const getRecId = (row) => {
  const id = row?.RECID ?? row?.recID ?? row?.RecID ?? row?.recid ?? row?.id ?? 0;
  return Number(id) || 0;
};

const OpportunityDetails = () => {
  const { oppCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [header, setHeader] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------- Filters & table UX ----------
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Follow Up Date mode: ""=All, "0"=Today, "1"=Tomorrow, "2"=Date Range
  const [followDateMode, setFollowDateMode] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  // Follow-up time From (slot + AM/PM)
  const [timeFromSlot, setTimeFromSlot] = useState("");
  const [timeFromMer, setTimeFromMer] = useState("AM");
  // Follow-up time To
  const [timeToSlot, setTimeToSlot] = useState("");
  const [timeToMer, setTimeToMer] = useState("AM");

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const now = new Date();
        const defaultFrom = new Date(now);
        defaultFrom.setDate(now.getDate() - 13);

        const fromDate = state?.fromDate || toISODateOnly(defaultFrom);
        const toDate = state?.toDate || toISODateOnly(now);

        const payload = { oppCode, fromDate, toDate };

        const res = await fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const arr = Array.isArray(data) ? data : (data ? [data] : []);
        setHeader(arr[0] ?? null);
        setRows(arr);
      } catch (e) {
        console.error("Failed to load opportunity details:", e);
        setError("Failed to load details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [oppCode, state?.fromDate, state?.toDate]);

  const hasRows = rows?.length > 0;
  const safe = (v, fallback = "") => (v === null || v === undefined || v === "" ? fallback : v);

  // Primary header source:
  const top = useMemo(() => header ?? (hasRows ? rows[0] : null), [header, hasRows, rows]);

  // Fallback header when API returned no rows:
  const fallbackHeader = useMemo(
    () => ({
      oppCode: oppCode,
      oppName: state?.oppName || "—",
      oRuleDetails: state?.oRuleDetails || "—",
      oRuleXvalue: state?.oRuleXvalue || "—",
      oRuleCode: state?.oRuleCode || state?.oRuleDetails || "—",
    }),
    [oppCode, state?.oppName, state?.oRuleDetails, state?.oRuleXvalue, state?.oRuleCode]
  );

  const H = top || fallbackHeader;

  // Manual lead?
  const isManualLead = useMemo(() => {
    const code = (H?.oRuleCode || H?.oRuleDetails || "").toString().trim().toLowerCase();
    if (H?.manualLead || H?.isManualLead) return true;
    return code === "manual lead";
  }, [H]);

  // Distinct owner options from rows
  const ownerOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r?.salesOwner) set.add(String(r.salesOwner));
    });
    return ["", ...Array.from(set)];
  }, [rows]);

  // Quick date range boundaries based on followDateMode
  const dateRange = useMemo(() => {
    if (followDateMode === "") return null; // All

    const today = new Date();
    const make = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (followDateMode === "0") { // Today
      return { from: make(today), to: make(today) };
    }
    if (followDateMode === "1") { // Tomorrow
      const t = new Date(today);
      t.setDate(today.getDate() + 1);
      return { from: make(t), to: make(t) };
    }
    if (followDateMode === "2") { // Date Range
      if (!rangeFrom || !rangeTo) return null;
      const f = toDate(rangeFrom);
      const t = toDate(rangeTo);
      if (!f || !t) return null;
      return { from: make(f), to: make(t) };
    }
    return null;
  }, [followDateMode, rangeFrom, rangeTo]);

  // 24h filter times derived from slot + AM/PM
  const filterTimeFrom = useMemo(() => to24h(timeFromSlot, timeFromMer), [timeFromSlot, timeFromMer]);
  const filterTimeTo   = useMemo(() => to24h(timeToSlot,   timeToMer),   [timeToSlot,   timeToMer]);

  // Search, filter, and sort rows
  const filteredRows = useMemo(() => {
    let list = rows.slice();

    const s = searchTerm.trim().toLowerCase();
    if (s) {
      list = list.filter((r) =>
        String(r.custID || "").toLowerCase().includes(s) ||
        String(r.custName || "").toLowerCase().includes(s) ||
        String(r.custMobileNo || "").toLowerCase().includes(s) ||
        String(r.oppStatus || "").toLowerCase().includes(s) ||
        String(r.salesOwner || "").toLowerCase().includes(s)
      );
    }

    const inTimeWindow = (row) => {
      if (!filterTimeFrom && !filterTimeTo) return true;
      const hhmm = getRowTimeHHmm(row);
      if (!hhmm) return false;

      const toMin = (str) => {
        const [h, m] = str.split(":").map((x) => +x);
        return h * 60 + m;
      };
      const v = toMin(hhmm);
      if (filterTimeFrom && v < toMin(filterTimeFrom)) return false;
      if (filterTimeTo && v > toMin(filterTimeTo)) return false;
      return true;
    };

    if (isManualLead) {
      if (statusFilter) {
        list = list.filter((r) =>
          String(r?.oppStatus || "").toLowerCase() === statusFilter.toLowerCase()
        );
      }
      if (ownerFilter) {
        list = list.filter((r) =>
          String(r?.salesOwner || "").toLowerCase() === ownerFilter.toLowerCase()
        );
      }
      if (dateRange) {
        list = list.filter((r) => {
          const d = getRowFollowUpDate(r);
          if (!d) return false;
          const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          return dd >= dateRange.from && dd <= dateRange.to;
        });
      }
      list = list.filter(inTimeWindow);
    } else {
      list = list.filter(inTimeWindow);
    }

    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        const va = (a?.[key] ?? "").toString().toLowerCase();
        const vb = (b?.[key] ?? "").toString().toLowerCase();
        if (va < vb) return direction === "asc" ? -1 : 1;
        if (va > vb) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [
    rows,
    searchTerm,
    isManualLead,
    statusFilter,
    ownerFilter,
    dateRange,
    filterTimeFrom,
    filterTimeTo,
    sortConfig,
  ]);

  /** On click of CustID:
   *  - Navigate to OppCustomerDetails route
   *  - Pass oppCode + recId via state so OppCustomerDetails can call
   *    /api/Opportunity/OpportunityMoreDetails/{OppCode}/{RecId}
   */
  const openCustomer = (row) => {
    const recId = getRecId(row);
    const isManual = isManualLead || row?.manualLead || row?.isManualLead;
    navigate(`/opportunity/${oppCode}/customer/${row.custID}`, {
      state: {
        recId,
        oppCode,
        row,          // optional: original list row (for any fallback)
        header: H,
        isManual,
      },
    });
  };

  const exportCSV = () => {
    const colsManual = [
      "CustID","CustName","CustMobileNo","OppStatus","FollowUpDate",
      "Disposition","Remarks","CustomerMessage","SalesOwner","CreatedDate",
    ];
    const colsOther = [
      "CustID","CustName","CustMobileNo","OppStatus","AppointmentDate",
      "Disposition","Remarks","SalesOwner","CreatedDate",
    ];
    const headers = isManualLead ? colsManual : colsOther;

    const escape = (v) => {
      const s = v == null ? "" : String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.join(",")];
    filteredRows.forEach((r) => {
      const rowArr = isManualLead
        ? [
            r.custID,
            r.custName,
            r.custMobileNo,
            r.oppStatus,
            r.followUpDate || r.followupdate || r.appointmentdatetime || "",
            r.disposition,
            r.remarks,
            r.customerMessage || r.customer_message || "",
            r.salesOwner,
            r.createddate,
          ]
        : [
            r.custID,
            r.custName,
            r.custMobileNo,
            r.oppStatus,
            r.appointmentdatetime,
            r.disposition,
            r.remarks,
            r.salesOwner,
            r.createddate,
          ];
      lines.push(rowArr.map(escape).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${H?.oppCode || "opportunity"}-details.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  if (loading) return <div className="loading-msg">Loading…</div>;
  if (error) return <div className="loading-msg" style={{ color: "#c33" }}>{error}</div>;

  const sortArrow = (key) =>
    sortConfig.key === key ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <>
      <div className="dashboard-container">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate("/opportunity")}>
            Opportunity
          </span>
          {" > "}
          <span className="breadcrumb-current">Details</span>
        </div>

        <div className="details-card">
          {/* ---- Top header summary ---- */}
          <div className="details-header">
            <div className="title-col">
              <div className="pair">
                <span className="label">Opportunity Code :</span>
                <span className="value pill">{safe(H.oppCode, "—")}</span>
              </div>
              <div className="pair">
                <span className="label">Opportunity Name :</span>
                <span className="value">{safe(H.oppName, "—")}</span>
              </div>
              <div className="pair">
                <span className="label">Rule Details :</span>
                <span className="value">{safe(H.oRuleDetails || H.oRuleCode, "—")}</span>
              </div>
              <div className="xywrap">
                <div className="pair">
                  <span className="label short">X :</span>
                  <span className="value">{safe(H.oRuleXvalue, "—")}</span>
                </div>
                {safe(H.oRuleYvalue) ? (
                  <div className="pair">
                    <span className="label short">Y :</span>
                    <span className="value">{H.oRuleYvalue}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="header-actions">
              <button className="btn-export" onClick={exportCSV}>Export</button>
              <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
            </div>
          </div>

          {/* ---- Filter strip ---- */}
          <div className="filters-card">
            {isManualLead ? (
              <div className="filters-grid">
                {/* Status */}
                <div className="fgroup">
                  <label className="flabel">Status :</label>
                  <select className="finput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All</option>
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Sales Owner */}
                <div className="fgroup">
                  <label className="flabel">Sales Owner :</label>
                  <select className="finput" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                    <option value="">- &lt; Select one &gt; -</option>
                    {ownerOptions.map((o, i) => (
                      <option key={i} value={o}>{o || "(Unassigned)"}</option>
                    ))}
                  </select>
                </div>

                {/* Follow Up Date mode */}
                <div className="fgroup">
                  <label className="flabel">Follow Up Date :</label>
                  <select
                    className="finput"
                    value={followDateMode}
                    onChange={(e) => setFollowDateMode(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="0">Today</option>
                    <option value="1">Tomorrow</option>
                    <option value="2">Date Range</option>
                  </select>
                </div>

                {/* Date range inputs */}
                {followDateMode === "2" && (
                  <>
                    <div className="fgroup">
                      <label className="flabel">From :</label>
                      <input
                        type="date"
                        className="finput"
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                      />
                    </div>
                    <div className="fgroup">
                      <label className="flabel">To :</label>
                      <input
                        type="date"
                        className="finput"
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Follow Up time From */}
                <div className="fgroup ftime">
                  <label className="flabel">Follow Up time (From) :</label>
                  <div className="ftime-row">
                    <select className="finput" value={timeFromSlot} onChange={(e) => setTimeFromSlot(e.target.value)}>
                      <option value="">—</option>
                      {HALF_HOURS_1_TO_730.map((t) => <option key={`fs-${t}`} value={t}>{t}</option>)}
                    </select>
                    <select className="finput" value={timeFromMer} onChange={(e) => setTimeFromMer(e.target.value)}>
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>

                {/* Actions — ONLY for manual lead */}
                <div className="factions">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const code = oppCode || (H?.oppCode ?? "");
                      if (code) {
                        navigate(`/opportunity/${code}/customers`, { state: { oppCode: code } });
                      } else {
                        navigate(`/opportunity/customers`, { state: { oppCode: code } });
                      }
                    }}
                  >
                    Add Lead
                  </button>
                </div>
              </div>
            ) : (
              // Non-manual lead: no Add Lead button
              <div className="filters-grid">
                <div className="fgroup">
                  <label className="flabel">Status :</label>
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
                      <option key={i} value={o}>{o || "(Unassigned)"}</option>
                    ))}
                  </select>
                </div>

                <div className="fgroup">
                  <label className="flabel">Follow Up Date :</label>
                  <select
                    className="finput"
                    value={followDateMode}
                    onChange={(e) => setFollowDateMode(e.target.value)}
                  >
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
                      <input
                        type="date"
                        className="finput"
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                      />
                    </div>
                    <div className="fgroup">
                      <label className="flabel">To :</label>
                      <input
                        type="date"
                        className="finput"
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="fgroup ftime">
                  <label className="flabel">Follow Up time (From) :</label>
                  <div className="ftime-row">
                    <select className="finput" value={timeFromSlot} onChange={(e) => setTimeFromSlot(e.target.value)}>
                      <option value="">—</option>
                      {HALF_HOURS_1_TO_730.map((t) => <option key={`fs-${t}`} value={t}>{t}</option>)}
                    </select>
                    <select className="finput" value={timeFromMer} onChange={(e) => setTimeFromMer(e.target.value)}>
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---- Search ---- */}
          <div style={{ marginTop: 12, marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
            <input
              className="finput"
              style={{ width: 280 }}
              placeholder="Search (ID, Name, Phone, Status, Owner)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* ---- Table ---- */}
          {filteredRows.length > 0 ? (
            <div className="table-wrap">
              <table className="opptable">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("custID")}>CustID <span className="sort">{sortArrow("custID")}</span></th>
                    <th onClick={() => handleSort("custName")}>CustName <span className="sort">{sortArrow("custName")}</span></th>
                    <th onClick={() => handleSort("custMobileNo")}>CustMobileNo <span className="sort">{sortArrow("custMobileNo")}</span></th>
                    <th onClick={() => handleSort("oppStatus")}>OppStatus <span className="sort">{sortArrow("oppStatus")}</span></th>
                    <th onClick={() => handleSort(isManualLead ? "followUpDate" : "appointmentdatetime")}>
                      {isManualLead ? "Follow Up Date" : "Appointment Date"}{" "}
                      <span className="sort">{sortArrow(isManualLead ? "followUpDate" : "appointmentdatetime")}</span>
                    </th>
                    <th onClick={() => handleSort("disposition")}>Disposition <span className="sort">{sortArrow("disposition")}</span></th>
                    <th onClick={() => handleSort("remarks")}>Remarks <span className="sort">{sortArrow("remarks")}</span></th>
                    {isManualLead ? (
                      <th onClick={() => handleSort("customerMessage")}>
                        Customer Message <span className="sort">{sortArrow("customerMessage")}</span>
                      </th>
                    ) : null}
                    <th onClick={() => handleSort("salesOwner")}>Sales Owner <span className="sort">{sortArrow("salesOwner")}</span></th>
                    <th onClick={() => handleSort("createddate")}>Created Date <span className="sort">{sortArrow("createddate")}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={`${r.recid || r.custID || i}-${i}`}>
                      <td>
                        <button className="linkish" onClick={() => openCustomer(r)}>
                          {safe(r.custID, "—")}
                        </button>
                      </td>
                      <td>{safe(r.custName, "—")}</td>
                      <td>{safe(r.custMobileNo, "—")}</td>
                      <td>{safe(r.oppStatus, "—")}</td>
                      {isManualLead ? (
                        <td>{safe(r.followUpDate || r.followupdate || r.appointmentdatetime, "—")}</td>
                      ) : (
                        <td>{safe(r.appointmentdatetime, "—")}</td>
                      )}
                      <td>{safe(r.disposition, "—")}</td>
                      <td>{safe(r.remarks, "—")}</td>
                      {isManualLead ? <td>{safe(r.customerMessage || r.customer_message, "—")}</td> : null}
                      <td>{safe(r.salesOwner, "—")}</td>
                      <td>{safe(r.createddate, "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-note">No data found for this opportunity.</div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .breadcrumb { font-size:14px; color:#6c757d; margin-bottom:16px; }
        .breadcrumb-link { color:#334b71; cursor:pointer; }
        .breadcrumb-link:hover { text-decoration:underline; }
        .breadcrumb-current { color:#888; }
        .details-card { background:#fff; padding:24px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .details-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px; }
        .title-col { display:grid; gap:8px; }
        .pair { font-size:16px; color:#333; }
        .label { display:inline-block; font-weight:600; color:#555; margin-right:8px; min-width:180px; }
        .label.short { min-width:20px; }
        .value { color:#222; }
        .xywrap { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px 24px; max-width:640px; }
        .pill { background:#eef3ff; color:#334b71; padding:4px 10px; border-radius:20px; font-size:14px; }
        .header-actions { display:flex; gap:10px; }
        .btn-back { background:#14233c; color:#fff; border:0; border-radius:8px; padding:10px 18px; font-weight:600; cursor:pointer; }
        .btn-back:hover { opacity:.95; }
        .btn-export { background:#223b63; color:#fff; border:0; border-radius:8px; padding:10px 16px; font-weight:600; cursor:pointer; }
        .btn-export:hover { opacity:.95; }

        .filters-card { background:#f7f9fc; border:1px solid #e6eaf2; border-radius:10px; padding:16px; margin-top:10px; }
        .filters-grid { display:grid; grid-template-columns: repeat(12, 1fr); gap:12px 16px; align-items:end; }
        .fgroup { grid-column: span 3; }
        .fgroup.ftime { grid-column: span 3; }
        .ftime-row { display:flex; gap:8px; }
        .flabel { display:block; font-size:13px; color:#475569; margin-bottom:6px; font-weight:600; }
        .finput { width:100%; height:36px; border:1px solid #d7ddea; border-radius:6px; padding:6px 10px; background:#fff; color:#222; }
        .factions { grid-column: span 2; display:flex; justify-content:flex-start; gap:8px; }
        .btn-primary { background:#0f2445; color:#fff; border:0; border-radius:8px; padding:10px 16px; font-weight:700; cursor:pointer; }
        .btn-primary:hover { opacity:.95; }

        .table-wrap { margin-top:16px; overflow-x:auto; border-radius:10px; }
        .opptable { width:100%; border-collapse:collapse; min-width:1000px; }
        .opptable thead th { text-align:left; font-weight:600; font-size:14px; color:#445; background:#f6f8fb; padding:12px 14px; border-bottom:1px solid #e8edf5; white-space:nowrap; cursor:pointer; user-select:none; }
        .opptable tbody td { font-size:14px; color:#333; padding:12px 14px; border-bottom:1px solid #f0f2f6; vertical-align:middle; }
        .opptable tbody tr:hover { background:#fafbfe; }
        .linkish { background:none; border:none; padding:0; color:#2b5ec2; cursor:pointer; font-weight:600; }
        .sort { margin-left:6px; color:#6b7280; font-size:12px; }
        .empty-note { margin-top:12px; padding:14px; background:#f9fafc; border:1px dashed #e6eaf2; border-radius:8px; color:#5c6b7a; font-size:14px; }
        .loading-msg { padding:40px; text-align:center; font-size:18px; color:#666; }
      `}</style>
    </>
  );
};

export default OpportunityDetails;
