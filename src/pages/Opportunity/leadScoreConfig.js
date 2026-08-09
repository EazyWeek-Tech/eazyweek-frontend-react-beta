// src/pages/Opportunity/leadScoreConfig.js
//
// Lead Score — the scoring model, the knowledge-base copy and the four API
// calls, shared by all four opportunity lead forms.
//
// The weights and points here mirror src/modules/opportunity/leadscore.config.js
// on the API. This copy exists so the score moves the instant the agent clicks a
// level; the number that gets STORED is always the server's. If the two ever
// disagree, the server wins and the panel shows what came back from the save.
//
// Source: Eazyweek_Lead_Score__Opportunity_Module.xlsx
//   "Lead Score Logic"        → LEVELS / POINTS / PARAMETERS / BANDS
//   "Knowledge Base - En"     → KB_EN
//   "Knowledge Base - Arabic" → KB_AR

import { API_BASE_URL } from "../../config";

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const AUTH_HEADERS = () => {
  const t = TOKEN();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/* ── Model ────────────────────────────────────────────────────────────────── */

export const LEVELS = ["High", "Medium", "Low"];

export const POINTS = { High: 10, Medium: 6, Low: 2 };

export const PARAMETERS = [
  { key: "readinessToBook",     label: "Readiness to Book",    weight: 3.5 },
  { key: "priceComfort",        label: "Price Comfort",        weight: 3.0 },
  { key: "serviceClarity",      label: "Service Clarity",      weight: 2.0 },
  { key: "conversationQuality", label: "Conversation Quality", weight: 1.5 },
];

export const PARAM_KEYS = PARAMETERS.map((p) => p.key);

export const MAX_SCORE = 100;

// Hot 75-100 | Warm 45-74 | Cold below 45.
export const BANDS = [
  { band: "Hot",  min: 75, action: "Immediate callback — priority follow-up" },
  { band: "Warm", min: 45, action: "Standard follow-up cadence" },
  { band: "Cold", min: 0,  action: "Route to nurture campaign" },
];

export const EMPTY_LEVELS = {
  readinessToBook: "",
  priceComfort: "",
  serviceClarity: "",
  conversationQuality: "",
};

export const normalizeLevel = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "high") return "High";
  if (s === "medium") return "Medium";
  if (s === "low") return "Low";
  return "";
};

export const bandForScore = (score) => {
  const n = Number(score) || 0;
  return (BANDS.find((b) => n >= b.min) || BANDS[BANDS.length - 1]).band;
};

/** Hot | Warm | Cold → the wording used on the pill. */
export const bandLabel = (band) => {
  const b = String(band || "").trim().toLowerCase();
  if (b === "hot") return "HOT LEAD";
  if (b === "warm") return "WARM LEAD";
  if (b === "cold") return "COLD LEAD";
  return "";
};

/**
 * levels → { complete, missing[], rows[], score, band }
 * Partial selections still return a running score so the agent can see it build,
 * but `complete` stays false until all four are answered.
 */
export const computeLeadScore = (levels = {}) => {
  const missing = [];
  const rows = PARAMETERS.map((p) => {
    const level = normalizeLevel(levels[p.key]);
    if (!level) missing.push(p.key);
    const points = level ? POINTS[level] : 0;
    return {
      ...p,
      level,
      points,
      weighted: Math.round(points * p.weight * 100) / 100,
    };
  });

  const score = Math.round(rows.reduce((a, r) => a + r.weighted, 0) * 100) / 100;

  return {
    complete: missing.length === 0,
    missing,
    rows,
    score,
    band: missing.length === 0 ? bandForScore(score) : "",
  };
};

/* Band colours, shared by the panel pill and the history modal so the two can
   never drift. Text only — no icons anywhere in this feature. Drawn from the
   EazyWeek palette: Warm Coral for Hot, Warm Cream's deeper amber for Warm,
   Blue Grey for Cold. */
export const BAND_COLORS = {
  Hot:  { bg: "#DD7766", fg: "#ffffff", soft: "#fbeceb", line: "#DD7766" },
  Warm: { bg: "#C98A2E", fg: "#ffffff", soft: "#fbf3e6", line: "#C98A2E" },
  Cold: { bg: "#85A2AA", fg: "#ffffff", soft: "#eef3f5", line: "#85A2AA" },
};

export const bandColor = (band) =>
  BAND_COLORS[String(band || "").trim().replace(/^(.)(.*)$/, (m, a, b) => a.toUpperCase() + b.toLowerCase())] ||
  { bg: "#85A2AA", fg: "#ffffff", soft: "#eef3f5", line: "#85A2AA" };

/** 82 → "82", 82.5 → "82.5". Whole numbers shouldn't wear a decimal tail. */
export const fmtScore = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
};

/* ── Knowledge base ───────────────────────────────────────────────────────── */

