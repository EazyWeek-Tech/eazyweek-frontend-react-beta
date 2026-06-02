import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCenterCode = () => (getUser().centerCode || "").trim();
const getUserId = () => { const u = getUser(); return (u.employeeCode || u.userId || "").trim(); };

const NotesTab = ({ custId }) => {
  const [notes, setNotes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [page, setPage]         = useState(1);
  const [noteText, setNoteText] = useState("");
  const [options, setOptions]   = useState({
    showOnHistory: false,
    showOnCheckin: false,
    showOnBooking: false,
    showOnPayment: false,
    isPrivate:     false,
  });
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const PAGE_SIZE = 10;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadNotes = () => {
    if (!custId) return;
    setLoading(true); setError("");
    fetch(`${API_BASE_URL}/api/Customer/FetchCustomerNotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
      body: JSON.stringify({ custId, centerCode: getCenterCode() }),
    })
      .then(r => r.json())
      .then(json => {
        const data = json?.data ?? json;
        setNotes(Array.isArray(data) ? data : []);
        setPage(1);
      })
      .catch(e => setError(e.message || "Failed to load notes"))
      .finally(() => setLoading(false));
  };

  useEffect(loadNotes, [custId]);

  const handleAdd = async () => {
    if (!noteText.trim()) return showToast("Please enter a note.", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Customer/SaveCustomerNote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({
          custId,
          centerCode:      getCenterCode(),
          createdBy:       getUserId(),
          noteText:        noteText.trim(),
          showOnHistory:   options.showOnHistory  ? 1 : 0,
          showOnCheckin:   options.showOnCheckin  ? 1 : 0,
          showOnBooking:   options.showOnBooking  ? 1 : 0,
          showOnPayment:   options.showOnPayment  ? 1 : 0,
          isPrivate:       options.isPrivate      ? 1 : 0,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setNoteText("");
      setOptions({ showOnHistory: false, showOnCheckin: false, showOnBooking: false, showOnPayment: false, isPrivate: false });
      showToast("Note added successfully.");
      loadNotes();
    } catch (e) {
      showToast(e.message || "Failed to save note.", "error");
    } finally {
      setSaving(false);
    }
  };

  const pageRows = notes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));

  return (
    <div className="notes-tab">
      {/* Add Note */}
      <div className="add-note-section">
        <label className="note-label">Add a Note for this Guest</label>
        <textarea
          className="note-textarea"
          rows={3}
          placeholder="Enter your note here…"
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
        />
        <div className="note-options">
          {[
            ["showOnHistory", "Show on opening Guest History"],
            ["showOnCheckin", "Show during check-in"],
            ["showOnBooking", "Show when booking Appointment"],
            ["showOnPayment", "Show when taking payment"],
            ["isPrivate",     "Keep Hidden"],
          ].map(([key, label]) => (
            <label key={key} className="note-opt-label">
              <input type="checkbox" checked={options[key]}
                onChange={e => setOptions(p => ({ ...p, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
        </div>
        <button className="add-note-btn" onClick={handleAdd} disabled={saving}>
          {saving ? "Saving…" : "Add Note"}
        </button>
      </div>

      {/* Notes table */}
      <div className="appt-section">
        <h4 className="sectttl">Notes <span className="sect-count">({notes.length})</span></h4>

        {loading ? (
          <p style={{ color: "#94a3b8", padding: "20px 0" }}>Loading notes…</p>
        ) : error ? (
          <div className="notes-error">{error}</div>
        ) : (
          <>
            <table className="notes-table">
              <thead>
                <tr>
                  <th>Date Created</th>
                  <th>Note</th>
                  <th>Note Type</th>
                  <th>Service</th>
                  <th>Added By</th>
                  <th>Centre</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}>No notes available.</td></tr>
                ) : pageRows.map((n, i) => (
                  <tr key={n.recId || i}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {n.createdDate
                        ? new Date(n.createdDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })
                        : n.date
                        ? new Date(n.date).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })
                        : "—"}
                    </td>
                    <td style={{ maxWidth: 360, whiteSpace: "normal", lineHeight: 1.5 }}>{n.notes}</td>
                    <td>
                      {n.showOnHistory  ? <span className="note-type-badge">Guest History</span> : null}
                      {n.showOnCheckin  ? <span className="note-type-badge">Check-in</span>      : null}
                      {n.showOnBooking  ? <span className="note-type-badge">Booking</span>       : null}
                      {n.showOnPayment  ? <span className="note-type-badge">Payment</span>       : null}
                      {n.isPrivate      ? <span className="note-type-badge note-private">Keep Hidden</span> : null}
                      {!n.showOnHistory && !n.showOnCheckin && !n.showOnBooking && !n.showOnPayment && !n.isPrivate
                        ? <span style={{ color:"#94a3b8" }}>General</span> : null}
                    </td>
                    <td>{n.serviceCode || "—"}</td>
                    <td>{n.createdBy || "—"}</td>
                    <td>{n.centerCode || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {notes.length > PAGE_SIZE && (
              <div className="pagination">
                <span style={{ fontSize: 13, color: "#475569" }}>
                  Page {page} of {totalPages} • {notes.length} notes
                </span>
                <div className="pg-right">
                  <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
                  <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className={`notes-toast notes-toast-${toast.type}`}>{toast.msg}</div>
      )}

      <style>{`
        .notes-tab { padding: 30px; width: calc(100% - 300px); font-family: 'DM Sans', system-ui, sans-serif; }

        /* Add note */
        .add-note-section { background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
        .note-label { font-weight: 700; font-size: 14px; color: #0f172a;
          display: block; margin-bottom: 10px; }
        .note-textarea { width: 100%; padding: 10px 12px; border: 1.5px solid #dde1ea;
          border-radius: 8px; font-size: 13px; font-family: inherit; resize: vertical;
          outline: none; box-sizing: border-box; }
        .note-textarea:focus { border-color: #334B71; box-shadow: 0 0 0 3px rgba(51,75,113,.08); }
        .note-options { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0 16px; }
        .note-opt-label { display: flex; align-items: center; gap: 7px;
          font-size: 13px; color: #334155; cursor: pointer; }
        .note-opt-label input { width: 15px; height: 15px; accent-color: #334B71; cursor: pointer; }
        .add-note-btn { background: #334B71; color: #fff; border: none;
          padding: 8px 20px; border-radius: 7px; font-size: 13px; font-weight: 600;
          cursor: pointer; }
        .add-note-btn:hover:not(:disabled) { background: #2f4a72; }
        .add-note-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Table */
        .appt-section { margin-bottom: 20px; }
        .sectttl { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
        .sect-count { font-weight: 400; color: #94a3b8; font-size: 13px; }

        .notes-table { width: 100%; border-collapse: collapse; background: #fff;
          border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 4px 12px rgba(15,23,42,0.06); overflow: hidden; }
        .notes-table th { background: #334B71; color: #fff; font-weight: 600;
          font-size: 13px; text-align: left; padding: 12px 16px; white-space: nowrap; }
        .notes-table td { padding: 11px 16px; font-size: 13px; color: #0f172a;
          border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .notes-table tr:last-child td { border-bottom: none; }
        .notes-table tbody tr:hover { background: #f8fafc; }

        .notes-error { padding: 12px 16px; background: #fee2e2; color: #991b1b;
          border-radius: 8px; font-size: 13px; }

        .pagination { margin: 12px 0 0; display: flex; align-items: center;
          justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .pg-right { display: flex; gap: 6px; }
        .pg-btn { background: #fff; border: 1px solid #cbd5e1; color: #0f172a;
          padding: 5px 12px; border-radius: 7px; cursor: pointer; font-size: 13px; }
        .pg-btn:hover:not(:disabled) { background: #f1f5f9; }
        .pg-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .notes-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px;
          border-radius: 10px; font-size: 14px; font-weight: 600; color: #fff;
          z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,.15); }
        .notes-toast-success { background: #16a34a; }
        .notes-toast-error   { background: #dc2626; }
        .note-type-badge { display:inline-block; background:#eef2fa; color:#334B71; font-size:11px; font-weight:700; padding:2px 7px; border-radius:4px; margin:1px 2px; }
        .note-private { background:#fef3c7; color:#92400e; }
      `}</style>
    </div>
  );
};

export default NotesTab;