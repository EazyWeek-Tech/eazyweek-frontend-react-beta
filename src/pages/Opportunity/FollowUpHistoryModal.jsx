// src/pages/Opportunity/FollowUpHistoryModal.jsx
//
// Follow-up / session history for R1–R7 leads, reading GET /api/Opportunity/
// OppFollowUps/:oppRecId.
//
// The manual campaigns already had this trail (its own modal inside
// ManualOppCustomerDetails, reading LeadFollowUps). The transaction (R1–R6) and
// external (R7) forms had none, even though the OppFollowUps endpoint existed.
// This is that same modal as one shared component so the three remaining forms
// don't grow three copies of it — and the manual form is deliberately left alone,
// since it works and reshuffling it would cost a QC re-test for no user benefit.
//
// Columns and row shape match the manual modal exactly, so the two histories read
// identically to an agent. Styling comes from OPP_THEME_CSS (.modalOverlay,
// .modalCard, .tbl …), so the form rendering this must carry the .ewOpp class —
// all four already do.

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const pad2 = (n) => String(n).padStart(2, "0");
const safe = (v) => (v === null || v === undefined ? "" : String(v));

/** "2026-08-14" → "14/08/26". Blank for anything unparseable, including the
 *  1900-01-01 placeholders older rows may still carry. */
const fmtDate = (iso) => {
  const raw = safe(iso).trim();
  if (!raw || raw.startsWith("1900") || raw.startsWith("0001")) return "";
  const d = new Date(raw);
  if (Number.isNaN(+d)) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
};

/** "13:30:00" → "01:30 PM". Falls back to any AM/PM already stored alongside. */
const fmtTime = (timeStr, ampm) => {
  const raw = safe(timeStr).trim();
  if (!raw) return "";
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const mins = m[2];
  const stored = safe(ampm).trim().toUpperCase();
  // A 24-hour value carries its own meridiem; only trust the stored one for 1–12.
  const per = h >= 13 || h === 0 ? (h >= 12 ? "PM" : "AM") : stored || (h >= 12 ? "PM" : "AM");
  h = h % 12 === 0 ? 12 : h % 12;
  return `${pad2(h)}:${mins} ${per}`;
};

/**
 * @param {boolean}  open      whether the modal is shown
 * @param {function} onClose   called on backdrop click / × / Escape
 * @param {number}   oppRecId  CLINIC_OPPORTUNITYTRANSDETAILS.RECID (R1–R6) or
 *                             CLINIC_OPPORTUNITYEXTERNALSOURCE.RecID (R7)
 */
export default function FollowUpHistoryModal({ open, onClose, oppRecId }) {
  const [loading, setLoading] = useState(false);
  const [rows,    setRows]    = useState([]);
  const [error,   setError]   = useState("");

  // Fetch on each open — the agent may have saved a change since last viewing.
  useEffect(() => {
    if (!open) return;

    const id = parseInt(oppRecId, 10) || 0;
    if (!id) {
      setRows([]);
      setError("Lead ID not found. Follow up history cannot be loaded.");
      return;
    }

    let alive = true;
    setLoading(true);
    setError("");
    setRows([]);

    fetch(`${API_BASE_URL}/api/Opportunity/OppFollowUps/${id}`, {
      headers: { Authorization: `Bearer ${TOKEN()}` },
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Failed to load follow up history.");
        return json;
      })
      .then((data) => {
        if (!alive) return;
        // The endpoint returns a bare array; tolerate an enveloped shape too.
        setRows(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      })
      .catch((e) => { if (alive) setError(e?.message || "Failed to load follow up history."); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [open, oppRecId]);

  // Escape closes, matching the rest of the module's popups.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Follow Up History</div>
          <button type="button" className="modalClose" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="modalBody">Loading...</div>
        ) : error ? (
          <div className="modalBody errBox">{error}</div>
        ) : (
          <div className="modalBody">
            <div className="tblWrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Sr No</th>
                    <th>Disposition</th>
                    <th>Sub-Disposition</th>
                    <th>Follow Up Date</th>
                    <th>Follow Up Time</th>
                    <th>Remarks</th>
                    <th>Modified By</th>
                    <th>Modified On</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "14px" }}>
                        No follow up history found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr key={r?.followUpId ?? idx}>
                        <td>{idx + 1}</td>
                        <td>{safe(r?.disposition)}</td>
                        <td>{safe(r?.subDisposition)}</td>
                        <td>{fmtDate(r?.followUpDate)}</td>
                        <td>{fmtTime(r?.followUpTime, r?.followUpTimeAmPM)}</td>
                        <td>{safe(r?.remarks ?? r?.remark)}</td>
                        <td>{safe(r?.modifiedBy ?? r?.salesOwner)}</td>
                        <td>{safe(r?.modifiedOn ?? r?.createdOn)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}