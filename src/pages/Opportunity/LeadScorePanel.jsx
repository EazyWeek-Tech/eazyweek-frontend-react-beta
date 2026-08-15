// src/pages/Opportunity/LeadScorePanel.jsx
//
// Lead Score — the card that sits beside Lead Disposition on all four
// opportunity lead forms (R1-R6 no-show, R5/R6 master, R7 external, manual).
//
// The agent picks High / Medium / Low for four parameters while they are on the
// call; the card weights them, shows the running score out of 100 and names the
// band (Hot / Warm / Cold).
//
// Whether scoring is required at all is a SECTION-level setting in Form
// Configuration, not four per-parameter flags — a partial score is arithmetic
// that silently understates and can land the lead in the wrong band, so there
// is no state in which three of four is acceptable. Required: all four.
// Not required: all four, or none. `complete` reflects that rule and the parent
// form's Submit stays disabled until it comes back true.
//
// Interaction is deliberately the same as the Audit module's Yes/No scoring
// rows: a segmented control sitting beside each criterion, and a running total
// in the footer. An agent who has used one recognises the other immediately.
// The weight and per-row weighted score are applied but not displayed — they
// are arithmetic the agent never has to do, and showing them pushed the levels
// onto a second line.
//
// Usage — the form owns the value so it can save it after its own save lands:
//
//   const [leadScore, setLeadScore] = useState(null);
//   ...
//   <div className="lsRow">
//     <fieldset className="fs"> …Lead Disposition… </fieldset>
//     <LeadScorePanel
//       leadSource={LEAD_SOURCE.TRANS}
//       leadRecId={recID}
//       oppCode={oppCode}
//       locked={isLocked}
//       onChange={setLeadScore}
//     />
//   </div>
//
// then gate Submit on `leadScore?.complete` and call saveLeadScoreSafe() with
// `leadScore.levels` once the lead itself has saved.

import React, { useEffect, useRef, useState } from "react";
import {
  LEVELS,
  PARAMETERS,
  MAX_SCORE,
  EMPTY_LEVELS,
  computeLeadScore,
  fetchLeadScore,
  fmtScore,
  bandColor,
  bandLabel,
  LEAD_SOURCE,
} from "./leadScoreConfig";
import { useFormConfig } from "../Settings/useFormConfig";
import LeadScoreKnowledgeModal from "./LeadScoreKnowledgeModal";
import LeadScoreHistoryModal from "./LeadScoreHistoryModal";

/* Scoped to .ewOpp like the rest of the module's CSS. Includes .lsRow, the
   two-column wrapper each form puts around the disposition card and this one —
   it lives here so a form only has to add the wrapper div, not stylesheet
   rules. Collapses to a single column below 1100px. */
