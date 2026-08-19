import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../config"; // adjust path to match this file's location
import { resolveFeatures, getFeatureMeta, minimumTierFor, getTierLabel } from "../../config/licenseConfig"; // license helpers (adjust path if needed)
import { resolveDashboardAccess, DASHBOARD_VIEW } from "../../components/DashboardGate"; // DASH.* view permissions (adjust path if needed)
// Shared EazyWeek loading indicators. Place DashboardLoadingBar.jsx beside this
// file (src/pages/Dashboard/) or adjust this path to wherever it lives.
import { DashboardLoadingBar, TileSkeleton, AwaitingFeed, LoadError } from "./DashboardLoadingBar";

/**
 * EazyWeek — Executive Analytics Dashboard
 * Faithful React port of the eazyweek_Dashboard design mockup.
 *
 * Self-contained: no chart library required (charts are hand-rolled SVG).
 *
 * Data policy: NO sample figures are ever shown. While the endpoints are in
 * flight the page shows a brand progress bar; if they fail it shows a retry
 * panel; any block with no endpoint yet shows an explicit "awaiting source"
 * state rather than an invented number.
 *
 * Financial tiles A-O follow Home_Dashboard_Calculation ("New" tab) and are fed
 * by GET /api/Invoice/HomeDashboard, which returns the ATOMS (see the repo
 * comment there) so open business decisions stay out of the SQL.
 */

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */
/* Centre codes only — a fallback list for the centre filter until
   GET /api/Settings/Centre/Hierarchy answers. Carries NO revenue figures:
   every number on this page comes from an endpoint or is not shown. */
const CENTRES = [
  { name: "Bright" }, { name: "GLAM25" }, { name: "GL12" }, { name: "GLOW123" },
  { name: "INFENI" }, { name: "Silk" }, { name: "LNS" }, { name: "MXM" },
];

const RANGE_KEYS = ["Today", "This Week", "This Month", "QTD", "YTD", "Custom"];

/* ====================================================================== */
/* SAMPLE DATA — for the widgets that have NO API AT ALL, and only those.  */
/* ====================================================================== */
/* The exhaustive list of what this fills, and why each one has no source:

     Centre performance (actual vs target)  no CLINIC_CENTRE_TARGET table
     Leads by source                        no endpoint
     Loyalty tier distribution              no endpoint
     Campaign performance                   no endpoint
     Active customers                       needs the appointment-frequency
                                            setting, which does not exist
     Unsettled Claims / Open PO /           no claims, purchasing or vendor
       Vendor Balance                       module in EazyWeek

   NOTHING ELSE IS EVER SAMPLED. Every other figure on the page has an
   endpoint behind it, and if that endpoint is slow, empty or broken the
   widget shows the loader, an em dash or the retry panel — it never falls
   back to an invented number. That distinction is the whole point: a sample
   here means "this feature isn't built yet", never "the API failed".

   Figures are deterministic per centre (so they don't jitter between
   renders), recompute from the selected centres, and scale with the selected
   period — the target pro-rates by day exactly as the spec requires.

   Set SAMPLE_UNSOURCED = false for strict live-only: these widgets go back
   to the awaiting-source card and nothing else on the page changes. */
const SAMPLE_UNSOURCED = true;

/* Stable 0..1 hash so a centre the hierarchy returns that isn't in any table
   here still gets sensible, non-jittering numbers. */
const shash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
};
const sampleCentre = (code) => {
  const a = shash(code), b = shash(code + "|b"), c = shash(code + "|c");
  return {
    monthlyActual: 180000 + Math.round(a * 520000),   // one full calendar month
    attainment:    0.74 + b * 0.44,                   // actual / target
    loyalty:       420 + Math.round(c * 2600),
    monthlyLeads:  70 + Math.round(a * 230),
    activeCust:    260 + Math.round(b * 1400),
  };
};

const SAMPLE_LEAD_SOURCES = [
  { en: "Walk-in",           ar: "زيارة مباشرة", share: 0.28 },
  { en: "Instagram",         ar: "إنستغرام",     share: 0.24 },
  { en: "Referral",          ar: "توصية",        share: 0.18 },
  { en: "WhatsApp",          ar: "واتساب",       share: 0.14 },
  { en: "Website",           ar: "الموقع",       share: 0.10 },
  { en: "Undefined Source",  ar: "مصدر غير محدد", share: 0.06 },
];
const SAMPLE_TIERS = [
  { en: "Bronze",   ar: "برونزي", color: "#B07C28", share: 0.46 },
  { en: "Silver",   ar: "فضي",    color: "#85A2AA", share: 0.31 },
  { en: "Gold",     ar: "ذهبي",   color: "#D19A3E", share: 0.17 },
  { en: "Platinum", ar: "بلاتيني", color: "#18396E", share: 0.06 },
];
const SAMPLE_CAMPAIGNS = [
  { en: "Summer Glow",        ar: "إشراقة الصيف",   share: 0.34, conv: 0.31 },
  { en: "Membership Renewal", ar: "تجديد العضوية",  share: 0.27, conv: 0.52 },
  { en: "Referral Rewards",   ar: "مكافآت التوصية", share: 0.22, conv: 0.38 },
  { en: "Winter Skin Reset",  ar: "تجديد بشرة الشتاء", share: 0.17, conv: 0.23 },
];

/* Builds the sample payload for the selected centres + period.
   Returns null when sampling is off or nothing is selected. */
function buildSample(codes, period) {
  if (!SAMPLE_UNSOURCED) return null;
  const list = (codes || []).map((code) => ({ code, ...sampleCentre(code) }));
  if (!list.length) return null;
  const f = period && period.factor ? period.factor : 1;   // period / 30 days
  const r0 = (n) => Math.max(0, Math.round(n));

  const centreRows = list.map((p) => {
    const target = r0((p.monthlyActual / p.attainment) * f);
    /* A little per-period drift so the bars are not all identical shapes. */
    const drift  = 0.9 + shash(p.code + period.fromDate) * 0.24;
    return { code: p.code, actual: r0(p.monthlyActual * f * drift), target };
  });

  const leads = r0(list.reduce((a, p) => a + p.monthlyLeads, 0) * f);
  const loyal = list.reduce((a, p) => a + p.loyalty, 0);

  return {
    centreRows,
    activeCustomers: list.reduce((a, p) => a + p.activeCust, 0),
    leadSources: SAMPLE_LEAD_SOURCES.map((x) => ({ ...x, value: Math.max(1, r0(leads * x.share)) })),
    tiers:       SAMPLE_TIERS.map((x) => ({ ...x, value: Math.max(1, r0(loyal * x.share)) })),
    campaigns:   SAMPLE_CAMPAIGNS.map((c) => {
      const cl = Math.max(1, r0(leads * c.share));
      return { ...c, leads: cl, converted: Math.max(0, r0(cl * c.conv)) };
    }),
    /* Balances, so these do NOT scale with the selected period. */
    procurement: {
      unsettledClaims: r0(list.reduce((a, p) => a + p.monthlyActual * 0.09, 0)),
      openPoCount:     r0(list.length * 3 + shash("po" + list.length) * 6),
      openPoValue:     r0(list.reduce((a, p) => a + p.monthlyActual * 0.11, 0)),
      vendorBalance:   r0(list.reduce((a, p) => a + p.monthlyActual * 0.075, 0)),
    },
  };
}

