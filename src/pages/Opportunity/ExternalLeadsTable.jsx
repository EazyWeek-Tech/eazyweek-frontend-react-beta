"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/** -----------------------------
 * Date helpers
 * ----------------------------- */
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

  // "dd/MM/yyyy" -> ISO
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

const safe = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : v;

/** -----------------------------
 * API helpers
 * ----------------------------- */

// ✅ campaign header (to know oRuleCode, oppName, etc.)
const GET_CAMPAIGN_URL = (oppCode) =>
  `${API_BASE_URL}/api/LeadOpp/getCampaign/${encodeURIComponent(oppCode)}`;

// ✅ LoadOppDetails: try GET (querystring) first, fallback POST if needed
const fetchOppDetails = async ({ oppCode, fromISO, toISO }) => {
  const qs = new URLSearchParams();
  qs.set("oppCode", String(oppCode || "").trim());
  if (fromISO) qs.set("fromDate", `${fromISO}T00:00:00.000Z`);
  if (toISO) qs.set("toDate", `${toISO}T23:59:59.999Z`);

  // 1) Try GET ?oppCode=&fromDate=&toDate=
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/Opportunity/LoadOppDetails?${qs.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      }
    );

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
    const data = JSON.parse(text);

    // API might return single object or array
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return data ? [data] : [];
  } catch (e) {
    // 2) Fallback POST with JSON body (in case backend expects body)
    const payload = {
      oppCode: String(oppCode || "").trim(),
      fromDate: fromISO ? `${fromISO}T00:00:00.000Z` : new Date().toISOString(),
      toDate: toISO ? `${toISO}T23:59:59.999Z` : new Date().toISOString(),
    };

    const res = await fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
    const data = JSON.parse(text);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return data ? [data] : [];
  }
};

/** -----------------------------
 * Row mapper
 * ----------------------------- */