const LEAD_SCORE_CSS = `
.ewOpp .lsRow{
  display:grid;
  /* Equal halves. The disposition card was wider on the theory that it holds
     more fields, but the score card's three-pill rows need the room more, and
     an even split reads as two peers rather than a main block and an aside. */
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:16px;
  align-items:start;
  width:100%;
  min-width:0;
}
.ewOpp .lsRow > *{ min-width:0; }
@media (max-width:1100px){
  .ewOpp .lsRow{ grid-template-columns:minmax(0,1fr); }
}

.ewOpp .lsCard{ margin:0; }
.ewOpp .lsHead{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; flex-wrap:wrap;
}
.ewOpp .lsHeadBtns{ display:flex; gap:6px; flex-wrap:wrap; }
.ewOpp .lsBtn{
  padding:5px 10px; font-size:11px; font-weight:700; line-height:1.35;
  white-space:nowrap; color:#fff; background:#334b71; border:1px solid #334b71;
  border-radius:4px; cursor:pointer;
}
.ewOpp .lsBtn:hover{ background:#283c5c; border-color:#283c5c; }
.ewOpp .lsBtn.ghost{ background:#fff; color:#334b71; }
.ewOpp .lsBtn.ghost:hover{ background:#eef2f7; }

/* One line per parameter: number, label, then its three levels. The weight and
   the per-row weighted score used to sit in two right-hand columns; they were
   arithmetic the agent never has to do, and they pushed the levels onto a second
   line. The footer total is the number that matters. */
.ewOpp .lsItem{
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:11px 2px; border-bottom:1px solid #eef2f6;
}
.ewOpp .lsItem:first-of-type{ border-top:1px solid #e6ecf2; }
.ewOpp .lsItem:last-of-type{ border-bottom:0; }
.ewOpp .lsNum{ flex:0 0 auto; width:14px; font-size:11px; font-weight:700; color:#9aa8b8; }
.ewOpp .lsName{
  flex:1 1 130px; min-width:0;
  font-size:12.5px; font-weight:600; color:#1f3050; line-height:1.3;
}
.ewOpp .lsPills{ flex:0 0 auto; display:flex; gap:6px; }

.ewOpp .lsPill{
  min-width:58px; padding:5px 9px; font-size:11px; font-weight:700;
  border-radius:4px; border:1px solid #d9e0e8; background:#fff; color:#5b6a7d;
  cursor:pointer; transition:background .12s ease, border-color .12s ease, color .12s ease;
}
.ewOpp .lsPill:hover:not(:disabled){ border-color:#334b71; color:#334b71; }
.ewOpp .lsPill:focus-visible{ outline:2px solid #18396E; outline-offset:1px; }
.ewOpp .lsPill:disabled{ cursor:default; opacity:.65; }
.ewOpp .lsPill.on-High{   background:#e9f6ef; border-color:#1f8a5f; color:#12693f; }
.ewOpp .lsPill.on-Medium{ background:#fbf3e6; border-color:#C98A2E; color:#8f5f19; }
.ewOpp .lsPill.on-Low{    background:#fdeceb; border-color:#d2624f; color:#ac3f30; }

.ewOpp .lsFoot{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  flex-wrap:wrap; margin-top:12px; padding-top:12px; border-top:1px solid #e6ecf2;
}
.ewOpp .lsTotalLab{
  font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
  color:#8a99ab; display:block;
}
.ewOpp .lsTotal{ font-size:30px; font-weight:800; color:#05224C; line-height:1.05; }
.ewOpp .lsTotal .lsOutOf{ font-size:13px; font-weight:600; color:#9aa8b8; margin-left:3px; }
.ewOpp .lsBand{
  padding:7px 16px; border-radius:4px; font-size:12px; font-weight:800;
  letter-spacing:.06em; white-space:nowrap;
}
.ewOpp .lsPending{
  font-size:11.5px; font-weight:600; color:#b3543f;
  background:#fdeceb; border:1px solid #f3cdc6; border-radius:4px; padding:6px 10px;
}
.ewOpp .lsPending.optional{
  color:#5b6a7d; background:#f4f7fa; border-color:#dfe6ee;
}
.ewOpp .lsNote{ margin-top:8px; font-size:11px; color:#8a99ab; }
.ewOpp .lsErr{ margin-top:8px; font-size:11.5px; color:#c0392b; }
`;

const numbered = PARAMETERS.map((p, i) => ({ ...p, n: i + 1 }));

