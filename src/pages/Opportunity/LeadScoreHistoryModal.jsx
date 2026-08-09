// src/pages/Opportunity/LeadScoreHistoryModal.jsx
//
// Every scoring session for one lead, newest first — the score, the band it
// landed in, and the state of the lead at that moment.
//
// A row is written on EVERY save, including one where the score comes out the
// same as last time: "scored again and it hasn't moved" is itself information
// when you are deciding whether to keep chasing. That is the one behavioural
// difference from the follow-up trail, which dedupes unchanged saves.
//
// Columns follow the Lead Score History tab of the workbook — date, score and
// band, then the same fields the follow-up history shows. Styling comes from
// OPP_THEME_CSS (.modalOverlay, .modalCard, .tbl), so the form rendering this
// must carry the .ewOpp class.

import React, { useEffect, useState } from "react";
import { fetchLeadScoreHistory, fmtScore, bandColor, bandLabel, LEAD_SOURCE } from "./leadScoreConfig";
import { useFormConfig } from "../Settings/useFormConfig";

const safe = (v) => (v === null || v === undefined ? "" : String(v));
const pad2 = (n) => String(n).padStart(2, "0");

/** "2026-08-14" → "14/08/26". Blank for placeholders and anything unparseable. */
const fmtDate = (iso) => {
  const raw = safe(iso).trim();
  if (!raw || raw.startsWith("1900") || raw.startsWith("0001")) return "";
  const d = new Date(raw);
  if (Number.isNaN(+d)) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
};

/** "2026-08-14 09:37:13" → "14/08/26 09:37". */
const fmtStamp = (s) => {
  const raw = safe(s).trim();
  if (!raw) return "";
  const [d, t] = raw.split(/[ T]/);
  const day = fmtDate(d);
  return day ? `${day} ${safe(t).slice(0, 5)}`.trim() : raw;
};

/** "13:30:00" → "01:30 PM", falling back to the stored meridiem for 1–12. */
const fmtTime = (timeStr, ampm) => {
  const raw = safe(timeStr).trim();
  if (!raw) return "";
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const mins = m[2];
  const stored = safe(ampm).trim().toUpperCase();
  const per = h >= 13 || h === 0 ? (h >= 12 ? "PM" : "AM") : stored || (h >= 12 ? "PM" : "AM");
  h = h % 12 === 0 ? 12 : h % 12;
  return `${pad2(h)}:${mins} ${per}`;
};

/**
 * @param {boolean}  open
 * @param {function} onClose
 * @param {string}   leadSource  TRANS | EXTERNAL | MANUAL
 * @param {number}   leadRecId   the lead's RECID in its own table
 */
export default function LeadScoreHistoryModal({ open, onClose, leadSource = LEAD_SOURCE.TRANS, leadRecId }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows]       = useState([]);
  const [error, setError]     = useState("");
  const fc = useFormConfig("LEADFORM");

  // Refetch on each open — the agent may have scored again since last look.
  useEffect(() => {
    if (!open) return;

    const id = parseInt(leadRecId, 10) || 0;
    if (!id) {
      setRows([]);
      setError("This lead has not been saved yet, so it has no score history.");
      return;
    }

    let alive = true;
    setLoading(true);
    setError("");
    setRows([]);

    fetchLeadScoreHistory(leadSource, id)
      .then((data) => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch((e) => { if (alive) setError(e?.message || "Could not load the lead score history."); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [open, leadSource, leadRecId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 1100 }}>
        <div className="modalHeader">
          <div className="modalTitle">Lead Score History</div>
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
                    <th>Date</th>
                    <th>Lead Score</th>
                    <th>Lead Type</th>
                    <th>{fc.labelOf("dispositionId", "Disposition")}</th>
                    <th>{fc.labelOf("subDispositionId", "Sub-Disposition")}</th>
                    <th>{fc.labelOf("followUpDate", "Follow Up Date")}</th>
                    <th>{fc.labelOf("followUpTime", "Follow Up Time")}</th>
                    <th>{fc.labelOf("remarks", "Remarks")}</th>
                    <th>Modified By</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "14px" }}>
                        This lead has not been scored yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => {
                      const c = bandColor(r?.band);
                      return (
                        <tr key={r?.recId ?? idx}>
                          <td>{idx + 1}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtStamp(r?.modifiedOn)}</td>
                          <td style={{ fontWeight: 700 }}>{fmtScore(r?.score)}</td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 9px",
                                borderRadius: 3,
                                fontSize: 10,
                                fontWeight: 800,
                                letterSpacing: ".04em",
                                whiteSpace: "nowrap",
                                background: c.bg,
                                color: c.fg,
                              }}
                            >
                              {bandLabel(r?.band) || safe(r?.band).toUpperCase()}
                            </span>
                          </td>
                          <td>{safe(r?.disposition)}</td>
                          <td>{safe(r?.subDisposition)}</td>
                          <td>{fmtDate(r?.followUpDate)}</td>
                          <td>{fmtTime(r?.followUpTime, r?.followUpTimeAmPM)}</td>
                          <td>{safe(r?.remarks)}</td>
                          <td>{safe(r?.modifiedBy)}</td>
                        </tr>
                      );
                    })
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