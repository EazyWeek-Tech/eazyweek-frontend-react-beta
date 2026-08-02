import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { API_BASE_URL } from "../../../config";

const trim = (s) => (s ?? "").toString().trim();

const splitEmails = (s) =>
  trim(s)
    .replace(/;/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// "NK" from "Nada Kareem"; falls back to the first two characters.
const initials = (name) => {
  const parts = trim(name).replace(/^dr\.?\s*/i, "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Body text longer than this gets collapsed behind "Read full response".
const CLAMP_AT = 280;

const JourneyTab = forwardRef(({ caseNo }, ref) => {
  const [journeyData, setJourneyData] = useState([]);
  const [openCc, setOpenCc] = useState({});
  const [openBody, setOpenBody] = useState({});

  useImperativeHandle(ref, () => ({
    getJourneyData: () => journeyData || [],
  }));

  useEffect(() => {
    const fetchJourney = async () => {
      if (!caseNo) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseJourney/${caseNo}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const raw = await response.json();
        const data = Array.isArray(raw) ? raw : (raw?.data ?? []);

        // SP returns rows in correct order (ORDER BY RECID ASC).
        // Collapse consecutive duplicates (same stage, sender, recipient and body)
        // that come from a response being submitted more than once.
        const arr = Array.isArray(data) ? data : [];
        const body = (e) =>
          (e.response || e.issueDesciption || e.issueDescription || "").toString().trim();
        const deduped = arr.filter((e, i, a) => {
          if (i === 0) return true;
          const p = a[i - 1];
          return !(
            (e.stageType || "") === (p.stageType || "") &&
            (e.createdBy || e.from || "") === (p.createdBy || p.from || "") &&
            (e.emailTo || e.to || "") === (p.emailTo || p.to || "") &&
            body(e) === body(p)
          );
        });
        setJourneyData(deduped);
      } catch (error) {
        console.error("Failed to fetch journey data:", error);
        setJourneyData([]);
      }
    };

    fetchJourney();
  }, [caseNo]);

  const getStageLabel = (entry) => {
    const stage = trim(entry.stageType);
    if (stage === "Initiated") return "Initiated";
    if (stage === "Closed") return "Closed";
    if (stage === "EscalatedToL2") return "Escalated to L2";
    return "Response";
  };

  // Stage drives the marker colour, the left border and the badge.
  const getStageVariant = (entry) => {
    const stage = trim(entry.stageType);
    if (stage === "Initiated") return "start";
    if (stage === "Closed") return "end";
    if (stage === "EscalatedToL2") return "esc";
    return "resp";
  };

  const toggle = (setter, index) =>
    setter((prev) => ({ ...prev, [index]: !prev[index] }));

  const renderRow = (entry, index, all) => {
    const variant = getStageVariant(entry);
    const from = trim(entry.createdBy || entry.from);
    const to = trim(entry.emailTo || entry.to);
    const cc = splitEmails(entry.emailCC || entry.cc);
    const subject = trim(entry.caseTitle || entry.subject);
    // The subject is the case title, so it is the same on almost every row.
    // Show it on the first entry and only again when it actually changes.
    const prevSubject = index > 0 ? trim(all[index - 1].caseTitle || all[index - 1].subject) : "";
    const showSubject = index === 0 || subject !== prevSubject;
    const message = trim(
      entry.response || entry.issueDesciption || entry.issueDescription
    );

    const ccOpen = !!openCc[index];
    const bodyOpen = !!openBody[index];
    const needsClamp = message.length > CLAMP_AT;

    return (
      <li
        className={`cd-cmt cd-cmt--${variant}`}
        key={entry.recid || `journey-row-${index}`}
      >
        <div className="cd-cmt-avatar" aria-hidden="true">{initials(from)}</div>

        <div className="cd-cmt-main">
          <div className="cd-cmt-hd">
            <span className="cd-cmt-author">{from || "Unknown"}</span>
            <span className="cd-badge">{getStageLabel(entry)}</span>
            <span className="cd-cmt-to">
              to <span className="cd-addr">{to}</span>
            </span>

            {cc.length > 0 && (
              <button
                type="button"
                className="cd-cc-btn"
                aria-expanded={ccOpen}
                onClick={() => toggle(setOpenCc, index)}
              >
                {ccOpen ? "Hide cc" : `Cc ${cc.length}`}
              </button>
            )}

            <span className="cd-cmt-step">{String(index + 1).padStart(2, "0")}</span>
          </div>

          {showSubject && <div className="cd-cmt-subject">{subject || "No subject"}</div>}

          {ccOpen && (
            <div className="cd-cc-list">
              {cc.map((addr, i) => (
                <span className="cd-cc-pill" key={i}>
                  {addr}
                </span>
              ))}
            </div>
          )}

          {message ? (
            <div className="cd-cmt-bubble">
              <div className={needsClamp && !bodyOpen ? "cd-tl-body--clamped" : undefined}>
                {message}
              </div>
              {needsClamp && (
                <button
                  type="button"
                  className="cd-more"
                  aria-expanded={bodyOpen}
                  onClick={() => toggle(setOpenBody, index)}
                >
                  {bodyOpen ? "Show less" : "Read full response"}
                </button>
              )}
            </div>
          ) : (
            <div className="cd-cmt-bubble cd-cmt-bubble--empty">No message recorded.</div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="cd-tab jrnyform">
      <section className="cd-section">
        <h3 className="cd-eyebrow">
          Case journey
          {journeyData.length > 0 && (
            <span className="cd-num">
              {journeyData.length} {journeyData.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </h3>

        {journeyData.length === 0 ? (
          <div className="cd-empty">
            Nothing recorded yet. Entries appear here each time the case is
            assigned, answered or closed.
          </div>
        ) : (
          <ol className="cd-thread">
            {journeyData.map((entry, index) => renderRow(entry, index, journeyData))}
          </ol>
        )}
      </section>
    </div>
  );
});

export default JourneyTab;