export default function LeadScorePanel({
  leadSource = LEAD_SOURCE.TRANS,
  leadRecId,
  oppCode = "",
  locked = false,
  onChange,
  title = "Lead Score",
}) {
  const [levels, setLevels]   = useState(EMPTY_LEVELS);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [last, setLast]       = useState(null);   // previously stored score, if any
  const [kbOpen, setKbOpen]   = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const fc = useFormConfig("LEADFORM");

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Load the lead's current score. A lead that has never been scored simply
  // opens blank — that is the normal state for every lead until this ships.
  useEffect(() => {
    const id = parseInt(leadRecId, 10) || 0;
    if (!id) { setLevels(EMPTY_LEVELS); setLast(null); return; }

    let alive = true;
    setLoading(true);
    setError("");

    fetchLeadScore(leadSource, id)
      .then((row) => {
        if (!alive) return;
        setLast(row || null);
        setLevels(row?.levels ? { ...EMPTY_LEVELS, ...row.levels } : EMPTY_LEVELS);
      })
      .catch((e) => {
        if (!alive) return;
        // Never block the form over this — the agent can still score the lead.
        console.error("[leadScore] load failed:", e?.message || e);
        setError("Could not load the saved score. You can still score this lead.");
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [leadSource, leadRecId]);

  const calc = computeLeadScore(levels);

  // The section key comes off the field itself rather than a literal, so the
  // panel keeps working if the catalogue section is ever renamed.
  const sectionKey = fc.sectionOf(PARAMETERS[0].key) || "leadScore";
  const required = fc.isSectionRequired(sectionKey, true);

  const answered = PARAMETERS.length - calc.missing.length;
  const untouched = answered === 0;
  const gateComplete = required ? calc.complete : calc.complete || untouched;

  // Report upward on every change so the form can gate Submit and save on it.
  // `scored` tells the form whether there is anything to hand saveLeadScoreSafe.
  useEffect(() => {
    onChangeRef.current?.({
      levels,
      score: calc.score,
      band: calc.band,
      complete: gateComplete,
      scored: calc.complete,
      required,
      missing: calc.missing,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels, calc.score, calc.band, calc.complete, gateComplete, required]);

  const pick = (key, level) => {
    if (locked) return;
    setLevels((p) => ({ ...p, [key]: p[key] === level ? "" : level }));
  };

  const band = calc.complete ? calc.band : "";
  const c = bandColor(band || "Cold");

  return (
    <fieldset className="fs lsCard">
      <div className="fsHead lsHead">
        <div className="fsTitle">{title}</div>
        <div className="lsHeadBtns">
          <button type="button" className="lsBtn ghost" onClick={() => setKbOpen(true)}>
            Knowledge Base
          </button>
          <button type="button" className="lsBtn" onClick={() => setHistOpen(true)}>
            Lead Score History
          </button>
        </div>
      </div>

      {numbered.map((p) => {
        const sel = levels[p.key] || "";
        return (
          <div className="lsItem" key={p.key}>
            <div className="lsNum">{p.n}</div>
            <div className="lsName">
              {fc.labelOf(p.key, p.label)} {required && <span className="req">*</span>}
            </div>

            <div className="lsPills" role="group" aria-label={fc.labelOf(p.key, p.label)}>
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className={`lsPill${sel === lv ? ` on-${lv}` : ""}`}
                  aria-pressed={sel === lv}
                  disabled={locked}
                  onClick={() => pick(p.key, lv)}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="lsFoot">
        <div>
          <span className="lsTotalLab">Lead Score</span>
          <span className="lsTotal">
            {fmtScore(calc.score)}
            <span className="lsOutOf">/ {MAX_SCORE}</span>
          </span>
        </div>

        {calc.complete ? (
          <span className="lsBand" style={{ background: c.bg, color: c.fg }}>
            {bandLabel(band)}
          </span>
        ) : required ? (
          <span className="lsPending">
            {answered} of {PARAMETERS.length} answered — all four are required
          </span>
        ) : untouched ? (
          <span className="lsPending optional">
            Optional — score this lead, or leave the section blank
          </span>
        ) : (
          <span className="lsPending">
            {answered} of {PARAMETERS.length} answered — answer all four, or clear the section
          </span>
        )}
      </div>

      {loading && <div className="lsNote">Loading saved score…</div>}
      {!loading && last && (
        <div className="lsNote">
          Last scored {String(last.modifiedOn || "").slice(0, 16)}
          {last.modifiedBy ? ` by ${last.modifiedBy}` : ""} — {fmtScore(last.score)} ({last.band})
        </div>
      )}
      {error && <div className="lsErr">{error}</div>}

      <LeadScoreKnowledgeModal open={kbOpen} onClose={() => setKbOpen(false)} />
      <LeadScoreHistoryModal
        open={histOpen}
        onClose={() => setHistOpen(false)}
        leadSource={leadSource}
        leadRecId={leadRecId}
      />

      <style>{LEAD_SCORE_CSS}</style>
    </fieldset>
  );
}