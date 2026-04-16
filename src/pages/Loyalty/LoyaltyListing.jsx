import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL as API_BASE } from "../../config";

// ── API ───────────────────────────────────────────────────────────────────────
const fetchLoyaltyPrograms = async (pageNumber = 1, pageSize = 10) => {
  const res = await fetch(
    `${API_BASE}/api/LoyaltyProgram/program/list?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }
  );
  if (res.status === 304 || res.status === 404 || res.status === 204)
    return { data: [], totalRecords: 0, totalPages: 0, pageNumber, pageSize };
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try { const b = await res.json(); if (b?.message || b?.error) msg = b.message ?? b.error; } catch (_) {}
    throw new Error(msg);
  }
  try {
    const json = await res.json();
    return {
      data: json.data ?? [],
      totalRecords: json.totalRecords ?? 0,
      totalPages: json.totalPages ?? Math.ceil((json.totalRecords ?? 0) / pageSize),
      pageNumber: json.pageNumber ?? pageNumber,
      pageSize: json.pageSize ?? pageSize,
    };
  } catch (_) { return { data: [], totalRecords: 0, totalPages: 0, pageNumber, pageSize }; }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ── Sub-components ────────────────────────────────────────────────────────────
const Badge = ({ active }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
    background: active ? "#e6f4ef" : "#fdf3f3",
    color: active ? "#2e7d5e" : "#b94a3a",
    border: `1px solid ${active ? "#b3d9cc" : "#f0c4c0"}`,
    letterSpacing: "0.02em", whiteSpace: "nowrap",
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#2e7d5e" : "#cc6b5c", display: "inline-block" }} />
    {active ? "Active" : "Inactive"}
  </span>
);

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LoyaltyListing() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalRecords: 0, totalPages: 0, pageNumber: 1, pageSize: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);

  const loadPrograms = (p = 1) => {
    setLoading(true);
    fetchLoyaltyPrograms(p, meta.pageSize)
      .then((res) => {
        setRows(res.data);
        setMeta({ totalRecords: res.totalRecords, totalPages: res.totalPages, pageNumber: res.pageNumber, pageSize: res.pageSize });
        setPage(p);
      })
      .catch((err) => { console.error(err); setError("Failed to load loyalty programs."); setRows([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPrograms(1); }, []);

  const hasProgram = rows.length > 0;
  const latestProgram = rows[0] ?? null;

  return (
    <div className="ll-page">

      {/* ── Toolbar ── */}
      <div className="ll-toolbar">
        <div className="ll-toolbar-left">
          <div className="ll-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div>
            <h1 className="ll-title">Loyalty Programs</h1>
            <p className="ll-subtitle">
              {loading
                ? "Loading…"
                : hasProgram
                ? `${meta.totalRecords} program${meta.totalRecords !== 1 ? "s" : ""} configured`
                : "No programs configured yet"}
            </p>
          </div>
        </div>
        <div className="ll-toolbar-right">
          {!loading && hasProgram && (
            <button
              className="ll-btn ll-btn-outline"
              onClick={() => navigate("/loyalty/config", { state: { program: latestProgram } })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Update Program
            </button>
          )}
          <button
            className="ll-btn ll-btn-primary"
            onClick={() => navigate("/loyalty/config", { state: { program: null } })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Program
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="ll-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Table card ── */}
      <div className="ll-card">

        {/* Table header */}
        <div className="ll-table-head">
          <div className="ll-col">Program</div>
          <div className="ll-col">Code</div>
          <div className="ll-col">Enrollment</div>
          <div className="ll-col">Start Date</div>
          <div className="ll-col">End Date</div>
          <div className="ll-col">Status</div>
          <div className="ll-col ll-col-actions">Actions</div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="ll-skeleton-wrap">
            {[1, 2, 3].map(i => (
              <div key={i} className="ll-skeleton-row">
                <div className="ll-skel ll-skel-lg" />
                <div className="ll-skel ll-skel-md" />
                <div className="ll-skel ll-skel-sm" />
                <div className="ll-skel ll-skel-md" />
                <div className="ll-skel ll-skel-md" />
                <div className="ll-skel ll-skel-sm" />
                <div className="ll-skel ll-skel-sm" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasProgram && !error && (
          <div className="ll-empty">
            <div className="ll-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <p className="ll-empty-title">No loyalty programs yet</p>
            <p className="ll-empty-sub">Create your first loyalty program to start rewarding customers.</p>
            <button
              className="ll-btn ll-btn-primary"
              onClick={() => navigate("/loyalty/config", { state: { program: null } })}
            >
              + Create Program
            </button>
          </div>
        )}

        {/* Rows */}
        {!loading && rows.map((p) => (
          <React.Fragment key={p.programId}>
            <div
              className={`ll-table-row ${expanded === p.programId ? "expanded" : ""}`}
              onClick={() => setExpanded(expanded === p.programId ? null : p.programId)}
            >
              {/* Program name */}
              <div className="ll-col">
                <div className="ll-prog-name-cell">
                  <div className="ll-prog-avatar">{(p.programName?.[0] ?? "L").toUpperCase()}</div>
                  <div>
                    <div className="ll-prog-name">{p.programName}</div>
                    <div className="ll-prog-id">#{p.programId}</div>
                  </div>
                </div>
              </div>

              {/* Code */}
              <div className="ll-col">
                <code className="ll-code">{p.programCode}</code>
              </div>

              {/* Enrollment */}
              <div className="ll-col">
                <span className="ll-enrollment">
                  {p.enrollmentType === "AUTO" ? "Auto" : "On Request"}
                </span>
              </div>

              {/* Start Date */}
              <div className="ll-col ll-date">{fmt(p.startDate)}</div>

              {/* End Date */}
              <div className="ll-col ll-date">{fmt(p.endDate)}</div>

              {/* Status */}
              <div className="ll-col">
                <Badge active={p.isActive} />
              </div>

              {/* Actions */}
              <div className="ll-col ll-col-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="ll-action-btn"
                  title="Edit"
                  onClick={() => navigate("/loyalty/config", { state: { program: p } })}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  className="ll-action-btn ll-expand-btn"
                  title={expanded === p.programId ? "Collapse" : "View details"}
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: expanded === p.programId ? "rotate(180deg)" : "none", transition: "transform .2s" }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Expanded detail panel */}
            {expanded === p.programId && (
              <div className="ll-detail-panel">
                <div className="ll-detail-grid">
                  <div className="ll-detail-section">
                    <div className="ll-detail-label">Program Details</div>
                    <div className="ll-detail-rows">
                      <div className="ll-detail-row"><span>Program ID</span><b>#{p.programId}</b></div>
                      <div className="ll-detail-row"><span>Code</span><code className="ll-code">{p.programCode}</code></div>
                      <div className="ll-detail-row"><span>Enrollment</span><b>{p.enrollmentType === "AUTO" ? "Auto" : "On Request"}</b></div>
                      <div className="ll-detail-row"><span>Start Date</span><b>{fmt(p.startDate)}</b></div>
                      <div className="ll-detail-row"><span>End Date</span><b>{fmt(p.endDate)}</b></div>
                      <div className="ll-detail-row"><span>Status</span><Badge active={p.isActive} /></div>
                      <div className="ll-detail-row"><span>Created</span><b>{fmt(p.createdDate)}</b></div>
                      <div className="ll-detail-row"><span>Modified</span><b>{fmt(p.modifiedDate)}</b></div>
                    </div>
                  </div>
                </div>
                <div className="ll-detail-footer">
                  <button
                    className="ll-btn ll-btn-primary"
                    style={{ height: 34, fontSize: 13, padding: "0 16px" }}
                    onClick={() => navigate("/loyalty/config", { state: { program: p } })}
                  >
                    Edit Configuration →
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {/* Pagination */}
        {!loading && meta.totalRecords > meta.pageSize && (
          <div className="ll-pagination">
            <span className="ll-pag-info">
              Showing {((page - 1) * meta.pageSize) + 1}–{Math.min(page * meta.pageSize, meta.totalRecords)} of {meta.totalRecords}
            </span>
            <div className="ll-pag-btns">
              <button className="ll-pag-btn" disabled={page <= 1} onClick={() => loadPrograms(page - 1)}>← Prev</button>
              {Array.from({ length: Math.max(meta.totalPages, 1) }, (_, i) => i + 1).map(pg => (
                <button key={pg} className={`ll-pag-btn ${pg === page ? "active" : ""}`} onClick={() => loadPrograms(pg)}>{pg}</button>
              ))}
              <button className="ll-pag-btn" disabled={page >= meta.totalPages} onClick={() => loadPrograms(page + 1)}>Next →</button>
            </div>
          </div>
        )}

      </div>{/* end ll-card */}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .ll-page {
          padding: 28px 32px; max-width: 1140px; margin: 0 auto;
          display: flex; flex-direction: column; gap: 20px;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          color: #334b71;
        }

        /* ── Toolbar ── */
        .ll-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap;
          background: linear-gradient(135deg, #334b71 0%, #1e3352 100%);
          border-radius: 16px; padding: 20px 24px;
          box-shadow: 0 8px 24px rgba(51,75,113,0.28);
          position: relative; overflow: hidden;
        }
        .ll-toolbar::before {
          content: ""; position: absolute; top: -40px; right: -40px;
          width: 180px; height: 180px; border-radius: 50%;
          background: rgba(167,209,205,0.12); pointer-events: none;
        }
        .ll-toolbar::after {
          content: ""; position: absolute; bottom: -60px; right: 80px;
          width: 140px; height: 140px; border-radius: 50%;
          background: rgba(243,220,176,0.08); pointer-events: none;
        }
        .ll-toolbar-left { display: flex; align-items: center; gap: 14px; position: relative; }
        .ll-icon-wrap {
          width: 48px; height: 48px; border-radius: 14px;
          background: rgba(167,209,205,0.25);
          border: 1.5px solid rgba(167,209,205,0.4);
          color: #A7D1CD; display: grid; place-items: center; flex-shrink: 0;
        }
        .ll-title { margin: 0 0 3px; font-size: 20px; font-weight: 800; color: #fff; line-height: 1; }
        .ll-subtitle { margin: 0; font-size: 13px; color: rgba(255,255,255,0.6); }
        .ll-toolbar-right { display: flex; gap: 10px; align-items: center; position: relative; }

        /* ── Buttons ── */
        .ll-btn {
          display: inline-flex; align-items: center; gap: 7px;
          height: 38px; padding: 0 18px; border-radius: 10px;
          font-size: 13px; font-weight: 700; cursor: pointer; border: none;
          transition: all .18s; white-space: nowrap; font-family: inherit;
        }
        .ll-btn:hover { transform: translateY(-1px); }
        .ll-btn:active { transform: translateY(0); }
        .ll-btn-primary {
          background: #A7D1CD; color: #1e3352;
          box-shadow: 0 4px 12px rgba(167,209,205,0.4);
        }
        .ll-btn-primary:hover { background: #bcdedd; box-shadow: 0 6px 16px rgba(167,209,205,0.5); }
        .ll-btn-outline {
          background: rgba(255,255,255,0.12); color: #fff;
          border: 1.5px solid rgba(255,255,255,0.3);
          backdrop-filter: blur(4px);
        }
        .ll-btn-outline:hover { background: rgba(255,255,255,0.2); }

        /* ── Error ── */
        .ll-error {
          display: flex; align-items: center; gap: 10px;
          background: #fff5f5; border: 1px solid #f0c4c0;
          border-left: 4px solid #cc6b5c;
          border-radius: 10px; padding: 12px 16px;
          color: #cc6b5c; font-size: 13px; font-weight: 600;
        }

        /* ── Table card ── */
        .ll-card {
          background: #fff; border: 1px solid #e5ebf3;
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 4px 16px rgba(51,75,113,0.08);
        }
        .ll-table-head {
          display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 0.8fr 0.7fr;
          padding: 11px 22px; background: #f0f5ff;
          border-bottom: 2px solid #e5ebf3;
          font-size: 11px; font-weight: 700; color: #8da0b8;
          text-transform: uppercase; letter-spacing: 0.07em;
        }
        .ll-table-row {
          display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 0.8fr 0.7fr;
          padding: 15px 22px; align-items: center;
          border-bottom: 1px solid #f0f4fa; cursor: pointer;
          transition: background .15s, box-shadow .15s;
          animation: ll-fadein .25s ease both;
        }
        .ll-table-row:nth-child(even) { background: #fafbfe; }
        .ll-table-row:hover { background: #f0f5ff; box-shadow: inset 3px 0 0 #A7D1CD; }
        .ll-table-row.expanded { background: #eef6f5; border-bottom: none; box-shadow: inset 3px 0 0 #334b71; }
        @keyframes ll-fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

        .ll-col { display: flex; align-items: center; }
        .ll-col-actions { gap: 6px; }

        /* Name cell */
        .ll-prog-name-cell { display: flex; align-items: center; gap: 12px; }
        .ll-prog-avatar {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, #334b71, #4a6a9e);
          color: #fff; font-size: 14px; font-weight: 800;
          display: grid; place-items: center;
          box-shadow: 0 3px 8px rgba(51,75,113,0.25);
        }
        .ll-prog-name { font-size: 14px; font-weight: 700; color: #1e3352; line-height: 1.2; }
        .ll-prog-id {
          font-size: 11px; color: #fff; font-weight: 700; margin-top: 3px;
          background: #A7D1CD; padding: 1px 7px; border-radius: 999px;
          display: inline-block; color: #1e3352;
        }

        /* Code chip */
        .ll-code {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 11px; font-weight: 700; color: #334b71;
          background: #eef2f7; padding: 4px 10px; border-radius: 7px;
          border: 1px solid #dce6f0; letter-spacing: 0.03em;
        }

        .ll-enrollment {
          font-size: 12px; font-weight: 600;
          color: #6e7b8f; background: #f4f7fb;
          padding: 3px 10px; border-radius: 6px;
          border: 1px solid #e5ebf3;
        }
        .ll-date { font-size: 13px; color: #6e7b8f; font-weight: 500; }

        /* Action buttons */
        .ll-action-btn {
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid #e5ebf3; background: #fff;
          color: #8da0b8; cursor: pointer;
          display: grid; place-items: center;
          transition: all .15s;
        }
        .ll-action-btn:hover { background: #334b71; color: #fff; border-color: #334b71; transform: scale(1.08); }

        /* Skeleton */
        .ll-skeleton-wrap { padding: 4px 0; }
        .ll-skeleton-row {
          display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 0.8fr 0.7fr;
          padding: 16px 22px; gap: 12px; align-items: center;
          border-bottom: 1px solid #f0f4fa;
        }
        .ll-skel { height: 13px; border-radius: 6px; background: linear-gradient(90deg, #eef2f7 25%, #e5ebf3 50%, #eef2f7 75%); background-size: 200% 100%; animation: ll-shimmer 1.5s infinite; }
        .ll-skel-lg { width: 80%; } .ll-skel-md { width: 60%; } .ll-skel-sm { width: 40%; }
        @keyframes ll-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Empty state */
        .ll-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 72px 24px; text-align: center;
        }
        .ll-empty-icon {
          width: 72px; height: 72px; border-radius: 20px;
          background: linear-gradient(135deg, #eef6f5, #ddf0ee);
          border: 2px dashed #A7D1CD;
          display: grid; place-items: center; color: #A7D1CD; margin-bottom: 4px;
        }
        .ll-empty-title { margin: 0; font-size: 17px; font-weight: 800; color: #334b71; }
        .ll-empty-sub { margin: 0; font-size: 13px; color: #6e7b8f; max-width: 320px; line-height: 1.6; }

        /* Detail panel */
        .ll-detail-panel {
          background: linear-gradient(135deg, #f0f5ff 0%, #eef6f5 100%);
          border-top: 2px solid #A7D1CD;
          border-bottom: 1px solid #dce6f0;
          padding: 20px 24px;
          animation: ll-fadein .2s ease both;
        }
        .ll-detail-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .ll-detail-label {
          font-size: 10px; font-weight: 800; color: #334b71;
          text-transform: uppercase; letter-spacing: 0.1em;
          margin-bottom: 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .ll-detail-label::after { content: ""; flex: 1; height: 1px; background: #dce6f0; }
        .ll-detail-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .ll-detail-row {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 13px; padding: 8px 12px; border-radius: 9px;
          background: rgba(255,255,255,0.8); border: 1px solid #e5ebf3;
          backdrop-filter: blur(4px);
        }
        .ll-detail-row span:first-child { color: #6e7b8f; font-size: 12px; }
        .ll-detail-row b { color: #334b71; font-weight: 700; }
        .ll-detail-footer { margin-top: 16px; display: flex; justify-content: flex-end; }

        /* Pagination */
        .ll-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 22px; border-top: 1px solid #f0f4fa;
          background: #fafbfe; flex-wrap: wrap; gap: 10px;
        }
        .ll-pag-info { font-size: 12px; color: #8da0b8; font-weight: 600; }
        .ll-pag-btns { display: flex; gap: 4px; align-items: center; }
        .ll-pag-btn {
          height: 30px; min-width: 32px; padding: 0 10px;
          border-radius: 8px; border: 1px solid #e5ebf3;
          background: #fff; color: #334b71;
          font-size: 12px; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: all .15s;
        }
        .ll-pag-btn:hover:not(:disabled) { background: #334b71; color: #fff; border-color: #334b71; transform: translateY(-1px); }
        .ll-pag-btn.active { background: #334b71; color: #fff; border-color: #334b71; box-shadow: 0 3px 8px rgba(51,75,113,0.25); }
        .ll-pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        @media (max-width: 768px) {
          .ll-table-head { display: none; }
          .ll-table-row { grid-template-columns: 1fr 1fr; gap: 8px; }
          .ll-detail-rows { grid-template-columns: 1fr; }
          .ll-page { padding: 16px; }
          .ll-toolbar { padding: 16px; }
        }
      `}</style>

    </div>
  );
}