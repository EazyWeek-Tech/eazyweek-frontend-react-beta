import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

/* ---------------------------------------------------------------
   Display helpers
   --------------------------------------------------------------- */

const trim = (s) => (s ?? "").toString().trim();

// "AB" from "Nahlah Hassan Altayeb"; falls back to first two chars.
const initials = (name) => {
  const parts = trim(name).replace(/^dr\.?\s*/i, "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// SLA hours arrive either as a single value ("1") or a range ("24-48").
// The upper bound is what the escalation service compares against.
const parseWindow = (raw) => {
  const s = trim(raw);
  if (!s) return { label: "", hours: null };

  const parts = s.split("-").map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
  if (!parts.length) return { label: s, hours: null };

  const upper = parts[parts.length - 1];
  const hourText = parts.join("–") + " hr";
  const days = parts.map((h) => Math.round(h / 24));
  const dayText =
    upper >= 24 ? ` (${[...new Set(days)].join("–")} ${upper >= 48 ? "days" : "day"})` : "";

  return { label: hourText + dayText, hours: upper };
};

// Which configured window governs each hop of the actual route.
// Hop 1 is the first handoff out of creation (Level 1 window); every later
// hop sits inside the Level 2 window. Change here if the mapping shifts.
const windowForHop = (hopIndex, first, second) => (hopIndex <= 1 ? first : second);

const formatDuration = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return `${hours} hr`;
  if (minutes > 0) return `${minutes} min`;
  return "0 min";
};

const Person = ({ name, role, variant }) => (
  <div className={`cd-person cd-person--${variant}`}>
    <div className="cd-avatar">{initials(name)}</div>
    <div className="cd-person-txt">
      <div className="cd-person-name">{trim(name)}</div>
      <div className="cd-person-role">{role}</div>
    </div>
  </div>
);

// One connector on the rail. `escalation` switches it to the dashed coral
// treatment and puts the SLA window on it, since the window is what triggers
// the hop to the escalation contact.
const Link = ({ label }) => (
  <div className="cd-link">
    <div className="cd-link-lbl">{label}</div>
    <div className="cd-link-rule" />
  </div>
);

// One level of the hierarchy. The assignee sits on the main line; the
// escalation contact hangs off it on a branch, because escalation is what
// happens when nothing happens — not the next step forward.
const Stage = ({ level, assignee, escalation, slaLabel }) => (
  <div className="cd-branch">
    <div className="cd-stop cd-stop--handler">
      <Person name={assignee} role={`Level ${level} assignee`} variant="handler" />
    </div>

    <div className="cd-fallback">
      <span className="cd-fallback-arm" aria-hidden="true" />
      <div className="cd-fallback-body">
        <div className="cd-fallback-lbl">
          If no response in {slaLabel || "the configured window"}
        </div>
        <div className="cd-stop cd-stop--esc">
          <Person
            name={escalation}
            role={`Level ${level} escalation`}
            variant="escalate"
          />
        </div>
      </div>
    </div>
  </div>
);

/* ---------------------------------------------------------------
   Component
   --------------------------------------------------------------- */

const SLATab = forwardRef((_, ref) => {
  const { caseNumber } = useParams();
  const [ideal, setIdeal] = useState({});
  const [actualList, setActualList] = useState([]);
  const [categoryData, setCategoryData] = useState({
    caseCategory: "",
    subCategory: "",
    subSubCategory: "",
    subSubSubCategory: "",
  });

  useImperativeHandle(ref, () => ({
    getSLAData: () => ({
      slaIdeal: ideal,
      slaActual: actualList,
    }),
  }));

  useEffect(() => {
    const fetchSLA = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseDetails/${caseNumber}`,
          {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          }
        );

        if (response.status === 401) {
          console.error("401 Unauthorized: Not logged in / cookie not sent");
          return;
        }

        const raw = await response.json();
        const data = raw?.data ?? raw;

        const firstSlaName = data.firstSlaName?.trim() || "";
        const secondSlaName = data.secondSlaName?.trim() || "";
        const firstSlaEName = data.firstSlaEName?.trim() || "";
        const secondSlaEName = data.secondSlaEName?.trim() || "";

        setIdeal({
          initial: firstSlaName,
          // If L1 escalation name is empty, fall back to L2 assignee
          mid: firstSlaEName || secondSlaName,
          late: secondSlaName || firstSlaEName,
          // If L2 escalation name is empty, fall back to L2 assignee
          final: secondSlaEName || secondSlaName,
          firstSlaHours: data.firstSlaHours?.trim() || "",
          secondSlaHours: data.secondSlaHours?.trim() || "",
        });

        setCategoryData({
          caseCategory: data.categoryName || "",
          subCategory: data.subCategoryName || "",
          subSubCategory: data.subSubCategoryName || "",
          subSubSubCategory: data.subSubSubCategoryName || "",
        });
      } catch (err) {
        console.error("Error fetching SLA tab data:", err);
      }
    };

    const fetchActualSLA = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/CaseOperation/CaseResponse/${caseNumber}/ActualResponse`
        );
        const rawA = await res.json();
        const data = Array.isArray(rawA) ? rawA : (rawA?.data ?? []);

        if (Array.isArray(data)) {
          // Show all non-draft rows, deduplicating consecutive same-person blocks.
          const submitted = data.filter((entry) => !entry.isDraft);

          const deduped = [];
          let lastCaseWith = null;
          for (const entry of submitted) {
            const key = entry.caseWith || "";
            if (key !== lastCaseWith) {
              deduped.push(entry);
              lastCaseWith = key;
            }
          }

          setActualList(
            deduped.map((entry, index, arr) => {
              // Time FROM the previous entry TO this one. Index 0 has no
              // predecessor, so it carries no elapsed value.
              let diffDisplay = "";
              let diffMinutes = null;

              if (index > 0) {
                const prev = new Date(arr[index - 1].caseReceiveDate);
                const current = new Date(entry.caseReceiveDate);
                diffMinutes = Math.round((current - prev) / (1000 * 60));
                diffDisplay = formatDuration(diffMinutes);
              }

              return {
                caseWith: entry.caseWith || "",
                timestamp: formatDateTime(entry.caseReceiveDate),
                diffHours: diffDisplay,
                diffMinutes,
              };
            })
          );
        }
      } catch (err) {
        console.error("Failed to fetch actual SLA:", err);
      }
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return "-";
      const d = new Date(dateStr);
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    fetchSLA();
    fetchActualSLA();
  }, [caseNumber]);

  const first = parseWindow(ideal.firstSlaHours);
  const second = parseWindow(ideal.secondSlaHours);

  return (
    <div className="cd-tab slaform">
      {/* ---------- Classification ---------- */}
      <section className="cd-section">
        <h3 className="cd-eyebrow">Category</h3>
        <dl className="cd-facts">
          <div className="cd-fact">
            <dt>Category</dt>
            <dd>{categoryData.caseCategory}</dd>
          </div>
          <div className="cd-fact">
            <dt>Sub category</dt>
            <dd>{categoryData.subCategory}</dd>
          </div>
          <div className="cd-fact">
            <dt>Sub sub category</dt>
            <dd>{categoryData.subSubCategory}</dd>
          </div>
          <div className="cd-fact">
            <dt>Sub sub sub category</dt>
            <dd>{categoryData.subSubSubCategory}</dd>
          </div>
        </dl>
      </section>

      {/* ---------- Planned route ---------- */}
      <section className="cd-section">
        <h3 className="cd-eyebrow">Planned route</h3>

        <div className="cd-lane cd-lane--planned">
          <div className="cd-origin">
            <span className="cd-origin-dot" />
            <span className="cd-origin-lbl">Created</span>
          </div>

          <Link label="assigned to" />

          <Stage
            level="1"
            assignee={ideal.initial}
            escalation={ideal.mid}
            slaLabel={first.label}
          />

          <Link label="then level 2" />

          <Stage
            level="2"
            assignee={ideal.late}
            escalation={ideal.final}
            slaLabel={second.label}
          />

          <Link label="then" />
          <div className="cd-terminus">Close</div>
        </div>
      </section>

      {/* ---------- Actual route ---------- */}
      <section className="cd-section">
        <h3 className="cd-eyebrow">Actual route</h3>

        {actualList.length === 0 ? (
          <div className="cd-empty">
            No handoffs recorded yet. The route fills in as the case is assigned.
          </div>
        ) : (
          <div className="cd-flow">
            <div className="cd-origin">
              <span className="cd-origin-dot" />
              <span className="cd-origin-lbl">Created</span>
            </div>

            {actualList.map((item, index) => {
              const target =
                index === 0 ? null : windowForHop(index, first, second);
              const over =
                target?.hours != null &&
                item.diffMinutes != null &&
                item.diffMinutes > target.hours * 60;

              return (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <div className={`cd-seg${over ? " cd-seg--over" : ""}`}>
                      <div className="cd-seg-time">{item.diffHours}</div>
                      <div className="cd-seg-rule" />
                      {target?.label && (
                        <div className="cd-seg-target">target {target.label}</div>
                      )}
                    </div>
                  )}

                  <div
                    className={`cd-stop cd-stop--actual${
                      index === actualList.length - 1 ? " cd-stop--current" : ""
                    }`}
                  >
                    <Person
                      name={item.caseWith}
                      role={index === actualList.length - 1 ? "With now" : "Handled"}
                      variant="actual"
                    />
                    <div className="cd-stop-time">{item.timestamp}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
});

export default SLATab;