const normalizeOppStatus = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";

  // numeric codes
  if (s === "1") return "Open";
  if (s === "2") return "Closed";
  if (s === "WIP") return "WIP"

  // text variants
  const t = s.toLowerCase();
  if (t === "open") return "Open";
  if (t === "closed" || t === "close") return "Closed";

  // fallback (still try to keep it readable)
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};
const mapExternalRow = (x) => {
  const oppStatus = normalizeOppStatus(x?.oppStatus);

  return {
    recid: x?.recid ?? x?.recId ?? "",
    custID: (x?.custID ?? "").toString(),
    custName: (x?.custName ?? "").toString(),
    custMobileNo: (x?.custMobileNo ?? "").toString(),

    // ✅ add these so Details page can prefill
    therapistCode: (x?.therapistCode ?? "").toString().trim(),
    therapistname: (x?.therapistname ?? x?.therapistName ?? "").toString().trim(),

    interestedInCode: (x?.interestedInCode ?? "").toString().trim(),
    interestedInName: (x?.interestedInName ?? "").toString().trim(),

    dispositionCode: (x?.dispositionCode ?? "").toString().trim(),
    disposition: (x?.disposition ?? "").toString().trim(),

    subDispositionCode: (x?.subDispositionCode ?? "").toString().trim(),
    subDisposition: (x?.subDisposition ?? "").toString().trim(),

    oppStatus,
    remarks: (x?.remarks ?? "").toString(),
    salesOwner: (x?.salesOwner ?? "").toString(),
    createddate: x?.createddate ?? x?.createdDate ?? "",

    __q: [
      x?.custID,
      x?.custName,
      x?.custMobileNo,
      oppStatus,
      x?.disposition,
      x?.subDisposition,
      x?.remarks,
      x?.salesOwner,
      x?.createddate,
    ]
      .map((t) => (t ?? "").toString().toLowerCase())
      .join(" | "),
  };
};
export default function ExternalLeadsTable({ oppCode, header, onToast }) {
  const navigate = useNavigate();
  const params = useParams();

  const oppCodeFromUrl = params?.oppCode || params?.OppCode || "";
  const effectiveOppCode = (oppCode || header?.oppCode || oppCodeFromUrl || "")
    .toString()
    .trim();

  // -----------------------------
  // Pagination
  // -----------------------------
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // campaign header
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignErr, setCampaignErr] = useState("");
  const [campaignHeader, setCampaignHeader] = useState(null);

  // data
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // filters
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // optional date range for API
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // sorting
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc"); // asc|desc

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchDraft), 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // -----------------------------
  // Load campaign header (to confirm R7)
  // -----------------------------
  useEffect(() => {
    let alive = true;

    const run = async () => {
      const code = effectiveOppCode;
      if (!code) return;

      setCampaignLoading(true);
      setCampaignErr("");

      try {
        const res = await fetch(GET_CAMPAIGN_URL(code), {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
        const data = JSON.parse(text);

        if (!alive) return;
        setCampaignHeader(data || null);

        // ✅ set default date range from campaign if present
        const cs = toISODateOnly(data?.oppCampStartDate);
        const ce = toISODateOnly(data?.oppCampEndDate);
        if (cs && ce) {
          setFromDate(cs);
          setToDate(ce);
        }
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

  const uiHeader = campaignHeader || header || {};
  const uiOppCode = (uiHeader?.oppCode || effectiveOppCode || "").toString().trim();

  const isR7 = String(uiHeader?.oRuleCode || "")
    .trim()
    .toUpperCase() === "R7";

  // -----------------------------
  // Load external leads (R7) via LoadOppDetails
  // -----------------------------
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!uiOppCode) return;

      // If you only want this page for R7, keep this guard:
      if (campaignHeader && !isR7) {
        setRows([]);
        setErr("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr("");

      try {
        const list = await fetchOppDetails({
          oppCode: uiOppCode,
          fromISO: fromDate ? toISODateOnly(fromDate) : "",
          toISO: toDate ? toISODateOnly(toDate) : "",
        });

        if (!alive) return;
        setRows((list || []).map(mapExternalRow));
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setRows([]);
        setErr(e?.message || "Failed to load external leads.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [uiOppCode, isR7, campaignHeader, fromDate, toDate]);

  // Owner options
  const ownerOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const n = String(r?.salesOwner || "").trim();
      if (n) set.add(n);
    });
    return ["", ...Array.from(set)];
  }, [rows]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = rows.slice();

    const s = searchTerm.trim().toLowerCase();
    if (s) list = list.filter((r) => (r.__q || "").includes(s));

    if (statusFilter) {
      const st = statusFilter.toLowerCase();
      list = list.filter((r) => String(r?.oppStatus || "").toLowerCase() === st);
    }

    if (ownerFilter) {
      const ow = ownerFilter.toLowerCase();
      list = list.filter((r) => String(r?.salesOwner || "").toLowerCase() === ow);
    }

    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      list.sort((a, b) => {
        const av = (a?.[sortKey] ?? "").toString().toLowerCase();
        const bv = (b?.[sortKey] ?? "").toString().toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    return list;
  }, [rows, searchTerm, statusFilter, ownerFilter, sortKey, sortDir]);

  // ✅ reset page when any filter/search/sort/date changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, ownerFilter, fromDate, toDate, sortKey, sortDir]);

  // ✅ pagination calculations
  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const SortMark = ({ k }) => (
    <span className="sort" title="Sort" onClick={() => toggleSort(k)} role="button">
      ↕
    </span>
  );

  const renderPageButtons = () => {
    const windowSize = 5;
    let start = Math.max(1, safePage - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    const nodes = [];

    if (start > 1) {
      nodes.push(
        <button key="p1" className="pager-num" onClick={() => setPage(1)}>
          1
        </button>
      );
      if (start > 2) nodes.push(<span key="dots1" className="pager-dots">…</span>);
    }

    for (let i = start; i <= end; i++) {
      nodes.push(
        <button
          key={`p${i}`}
          className={`pager-num ${i === safePage ? "active" : ""}`}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) nodes.push(<span key="dots2" className="pager-dots">…</span>);
      nodes.push(
        <button
          key={`p${totalPages}`}
          className="pager-num"
          onClick={() => setPage(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return nodes;
  };

    const goToExternalLeadForm = (row) => {
  const leadOppId = row?.recid || row?.recId || "";

  navigate(
    `/opportunity/external/${encodeURIComponent(uiOppCode)}/lead/${encodeURIComponent(
      leadOppId
    )}`,
    {
      state: {
        oppCode: uiOppCode,
        header: uiHeader,
        row,
        leadKind: "External",
        leadOppId,
      },
    }
  );
};



  return (
    <>
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate("/opportunity")}>
          Opportunity
        </span>
        {" > "}
        <span className="breadcrumb-current">Details</span>
      </div>

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
              <span className="label">Rule Code :</span>
              <span className="value">{safe(uiHeader?.oRuleCode)}</span>
            </div>

            <div className="pair">
              <span className="label">Rule Details :</span>
              <span className="value">
                {safe(uiHeader?.oRuleDetails || uiHeader?.oRuleName || uiHeader?.oRuleCode)}
              </span>
            </div>

            {uiHeader?.oppCampStartDate || uiHeader?.oppCampEndDate ? (
              <div className="pair">
                <span className="label">Campaign Period :</span>
                <span className="value">
                  {formatDDMMYYYY(uiHeader?.oppCampStartDate)} -{" "}
                  {formatDDMMYYYY(uiHeader?.oppCampEndDate)}
                </span>
              </div>
            ) : null}

            {campaignLoading ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>Loading campaign…</div>
            ) : null}
            {campaignErr ? <div style={{ fontSize: 12, color: "#c33" }}>{campaignErr}</div> : null}

            {!campaignLoading && campaignHeader && !isR7 ? (
              <div style={{ fontSize: 12, color: "#c33" }}>
                This page is only for External Rule <strong>R7</strong>.
              </div>
            ) : null}
          </div>

          <div className="header-actions">
            <button className="btn-back" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-grid">
            <div className="fgroup">
              <label className="flabel">Status :</label>
              <select
                className="finput"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="WIP">WIP</option>
              </select>
            </div>

            <div className="fgroup">
              <label className="flabel">Sales Owner :</label>
              <select
                className="finput"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <option value="">- &lt; Select one &gt; -</option>
                {ownerOptions.map((o, i) => (
                  <option key={i} value={o}>
                    {o || "(Unassigned)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="fgroup">
              <label className="flabel">From :</label>
              <input
                type="date"
                className="finput"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="fgroup">
              <label className="flabel">To :</label>
              <input
                type="date"
                className="finput"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 12, marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
          <input
            className="finput"
            style={{ width: 320 }}
            placeholder="Search (Customer, Mobile, Status, Owner, Disposition)"
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
          <>
            <div className="table-wrap">
              <table className="opptable">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("custID")}>
                      Lead ID <SortMark k="custID" />
                    </th>
                    <th onClick={() => toggleSort("custName")}>
                      Lead Name <SortMark k="custName" />
                    </th>
                    <th onClick={() => toggleSort("custMobileNo")}>
                      MobileNo <SortMark k="custMobileNo" />
                    </th>
                    <th onClick={() => toggleSort("oppStatus")}>
                      Status <SortMark k="oppStatus" />
                    </th>
                    <th onClick={() => toggleSort("disposition")}>
                      Disposition <SortMark k="disposition" />
                    </th>
                    <th onClick={() => toggleSort("remarks")}>
                      Remarks <SortMark k="remarks" />
                    </th>
                    <th onClick={() => toggleSort("salesOwner")}>
                      Sales Owner <SortMark k="salesOwner" />
                    </th>
                    <th onClick={() => toggleSort("createddate")}>
                      Created Date <SortMark k="createddate" />
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pagedRows.map((r, idx) => (
                    <tr key={`${r.recid || "x"}-${idx}`}>
                     <td>
  <span
    className="leadLink"
    role="button"
    tabIndex={0}
    onClick={() => goToExternalLeadForm(r)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") goToExternalLeadForm(r);
    }}
    title="Open Lead"
  >
    {r.recid ? `LD-EX-${r.recid}` : "—"}
  </span>
</td>


                      <td>{safe(r.custName)}</td>
                      <td>{safe(r.custMobileNo)}</td>
                      <td>{safe(r.oppStatus)}</td>
                      <td>{safe(r.disposition)}</td>
                      <td>{safe(r.remarks)}</td>
                      <td>{safe(r.salesOwner)}</td>
                      <td>{formatDDMMYYYY(r.createddate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pager">
              <div className="pager-left">
                Showing{" "}
                <strong>
                  {(safePage - 1) * PAGE_SIZE + 1}-
                  {Math.min(safePage * PAGE_SIZE, totalRecords)}
                </strong>{" "}
                of <strong>{totalRecords}</strong>
              </div>

              <div className="pager-right">
                <button
                  className="pager-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>

                {renderPageButtons()}

                <button
                  className="pager-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}

        {!loading && !err && !filtered.length ? (
          <div className="empty-note">No entries found.</div>
        ) : null}
      </div>

      <style jsx>{`
        .details-card {
          background: #fff;
          padding: 24px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .leadLink {
  color: #334b71;
  font-weight: 700;
  cursor: pointer;
}
.leadLink:hover {
  opacity: 0.85;
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
          min-width: 1200px;
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
          cursor: pointer;
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

        .sort {
          margin-left: 8px;
          opacity: 0.7;
          cursor: pointer;
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

        /* Pagination */
        .pager {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pager-left {
          font-size: 13px;
          color: #64748b;
        }
        .pager-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .pager-btn {
          height: 34px;
          padding: 0 12px;
          border: 1px solid #d7ddea;
          background: #fff;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .pager-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pager-num {
          height: 34px;
          min-width: 34px;
          padding: 0 10px;
          border: 1px solid #d7ddea;
          background: #fff;
          border-radius: 8px;
          cursor: pointer;
        }
        .pager-num.active {
          background: #14233c;
          color: #fff;
          border-color: #14233c;
        }
        .pager-dots {
          padding: 0 6px;
          color: #64748b;
        }
      `}</style>
    </>
  );
}