export const KB_EN = {
  dir: "ltr",
  title: "Answer Definitions",
  head: { parameter: "Parameter", high: "High (10 pts)", medium: "Medium (6 pts)", low: "Low (2 pts)" },
  rows: [
    {
      key: "readinessToBook",
      parameter: "Readiness to Book",
      high: "Wants to book now / within days",
      medium: "Interested, but no firm timeline",
      low: "Just browsing, no urgency",
    },
    {
      key: "priceComfort",
      parameter: "Price Comfort",
      high: "Comfortable with pricing, no hesitation",
      medium: "Asked about pricing, some hesitation",
      low: "Pushed back on price / said it's a concern",
    },
    {
      key: "serviceClarity",
      parameter: "Service Clarity",
      high: "Asked for a specific treatment by name",
      medium: "Asked about a general category",
      low: 'Fully vague enquiry (e.g. "what do you offer")',
    },
    {
      key: "conversationQuality",
      parameter: "Conversation Quality",
      high: "Asked detailed questions, engaged well",
      medium: "Gave short but relevant answers",
      low: "One-word answers, minimal engagement",
    },
  ],
};

export const KB_AR = {
  dir: "rtl",
  title: "تعريف الإجابات",
  head: { parameter: "المعيار", high: "مرتفع (10 نقاط)", medium: "متوسط (6 نقاط)", low: "منخفض (2 نقطة)" },
  rows: [
    {
      key: "readinessToBook",
      parameter: "الجاهزية للحجز",
      high: "يريد الحجز الآن / خلال أيام",
      medium: "مهتم، لكن دون جدول زمني محدد",
      low: "يستعرض فقط، دون إلحاح",
    },
    {
      key: "priceComfort",
      parameter: "الارتياح للسعر",
      high: "مرتاح للسعر، دون تردد",
      medium: "استفسر عن السعر، مع بعض التردد",
      low: "تراجع بسبب السعر / اعتبره مصدر قلق",
    },
    {
      key: "serviceClarity",
      parameter: "وضوح الخدمة",
      high: "طلب علاجاً محدداً بالاسم",
      medium: "استفسر عن فئة عامة",
      low: "استفسار غامض تماماً (مثل «ما الذي تقدمونه»)",
    },
    {
      key: "conversationQuality",
      parameter: "جودة المحادثة",
      high: "طرح أسئلة مفصلة، وتفاعل بشكل جيد",
      medium: "أجاب بإجابات قصيرة لكن ذات صلة",
      low: "إجابات من كلمة واحدة، تفاعل ضعيف",
    },
  ],
};

/* ── API ──────────────────────────────────────────────────────────────────── */

/** TRANS (R1-R6) | EXTERNAL (R7) | MANUAL — what each form passes as leadSource. */
export const LEAD_SOURCE = { TRANS: "TRANS", EXTERNAL: "EXTERNAL", MANUAL: "MANUAL" };

const asJson = async (res) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
  if (json && json.success === false) throw new Error(json.message || "Request failed.");
  return json;
};

/** Latest stored score for a lead, or null when it has never been scored. */
export const fetchLeadScore = async (leadSource, leadRecId) => {
  const id = parseInt(leadRecId, 10) || 0;
  if (!id) return null;
  const res = await fetch(
    `${API_BASE_URL}/api/Opportunity/LeadScore/${encodeURIComponent(leadSource)}/${id}`,
    { headers: { Accept: "application/json", ...AUTH_HEADERS() } }
  );
  const json = await asJson(res);
  return json?.data || null;
};

/** Full scoring trail, newest first. */
export const fetchLeadScoreHistory = async (leadSource, leadRecId) => {
  const id = parseInt(leadRecId, 10) || 0;
  if (!id) return [];
  const res = await fetch(
    `${API_BASE_URL}/api/Opportunity/LeadScoreHistory/${encodeURIComponent(leadSource)}/${id}`,
    { headers: { Accept: "application/json", ...AUTH_HEADERS() } }
  );
  const json = await asJson(res);
  return Array.isArray(json?.data) ? json.data : [];
};

/**
 * Records one scoring session. Called by each form AFTER its own save has
 * succeeded, so a scoring failure can never cost the agent the lead update.
 *
 * p: { leadSource, leadRecId, oppCode, levels, disposition, subDisposition,
 *      remarks, followUpDate, followUpTime, followUpTimeAmPM }
 * `disposition` / `subDisposition` are the LABELS shown in the dropdowns — the
 * history is meant to read the way the form read at the time.
 */
export const saveLeadScore = async (p) => {
  const res = await fetch(`${API_BASE_URL}/api/Opportunity/SaveLeadScore`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADERS() },
    body: JSON.stringify({
      leadSource:       p.leadSource || LEAD_SOURCE.TRANS,
      leadRecId:        p.leadRecId,
      oppCode:          p.oppCode || "",
      levels:           p.levels || EMPTY_LEVELS,
      disposition:      p.disposition || "",
      subDisposition:   p.subDisposition || "",
      remarks:          p.remarks || "",
      followUpDate:     p.followUpDate || "",
      followUpTime:     p.followUpTime || "",
      followUpTimeAmPM: p.followUpTimeAmPM || "",
    }),
  });
  const json = await asJson(res);
  return json?.data || null;
};

/**
 * Fire-and-log wrapper. The lead has already been saved by the time this runs —
 * a failed score write is worth a console error and nothing more, never an
 * exception that derails the conversion routing behind it.
 * Returns true when the score was stored.
 */
export const saveLeadScoreSafe = async (p) => {
  try {
    if (!(parseInt(p?.leadRecId, 10) || 0)) return false;
    if (!computeLeadScore(p?.levels).complete) return false;
    await saveLeadScore(p);
    return true;
  } catch (e) {
    console.error("[leadScore] save failed:", e?.message || e);
    return false;
  }
};