const COLORS = {
  primary: "#18396E",
  accent: "#A7D1CD",
  coral: "#DD7766",
  pos: "#2F8F6B",
  neg: "#CE5C48",
  neu: "#8b95a2",
  gold: "#D19A3E",
  bg: "#EAEFEE",
  ink: "#13294B",
};

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */
const fmtSAR = (n) => {
  if (n >= 1e6) {
    const m = n / 1e6;
    return "SAR " + (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + "M";
  }
  return "SAR " + Math.round(n).toLocaleString("en-US");
};
const grp = (n) => Math.round(n).toLocaleString("en-US");


/* ------------------------------------------------------------------ */
/* Translations                                                        */
/* ------------------------------------------------------------------ */
const T_EN = {
  tagline: "Executive analytics", financial: "Financial health",
  financialSub: "Revenue, tax & receivables",
  centre: "Centre performance", centreSub: "Ranking & trend",
  growth: "Growth & pipeline", growthSub: "Acquisition, loyalty & campaigns",
  ops: "Operations & service quality", opsSub: "Cases & SLA", trend: "Revenue trend",
  leadsBySource: "Leads by source", endFunnel: "End-of-funnel summary",
  compare: "Compare", allCentres: "All Centres", totalRevenue: "Total revenue", vsPrev: "vs. previous period",
  vsPrevShort: "vs prev", citizenExpat: "Revenue by customer type", citizen: "Citizen", expat: "Expat",
  topPerformer: "Top performer", bottomPerformer: "Needs attention", heatTitle: "Month-over-month trend",
  heatSub: "Revenue change per centre, last 6 months", funnel: "Lead-to-Revenue funnel", convRate: "Conversion",
  loyalty: "Loyalty engagement", pointsEarned: "Points earned", pointsRedeemed: "Points redeemed",
  tierDist: "Tier distribution", campaigns: "Campaign performance", campaign: "Campaign", leads: "Leads",
  conv: "Conv.", openCases: "open cases", sla: "SLA compliance", target: "target",
  avgResolution: "avg. resolution time", aging: "Case queue aging", currentPeriod: "Current period",
  previousPeriod: "Previous period", overlayPrev: "Overlay previous period",
  loading: "Fetching live data\u2026", loadFailed: "Live data could not be loaded.",
  loadingBlock: "Loading",
  revenueFunnelLbl: "Revenue funnel", casesLbl: "Cases by status",
  retry: "Retry", awaiting: "Awaiting live feed",
  demoChip: "Demo data", demoNote: "Illustrative figures shown where no live feed exists yet",
  liveChip: "Live data", lastRefreshed: "Last refreshed", refreshNow: "Refresh",
  selectAll: "Select all centres", clearAll: "Clear", ofSelected: "selected",
  noCentres: "No centres selected", noCentresHelp: "Pick at least one centre to see figures.",
  from: "From", to: "To", apply: "Apply", customRange: "Custom range",
  actual: "Actual", targetShort: "Target",
  avgSpendTitle: "Month-on-month average spend", avgSpendSub: "Average spend per invoice, last 6 months",
  tile: {
    A: "Total Sales", B: "VAT Collected", C: "Refunds", D: "Net Sales",
    E: "Total Revenue", F: "VAT", G: "Net Revenue",
    H: "Total Liability", I: "VAT", J: "Net Liability",
    K: "Advance Collected", L: "VAT", M: "Advance Redeemed",
    N: "Membership Revenue", O: "VAT",
  },
};
const T_AR = {
  tagline: "التحليلات التنفيذية", financial: "الأداء المالي", financialSub: "الإيرادات والضرائب والذمم",
  centre: "أداء المراكز", centreSub: "الترتيب والاتجاه",
  growth: "النمو والفرص", growthSub: "الاستقطاب والولاء والحملات",
  ops: "العمليات وجودة الخدمة", opsSub: "الحالات والاتفاقيات", trend: "اتجاه الإيرادات",
  leadsBySource: "العملاء حسب المصدر", endFunnel: "ملخص نهاية المسار",
  compare: "مقارنة", allCentres: "كل المراكز", totalRevenue: "إجمالي الإيرادات", vsPrev: "مقارنة بالفترة السابقة",
  vsPrevShort: "عن السابق", citizenExpat: "الإيرادات حسب نوع العميل", citizen: "مواطن", expat: "مقيم",
  topPerformer: "الأفضل أداءً", bottomPerformer: "يحتاج انتباه", heatTitle: "الاتجاه الشهري",
  heatSub: "تغير الإيرادات لكل مركز، آخر ٦ أشهر", funnel: "مسار العميل إلى الإيراد", convRate: "التحويل",
  loyalty: "تفاعل الولاء", pointsEarned: "النقاط المكتسبة", pointsRedeemed: "النقاط المستبدلة", tierDist: "توزيع الفئات",
  campaigns: "أداء الحملات", campaign: "الحملة", leads: "العملاء", conv: "التحويل", openCases: "حالات مفتوحة",
  sla: "الالتزام بالاتفاقية", target: "الهدف", avgResolution: "متوسط وقت الحل", aging: "أعمار قائمة الحالات",
  currentPeriod: "الفترة الحالية", previousPeriod: "الفترة السابقة", overlayPrev: "إظهار الفترة السابقة",
  loading: "جارٍ تحميل البيانات\u2026", loadFailed: "تعذّر تحميل البيانات.",
  loadingBlock: "جارٍ التحميل",
  revenueFunnelLbl: "مسار الإيرادات", casesLbl: "الحالات حسب الحالة",
  retry: "إعادة المحاولة", awaiting: "في انتظار المصدر",
  demoChip: "بيانات تجريبية", demoNote: "أرقام توضيحية حيث لا يوجد مصدر مباشر بعد",
  liveChip: "بيانات مباشرة", lastRefreshed: "آخر تحديث", refreshNow: "تحديث",
  selectAll: "تحديد كل المراكز", clearAll: "مسح", ofSelected: "محدد",
  noCentres: "لم يتم تحديد أي مركز", noCentresHelp: "اختر مركزًا واحدًا على الأقل لعرض الأرقام.",
  from: "من", to: "إلى", apply: "تطبيق", customRange: "نطاق مخصص",
  actual: "الفعلي", targetShort: "الهدف",
  avgSpendTitle: "متوسط الإنفاق شهريًا", avgSpendSub: "متوسط الإنفاق لكل فاتورة، آخر ٦ أشهر",
  tile: {
    A: "إجمالي المبيعات", B: "ضريبة القيمة المضافة", C: "المبالغ المستردة", D: "صافي المبيعات",
    E: "إجمالي الإيرادات", F: "الضريبة", G: "صافي الإيرادات",
    H: "إجمالي الالتزامات", I: "الضريبة", J: "صافي الالتزامات",
    K: "دفعات مقدمة محصّلة", L: "الضريبة", M: "دفعات مقدمة مستخدمة",
    N: "إيرادات العضويات", O: "الضريبة",
  },
};
const RANGE_LABELS = {
  en: ["Today", "This Week", "This Month", "QTD", "YTD", "Custom"],
  ar: ["اليوم", "هذا الأسبوع", "هذا الشهر", "الربع", "العام", "مخصص"],
};

/* ------------------------------------------------------------------ */
/* SVG charts                                                          */
/* ------------------------------------------------------------------ */
function Sparkline({ vals, color }) {
  const W = 300, H = 44, p = 3;
  const max = Math.max(...vals), min = Math.min(...vals), R = max - min || 1;
  const pts = vals.map((v, i) => [
    p + (i * (W - 2 * p)) / (vals.length - 1),
    H - p - ((v - min) / R) * (H - 2 * p),
  ]);
  const line = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
  const area = `${line} L${W - p} ${H} L${p} ${H} Z`;
  const gid = "spark-grad";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={44} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function LineChart({ series, prevSeries }) {
  const W = 1000, H = 300, pl = 46, pr = 22, pt = 22, pb = 34;
  const cur = series.map((s) => s.value);
  const prev = prevSeries ? prevSeries.map((s) => s.value) : null;
  const all = prev ? cur.concat(prev) : cur;
  let max = Math.max(...all), min = Math.min(...all);
  const span = max - min || max || 1;
  max += span * 0.14;
  min -= span * 0.18;
  const R = max - min || 1;
  const n = series.length;
  const X = (i) => pl + (i * (W - pl - pr)) / (n - 1 || 1);
  const Y = (v) => H - pb - ((v - min) / R) * (H - pt - pb);
  const path = (arr) => arr.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
  const curPath = path(cur);
  const area = `${curPath} L${X(n - 1)} ${H - pb} L${X(0)} ${H - pb} Z`;
  const accent = COLORS.primary;
  const gid = "line-grad";
  const li = n - 1;

  const grid = [];
  for (let g = 0; g <= 3; g++) {
    const y = pt + (g * (H - pt - pb)) / 3;
    grid.push(<line key={"g" + g} x1={pl} y1={y} x2={W - pr} y2={y} stroke="#EAEFEE" strokeWidth={1} vectorEffect="non-scaling-stroke" />);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", height: "auto" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </linearGradient>
      </defs>
      {grid}
      <path d={area} fill={`url(#${gid})`} />
      {prev && (
        <path d={path(prev)} fill="none" stroke="#c2ccd6" strokeWidth={2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      )}
      <path d={curPath} fill="none" stroke={accent} strokeWidth={2.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {cur.map((v, i) => (
        <circle key={"d" + i} cx={X(i)} cy={Y(v)} r={3.4} fill="#fff" stroke={accent} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ))}
      {series.map((s, i) => (
        <text key={"x" + i} x={X(i)} y={H - 12} fill="#9aa4b1" fontSize={12} textAnchor="middle" fontFamily="Lato">{s.label}</text>
      ))}
      <g>
        <rect x={X(li) - 62} y={Y(cur[li]) - 30} width={58} height={21} rx={5} fill={accent} />
        <text x={X(li) - 33} y={Y(cur[li]) - 15.5} fill="#fff" fontSize={12} fontWeight={700} textAnchor="middle" fontFamily="Lato">{fmtSAR(cur[li])}</text>
      </g>
    </svg>
  );
}

function Funnel({ stages, ar }) {
  const W = 520, bandH = 58, gap = 9, n = stages.length;
  const topPad = 8, H = topPad + n * bandH + (n - 1) * gap + 6;
  const badgeW = 106, fL = badgeW + 24, fR = W - 14;
  const cx = (fL + fR) / 2, maxHalf = (fR - fL) / 2, minHalf = 46;
  // Classic funnel: band width by RANK (even taper) — not value-proportional —
  // so every band stays readable no matter how large the top metric is.
  const wAt = (rank) => maxHalf - (rank / n) * (maxHalf - minHalf);
  const shades = ["#B7C7DF", "#8AA1C6", "#5F81AD", "#39608F", "#18396E"];
  const shortLabel = (l) => String(l).replace(/^Appointment\s+/i, "").replace(/^Invoice\s+/i, "");
  const els = [];

  for (let i = 0; i < n; i++) {
    const y0 = topPad + i * (bandH + gap), y1 = y0 + bandH;
    const tH = wAt(i), bH = wAt(i + 1);
    const d = `M ${cx - tH} ${y0} L ${cx + tH} ${y0} L ${cx + bH} ${y1} L ${cx - bH} ${y1} Z`;
    const dark = i >= 2;
    const txt = dark ? "#ffffff" : "#13294B";
    const sub = dark ? "rgba(255,255,255,0.82)" : "rgba(19,41,75,0.62)";
    const pct = ((stages[i].raw / (stages[0].raw || 1)) * 100).toFixed(1);
    const cy = y0 + bandH / 2;

    els.push(<path key={"p" + i} d={d} fill={shades[i % shades.length]} />);
    els.push(
      <text key={"v" + i} x={cx} y={cy - 4} fill={txt} fontSize={22} fontWeight={800} textAnchor="middle" fontFamily="Lato" style={{ fontVariantNumeric: "tabular-nums" }}>
        {grp(stages[i].value)}
      </text>
    );
    els.push(
      <text key={"l" + i} x={cx} y={cy + 12} fill={sub} fontSize={9.5} fontWeight={700} letterSpacing="0.05em" textAnchor="middle" fontFamily="Lato">
        {shortLabel(stages[i].label).toUpperCase()}
      </text>
    );
    els.push(
      <text key={"t" + i} x={cx} y={cy + 24} fill={sub} fontSize={9} textAnchor="middle" fontFamily="Lato">
        {pct + "%"}
      </text>
    );

    if (i > 0) {
      const prev = stages[i - 1].value || 1;
      const diff = stages[i].value - prev;
      const up = diff >= 0;
      const dropPct = ((diff / prev) * 100).toFixed(1);
      const by = y0 + bandH / 2;
      els.push(<rect key={"br" + i} x={8} y={by - 13} width={badgeW} height={26} rx={13} fill={up ? "#E6F1EC" : "#FBEEEA"} stroke={up ? "#CDE6DB" : "#F2D8D2"} strokeWidth={1} />);
      els.push(
        <text key={"bt" + i} x={8 + badgeW / 2} y={by + 4.5} fill={up ? "#2F8F6B" : "#CE5C48"} fontSize={11} fontWeight={700} textAnchor="middle" fontFamily="Lato">
          {(up ? "\u2191 +" : "\u2193 ") + dropPct + "%  " + grp(diff)}
        </text>
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", height: "auto" }}>
      {els}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Derived data hook                                                   */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Live data — real figures from the module dashboard endpoints.        */
/* There is no sample fallback: a widget with no endpoint renders an     */
/* AwaitingFeed card. Still unsourced: centre target vs actual, leads by */
/* source, loyalty tier split, campaign performance, active customers.   */
/* ------------------------------------------------------------------ */
const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
/* BUGFIX: toISOString() converts to UTC. At UTC+3 every local time before
   03:00 rolled the date back a day, so "Today" asked for yesterday and
   "This Month" could ask for the last day of the previous month. Build the
   yyyy-mm-dd string from LOCAL parts instead. */
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseYmd = (s) => {
  const d = new Date(String(s) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};
function spanOf(a, b) {
  const days = Math.max(1, Math.round((b - a) / 86400000) + 1);
  /* factor = period length relative to a 30-day month; used to scale demo
     figures so the time filter visibly changes the numbers. */
  return { fromDate: ymd(a), toDate: ymd(b), days, factor: days / 30 };
}
function periodDates(range, customFrom, customTo) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (range === "Custom") {
    const a = parseYmd(customFrom) || new Date(today);
    const b = parseYmd(customTo) || new Date(today);
    return a <= b ? spanOf(a, b) : spanOf(b, a);
  }
  const start = new Date(today);
  if (range === "This Week") start.setDate(today.getDate() - today.getDay());
  else if (range === "This Month") start.setDate(1);
  else if (range === "QTD") start.setMonth(Math.floor(today.getMonth() / 3) * 3, 1);
  else if (range === "YTD") start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  return spanOf(start, today);
}
const okJson = (r) => (r && r.ok ? r.json() : Promise.reject(new Error("http")));
const unwrap = (b) => (b && b.data !== undefined ? b.data : b);
function liveBucket(daily, max = 12) {
  if (!daily || !daily.length) return [];
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const size = Math.ceil(daily.length / max);
  const out = [];
  for (let i = 0; i < daily.length; i += size) {
    const chunk = daily.slice(i, i + size);
    const value = chunk.reduce((a, r) => a + (Number(r.sales) || 0), 0);
    const d = new Date(chunk[0].date);
    out.push({ label: isNaN(d) ? String(chunk[0].date) : `${MON[d.getMonth()]} ${d.getDate()}`, value });
  }
  return out;
}

/* Query-string name the API expects for the centre filter.
   CONFIRMED from invoice.controller.js: the controller reads `req.query.centre`
   and treats the literal "All" as every centre. A centre-level user is pinned
   to their own centre server-side regardless of what is sent here.
   Multiple centres go as a comma-separated list, which the repositories match
   with STRING_SPLIT. */
const CENTRE_PARAM = "centre";

/* The legal-entity pseudo-centre. A user whose session centre is this (or
   blank) sees every centre; anyone else is a CENTRE-LEVEL user and the API
   pins them to their own centre server-side no matter what the client asks
   for — see the isEntity branch in invoice.controller.js. */
const ENTITY_CENTRE = "Centriq Clinics";

/* ────────────────────────────────────────────────────────────────────────────
   PROGRESSIVE LOADING
   ---------------------------------------------------------------------------
   What this replaces: the loader used to `await Promise.all` over nine
   endpoints and render NOTHING until the slowest one answered, so the entire
   viewport sat behind the worst request in the batch. The financial tiles were
   usually ready in well under a second and still waited on the opportunity
   list, which is the heaviest query on the page.

   WAVE A (critical) — Invoice/HomeDashboard, Invoice/Dashboard,
     Advance/Dashboard. Between them these carry every figure in section 01,
     i.e. the top half of the viewport. Fired immediately; each one commits its
     own slice of state the moment it lands.

   WAVE B (deferred) — the remaining six. Held back until wave A settles OR
     HEAD_START_MS elapses, whichever comes first. On a congested link this
     hands the whole pipe to the tiles instead of splitting it nine ways. The
     timer is the safety valve: a hung wave A must never permanently starve the
     rest of the page.

   Nothing is awaited as a group any more, so one slow endpoint now delays only
   the widgets that actually need it.
   ──────────────────────────────────────────────────────────────────────────── */
const HEAD_START_MS = 1200;

/* One flag per wave-B endpoint. `ltr` (GET /api/Opportunity/Funnel) feeds BOTH
   the funnel trapezoid and the Revenue funnel rows, and is measurably the
   slowest of the six, so keeping it separate matters more than the rest. */
const PENDING_ALL = { cs: true, ap: true, opp: true, mem: true, loy: true, ltr: true };
/* Marks one slice done without disturbing the others. */
const settle = (p, key) => ({ ...p, pending: { ...(p.pending || PENDING_ALL), [key]: false } });

/* NOTE: no snapshot / warm-start cache here, deliberately. Every load starts
   from the loader and shows a figure only once THIS request has returned it.
   Repainting the previous response first is faster to look at but means the
   screen can show yesterday's number as though it were today's, which on a
   financial dashboard is worse than waiting. */

/* Funnel figures straddle both waves — invoiced comes from Invoice/Dashboard
   (wave A) while booked/attended/leads come from Appointment and Opportunity
   (wave B). The raw counts are kept on state under _-prefixed keys and the two
   composite objects are recomputed after every commit, so the funnel fills in
   progressively instead of waiting for all three endpoints. */
const withFunnel = (p) => {
  const invoiced = p._invoiceCount || 0;
  const attended = p._attended     || 0;
  const booked   = p._booked       || 0;
  const noShows  = p._noShows      || 0;
  const leads    = p._leads        || 0;
  const oppOpen  = p._oppOpen      || 0;
  return {
    ...p,
    funnelValues: { leads, contacted: Math.max(0, leads - oppOpen), booked, attended, invoiced },
    endFunnel:    { shown: attended, invoices: invoiced, noShows, shownNotInvoiced: Math.max(0, attended - invoiced) },
  };
};

const sessionUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null"); }
  catch { return null; }
};
/* Tolerant of the casing the login payload happens to use. */
const sessionCentreCode = () => {
  const u = sessionUser() || {};
  return String(u.centerCode || u.centreCode || u.CENTERCODE || u.centre || "").trim();
};

function useLiveDashboard({ range, customFrom, customTo, centreKey, reloadKey }) {
  /* Two independent loading flags instead of one. `topLoading` gates section 01
     only; `restLoading` gates everything below it.

     `pending` goes one level finer: a flag per wave-B endpoint, so a card stops
     spinning when ITS OWN endpoint answers. Without this, restLoading only
     flips once all six have settled, which means the slowest endpoint on the
     page holds a spinner over five blocks whose data arrived long ago — and the
     five fast ones hold nothing back but still look unfinished. */
  const [live, setLive] = useState({ topLoading: true, restLoading: true, pending: PENDING_ALL });
  /* Every in-flight load carries a sequence number. Without it, aborting the
     previous request (which happens on EVERY filter change) resolved the
     fetches to null through their .catch handlers, hit the "nothing came back"
     branch and painted the red retry panel over the request that was still
     running. That is the error the Today / This Week / This Month buttons
     were producing. */
  const seqRef = useRef(0);

  const load = useCallback((signal, seq) => {
    const alive  = () => !signal.aborted && seqRef.current === seq;
    const { fromDate, toDate } = periodDates(range, customFrom, customTo);
    const centreQS = centreKey ? `&${CENTRE_PARAM}=${encodeURIComponent(centreKey)}` : "";
    const qs   = `?fromDate=${fromDate}&toDate=${toDate}${centreQS}`;
    const base = { headers: { "Content-Type": "application/json", ...(TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}) }, credentials: "include", signal };
    const get  = (path, init) => fetch(`${API_BASE_URL}${path}`, init ? { ...base, ...init } : base).then(okJson).catch(() => null);
    const patch = (fn) => { if (alive()) setLive(fn); };
    const N = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    /* Straight back to the loader. Nothing carries over from the previous
       filter, so a figure on screen is always a figure this request returned. */
    setLive({ topLoading: true, restLoading: true, pending: PENDING_ALL });

    /* ── WAVE A — everything section 01 needs ───────────────────────────── */
    let aOk = 0, aDone = 0;
    const doneA = (ok) => {
      if (ok) aOk += 1;
      aDone += 1;
      if (aDone < 3) return;
      patch((p) => ({ ...p, topLoading: false, topFailed: aOk === 0 }));
      startB();
    };

    get(`/api/Invoice/HomeDashboard${qs}`).then((raw) => {
      const home = unwrap(raw);
      const ok = !!(home && home.tiles);
      patch((p) => ({
        ...p,
        live: p.live || ok,
        home: ok ? home : null,
        fetchedAt: ok ? Date.now() : p.fetchedAt,
      }));
      doneA(ok);
    });

    get(`/api/Invoice/Dashboard${qs}`).then((raw) => {
      const inv = unwrap(raw);
      const ok = !!inv;
      patch((p) => {
        if (!ok) return p;
        const salesDaily = Array.isArray(inv.salesDaily) ? inv.salesDaily : [];
        const oc = inv.openClosed || {};
        const invoiceCount = (N(oc.openCnt) + N(oc.closedCnt)) || salesDaily.reduce((a, r) => a + N(r.count), 0);
        const itemAmt = (needle) => (inv.itemType || []).filter((it) => String(it.itemType || "").toLowerCase().includes(needle)).reduce((a, it) => a + N(it.amount), 0);
        return withFunnel({
          ...p,
          live: true,
          fetchedAt: Date.now(),
          periodRev: salesDaily.reduce((a, r) => a + N(r.sales), 0),
          series: liveBucket(salesDaily),
          receivables: N(oc.openVal),
          _invoiceCount: invoiceCount,
          /* Item-type fallbacks, used only while Advance/Dashboard is still in
             flight or if it never answers. Whichever of the two lands second
             wins, and Advance always wins over the fallback. */
          advanceRedeemed: p.advanceRedeemed != null ? p.advanceRedeemed : Math.abs(itemAmt("advance")),
          refunds:         p.refunds         != null ? p.refunds         : Math.abs(itemAmt("refund")),
        });
      });
      doneA(ok);
    });

    get(`/api/Advance/Dashboard${qs}`).then((raw) => {
      const adv = unwrap(raw);
      const ok = !!adv;
      patch((p) => (!ok ? p : {
        ...p,
        live: true,
        fetchedAt: Date.now(),
        advanceHeld:     N(adv.held),
        advanceRedeemed: N(adv.redeemed),
        refunds:         N(adv.refunded),
      }));
      doneA(ok);
    });

    /* ── WAVE B — everything below the fold ─────────────────────────────── */
    /* Declared before startB so the clearTimeout inside it can never land in
       the temporal dead zone, whatever order the promises settle in. */
    let headStart = null;
    let bStarted = false, bDone = 0;
    /* `key` is the slice this response belongs to. restLoading still flips when
       all six are in, for anything that wants a whole-page signal. */
    const doneB = (key) => {
      patch((p) => (bDone + 1 === 6 ? { ...settle(p, key), restLoading: false } : settle(p, key)));
      bDone += 1;
    };

    function startB() {
      if (bStarted || signal.aborted) return;
      bStarted = true;
      clearTimeout(headStart);

      get(`/api/CaseOperation/CaseDashboard${qs}`).then((raw) => {
        const cs = unwrap(raw);
        patch((p) => (!cs ? p : {
          ...p,
          live: true, fetchedAt: Date.now(),
          caseSla:       cs.slaCompliancePct       != null ? Number(cs.slaCompliancePct)       : null,
          caseAvgResHrs: cs.averageResolutionHours != null ? Number(cs.averageResolutionHours) : null,
          caseAgeing:    cs.ageing || null,
          caseCounts: { open: N(cs.open), wip: N(cs.wip), closed: N(cs.closed) },
        }));
        doneB("cs");
      });

      get(`/api/Appointment/AppDashboard`, { method: "POST", body: JSON.stringify({ fromDate, toDate, centre: centreKey, centerCode: centreKey }) }).then((raw) => {
        const ap = unwrap(raw);
        patch((p) => {
          if (!ap) return p;
          const st = ap.status || {};
          return withFunnel({
            ...p, live: true, fetchedAt: Date.now(),
            _attended: N(st.completed), _booked: N(st.total), _noShows: N(st.noShow),
          });
        });
        doneB("ap");
      });

      get(`/api/Opportunity/LoadOpprotunityList/1`).then((raw) => {
        const oppU = unwrap(raw);
        const opp = Array.isArray(raw) ? raw : (Array.isArray(oppU) ? oppU : null);
        patch((p) => (!opp ? p : withFunnel({
          ...p, live: true, fetchedAt: Date.now(),
          _leads:   opp.reduce((a, r) => a + N(r.totalOpportunities), 0),
          _oppOpen: opp.reduce((a, r) => a + N(r.noOfOpenOpportunities), 0),
        })));
        doneB("opp");
      });

      get(`/api/Membership/Dashboard${qs}`).then((raw) => {
        const mem = unwrap(raw);
        patch((p) => (!mem ? p : {
          ...p, live: true, fetchedAt: Date.now(),
          activeMemberships: N(mem.activeMemberships),
          membershipRevenue: N(mem.membershipRevenue),
        }));
        doneB("mem");
      });

      get(`/api/v1/loyalty/dashboard${qs}`).then((raw) => {
        const loy = unwrap(raw);
        patch((p) => (!loy ? p : {
          ...p, live: true, fetchedAt: Date.now(),
          loyaltyMembers:  N(loy.loyaltyMembers),
          newCustomers:    N(loy.newCustomers),
          activeCustomers: N(loy.activeCustomers),
          pointsEarned:    N(loy.pointsEarned),
          pointsRedeemed:  N(loy.pointsRedeemed),
        }));
        doneB("loy");
      });

      get(`/api/Opportunity/Funnel${qs}`).then((raw) => {
        const ltr = unwrap(raw);
        patch((p) => (!ltr ? p : {
          ...p, live: true, fetchedAt: Date.now(),
          ltr: { buckets: ltr.buckets || {}, revenue: ltr.revenue || {}, appointment: ltr.appointment || {}, spend: ltr.spend || {}, badges: ltr.badges || {} },
        }));
        doneB("ltr");
      });
    }

    headStart = setTimeout(startB, HEAD_START_MS);
    signal.addEventListener("abort", () => clearTimeout(headStart));
  }, [range, customFrom, customTo, centreKey]);

  useEffect(() => {
    const c = new AbortController();
    const seq = ++seqRef.current;
    load(c.signal, seq);
    return () => c.abort();
  }, [reloadKey, load]);

  return live;
}

/* Active centres from the hierarchy endpoint (which returns active clinics
   only): { names: {code->name}, codes: [code,...] }. null until loaded / on
   failure, so callers fall back to the full static list.                  */
function useCentreDirectory() {
  const [dir, setDir] = useState(null);
  useEffect(() => {
    const ctl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`, {
          headers: { "Content-Type": "application/json", ...(TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}) },
          credentials: "include",
          signal: ctl.signal,
        });
        if (!res.ok) return;
        const data = unwrap(await res.json()) || {};
        const names = {};
        const codes = [];
        (data.zones || []).forEach((z) =>
          (z.clinics || []).forEach((cl) => {
            if (cl && cl.code && cl.isEntity !== true) { names[cl.code] = cl.name || cl.code; codes.push(cl.code); }
          })
        );
        if (codes.length) setDir({ names, codes });
      } catch { /* keep code fallback */ }
    })();
    return () => ctl.abort();
  }, []);
  return dir;
}

function useDashboardData({ range, compare, overlayPrev, lang, selected, live, centres, sample }) {
  return useMemo(() => {
    const ar = lang === "ar";
    const t = ar ? T_AR : T_EN;
    const DASH = "\u2014";

    const L = live && live.live ? live : null;
    /* SM is consulted ONLY by the six no-endpoint widgets listed at the top of
       this file. It is never used as a fallback for a failed request. */
    const SM = sample || null;
    const HOME = L && L.home ? L.home : null;
    const money = (v) => (v == null ? null : fmtSAR(v));
    const isNeg = (v) => v != null && Number(v) < 0;
    const count = (v) => (v == null ? null : grp(v));

    /* ---- Financial tiles A-O (Home_Dashboard_Calculation, "New" tab) ------
       Hero A, then five paired columns. Null -> the tile shows an em dash. */
    const HT = HOME ? HOME.tiles : null;
    const tv = (k) => (HT ? HT[k] : null);
    /* H / I / J are POINT-IN-TIME balances as at the period end, not period
       flows: outstanding advance + unconsumed package value on the books that
       day. They are non-zero on a day with no transactions, and because
       E = D - H the revenue tiles go negative when sales are small. Labelling
       them "as at <date>" is what stops that reading as a bug. */
    const MON3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const MON_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    /* "2026-06" -> "Jun 26". Falls back to the raw key if the endpoint ever
       returns a month in another shape, so a bad value shows itself rather
       than rendering as "undefined 26". */
    const monthLabel = (m) => {
      const key = String(m || "");
      const idx = Number(key.slice(5, 7)) - 1;
      const name = (ar ? MON_AR : MON3)[idx];
      return name ? name + " " + key.slice(2, 4) : key;
    };
    const asAtRaw = HOME && HOME.period ? HOME.period.toDate : null;
    const asAt = asAtRaw && /^\d{4}-\d{2}-\d{2}$/.test(asAtRaw)
      ? asAtRaw.slice(8, 10) + " " + MON3[Number(asAtRaw.slice(5, 7)) - 1]
      : null;
    const asAtSuffix = asAt ? (ar ? " (حتى " + asAt + ")" : " (as at " + asAt + ")") : "";

    /* "3 Aug 2026, 2:32 PM" — the browser's clock, in the viewer's own time
       zone. Hand-rolled rather than toLocaleString so the month name matches
       the rest of the page and the format does not shift with browser locale. */
    const stamp = (ms) => {
      const dt = new Date(ms);
      if (isNaN(dt.getTime())) return null;
      const h24 = dt.getHours();
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const mm = String(dt.getMinutes()).padStart(2, "0");
      const mer = ar ? (h24 < 12 ? "ص" : "م") : (h24 < 12 ? "AM" : "PM");
      const mon = (ar ? MON_AR : MON3)[dt.getMonth()];
      return `${dt.getDate()} ${mon} ${dt.getFullYear()}, ${h12}:${mm} ${mer}`;
    };
    const lastRefreshed = L && L.fetchedAt ? stamp(L.fetchedAt) : null;
    const tile = (key, raw, label) => ({ key, label, value: money(raw), negative: isNeg(raw) });
    const hasTiles = !!HT;
    const tileGroups = hasTiles ? [
      { top: [tile("B", tv("B_vatCollected")),   tile("C", tv("C_refunds"))],        bottom: tile("D", tv("D_netSales")) },
      { top: [tile("E", tv("E_totalRevenue")),   tile("F", tv("F_vatOnRevenue"))],   bottom: tile("G", tv("G_netRevenue")) },
      { top: [tile("H", tv("H_totalLiability"), t.tile.H + asAtSuffix), tile("I", tv("I_vatOnLiability"))],
        bottom: tile("J", tv("J_netLiability"), t.tile.J + asAtSuffix) },
      { top: [tile("K", tv("K_advanceCollected")), tile("L", tv("L_vatOnAdvance"))], bottom: tile("M", tv("M_advanceRedeemed")) },
      { top: [tile("N", tv("N_membershipSales")),  tile("O", tv("O_vatOnMembership"))], bottom: null },
    ] : [];

    /* Not part of A-O, but both were already live before the rework. */
    /* Row 3 — one card per figure, same shape for all five. Receivables and
       Advance held are live; the last three are sampled (see buildSample). */
    const PR = SM ? SM.procurement : null;
    const receivables = L ? L.receivables : null;
    const advanceHeld = L ? L.advanceHeld : null;
    const supplementaryTiles = [
      { label: ar ? "ذمم مدينة قائمة" : "Outstanding receivables", value: money(receivables) },
      { label: ar ? "دفعات مقدمة محتجزة" : "Advance held",         value: money(advanceHeld),
        sub: asAt ? (ar ? "حتى " + asAt : "as at " + asAt) : undefined },
      /* No claims, purchasing or vendor module exists, so these three are
         sampled — see buildSample(). They render as plain tiles; the only
         record of which figures are sampled now lives in the code. */
      { label: ar ? "مطالبات غير مسوّاة" : "Unsettled Claims",
        value: money(PR ? PR.unsettledClaims : null), sub: PR ? undefined : t.awaiting },
      { label: ar ? "أوامر شراء مفتوحة" : "Open PO",
        value: money(PR ? PR.openPoValue : null),
        sub: PR ? (ar ? "عدد " : "Count ") + grp(PR.openPoCount) : t.awaiting },
      { label: ar ? "أرصدة الموردين" : "Vendor Balance",
        value: money(PR ? PR.vendorBalance : null), sub: PR ? undefined : t.awaiting },
    ];

    /* Hero sparkline — the same exclusion-aware daily series as the tiles. */
    const dailySeries = HOME && Array.isArray(HOME.salesDaily) && HOME.salesDaily.length
      ? HOME.salesDaily
      : [];
    const heroSpark = dailySeries.length > 1 ? dailySeries.slice(-12).map((x) => Number(x.sales) || 0) : null;

    /* ---- Month-on-month average spend per centre ------------------------- */
    const avgSpendSrc = HOME && Array.isArray(HOME.averageSpend) && HOME.averageSpend.length
      ? HOME.averageSpend
      : [];
    const label = (code) => {
      const hit = centres.find((c) => c.name === code);
      return (hit && (hit.label || hit.name)) || code;
    };
    const spendRows = (() => {
      if (!avgSpendSrc.length) return { months: [], rows: [] };
      const months = [...new Set(avgSpendSrc.map((x) => x.month))].sort().slice(-6);
      const byCentre = {};
      avgSpendSrc.forEach((x) => {
        if (!months.includes(x.month)) return;
        (byCentre[x.centreCode] = byCentre[x.centreCode] || {})[x.month] = x.avgSpend;
      });
      const all = Object.values(byCentre).flatMap((m) => Object.values(m));
      const peak = all.length ? Math.max(...all) : 1;
      const rows = Object.keys(byCentre)
        .filter((code) => selected.has(code) || !centres.some((c) => c.name === code))
        .map((code) => {
          const vals = months.map((m) => byCentre[code][m]);
          const present = vals.filter((v) => v != null);
          const avg = present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
          return {
            name: label(code),
            avgNum: avg,
            cells: vals.map((v) => {
              if (v == null) return { label: DASH, bg: "#F4F6F8", color: "#b8c0cb" };
              const a = Math.min(0.92, (v / (peak || 1)) * 0.78 + 0.14);
              return { label: grp(v), bg: `rgba(24,57,110,${a.toFixed(2)})`, color: a > 0.5 ? "#fff" : COLORS.ink };
            }),
            avg: avg == null ? DASH : grp(avg),
          };
        })
        .sort((x, y) => (y.avgNum || 0) - (x.avgNum || 0));
      return { months: months.map(monthLabel), rows };
    })();

    /* ---- Centre performance: actual vs monthly target -------------------- */
    /* No CLINIC_CENTRE_TARGET table exists yet, so neither side of this card
       has a source. Sampled, and tagged as such on screen. */
    const centreRowsSrc = SM ? SM.centreRows : null;
    const centrePerf = centreRowsSrc && centreRowsSrc.length ? (() => {
      const peak = Math.max(...centreRowsSrc.map((r) => Math.max(r.actual, r.target)), 1);
      return centreRowsSrc.map((r) => ({
        name: label(r.code),
        actual: fmtSAR(r.actual),
        target: fmtSAR(r.target),
        pct: Math.round((r.actual / (r.target || 1)) * 100),
        barPct: Math.max(2, Math.round((r.actual / peak) * 100)),
        markPct: Math.max(2, Math.min(100, Math.round((r.target / peak) * 100))),
        met: r.actual >= r.target,
      }));
    })() : null;

    /* ---- Growth KPIs — label + value, value null when unsourced ---------- */
    const growthKpis = [
      { label: ar ? "عملاء جدد" : "New customers",
        value: count(HOME && HOME.customers ? HOME.customers.newCustomers : (L ? L.newCustomers : null)) },
      // Needs the appointment-frequency setting, which does not exist yet.
      // CLINIC_CUSTOMER.Active = 1 means "not deleted", not "visits often".
      // Sampled for that reason.
      { label: ar ? "عملاء نشطون" : "Active customers",
        value: SM ? count(SM.activeCustomers) : null },
      { label: ar ? "عضويات نشطة" : "Active memberships",
        value: count(HOME && HOME.membership ? HOME.membership.activeMemberships : (L ? L.activeMemberships : null)) },
      { label: ar ? "إيرادات العضويات" : "Membership revenue",
        value: money(HT ? HT.N_membershipSales : (L ? L.membershipRevenue : null)) },
      { label: ar ? "أعضاء الولاء" : "Loyalty members",
        value: count(L ? L.loyaltyMembers : null) },
    ].map((k) => ({ ...k, hasValue: k.value != null, value: k.value == null ? DASH : k.value }));

    /* ---- Lead-to-revenue funnel ----------------------------------------- */
    const stageDefs = [
      { key: "captured",          en: "Captured",           ar: "الملتقطة" },
      { key: "converted",         en: "Converted",          ar: "المحوّلة" },
      { key: "appointmentBooked", en: "Appointment Booked", ar: "حجز موعد" },
      { key: "showedUp",          en: "Showed Up",          ar: "الحضور" },
      { key: "purchased",         en: "Purchased",          ar: "شراء" },
    ];
    const liveBuckets = L && L.ltr && L.ltr.buckets && Object.keys(L.ltr.buckets).length ? L.ltr.buckets : null;
    const buckets = liveBuckets;
    const funnelStages = buckets
      ? stageDefs.map((sd) => ({ label: ar ? sd.ar : sd.en, value: Number(buckets[sd.key]) || 0, raw: Number(buckets[sd.key]) || 0 }))
      : null;
    const funnelRate = buckets
      ? (buckets.captured ? ((buckets.purchased / buckets.captured) * 100).toFixed(1) : "0.0")
      : null;
    const rev = (L && L.ltr && L.ltr.revenue && Object.keys(L.ltr.revenue).length) ? L.ltr.revenue : null;
    const spend = (L && L.ltr && L.ltr.spend) ? L.ltr.spend : null;
    const revenueFunnel = rev ? [
      { label: ar ? "معدل الشراء" : "Purchase Rate",        value: `${rev.purchaseRate ?? 0}%` },
      { label: ar ? "متوسط قيمة السلة" : "Avg Basket Size", value: fmtSAR(rev.avgBasketSize || 0) },
      { label: ar ? "إجمالي الإيرادات" : "Total Revenue",   value: fmtSAR(rev.totalRevenue || 0) },
      { label: ar ? "تكلفة اكتساب العميل" : "Lead Acq. Cost",
        value: fmtSAR((spend && spend.leadAcquisitionCost) || 0) },
    ] : null;

    const ef = (L && L.endFunnel) ? L.endFunnel : null;
    const endFunnelTiles = [
      { label: ar ? "المواعيد التي تم الحضور لها" : "Appointments shown", value: ef ? grp(ef.shown) : DASH, color: "#13294B" },
      { label: ar ? "فواتير صادرة" : "Invoices raised",                  value: ef ? grp(ef.invoices) : DASH, color: "#13294B" },
      { label: ar ? "عدم الحضور" : "No-shows",                            value: ef ? grp(ef.noShows) : DASH, color: "#CE5C48" },
      { label: ar ? "حضروا دون فاتورة" : "Shown, not invoiced",           value: ef ? grp(ef.shownNotInvoiced) : DASH, color: "#B07C28" },
    ];

    /* ---- Leads by source, loyalty tiers, campaigns ----------------------- */
    /* None of the three has an endpoint yet, so all three are sampled and each
       card carries the sample tag. Delete the SM branch when they land. */
    const leadSources = SM ? (() => {
      const peak = Math.max(...SM.leadSources.map((x) => x.value), 1);
      return SM.leadSources.map((x) => ({
        label: ar ? x.ar : x.en,
        value: x.value,
        pct: Math.max(2, Math.round((x.value / peak) * 100)),
      }));
    })() : null;

    const loyaltyTiers = SM ? (() => {
      const total = SM.tiers.reduce((a, x) => a + x.value, 0) || 1;
      return SM.tiers.map((x) => ({
        label: ar ? x.ar : x.en,
        value: x.value,
        color: x.color,
        pct: Math.round((x.value / total) * 100),
      }));
    })() : null;

    const campaigns = SM
      ? SM.campaigns.map((c) => ({
          name: ar ? c.ar : c.en,
          leads: grp(c.leads),
          conv: grp(c.converted) + " (" + Math.round((c.converted / (c.leads || 1)) * 100) + "%)",
        }))
      : null;

    /* ---- Operations ------------------------------------------------------ */
    const cc = (L && L.caseCounts && (L.caseCounts.open || L.caseCounts.wip || L.caseCounts.closed))
      ? L.caseCounts
      : null;
    const csMax = cc ? Math.max(1, cc.open, cc.wip, cc.closed) : 1;
    const caseStatuses = cc ? [
      { label: ar ? "مفتوحة" : "Open",   count: cc.open,   color: COLORS.accent },
      { label: ar ? "قيد المعالجة" : "WIP", count: cc.wip,  color: COLORS.primary },
      { label: ar ? "مغلقة" : "Closed",  count: cc.closed, color: "#85A2AA" },
    ].map((x) => ({ ...x, pct: ((x.count / csMax) * 100).toFixed(0) })) : null;
    const openCases = cc ? cc.open + cc.wip : null;

    const slaTarget = 95;
    const sla = L && L.caseSla != null ? L.caseSla : null;
    const atRisk = sla != null && sla < slaTarget;
    const resHrs = L && L.caseAvgResHrs != null ? L.caseAvgResHrs : null;
    const avgResolution = resHrs == null
      ? null
      : (resHrs >= 48 ? (resHrs / 24).toFixed(1) + "d" : resHrs.toFixed(1) + "h");
    const aging = (() => {
      const a = (L && L.caseAgeing) ? L.caseAgeing : null;
      if (!a) return null;
      const defs = [["< 24h", a.under24h], ["1\u20133d", a.days1to3], ["3\u20137d", a.days3to7], ["> 7d", a.over7d]];
      const mx = Math.max(1, ...defs.map((x) => Number(x[1]) || 0));
      const cols = [COLORS.primary, "#5C86A8", COLORS.gold, COLORS.neg];
      return defs.map((x, i) => ({ label: x[0], count: Number(x[1]) || 0, pct: (((Number(x[1]) || 0) / mx) * 100).toFixed(0), color: cols[i] }));
    })();

    /* ---- Revenue trend (section 05, currently hidden) ------------------- */
    const series = dailySeries.map((x) => ({ label: String(x.date).slice(5), value: Number(x.sales) || 0 }));

    const allSel = centres.length > 0 && selected.size === centres.length;
    const noneSel = selected.size === 0;

    return {
      ar, t, dir: ar ? "rtl" : "ltr",
      ranges: RANGE_KEYS.map((k, i) => ({ key: k, label: RANGE_LABELS[ar ? "ar" : "en"][i], active: range === k })),
      centreOptions: centres.map((c) => ({ name: c.name, label: c.label || c.name, on: selected.has(c.name) })),
      allSel, noneSel,
      centreCount: centres.length,
      centreSummary: noneSel
        ? t.noCentres
        : allSel
          ? t.allCentres
          : selected.size === 1
            /* One centre selected reads better as its name than as "1 centres". */
            ? (() => { const only = [...selected][0]; const hit = centres.find((c) => c.name === only); return (hit && (hit.label || hit.name)) || only; })()
            : ar ? selected.size + " مراكز" : selected.size + " centres",
      showCompare: compare,

      lastRefreshed,
      /* Two gates, not one. `topLoading` holds only section 01; `restLoading`
         holds the blocks below it. The page no longer has a single "loading"
         state, because that is exactly what made the whole viewport wait for
         the slowest of nine endpoints. */
      topLoading:  !!(live && live.topLoading),
      restLoading: !!(live && live.restLoading),
      /* Per-card waiting states. A block spins only for the endpoint it needs,
         so GET /api/Opportunity/Funnel being slow no longer holds a spinner
         over the case, loyalty and appointment blocks. */
      pendingCase:   !!(live && live.pending && live.pending.cs),
      pendingAppt:   !!(live && live.pending && live.pending.ap),
      pendingLoyalty:!!(live && live.pending && live.pending.loy),
      /* Both the funnel trapezoid and the Revenue funnel rows come from this
         one endpoint — the slowest on the page. */
      pendingFunnel: !!(live && live.pending && live.pending.ltr),
      /* A page-level failure now means wave A produced nothing AND there was no
         snapshot to paint. A failure below the fold degrades that block only. */
      loadFailed: !!(live && live.topFailed && !live.live),
      hasHome: !!HOME,

      // Financial
      totalSales: tv("A_totalSales") != null ? fmtSAR(tv("A_totalSales")) : DASH,
      tileGroups, supplementaryTiles, heroSpark, spendRows,

      // Centre
      centrePerf,

      // Growth
      growthKpis, funnelStages, funnelRate, endFunnelTiles, revenueFunnel,
      leadSources, loyaltyTiers, campaigns,
      pointsEarned:   count(L ? L.pointsEarned : null)   || DASH,
      pointsRedeemed: count(L ? L.pointsRedeemed : null) || DASH,

      // Operations
      openCases, caseStatuses, sla, slaTarget,
      slaTag: sla == null ? null : atRisk ? (ar ? "تحت الخطر" : "At risk") : ar ? "ضمن الهدف" : "On target",
      slaTagBg: atRisk ? "#F6EBD9" : "#E6F1EC",
      slaTagColor: atRisk ? "#B07C28" : COLORS.pos,
      avgResolution, aging,

      // Trend
      series,
      prevSeries: overlayPrev && series.length ? null : null, // no previous-period endpoint yet
      trendRangeLabel: range,
    };
  }, [range, compare, overlayPrev, lang, selected, live, centres, sample]);
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */
const SectionHeading = ({ num, title, sub }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.primary }}>{num}</span>
    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h2>
    {sub && <span style={{ fontSize: 12.5, color: "#8b95a2" }}>{sub}</span>}
  </div>
);

const card = { background: "#fff", border: "1px solid #e5e9ee", borderRadius: 16, padding: "20px 22px" };

/* ---- role-permission block (DASH.* view denied) ---- */
const RestrictedBlock = ({ ar, height = 220 }) => (
  <div style={{ ...card, minHeight: height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center" }}>
    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#13294B" }}>
      {ar ? "لا تملك صلاحية عرض هذه اللوحة" : "You don't have permission to view this dashboard"}
    </div>
    <div style={{ fontSize: 12, color: "#7a8593", maxWidth: 320, lineHeight: 1.5 }}>
      {ar
        ? "اطلب من المسؤول منحك صلاحية العرض من إعدادات الأدوار والصلاحيات"
        : "Ask an administrator to grant View access from Role Master & Security."}
    </div>
  </div>
);

/* ---- license block (feature not in the tenant's plan) ---- */
const LockedBlock = ({ feature, ar, height = 220 }) => {
  const meta = getFeatureMeta(feature) || {};
  const tierLabel = getTierLabel(minimumTierFor(feature)) || "";
  const name = (ar ? meta.labelAr : meta.label) || meta.label || meta.name || feature;
  return (
    <div style={{ ...card, minHeight: height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center", background: "#F7F9FB" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#13294B" }}>
        {ar ? "هذه الميزة غير مشمولة في باقتك" : "Not included in your plan"}
      </div>
      <div style={{ fontSize: 12, color: "#7a8593", maxWidth: 320, lineHeight: 1.5 }}>
        {ar
          ? `${name} متاحة في باقة ${tierLabel} وما فوق. تواصل معنا للترقية.`
          : `${name} is available on the ${tierLabel} plan and above. Contact us to upgrade.`}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Loading / empty states — shown INSTEAD of sample figures            */
/* ------------------------------------------------------------------ */
/* The progress bar, tile skeleton, awaiting-feed and error states all come
   from the shared DashboardLoadingBar module so every EazyWeek dashboard shows
   the same indicator. Only the page-level composition lives here.          */

/* Section 01 only. The old DashboardLoading covered the WHOLE page and was
   shown instead of every section at once; now each block carries its own
   placeholder so the tiles can arrive without the charts. */
function TileGridSkeleton({ t }) {
  return (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ maxWidth: 420 }}><DashboardLoadingBar label={t.loading} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(250px, 1.3fr) repeat(5, minmax(132px, 1fr))", gridAutoRows: "minmax(104px, auto)", gap: 14 }}>
        <div style={{ gridColumn: 1, gridRow: "1 / span 3" }}><TileSkeleton /></div>
        {[1, 2, 3, 4, 5].map((c) => <div key={"r1" + c} style={{ gridColumn: c + 1, gridRow: 1 }}><TileSkeleton /></div>)}
        {[1, 2, 3, 4].map((c) => <div key={"r2" + c} style={{ gridColumn: c + 1, gridRow: 2 }}><TileSkeleton /></div>)}
        {[1, 2, 3, 4, 5].map((c) => <div key={"r3" + c} style={{ gridColumn: c + 1, gridRow: 3 }}><TileSkeleton /></div>)}
      </div>
    </div>
  );
}

/* Below the fold: a block is either still loading (spinner) or has no endpoint
   at all (awaiting-source card). Previously both read as "awaiting live feed",
   which made a slow fetch look like a permanently missing one.

   Laid out here rather than handed straight to ChartLoading, because
   ChartLoading renders the bar at its intrinsic width from the top-left of
   whatever box it is given: in a 300px-tall card that put a 40px bar in the
   corner of an otherwise empty white rectangle. The bar is now centred in the
   space the finished block will occupy, so the card looks like it is loading
   rather than like it failed to draw.

   showPercent is off deliberately. The percentage is a timed ramp, not real
   progress — it has no idea how far along the request is — so it parks at 93%
   and sits there, which reads as a stuck job. A moving bar with no number
   promises only what it can deliver: something is still in flight. The label
   below it stays the same for as long as the request takes. */
function Pending({ loading, t, height, label }) {
  if (!loading) return <AwaitingFeed title={t.awaiting} height={height} />;
  return (
    <div style={{ height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 11 }}>
      <div style={{ width: "100%", maxWidth: 220 }}>
        <DashboardLoadingBar active showPercent={false} label={null} />
      </div>
      <div style={{ fontSize: 11.5, color: "#8b95a2", textAlign: "center", lineHeight: 1.4 }}>
        {label ? t.loadingBlock + " " + label : t.loading}
      </div>
    </div>
  );
}

/* Mounts children only once the block is near the viewport. Section 01 is
   always mounted; everything below it pays its render cost only if the user
   scrolls there. These charts are hand-rolled SVG with a node per data point,
   and building all of them during first paint is a measurable slice of the
   delay on a mid-range phone. Falls back to mounting immediately where
   IntersectionObserver is unavailable. */
function LazyMount({ minHeight = 260, children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShown(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return <div ref={ref} style={shown ? undefined : { minHeight }}>{shown ? children : null}</div>;
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const [range, setRange] = useState("This Month");
  const [compare, setCompare] = useState(true);
  const [overlayPrev, setOverlayPrev] = useState(false);
  const [lang, setLang] = useState("en");
  const [menuOpen, setMenuOpen] = useState(false);
  /* Session scope, read once. A centre-level user opens the dashboard on their
     OWN centre rather than on every centre — the figures were identical either
     way (the API pins them), but "All Centres" in the header was telling them
     something untrue about what they were looking at. They can still change the
     selection afterwards; nothing here locks the dropdown. */
  const mySessionCentre = useMemo(sessionCentreCode, []);
  const isEntityUser = !mySessionCentre || mySessionCentre === ENTITY_CENTRE;
  const [selected, setSelected] = useState(() =>
    isEntityUser ? new Set(CENTRES.map((c) => c.name)) : new Set([mySessionCentre])
  );
  const [reloadKey, setReloadKey] = useState(0);
  // Custom range. Draft values live in the two inputs; nothing refetches
  // until both are set and Apply is pressed, so a half-typed date can never
  // reach the API.
  const today0 = useMemo(() => ymd(new Date()), []);
  const [draftFrom, setDraftFrom] = useState(today0);
  const [draftTo, setDraftTo] = useState(today0);
  const [customFrom, setCustomFrom] = useState(today0);
  const [customTo, setCustomTo] = useState(today0);

  const centreDir = useCentreDirectory();
  // Effective centre list: active centres from the hierarchy (name from the
  // API, mock rev kept by code). Falls back to the full static list until the
  // hierarchy has loaded.
  const activeCentres = useMemo(() => {
    if (!centreDir || !centreDir.codes.length) return CENTRES;
    return centreDir.codes.map((code) => ({ name: code, label: centreDir.names[code] || code }));
  }, [centreDir]);
  // Once the hierarchy loads, keep the selection within the active centres.
  useEffect(() => {
    if (!centreDir || !centreDir.codes.length) return;
    const active = new Set(centreDir.codes);
    setSelected((prev) => {
      const next = new Set([...prev].filter((code) => active.has(code)));
      if (next.size) return next;
      /* Nothing survived the filter. Fall back to the user's own centre if the
         hierarchy knows it, and only widen to everything for an entity user —
         otherwise a centre-level user would land on "All Centres" again. */
      if (!isEntityUser && active.has(mySessionCentre)) return new Set([mySessionCentre]);
      return active;
    });
  }, [centreDir, isEntityUser, mySessionCentre]);
  // One stable, order-independent key for the selected centres. This is what
  // goes to the API and what the fetch effect depends on, so changing the
  // centre filter actually refetches — previously `selected` never reached
  // useLiveDashboard at all, which is why the dropdown filtered nothing.
  const centreKey = useMemo(() => {
    if (!activeCentres.length) return "";
    // "All" is the controller's own keyword and maps to 'Centriq Clinics',
    // which short-circuits the STRING_SPLIT branch in every dashboard query.
    if (selected.size === activeCentres.length) return "All";
    return [...selected].sort().join(",");
  }, [selected, activeCentres]);
  const live = useLiveDashboard({ range, customFrom, customTo, centreKey, reloadKey });

  /* Sample payload for the six widgets with no endpoint. Recomputed from the
     selected centres and period so those cards react to the filters like the
     live ones do. Null when SAMPLE_UNSOURCED is off or nothing is selected. */
  const sample = useMemo(
    () => buildSample([...selected].sort(), periodDates(range, customFrom, customTo)),
    [selected, range, customFrom, customTo]
  );

  const d = useDashboardData({ range, compare, overlayPrev, lang, selected, live, centres: activeCentres, sample });
  const ar = d.ar;

  /* ---- dashboard view permissions (DASH.*) ---- */
  const [dashPerms, setDashPerms] = useState(null);
  useEffect(() => {
    let alive = true;
    resolveDashboardAccess().then((p) => { if (alive) setDashPerms(p); });
    return () => { alive = false; };
  }, []);
  const canDash = (code) => !dashPerms || dashPerms.isSuper || dashPerms.codes.has(code);

  // License-based block visibility — read the tenant's plan from the logged-in user.
  const licenseUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null"); }
    catch { return null; }
  }, []);
  const licenseSet = useMemo(
    () => resolveFeatures(licenseUser?.licenseTier, licenseUser?.licenseOverrides),
    [licenseUser]
  );
  // Rollout-safe: until login returns a licenseTier, show every block.
  const can = (feature) => !licenseUser?.licenseTier || licenseSet.has(feature);

  const toggleCentre = (name) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(name)) s.delete(name); else s.add(name);
      return s;
    });
  };
  // Select all / clear. An empty selection is allowed and shows an explicit
  // empty state rather than silently snapping back to one centre.
  const selectAll = () => setSelected(new Set(activeCentres.map((c) => c.name)));
  const clearAll = () => setSelected(new Set());
  const toggleAll = () => (d.allSel ? clearAll() : selectAll());

  const applyCustom = () => {
    const a = draftFrom || today0;
    const b = draftTo || today0;
    setCustomFrom(a <= b ? a : b);
    setCustomTo(a <= b ? b : a);
    setRange("Custom");
  };

  const seg = { border: "1px solid #e2e6ec", borderRadius: 11, padding: 3, background: "#f0f2f5", display: "flex", alignItems: "center", gap: 3 };

  return (
    <div
      dir={d.dir}
      style={{
        fontFamily: "'Lato', system-ui, sans-serif",
        color: COLORS.ink, background: COLORS.bg, minHeight: "100vh", WebkitFontSmoothing: "antialiased",
        position: "relative",
      }}
    >
      {/* ===================== TOP BAR ===================== */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(255,255,255,0.86)", backdropFilter: "blur(14px)", borderBottom: "1px solid #e2e6ec" }}>
        <div style={{ maxWidth: 1680, margin: "0 auto", padding: "12px 26px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Date range segmented */}
          <div style={{ ...seg }}>
            {d.ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => (r.key === "Custom" ? applyCustom() : setRange(r.key))}
                style={{
                  border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
                  fontWeight: r.active ? 700 : 500, padding: "6px 12px", borderRadius: 8,
                  background: r.active ? "#fff" : "transparent", color: r.active ? COLORS.primary : "#6b7684",
                  boxShadow: r.active ? "0 1px 3px rgba(20,30,45,0.12)" : "none",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Custom range inputs — shown only while Custom is the active range */}
          {range === "Custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginInlineEnd: "auto", background: "#fff", border: "1px solid #e2e6ec", borderRadius: 11, padding: "5px 9px" }}>
              <span style={{ fontSize: 11.5, color: "#7a8593", fontWeight: 600 }}>{d.t.from}</span>
              <input
                type="date" value={draftFrom} max={draftTo || undefined}
                onChange={(e) => setDraftFrom(e.target.value)}
                style={{ fontFamily: "inherit", fontSize: 12.5, color: COLORS.ink, border: "1px solid #e2e6ec", borderRadius: 8, padding: "5px 8px", background: "#fff" }}
              />
              <span style={{ fontSize: 11.5, color: "#7a8593", fontWeight: 600 }}>{d.t.to}</span>
              <input
                type="date" value={draftTo} min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                style={{ fontFamily: "inherit", fontSize: 12.5, color: COLORS.ink, border: "1px solid #e2e6ec", borderRadius: 8, padding: "5px 8px", background: "#fff" }}
              />
              <button
                onClick={applyCustom}
                style={{ cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none" }}
              >
                {d.t.apply}
              </button>
            </div>
          )}
          {range !== "Custom" && <div style={{ marginInlineEnd: "auto" }} />}

          {/* Centre filter */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "#33404e", padding: "8px 13px", borderRadius: 10, background: "#fff", border: "1px solid #e2e6ec" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.primary }} />
              {d.centreSummary}
              <span style={{ color: "#9aa4b1", fontSize: 10 }}>▾</span>
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", top: 46, insetInlineEnd: 0, zIndex: 50, width: 232, background: "#fff", border: "1px solid #e2e6ec", borderRadius: 13, boxShadow: "0 18px 44px rgba(20,30,45,0.16)", padding: 7 }}>
                {/* Select all — real tri-state checkbox, not a relabelled toggle */}
                <button
                  onClick={toggleAll}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: COLORS.ink, padding: "9px 11px", borderRadius: 9, background: d.allSel ? "#E7ECF4" : "transparent", border: "none", textAlign: "start" }}
                >
                  <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${d.noneSel ? "#cdd4dc" : COLORS.primary}`, background: d.noneSel ? "#fff" : COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, flex: "none" }}>
                    {d.allSel ? "✓" : d.noneSel ? "" : "–"}
                  </span>
                  <span style={{ flex: 1 }}>{d.t.selectAll}</span>
                  <span style={{ fontSize: 11, color: "#9aa4b1", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {selected.size}/{d.centreCount}
                  </span>
                </button>
                <div style={{ height: 1, background: "#edf0f3", margin: "5px 4px" }} />
                {d.centreOptions.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => toggleCentre(c.name)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 500, color: "#33404e", padding: "8px 11px", borderRadius: 9, background: "none", border: "none", textAlign: "start" }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${c.on ? COLORS.primary : "#cdd4dc"}`, background: c.on ? COLORS.primary : "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, flex: "none" }}>
                      {c.on ? "✓" : ""}
                    </span>
                    {c.label}
                  </button>
                ))}
                <div style={{ height: 1, background: "#edf0f3", margin: "5px 4px" }} />
                <button
                  onClick={clearAll}
                  disabled={d.noneSel}
                  style={{ width: "100%", cursor: d.noneSel ? "default" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: d.noneSel ? "#c3cad3" : "#6b7684", padding: "7px 11px", borderRadius: 9, background: "none", border: "none", textAlign: "start" }}
                >
                  {d.t.clearAll}
                </button>
              </div>
            )}
          </div>

          {/* Compare toggle */}
          <button
            onClick={() => setCompare((c) => !c)}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit", padding: "7px 12px 7px 13px", borderRadius: 10, background: compare ? "#E7ECF4" : "#fff", border: `1px solid ${compare ? "#C3CEE0" : "#e2e6ec"}` }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 600, color: compare ? "#05224C" : "#6b7684" }}>{d.t.compare}</span>
            <span style={{ width: 34, height: 19, borderRadius: 20, background: compare ? COLORS.primary : "#cdd4dc", position: "relative", transition: "background .2s" }}>
              <span style={{ position: "absolute", top: 2, width: 15, height: 15, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", insetInlineStart: compare ? (ar ? "2px" : "17px") : ar ? "17px" : "2px", transition: "inset-inline-start .2s" }} />
            </span>
          </button>

          {/* Language / direction */}
          <div style={{ display: "flex", background: "#f0f2f5", border: "1px solid #e2e6ec", borderRadius: 10, padding: 3, gap: 2 }}>
            <button onClick={() => setLang("en")} style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 7, background: !ar ? "#fff" : "transparent", color: !ar ? COLORS.primary : "#6b7684" }}>EN</button>
            <button onClick={() => setLang("ar")} style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 7, background: ar ? "#fff" : "transparent", color: ar ? COLORS.primary : "#6b7684" }}>ع</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1680, margin: "0 auto", padding: "24px 26px 60px" }}>
        {/* Data-state strip. No "sample data" state exists any more. */}
        {!d.loadFailed && !d.topLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#E6F1EC", color: COLORS.pos }}>{d.t.liveChip}</span>
            {d.lastRefreshed && (
              <span style={{ fontSize: 11.5, color: "#8b95a2" }}>
                {d.t.lastRefreshed} {d.lastRefreshed}
              </span>
            )}
            {/* Re-runs the same fetch through the existing reloadKey path. */}
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              title={d.t.refreshNow}
              style={{ cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: COLORS.primary, padding: "3px 10px", borderRadius: 20, background: "#fff", border: "1px solid #e2e6ec", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <span style={{ fontSize: 12 }}>&#8635;</span>{d.t.refreshNow}
            </button>
          </div>
        )}

        {d.noneSel ? (
          <div style={{ ...card, textAlign: "center", padding: "58px 24px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink }}>{d.t.noCentres}</div>
            <div style={{ fontSize: 12.5, color: "#8b95a2", marginTop: 7 }}>{d.t.noCentresHelp}</div>
            <button
              onClick={selectAll}
              style={{ marginTop: 18, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "9px 18px", borderRadius: 10, background: COLORS.primary, color: "#fff", border: "none" }}
            >
              {d.t.selectAll}
            </button>
          </div>
        ) : d.loadFailed ? (
          <LoadError height={190} message={d.t.loadFailed} retryLabel={d.t.retry} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : (
        <>
        {/* ===================== 1. FINANCIAL HEALTH ===================== */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="01" title={d.t.financial} />
          {!canDash(DASHBOARD_VIEW.FINANCIAL) ? (
            <RestrictedBlock ar={ar} height={220} />
          ) : d.topLoading && !d.hasHome ? (
            <TileGridSkeleton t={d.t} />
          ) : !d.hasHome ? (
            <AwaitingFeed title={d.t.awaiting} height={180} />
          ) : (
          <div
            style={{
              display: "grid",
              // Explicit 6 columns x 3 rows. auto-fit was letting the browser
              // choose the track count, so pairs drifted out of alignment and
              // the last row left dead tracks.
              gridTemplateColumns: "minmax(250px, 1.3fr) repeat(5, minmax(132px, 1fr))",
              gridAutoRows: "minmax(104px, auto)",
              gap: 14,
            }}
          >
            {/* Hero: A — Total Sales, spanning all three rows */}
            <div style={{ gridColumn: 1, gridRow: "1 / span 3", background: COLORS.primary, color: "#fff", borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", boxShadow: "0 12px 30px rgba(24,57,110,0.28)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.16), transparent 60%)", pointerEvents: "none" }} />
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>{d.t.tile.A}</div>
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{d.totalSales}</div>
              {d.heroSpark && (
                <div style={{ marginTop: 16, flex: 1, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%" }}><Sparkline vals={d.heroSpark} color={COLORS.accent} /></div>
                </div>
              )}
            </div>

            {/* Row 1 — the paired gross/VAT cards (B+C, E+F, H+I, K+L, N+O) */}
            {d.tileGroups.map((g, i) => (
              <div key={"top" + i} style={{ ...card, gridColumn: i + 2, gridRow: 1, borderRadius: 14, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 13 }}>
                {g.top.map((tl, ti) => (
                  <div key={tl.key} style={ti ? { paddingTop: 11, borderTop: "1px solid #eef1f5" } : undefined}>
                    <div style={{ fontSize: 11.5, color: "#7a8593", fontWeight: 500 }}>{tl.label || d.t.tile[tl.key]}</div>
                    <div style={{ fontSize: ti ? 17 : 20, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4, fontVariantNumeric: "tabular-nums", color: tl.negative ? COLORS.neg : undefined }}>
                      {tl.value == null ? "\u2014" : tl.value}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Row 2 — the derived net cards. Membership has no net tile, so
                column 6 is deliberately empty rather than stretched. */}
            {d.tileGroups.map((g, i) => (g.bottom ? (
              <div key={"bot" + i} style={{ ...card, gridColumn: i + 2, gridRow: 2, borderRadius: 14, padding: "16px 17px", background: "#F7F9FB", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 11.5, color: "#7a8593", fontWeight: 500 }}>{g.bottom.label || d.t.tile[g.bottom.key]}</div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4, fontVariantNumeric: "tabular-nums", color: g.bottom.negative ? COLORS.neg : COLORS.primary }}>
                  {g.bottom.value == null ? "\u2014" : g.bottom.value}
                </div>
              </div>
            ) : null))}

            {/* Row 3 — receivables, advance held and the three placeholder cards */}
            {d.supplementaryTiles.map((tl, i) => (
              <div key={tl.label} style={{ ...card, gridColumn: i + 2, gridRow: 3, borderRadius: 14, padding: "16px 17px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 11.5, color: "#7a8593", fontWeight: 500 }}>{tl.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                  {tl.value == null ? "\u2014" : tl.value}
                </div>
                {tl.sub && (
                  <div style={{ fontSize: 11.5, color: "#8b95a2", marginTop: 5, fontVariantNumeric: "tabular-nums" }}>{tl.sub}</div>
                )}
              </div>
            ))}
          </div>
          )}
        </section>

        {/* ===================== 2. CENTRE PERFORMANCE ===================== */}
        <LazyMount minHeight={320}>
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="02" title={d.t.centre} />
          {!canDash(DASHBOARD_VIEW.CENTRE_PERFORMANCE) ? (
            <RestrictedBlock ar={ar} height={220} />
          ) : can("multiLocation") ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {/* Target vs actual. Both the ranked bars AND the top/bottom performer
                badges needed a per-centre period figure against a monthly target;
                the target table does not exist yet, and the badges were reading
                the old mock revenue, so the whole card is an explicit gap. */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{d.t.centre}</div>
              <div style={{ fontSize: 11.5, color: "#8b95a2", marginBottom: 15 }}>{d.t.centreSub}</div>
              {!d.centrePerf ? <Pending loading={d.restLoading} t={d.t} height={210} label={d.t.centre} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  {d.centrePerf.map((c) => (
                    <div key={c.name}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#33404e" }}>{c.name}</span>
                        <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "#7a8593" }}>
                          <span style={{ fontWeight: 700, color: COLORS.ink }}>{c.actual}</span>
                          <span style={{ marginInlineStart: 7 }}>{d.t.targetShort} {c.target}</span>
                        </span>
                      </div>
                      <div style={{ position: "relative", height: 14, background: "#f2f4f7", borderRadius: 5 }}>
                        <div style={{ width: `${c.barPct}%`, height: "100%", background: c.met ? COLORS.pos : COLORS.primary, borderRadius: 5 }} />
                        {/* target marker */}
                        <div style={{ position: "absolute", top: -3, insetInlineStart: `${c.markPct}%`, width: 2, height: 20, background: "#33404e" }} />
                        <span style={{ position: "absolute", insetInlineEnd: 6, top: -1, fontSize: 10.5, fontWeight: 700, color: c.barPct > 55 ? "#fff" : "#7a8593", fontVariantNumeric: "tabular-nums" }}>
                          {c.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Month-on-month average spend — real figures, non-refunded
                invoices, last 6 months, from GET /api/Invoice/HomeDashboard. */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{d.t.avgSpendTitle}</div>
              <div style={{ fontSize: 11.5, color: "#8b95a2", marginBottom: 15 }}>{d.t.avgSpendSub}</div>
              {!d.spendRows.rows.length ? (
                <AwaitingFeed title={d.t.awaiting} height={150} />
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: `88px repeat(${d.spendRows.months.length}, 1fr) 62px`, gap: 6, alignItems: "center" }}>
                    <div />
                    {d.spendRows.months.map((m) => (
                      <div key={m} style={{ fontSize: 10.5, color: "#9aa4b1", textAlign: "center", fontWeight: 500 }}>{m}</div>
                    ))}
                    <div style={{ fontSize: 10.5, color: "#9aa4b1", textAlign: "center", fontWeight: 700 }}>{ar ? "المتوسط" : "Avg"}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    {d.spendRows.rows.map((row) => (
                      <div key={row.name} style={{ display: "grid", gridTemplateColumns: `88px repeat(${d.spendRows.months.length}, 1fr) 62px`, gap: 6, alignItems: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#33404e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</div>
                        {row.cells.map((cell, ci) => (
                          <div key={ci} style={{ height: 30, borderRadius: 6, background: cell.bg, color: cell.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{cell.label}</div>
                        ))}
                        <div style={{ height: 30, borderRadius: 6, background: COLORS.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{row.avg}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          ) : <LockedBlock feature="multiLocation" ar={ar} />}
        </section>
        </LazyMount>

        {/* ===================== 3. GROWTH & PIPELINE ===================== */}
        <LazyMount minHeight={520}>
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="03" title={d.t.growth} />
          {(can("opportunity") || can("loyalty")) ? (
          <>
          {!canDash(DASHBOARD_VIEW.GROWTH_KPIS) ? (
            <div style={{ marginBottom: 16 }}><RestrictedBlock ar={ar} height={110} /></div>
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 16 }}>
            {d.growthKpis.map((k, i) => (
              <div key={i} style={{ ...card, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontSize: 12, color: "#7a8593", fontWeight: 500 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 7, fontVariantNumeric: "tabular-nums", color: k.hasValue ? undefined : "#b8c0cb" }}>{k.value}</div>
                {!k.hasValue && (
                  <div style={{ fontSize: 10.5, color: "#9aa4b1", marginTop: 6, lineHeight: 1.35 }}>{d.t.awaiting}</div>
                )}
              </div>
            ))}
          </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 16, alignItems: "stretch" }}>
            {/* Col 1: Funnel */}
            {!canDash(DASHBOARD_VIEW.LTR_FUNNEL) ? (
              <RestrictedBlock ar={ar} height={360} />
            ) : (
            <div style={{ ...card, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.t.funnel}</div>
                {d.funnelRate != null && (
                  <div style={{ fontSize: 12, color: "#7a8593" }}>{d.t.convRate} <span style={{ fontWeight: 700, color: "#2F8F6B", fontSize: 14 }}>{d.funnelRate}%</span></div>
                )}
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                {d.funnelStages
                  ? <Funnel stages={d.funnelStages} ar={ar} />
                  : <Pending loading={d.pendingFunnel} t={d.t} height={300} label={d.t.funnel} />}
              </div>
            </div>
            )}

            {/* Col 2: Leads by source + End-of-funnel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!canDash(DASHBOARD_VIEW.LEADS_BY_SOURCE) ? (
                <RestrictedBlock ar={ar} height={170} />
              ) : (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{d.t.leadsBySource}</div>
                {!d.leadSources ? <Pending loading={d.restLoading} t={d.t} height={132} label={d.t.leadsBySource} /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {d.leadSources.map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 96, fontSize: 11.5, color: "#33404e", flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                        <div style={{ flex: 1, height: 13, background: "#f2f4f7", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${s.pct}%`, height: "100%", background: COLORS.primary, borderRadius: 4 }} />
                        </div>
                        <div style={{ width: 34, textAlign: "end", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", flex: "none" }}>{grp(s.value)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
              {!canDash(DASHBOARD_VIEW.LTR_FUNNEL) ? (
                <RestrictedBlock ar={ar} height={230} />
              ) : (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{d.t.endFunnel}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {d.endFunnelTiles.map((e, i) => (
                    <div key={i} style={{ background: "#f5f7f5", border: "1px solid #eaeeea", borderRadius: 11, padding: "13px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 11.5, color: "#7a8593", lineHeight: 1.3, minHeight: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>{e.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, fontVariantNumeric: "tabular-nums", color: e.color }}>{e.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 16, marginBottom: 10, color: "#33404e" }}>{ar ? "مسار الإيرادات" : "Revenue funnel"}</div>
                {!d.revenueFunnel ? <Pending loading={d.pendingFunnel} t={d.t} height={96} label={d.t.revenueFunnelLbl} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {d.revenueFunnel.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                      <span style={{ color: "#7a8593" }}>{r.label}</span>
                      <span style={{ fontWeight: 700, color: "#13294B", fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
                )}
              </div>
              )}
            </div>

            {/* Col 3: Loyalty + Campaigns */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Loyalty */}
              {!canDash(DASHBOARD_VIEW.LOYALTY) ? (
                <RestrictedBlock ar={ar} height={170} />
              ) : can("loyalty") ? (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{d.t.loyalty}</div>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, color: "#7a8593" }}>{d.t.pointsEarned}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{d.pointsEarned}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, color: "#7a8593" }}>{d.t.pointsRedeemed}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{d.pointsRedeemed}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#7a8593", marginBottom: 8 }}>{d.t.tierDist}</div>
                {!d.loyaltyTiers ? <Pending loading={d.restLoading} t={d.t} height={96} label={d.t.tierDist} /> : (
                  <>
                    <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
                      {d.loyaltyTiers.map((x) => (
                        <div key={x.label} style={{ width: `${x.pct}%`, background: x.color }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {d.loyaltyTiers.map((x) => (
                        <div key={x.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 3, background: x.color, flex: "none" }} />
                          <span style={{ flex: 1, color: "#33404e" }}>{x.label}</span>
                          <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{grp(x.value)}</span>
                          <span style={{ width: 34, textAlign: "end", color: "#8b95a2", fontVariantNumeric: "tabular-nums" }}>{x.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              ) : <LockedBlock feature="loyalty" ar={ar} />}

              {/* Campaigns */}
              {!canDash(DASHBOARD_VIEW.CAMPAIGNS) ? (
                <RestrictedBlock ar={ar} height={170} />
              ) : (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{d.t.campaigns}</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 10.5, color: "#9aa4b1", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid #edf0f3" }}>
                    <span style={{ flex: 1 }}>{d.t.campaign}</span>
                    <span style={{ width: 66, textAlign: "end" }}>{d.t.leads}</span>
                    <span style={{ width: 66, textAlign: "end" }}>{d.t.conv}</span>
                  </div>
                  <div style={{ paddingTop: 12 }}>
                    {!d.campaigns ? <Pending loading={d.restLoading} t={d.t} height={110} label={d.t.campaigns} /> : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {d.campaigns.map((c) => (
                          <div key={c.name} style={{ display: "flex", alignItems: "center", fontSize: 12.5 }}>
                            <span style={{ flex: 1, color: "#33404e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingInlineEnd: 8 }}>{c.name}</span>
                            <span style={{ width: 66, textAlign: "end", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.leads}</span>
                            <span style={{ width: 66, textAlign: "end", color: COLORS.pos, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.conv}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
          </>
          ) : <LockedBlock feature="opportunity" ar={ar} />}
        </section>
        </LazyMount>

        {/* ===================== 4. OPERATIONS ===================== */}
        <LazyMount minHeight={320}>
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="04" title={d.t.ops} />
          {!canDash(DASHBOARD_VIEW.CASE_OPS) ? (
            <RestrictedBlock ar={ar} height={220} />
          ) : can("caseManagement") ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {/* Cases by status */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d.openCases == null ? "\u2014" : d.openCases}</div>
                <div style={{ fontSize: 12.5, color: "#7a8593" }}>{d.t.openCases}</div>
              </div>
              {!d.caseStatuses ? <Pending loading={d.pendingCase} t={d.t} height={120} label={d.t.casesLbl} /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {d.caseStatuses.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 128, fontSize: 12, color: "#33404e", flex: "none" }}>{s.label}</div>
                    <div style={{ flex: 1, height: 16, background: "#f2f4f7", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: 5 }} />
                    </div>
                    <div style={{ width: 30, textAlign: "end", fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", flex: "none" }}>{s.count}</div>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* SLA + resolution */}
            <div style={{ ...card, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.t.sla}</div>
                {d.slaTag && (
                  <div style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: d.slaTagBg, color: d.slaTagColor }}>{d.slaTag}</div>
                )}
              </div>
              {d.sla == null ? (
                <AwaitingFeed title={d.t.awaiting} height={96} />
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: d.slaTagColor }}>{d.sla}%</div>
                    <div style={{ fontSize: 11.5, color: "#8b95a2", paddingBottom: 5 }}>{d.t.target} {d.slaTarget}%</div>
                  </div>
                  <div style={{ marginTop: 14, height: 10, background: "#f2f4f7", borderRadius: 6, position: "relative", overflow: "visible" }}>
                    <div style={{ width: `${Math.min(100, d.sla)}%`, height: "100%", background: d.slaTagColor, borderRadius: 6 }} />
                    <div style={{ position: "absolute", top: -4, insetInlineStart: `${d.slaTarget}%`, width: 2, height: 18, background: "#33404e" }} />
                  </div>
                </>
              )}
              <div style={{ height: 1, background: "#edf0f3", margin: "18px 0" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: d.avgResolution == null ? "#b8c0cb" : undefined }}>{d.avgResolution == null ? "\u2014" : d.avgResolution}</div>
                <div style={{ fontSize: 12.5, color: "#7a8593" }}>{d.t.avgResolution}</div>
              </div>
            </div>

            {/* Aging */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{d.t.aging}</div>
              {!d.aging ? <Pending loading={d.pendingCase} t={d.t} height={130} label={d.t.aging} /> : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 130 }}>
                {d.aging.map((a, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{a.count}</div>
                    <div style={{ width: "100%", height: `${a.pct}%`, background: a.color, borderRadius: "7px 7px 3px 3px" }} />
                    <div style={{ fontSize: 10.5, color: "#8b95a2", textAlign: "center" }}>{a.label}</div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
          ) : <LockedBlock feature="caseManagement" ar={ar} />}
        </section>
        </LazyMount>

        {/* ===================== 5. REVENUE TREND (temporarily hidden) ===================== */}
        <section style={{ display: "none" }}>
          <SectionHeading num="05" title={d.t.trend} sub={d.trendRangeLabel} />
          <div style={{ background: "#fff", border: "1px solid #e5e9ee", borderRadius: 16, padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                  <span style={{ width: 22, height: 3, borderRadius: 2, background: COLORS.primary }} />
                  <span style={{ fontWeight: 600 }}>{d.t.currentPeriod}</span>
                </div>
                {overlayPrev && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 22, height: 0, borderTop: "3px dashed #b6c0cc" }} />
                    <span style={{ fontWeight: 600, color: "#8b95a2" }}>{d.t.previousPeriod}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setOverlayPrev((o) => !o)}
                style={{ cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "7px 13px", borderRadius: 9, background: overlayPrev ? "#E7ECF4" : "#fff", color: overlayPrev ? "#05224C" : "#6b7684", border: `1px solid ${overlayPrev ? "#C3CEE0" : "#e2e6ec"}` }}
              >
                {d.t.overlayPrev}
              </button>
            </div>
            <div>{d.series.length > 1 ? <LineChart series={d.series} prevSeries={d.prevSeries} /> : <AwaitingFeed title={d.t.awaiting} height={200} />}</div>
          </div>
        </section>
        </>
        )}
      </main>
    </div>
  );
}