import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCenterCode = () => (getUser().centerCode || "").trim();

const PRIORITY_STYLE = {
  high:   { background: "#fee2e2", color: "#991b1b" },
  medium: { background: "#fef3c7", color: "#92400e" },
  low:    { background: "#d1fae5", color: "#065f46" },
};

const STATUS_STYLE = {
  open:       { background: "#dbeafe", color: "#1d4ed8" },
  closed:     { background: "#f0fdf4", color: "#166534" },
  inprogress: { background: "#fef3c7", color: "#92400e" },
  pending:    { background: "#f3e8ff", color: "#6b21a8" },
  draft:      { background: "#f0f2f5", color: "#4b5668" },
};

const badge = (val, map) => {
  const key = (val || "").toLowerCase().replace(/\s/g, "");
  const style = map[key] || { background: "#f0f2f5", color: "#4b5668" };
  return (
    <span style={{ ...style, display:"inline-block", padding:"3px 10px",
      borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      {val || "—"}
    </span>
  );
};

const PAGE_SIZE = 10;

const CaseTab = ({ custId }) => {
  const [cases, setCases]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    if (!custId) return;
    setLoading(true); setError("");
    fetch(`${API_BASE_URL}/api/CaseOperation/CaseListByCustWise/${custId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    })
      .then(r => r.json())
      .then(json => {
        const data = json?.data ?? json;
        setCases(Array.isArray(data) ? data : []);
        setPage(1);
      })
      .catch(e => setError(e.message || "Failed to load cases"))
      .finally(() => setLoading(false));
  }, [custId]);

  const filtered = cases.filter(c =>
    !search ||
    (c.caseNo     || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.caseTitle  || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.status     || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.category   || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="case-tab">
      <div className="ct-header">
        <div>
          <h4 className="sectttl">
            Cases <span className="sect-count">({cases.length})</span>
          </h4>
        </div>
        <input
          className="ct-search"
          placeholder="Search cases…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <p className="ct-loading">Loading cases…</p>
      ) : error ? (
        <div className="ct-error">{error}</div>
      ) : (
        <>
          <table className="cases-table">
            <thead>
              <tr>
                <th>Case No</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Sub Sub Category</th>
                <th>Case With</th>
                <th>Therapist</th>
                <th>Assigned To</th>
                <th>Owner</th>
                <th>Created Date</th>
                <th>Closed Date</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign:"center", padding:24, color:"#94a3b8" }}>
                    {search ? "No cases match your search." : "No cases found for this customer."}
                  </td>
                </tr>
              ) : pageRows.map((c, i) => (
                <tr key={c.recId || i}>
                  <td>
                    <Link to={`/cases/${c.caseNo}`} className="ct-link">
                      {c.caseNo}
                    </Link>
                  </td>
                  <td style={{ maxWidth:220, whiteSpace:"normal" }}>{c.caseTitle || "—"}</td>
                  <td>{badge(c.status,   STATUS_STYLE)}</td>
                  <td>{badge(c.priority, PRIORITY_STYLE)}</td>
                  <td>{c.category    || "—"}</td>
                  <td>{c.subCategory || "—"}</td>
                  <td>{c.subSubCategory || "—"}</td>
                  <td>{c.caseWith   || "—"}</td>
                  <td>{c.therapist  || "—"}</td>
                  <td>{c.assignTo   || "—"}</td>
                  <td>{c.owner      || "—"}</td>
                  <td style={{ whiteSpace:"nowrap" }}>
                    {c.createdDate ? new Date(c.createdDate).toLocaleDateString("en-GB",
                      { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                  </td>
                  <td style={{ whiteSpace:"nowrap" }}>{c.closureDate || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length > PAGE_SIZE && (
            <div className="pagination">
              <span className="pg-stats">
                {filtered.length} case{filtered.length !== 1 ? "s" : ""} • Page {page} of {totalPages}
              </span>
              <div className="pg-right">
                <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p-1))}
                  disabled={page === 1}>‹ Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i+1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i-1] > 1) acc.push("…");
                    acc.push(p); return acc;
                  }, [])
                  .map((p, i) => typeof p === "string"
                    ? <span key={i} style={{ padding:"0 4px", color:"#94a3b8" }}>…</span>
                    : <button key={p} className={`pg-btn${p === page ? " active" : ""}`}
                        onClick={() => setPage(p)}>{p}</button>
                  )}
                <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))}
                  disabled={page === totalPages}>Next ›</button>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .case-tab { padding: 30px; width: calc(100% - 300px);
          font-family: 'DM Sans', system-ui, sans-serif; }

        .ct-header { display:flex; align-items:center;
          justify-content:space-between; margin-bottom:16px; gap:12px; }
        .sectttl { font-size:15px; font-weight:700; color:#0f172a; margin:0; }
        .sect-count { font-weight:400; color:#94a3b8; font-size:13px; }
        .ct-search { height:34px; border:1.5px solid #d8dee8; border-radius:8px;
          padding:0 12px; font-size:13px; outline:none; width:220px; }
        .ct-search:focus { border-color:#334B71; }

        .cases-table { width:100%; border-collapse:collapse; background:#fff;
          border:1px solid #e2e8f0; border-radius:12px;
          box-shadow:0 4px 12px rgba(15,23,42,.06); overflow:hidden; }
        .cases-table th { background:#334B71; color:#fff; font-weight:600;
          font-size:13px; text-align:left; padding:12px 16px; white-space:nowrap; }
        .cases-table td { padding:11px 16px; font-size:13px; color:#0f172a;
          border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .cases-table tr:last-child td { border-bottom:none; }
        .cases-table tbody tr:hover { background:#f8fafc; }

        .ct-link { color:#334B71; font-weight:700; text-decoration:none; }
        .ct-link:hover { text-decoration:underline; }

        .ct-loading { color:#94a3b8; padding:20px 0; font-size:14px; }
        .ct-error   { padding:12px 16px; background:#fee2e2; color:#991b1b;
          border-radius:8px; font-size:13px; }

        .pagination { margin:14px 0 0; display:flex; align-items:center;
          justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .pg-stats { font-size:13px; color:#475569; }
        .pg-right { display:flex; gap:4px; }
        .pg-btn { background:#fff; border:1px solid #cbd5e1; color:#0f172a;
          padding:5px 10px; border-radius:7px; cursor:pointer; font-size:13px; }
        .pg-btn:hover:not(:disabled) { background:#f1f5f9; }
        .pg-btn:disabled { opacity:.45; cursor:not-allowed; }
        .pg-btn.active { background:#334B71; border-color:#334B71;
          color:#fff; font-weight:700; }
      `}</style>
    </div>
  );
};

export default CaseTab;