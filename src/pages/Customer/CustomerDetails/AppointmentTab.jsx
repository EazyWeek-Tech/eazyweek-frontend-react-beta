import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const AppointmentTab = ({ custId }) => {
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);

  // pagination state
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // shared page size for both tables

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerAppointment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custID: custId }),
          credentials: "include",
        });

        if (!response.ok) throw new Error("Error fetching appointments");
        const data = await response.json();

        const upcoming = (data || []).filter((appt) => appt.appointmentType === "UpComing");
        const past = (data || []).filter((appt) => appt.appointmentType === "Past");

        setUpcomingAppointments(upcoming);
        setPastAppointments(past);

        // reset to first page when data changes
        setUpcomingPage(1);
        setPastPage(1);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };

    if (custId) fetchAppointments();
  }, [custId]);

  const paginate = (arr, page, size) => {
    const start = (page - 1) * size;
    return arr.slice(start, start + size);
  };

  const renderPagination = (total, page, setPage) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const go = (p) => setPage(Math.min(totalPages, Math.max(1, p)));

    // build a compact page number list (current ±2)
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="pagination">
        <div className="pg-left">
          <label>
            Rows per page:&nbsp;
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value || "10", 10);
                setPageSize(newSize);
                setPage(1); // reset to first page when page size changes
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <span className="pg-stats">
            &nbsp;•&nbsp;Page {page} of {totalPages}
          </span>
        </div>

        <div className="pg-right">
          <button className="pg-btn" onClick={() => go(1)} disabled={page === 1}>« First</button>
          <button className="pg-btn" onClick={() => go(page - 1)} disabled={page === 1}>‹ Prev</button>

          {start > 1 && <span className="pg-ellipsis">…</span>}
          {pages.map((p) => (
            <button
              key={p}
              className={`pg-btn ${p === page ? "active" : ""}`}
              onClick={() => go(p)}
            >
              {p}
            </button>
          ))}
          {end < totalPages && <span className="pg-ellipsis">…</span>}

          <button className="pg-btn" onClick={() => go(page + 1)} disabled={page === totalPages}>Next ›</button>
          <button className="pg-btn" onClick={() => go(totalPages)} disabled={page === totalPages}>Last »</button>
        </div>
      </div>
    );
  };

  const renderTable = (data, title, page, setPage) => {
    const total = data.length;
    const rows = paginate(data, page, pageSize);

    return (
      <div className="appt-section">
        <h4 className="sectttl">{title}</h4>
        <table className="appt-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Receipt No</th>
              <th>Service</th>
              <th>Service Date</th>
              <th>Status</th>
              <th>Therapist</th>
              <th>Payment Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "16px" }}>
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((appt, idx) => (
                <tr key={`${appt.invoiceNo || appt.receiptNo || idx}-${page}`}>
                  <td>{appt.invoiceNo || "N/A"}</td>
                  <td>{appt.receiptNo || "N/A"}</td>
                  <td width="350">{appt.service || "N/A"}</td>
                  <td width="150">{appt.serviceDate || "N/A"}</td>
                  <td>{appt.status || "N/A"}</td>
                  <td width="150">{appt.therapist || "N/A"}</td>
                  <td>{appt.paymentType || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {renderPagination(total, page, setPage)}
      </div>
    );
  };

  return (
    <div className="appointment-tab">
      {renderTable(upcomingAppointments, "Upcoming Appointments", upcomingPage, setUpcomingPage)}
      {renderTable(pastAppointments, "Past Appointments", pastPage, setPastPage)}

      <style>{`
        .appt-section h4 { color: #333; margin-bottom: 10px; }
        .appointment-tab { padding: 30px; width: calc(100% - 300px) }
        .appt-table a { color: #334B71; font-weight: 700; }
        .appt-table {
          width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff;
          border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06); overflow: hidden;
        }
        .appt-table td {
          padding: 12px 18px; font-size: 14px; line-height: 20px; color: #0f172a;
          border-bottom: 1px solid #f1f5f9; vertical-align: middle;
        }
        .appt-table th {
          background: #f8fafc; color: #0f172a; font-weight: 700; font-size: 14px;
          text-align: left; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; letter-spacing: .2px;
        }

        /* Pagination */
        .pagination {
          margin: 12px 0 24px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; flex-wrap: wrap;
        }
        .pg-left { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #334155; }
        .pg-right { display: flex; align-items: center; gap: 6px; }
        .pg-btn {
          background: #fff; border: 1px solid #cbd5e1; color: #0f172a;
          padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 13px;
        }
        .pg-btn:hover { background: #f8fafc; }
        .pg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pg-btn.active { background: #334B71; border-color: #334B71; color: #fff; font-weight: 700; }
        .pg-ellipsis { color: #64748b; padding: 0 4px; }
      `}</style>
    </div>
  );
};

export default AppointmentTab;
