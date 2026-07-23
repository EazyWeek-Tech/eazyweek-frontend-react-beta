import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCenterCode = () => (getUser().centerCode || "").trim();

const STATUS_STYLE = {
  booked:    "status-booked",
  confirmed: "status-confirmed",
  arrived:   "status-arrived",
  completed: "status-completed",
  cancelled: "status-cancelled",
  "no show": "status-noshow",
  noshow:    "status-noshow",
};

const AppointmentTab = ({ custId }) => {
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [expandedNote, setExpandedNote] = useState(null);

  // pagination
  const [upPage, setUpPage]   = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!custId) return;
    setLoading(true); setError("");
    fetch(`${API_BASE_URL}/api/Customer/FetchCustomerAppointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
      body: JSON.stringify({ custId, centerCode: getCenterCode() }),
    })
      .then(r => r.json())
      .then(json => {
        const list = Array.isArray(json?.data ?? json) ? (json?.data ?? json) : [];
        setUpcoming(list.filter(a => a.appointmentType === "UpComing"));
        setPast(list.filter(a => a.appointmentType === "Past"));
        setUpPage(1); setPastPage(1);
      })
      .catch(e => setError(e.message || "Failed to load appointments"))
      .finally(() => setLoading(false));
  }, [custId]);

  const paginate = (arr, page) => arr.slice((page - 1) * pageSize, page * pageSize);

  const renderPagination = (total, page, setPage) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const go = (p) => setPage(Math.min(totalPages, Math.max(1, p)));
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="pagination">
        <div className="pg-left">
          <label>
            Rows per page:&nbsp;
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span className="pg-stats">&nbsp;•&nbsp;{total} record{total !== 1 ? "s" : ""} • Page {page} of {totalPages}</span>
        </div>
        <div className="pg-right">
          <button className="pg-btn" onClick={() => go(1)} disabled={page === 1}>« First</button>
          <button className="pg-btn" onClick={() => go(page - 1)} disabled={page === 1}>‹ Prev</button>
          {start > 1 && <span className="pg-ellipsis">…</span>}
          {pages.map(p => (
            <button key={p} className={`pg-btn${p === page ? " active" : ""}`} onClick={() => go(p)}>{p}</button>
          ))}
          {end < totalPages && <span className="pg-ellipsis">…</span>}
          <button className="pg-btn" onClick={() => go(page + 1)} disabled={page === totalPages}>Next ›</button>
          <button className="pg-btn" onClick={() => go(totalPages)} disabled={page === totalPages}>Last »</button>
        </div>
      </div>
    );
  };

  const renderTable = (data, title, page, setPage) => {
    const rows = paginate(data, page);
    return (
      <div className="appt-section">
        <h4 className="sectttl">{title} <span className="sect-count">({data.length})</span></h4>
        <table className="appt-table">
          <thead>
            <tr>
              <th>Appointment ID</th>
              <th>Date</th>
              <th>Time</th>
              <th>Service</th>
              <th>Status</th>
              <th>Therapist</th>
              <th>Payment Type</th>
              <th>Invoice No</th>
              <th>Created By</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}>No records found.</td></tr>
            ) : rows.map((a, i) => {
              const id = a.appointmentId || i;
              const statusKey = (a.status || "").toLowerCase().replace(/\s/g, "");
              const statusClass = STATUS_STYLE[statusKey] || "status-default";
              const hasNote = a.notes && a.notes.trim();
              const isOpen = expandedNote === id;
              return (
                <React.Fragment key={id}>
                  <tr>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{a.refId || a.appointmentId || "—"}</td>
                    <td>{a.serviceDate || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{a.startTime || "—"}{a.endTime ? ` – ${a.endTime}` : ""}</td>
                    <td style={{ maxWidth: 260, whiteSpace: "normal" }}>{a.service || "—"}</td>
                    <td><span className={`appt-status ${statusClass}`}>{a.status || "—"}</span></td>
                    <td>{a.therapist || "—"}</td>
                    <td>{a.paymentType || "—"}</td>
                    <td>{a.invoiceNo || "—"}</td>
                    <td>{a.createdBy || a.addedBy || "—"}</td>
                    <td>
                      {hasNote
                        ? <button className="notes-toggle" onClick={() => setExpandedNote(isOpen ? null : id)}>
                            {isOpen ? "Hide" : "View"} 📝
                          </button>
                        : <span style={{ color: "#cbd5e1" }}>—</span>
                      }
                    </td>
                  </tr>
                  {isOpen && hasNote && (
                    <tr className="note-row">
                      <td colSpan={10}>
                        <div className="note-content">
                          <strong>📝 Note:</strong> {a.notes}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {renderPagination(data.length, page, setPage)}
      </div>
    );
  };

  if (loading) return <div className="appt-loading">Loading appointments…</div>;
  if (error)   return <div className="appt-error">{error}</div>;

  return (
    <div className="appointment-tab">
      {renderTable(upcoming, "Upcoming Appointments", upPage, setUpPage)}
      {renderTable(past,     "Past Appointments",     pastPage, setPastPage)}

      <style>{`
        .appointment-tab { padding: 30px; width: calc(100% - 300px); font-family: 'DM Sans', system-ui, sans-serif; }
        .appt-section { margin-bottom: 32px; }
        .sectttl { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
        .sect-count { font-weight: 400; color: #94a3b8; font-size: 13px; }

        .appt-table { width: 100%; border-collapse: collapse; background: #fff;
          border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 4px 12px rgba(15,23,42,0.06); overflow: hidden; }
        .appt-table th { background: #334B71; color: #fff; font-weight: 600; font-size: 13px;
          text-align: left; padding: 12px 16px; white-space: nowrap; }
        .appt-table td { padding: 11px 16px; font-size: 13px; color: #0f172a;
          border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .appt-table tr:last-child td { border-bottom: none; }
        .appt-table tbody tr:hover { background: #f8fafc; }

        .appt-status { display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 700; white-space: nowrap; }
        .status-booked    { background: #dbeafe; color: #1d4ed8; }
        .status-confirmed { background: #d1fae5; color: #065f46; }
        .status-arrived   { background: #fef3c7; color: #92400e; }
        .status-completed { background: #dcfce7; color: #166534; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .status-noshow    { background: #f3f4f6; color: #6b7280; }
        .status-default   { background: #f0f2f5; color: #4b5668; }

        .notes-toggle { background: #fef3c7; border: 1px solid #fcd34d; color: #92400e;
          border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 700;
          cursor: pointer; white-space: nowrap; }
        .notes-toggle:hover { background: #fde68a; }

        .note-row td { background: #fffbeb; padding: 0; }
        .note-content { padding: 12px 20px; font-size: 13px; color: #1b2636;
          border-top: 1px solid #fcd34d; line-height: 1.6; }

        .appt-loading { padding: 40px; text-align: center; color: #94a3b8; font-size: 14px; }
        .appt-error   { padding: 16px; background: #fee2e2; color: #991b1b; border-radius: 8px; margin: 16px; }

        /* Pagination */
        .pagination { margin: 12px 0 8px; display: flex; align-items: center;
          justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .pg-left  { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; }
        .pg-left select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 6px; font-size: 13px; }
        .pg-right { display: flex; align-items: center; gap: 4px; }
        .pg-btn   { background: #fff; border: 1px solid #cbd5e1; color: #0f172a;
          padding: 5px 10px; border-radius: 7px; cursor: pointer; font-size: 13px; }
        .pg-btn:hover:not(:disabled) { background: #f1f5f9; }
        .pg-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .pg-btn.active   { background: #334B71; border-color: #334B71; color: #fff; font-weight: 700; }
        .pg-ellipsis { color: #94a3b8; padding: 0 4px; }
      `}</style>
    </div>
  );
};

export default AppointmentTab;