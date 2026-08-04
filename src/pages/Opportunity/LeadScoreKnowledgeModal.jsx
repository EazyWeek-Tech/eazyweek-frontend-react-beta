// src/pages/Opportunity/LeadScoreKnowledgeModal.jsx
//
// Knowledge hub for the Lead Score panel: what High / Medium / Low actually
// mean for each of the four parameters, in English and Arabic.
//
// Opens on English. Picking Arabic swaps the same table into RTL — same rows,
// same order, mirrored direction, so an agent can hand the screen to a colleague
// without either of them losing their place.
//
// Content lives in leadScoreConfig.js (KB_EN / KB_AR), taken from the Knowledge
// Base tabs of the lead score workbook. Chrome/overlay styling comes from
// OPP_THEME_CSS (.modalOverlay, .modalCard, .tbl), so the form rendering this
// must carry the .ewOpp class — all four do.

import React, { useEffect, useState } from "react";
import { KB_EN, KB_AR } from "./leadScoreConfig";

const TABS = [
  { id: "en", label: "English", content: KB_EN },
  { id: "ar", label: "العربية", content: KB_AR },
];

export default function LeadScoreKnowledgeModal({ open, onClose }) {
  const [tab, setTab] = useState("en");

  // Always reopen on English, whatever was last picked.
  useEffect(() => { if (open) setTab("en"); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = TABS.find((t) => t.id === tab) || TABS[0];
  const kb = active.content;
  const rtl = kb.dir === "rtl";

  const tabBtn = (t) => ({
    padding: "7px 16px",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.4,
    cursor: "pointer",
    borderRadius: 4,
    border: "1px solid " + (tab === t.id ? "#334b71" : "#d5dde6"),
    background: tab === t.id ? "#334b71" : "#fff",
    color: tab === t.id ? "#fff" : "#4a5a6e",
  });

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 980 }}>
        <div className="modalHeader">
          <div className="modalTitle">Knowledge Base — Lead Score</div>
          <button type="button" className="modalClose" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modalBody">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} style={tabBtn(t)}>
                {t.label}
              </button>
            ))}
          </div>

          <div dir={kb.dir} style={{ textAlign: rtl ? "right" : "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#05224C", marginBottom: 10 }}>
              {kb.title}
            </div>

            <div className="tblWrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ textAlign: rtl ? "right" : "left" }}>{kb.head.parameter}</th>
                    <th style={{ textAlign: rtl ? "right" : "left" }}>{kb.head.high}</th>
                    <th style={{ textAlign: rtl ? "right" : "left" }}>{kb.head.medium}</th>
                    <th style={{ textAlign: rtl ? "right" : "left" }}>{kb.head.low}</th>
                  </tr>
                </thead>
                <tbody>
                  {kb.rows.map((r) => (
                    <tr key={r.parameter}>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap", textAlign: rtl ? "right" : "left" }}>
                        {r.parameter}
                      </td>
                      <td style={{ textAlign: rtl ? "right" : "left" }}>{r.high}</td>
                      <td style={{ textAlign: rtl ? "right" : "left" }}>{r.medium}</td>
                      <td style={{ textAlign: rtl ? "right" : "left" }}>{r.low}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}