// src/pages/Opportunity/ManualLeadsTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

// Prospect Type rule:
// if custID is null/empty => Opportunity else => Lead
const toProspectType = (custID) => (isEmpty(custID) ? "Lead" : "Opportunity");

// normalize string for lookups
const norm = (v) => String(v ?? "").trim().toLowerCase();

// -----------------------------
// Row mapper (needs resolver for recId)
// -----------------------------
const mapManualLeadRow = (x, resolveOwnerRecId) => {
  const id = Number(x?.leadOpp_ID) || 0;

  // defensively read cust id
  const custID = x?.custID ?? x?.custId ?? null;

  // owner fields can vary across APIs
  const saleOwner =
    (x?.saleOwner ?? x?.salesOwner ?? x?.createdByName ?? "").toString();

  const saleOwnerCode =
    (x?.saleOwnerCode ?? x?.salesOwnerCode ?? x?.createdByCode ?? "").toString();

  const saleOwnerEmail =
    (x?.saleOwnerEmail ?? x?.createdByEmail ?? "").toString();

  const saleOwnerRecId = resolveOwnerRecId({
    name: saleOwner,
    code: saleOwnerCode,
    email: saleOwnerEmail,
  });

  return {
    id,
    leadOpp_ID: id,
    prospectId: toProspectId(id),
    prospectType: toProspectType(custID),

    custID,
    customerName: (x?.customerName ?? x?.custName ?? "").toString(),

    mobileNumber: (x?.mobileNumber ?? x?.mobile ?? x?.phone ?? "").toString(),

    status: (x?.status ?? x?.oppStatus ?? "").toString(),

    followUpDate: x?.followUpDate || x?.followUp || "",
    disposition: (x?.disposition ?? "").toString(),
    remark: (x?.remark ?? x?.remarks ?? "").toString(),

    // ✅ Sales owner fields
    saleOwner,
    saleOwnerCode,
    saleOwnerEmail,
    saleOwnerRecId, // ✅ THIS is what you want to send

    modifiedBy: (x?.modifiedBy ?? "").toString(),
    modifiedDate: x?.modifiedDate || "",
    createdDate: x?.createdDate || "",

    customerMsg: (x?.customerMsg ?? x?.customerMessage ?? "").toString(),

    __q: [
      toProspectId(id),
      toProspectType(custID),
      custID,
      x?.customerName,
      x?.custName,
      x?.mobileNumber,
      x?.mobile,
      x?.phone,
      x?.status,
      x?.oppStatus,
      x?.followUpDate,
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

  // server paging
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(50);

  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // api data
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // employees lookup
  const [empLoading, setEmpLoading] = useState(false);
  const [employees, setEmployees] = useState([]); // raw list

  // client filters
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [followDateMode, setFollowDateMode] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchDraft), 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

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
    // key -> recId
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

    return ""; // not found
  };

  // -----------------------------
  // Fetch manual leads
  // -----------------------------
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setErr("");

      try {
        const url = `${API_BASE_URL}/api/LeadOpp/List?pageNumber=${pageNumber}&pageSize=${pageSize}`;

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

        // ✅ map rows AFTER employee list is available (still works if empty)
        setRows(list.map((x) => mapManualLeadRow(x, resolveOwnerRecId)));
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
    // IMPORTANT: include empLookup to re-map when employees arrive
  }, [pageNumber, pageSize, empLookup]); // eslint-disable-line react-hooks/exhaustive-deps

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

    return list;
  }, [rows, searchTerm, statusFilter, ownerFilter, followDateMode, rangeFrom, rangeTo]);

  const openManualLead = (row) => {
  const leadId = row?.leadOpp_ID;

  navigate(`/manuallead/edit/${leadId}`, {
    state: {
      oppCode,
      header,

      // ✅ the id you want
      leadOpp_ID: leadId,

      // optional extras
      custID: row.custID,
      row,
      isManual: true,

      // ✅ Sales owner recId (you already added this)
      salesOwnerRecId: row.saleOwnerRecId,
    },
  });
};


  return (
    <>
      <div className="details-card">
        <div className="details-header">
          <div className="title-col">
            <div className="pair">
              <span className="label">Opportunity Code :</span>
              <span className="value pill">{safe(header?.oppCode || oppCode)}</span>
            </div>
            <div className="pair">
              <span className="label">Opportunity Name :</span>
              <span className="value">{safe(header?.oppName)}</span>
            </div>
            <div className="pair">
              <span className="label">Rule Details :</span>
              <span className="value">{safe(header?.oRuleDetails || header?.oRuleCode)}</span>
            </div>

            {/* optional: show employee lookup status */}
            {empLoading ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>Loading employees…</div>
            ) : null}
          </div>

          <div className="header-actions">
            <button className="btn-export" onClick={() => onToast?.("Export for manual leads can be added next.")}>
              Export
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
                  <th>CustID</th>
                  <th>CustName</th>
                  <th>Mobile Number</th>
                  <th>OppStatus</th>
                  <th>Follow Up Date</th>
                  <th>Disposition</th>
                  <th>Remarks</th>
                  <th>Sales Owner</th>
                  <th>Modified By</th>
                  <th>Modified Date</th>
                  <th>Created Date</th>
                  <th>Customer Message</th>
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
                    <td>{safe(r.prospectType)}</td>
                    <td>{safe(r.custID)}</td>
                    <td>{safe(r.customerName)}</td>
                    <td>{safe(r.mobileNumber)}</td>
                    <td>{safe(r.status)}</td>
                    <td>{formatDDMMYYYY(r.followUpDate)}</td>
                    <td>{safe(r.disposition)}</td>
                    <td>{safe(r.remark)}</td>

                    {/* UI shows name (like screenshot), but we carry + send recId */}
                    <td title={r.saleOwnerRecId ? `recId: ${r.saleOwnerRecId}` : "recId not found"}>
                      {safe(r.saleOwner)}
                    </td>

                    <td>{safe(r.modifiedBy)}</td>
                    <td>{formatDDMMYYYY(r.modifiedDate)}</td>
                    <td>{formatDDMMYYYY(r.createdDate)}</td>
                    <td>{safe(r.customerMsg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !err && !filtered.length ? (
          <div className="empty-note">No manual leads found.</div>
        ) : null}

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
