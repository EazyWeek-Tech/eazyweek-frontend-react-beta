import { useState, useMemo, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config"; // adjust path to match this file's location
import { resolveFeatures, getFeatureMeta, minimumTierFor, getTierLabel } from "../../config/licenseConfig"; // license helpers (adjust path if needed)
// Shared EazyWeek loading indicators. Place DashboardLoadingBar.jsx beside this
// file (src/pages/Dashboard/) or adjust this path to wherever it lives.
import { DashboardLoadingBar, TileSkeleton, ChartLoading, AwaitingFeed, LoadError } from "./DashboardLoadingBar";

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

const RANGE_KEYS = ["Today", "This Week", "This Month", "QTD", "YTD"];

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
  retry: "Retry", awaiting: "Awaiting live feed",
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
  retry: "إعادة المحاولة", awaiting: "في انتظار المصدر",
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
  en: ["Today", "This Week", "This Month", "QTD", "YTD"],
  ar: ["اليوم", "هذا الأسبوع", "هذا الشهر", "الربع", "العام"],
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
const ymd = (d) => d.toISOString().slice(0, 10);
function periodDates(range) {
  const today = new Date();
  const start = new Date(today);
  if (range === "This Week") start.setDate(today.getDate() - today.getDay());
  else if (range === "This Month") start.setDate(1);
  else if (range === "QTD") start.setMonth(Math.floor(today.getMonth() / 3) * 3, 1);
  else if (range === "YTD") start.setMonth(0, 1);
  return { fromDate: ymd(start), toDate: ymd(today) };
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

function useLiveDashboard({ range, reloadKey }) {
  const [live, setLive] = useState({ loading: true });
  const load = useCallback(async (signal) => {
    setLive({ loading: true });
    const { fromDate, toDate } = periodDates(range);
    const base = { headers: { "Content-Type": "application/json", ...(TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}) }, credentials: "include", signal };
    try {
      const [invB, caseB, apptB, oppB, advB, memB, loyB, ltrB, homeB] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Invoice/Dashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/CaseOperation/CaseDashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/Appointment/AppDashboard`, { ...base, method: "POST", body: JSON.stringify({ fromDate, toDate }) }).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/Opportunity/LoadOpprotunityList/1`, base).then(okJson).catch(() => null),
        // NOTE: adjust these three base paths to match your route mounts if different
        fetch(`${API_BASE_URL}/api/Advance/Dashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/Membership/Dashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/loyalty/dashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/Opportunity/Funnel`, base).then(okJson).catch(() => null),
        // Financial tiles A-O + new customers + 6-month average spend.
        fetch(`${API_BASE_URL}/api/Invoice/HomeDashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
      ]);
      if (!invB && !caseB && !apptB && !oppB && !homeB) { setLive({ live: false }); return; }
      const inv = unwrap(invB) || {}, cs = unwrap(caseB) || {}, ap = unwrap(apptB) || {};
      const oppU = unwrap(oppB);
      const opp = Array.isArray(oppB) ? oppB : (Array.isArray(oppU) ? oppU : []);
      const adv = unwrap(advB), mem = unwrap(memB), loy = unwrap(loyB);
      const ltr = unwrap(ltrB);
      const home = unwrap(homeB);
      const N = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

      const salesDaily = Array.isArray(inv.salesDaily) ? inv.salesDaily : [];
      const periodRev = salesDaily.reduce((a, r) => a + N(r.sales), 0);
      const oc = inv.openClosed || {};
      const invoiceCount = (N(oc.openCnt) + N(oc.closedCnt)) || salesDaily.reduce((a, r) => a + N(r.count), 0);
      const itemAmt = (needle) => (inv.itemType || []).filter((it) => String(it.itemType || "").toLowerCase().includes(needle)).reduce((a, it) => a + N(it.amount), 0);

      const st = ap.status || {};
      const attended = N(st.completed), booked = N(st.total), noShows = N(st.noShow);
      const leads = opp.reduce((a, r) => a + N(r.totalOpportunities), 0);
      const oppOpen = opp.reduce((a, r) => a + N(r.noOfOpenOpportunities), 0);

      setLive({
        live: true,
        // Home dashboard atoms — null until the endpoint is deployed, in which
        // case the financial tiles show "awaiting source", never a sample.
        home: home && home.tiles ? home : null,
        // Case extras added to the CaseDashboard aggregate.
        caseSla:        cs.slaCompliancePct     != null ? Number(cs.slaCompliancePct) : null,
        caseAvgResHrs:  cs.averageResolutionHours != null ? Number(cs.averageResolutionHours) : null,
        caseAgeing:     cs.ageing || null,
        periodRev,
        series: liveBucket(salesDaily),
        receivables: N(oc.openVal),
        advanceHeld:     adv ? N(adv.held)     : null,
        advanceRedeemed: adv ? N(adv.redeemed) : Math.abs(itemAmt("advance")),
        refunds:         adv ? N(adv.refunded) : Math.abs(itemAmt("refund")),
        activeMemberships: mem ? N(mem.activeMemberships) : null,
        membershipRevenue: mem ? N(mem.membershipRevenue) : null,
        loyaltyMembers:  loy ? N(loy.loyaltyMembers)  : null,
        newCustomers:    loy ? N(loy.newCustomers)    : null,
        activeCustomers: loy ? N(loy.activeCustomers)  : null,
        pointsEarned:    loy ? N(loy.pointsEarned)    : null,
        pointsRedeemed:  loy ? N(loy.pointsRedeemed)  : null,
        caseCounts: { open: N(cs.open), wip: N(cs.wip), closed: N(cs.closed) },
        funnelValues: { leads, contacted: Math.max(0, leads - oppOpen), booked, attended, invoiced: invoiceCount },
        endFunnel: { shown: attended, invoices: invoiceCount, noShows, shownNotInvoiced: Math.max(0, attended - invoiceCount) },
        ltr: ltr ? { buckets: ltr.buckets || {}, revenue: ltr.revenue || {}, appointment: ltr.appointment || {}, spend: ltr.spend || {}, badges: ltr.badges || {} } : null,
      });
    } catch { setLive({ live: false }); }
  }, [range]);
  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [range, reloadKey, load]);
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

function useDashboardData({ range, compare, overlayPrev, lang, selected, live, centres }) {
  return useMemo(() => {
    const ar = lang === "ar";
    const t = ar ? T_AR : T_EN;
    const DASH = "\u2014";

    const L = live && live.live ? live : null;
    const HOME = L && L.home ? L.home : null;
    const HT = HOME ? HOME.tiles : null;
    const money = (v) => (v == null ? null : fmtSAR(v));
    const count = (v) => (v == null ? null : grp(v));

    /* ---- Financial tiles A-O (Home_Dashboard_Calculation, "New" tab) ------
       Hero A, then five paired columns. Null -> the tile shows an em dash;
       nothing is ever substituted. */
    const tileGroups = HT ? [
      { top: [{ key: "B", value: money(HT.B_vatCollected) }, { key: "C", value: money(HT.C_refunds) }],
        bottom: { key: "D", value: money(HT.D_netSales) } },
      { top: [{ key: "E", value: money(HT.E_totalRevenue) }, { key: "F", value: money(HT.F_vatOnRevenue) }],
        bottom: { key: "G", value: money(HT.G_netRevenue) } },
      { top: [{ key: "H", value: money(HT.H_totalLiability) },
              { key: "I", value: money(HT.I_vatOnLiability) }],
        bottom: { key: "J", value: money(HT.J_netLiability) } },
      { top: [{ key: "K", value: money(HT.K_advanceCollected) }, { key: "L", value: money(HT.L_vatOnAdvance) }],
        bottom: { key: "M", value: money(HT.M_advanceRedeemed) } },
      { top: [{ key: "N", value: money(HT.N_membershipSales) }, { key: "O", value: money(HT.O_vatOnMembership) }],
        bottom: null },
    ] : [];

    /* Not part of A-O, but both were already live before the rework. */
    const extraTiles = L ? [
      { label: ar ? "ذمم مدينة قائمة" : "Outstanding receivables", value: money(L.receivables) },
      { label: ar ? "دفعات مقدمة محتجزة" : "Advance held",         value: money(L.advanceHeld) },
    ] : [];

    /* Hero sparkline — the same exclusion-aware daily series as the tiles. */
    const dailySeries = HOME && Array.isArray(HOME.salesDaily) ? HOME.salesDaily : [];
    const heroSpark = dailySeries.length > 1 ? dailySeries.slice(-12).map((x) => Number(x.sales) || 0) : null;

    /* ---- Month-on-month average spend per centre (real) ------------------ */
    const spendRows = (() => {
      if (!HOME || !Array.isArray(HOME.averageSpend) || !HOME.averageSpend.length) return { months: [], rows: [] };
      const months = [...new Set(HOME.averageSpend.map((x) => x.month))].sort().slice(-6);
      const byCentre = {};
      HOME.averageSpend.forEach((x) => {
        if (!months.includes(x.month)) return;
        (byCentre[x.centreCode] = byCentre[x.centreCode] || {})[x.month] = x.avgSpend;
      });
      const label = (code) => {
        const hit = centres.find((c) => c.name === code);
        return (hit && (hit.label || hit.name)) || code;
      };
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
      return { months: months.map((m) => m.slice(5) + "/" + m.slice(2, 4)), rows };
    })();

    /* ---- Growth KPIs — label + value, value null when unsourced ---------- */
    const growthKpis = [
      { label: ar ? "عملاء جدد" : "New customers",
        value: count(HOME && HOME.customers ? HOME.customers.newCustomers : (L ? L.newCustomers : null)) },
      // Needs the appointment-frequency setting, which does not exist yet.
      // CLINIC_CUSTOMER.Active = 1 means "not deleted", not "visits often".
      { label: ar ? "عملاء نشطون" : "Active customers", value: null },
      { label: ar ? "عضويات نشطة" : "Active memberships",
        value: count(HOME && HOME.membership ? HOME.membership.activeMemberships : (L ? L.activeMemberships : null)) },
      { label: ar ? "إيرادات العضويات" : "Membership revenue",
        value: money(HT ? HT.N_membershipSales : (L ? L.membershipRevenue : null)) },
      { label: ar ? "أعضاء الولاء" : "Loyalty members", value: count(L ? L.loyaltyMembers : null) },
    ].map((k) => ({ ...k, hasValue: k.value != null, value: k.value == null ? DASH : k.value }));

    /* ---- Lead-to-revenue funnel — live buckets only ---------------------- */
    const stageDefs = [
      { key: "captured",          en: "Captured",           ar: "الملتقطة" },
      { key: "converted",         en: "Converted",          ar: "المحوّلة" },
      { key: "appointmentBooked", en: "Appointment Booked", ar: "حجز موعد" },
      { key: "showedUp",          en: "Showed Up",          ar: "الحضور" },
      { key: "purchased",         en: "Purchased",          ar: "شراء" },
    ];
    const buckets = L && L.ltr && L.ltr.buckets ? L.ltr.buckets : null;
    const funnelStages = buckets
      ? stageDefs.map((sd) => ({ label: ar ? sd.ar : sd.en, value: Number(buckets[sd.key]) || 0, raw: Number(buckets[sd.key]) || 0 }))
      : null;
    const funnelRate = buckets
      ? (buckets.captured ? ((buckets.purchased / buckets.captured) * 100).toFixed(1) : "0.0")
      : null;
    const revenueFunnel = L && L.ltr && L.ltr.revenue ? [
      { label: ar ? "معدل الشراء" : "Purchase Rate",        value: `${L.ltr.revenue.purchaseRate ?? 0}%` },
      { label: ar ? "متوسط قيمة السلة" : "Avg Basket Size", value: fmtSAR(L.ltr.revenue.avgBasketSize || 0) },
      { label: ar ? "إجمالي الإيرادات" : "Total Revenue",   value: fmtSAR(L.ltr.revenue.totalRevenue || 0) },
      { label: ar ? "تكلفة اكتساب العميل" : "Lead Acq. Cost",
        value: fmtSAR((L.ltr.spend && L.ltr.spend.leadAcquisitionCost) || 0) },
    ] : null;

    const ef = L && L.endFunnel ? L.endFunnel : null;
    const endFunnelTiles = [
      { label: ar ? "المواعيد التي تم الحضور لها" : "Appointments shown", value: ef ? grp(ef.shown) : DASH, color: "#13294B" },
      { label: ar ? "فواتير صادرة" : "Invoices raised",                  value: ef ? grp(ef.invoices) : DASH, color: "#13294B" },
      { label: ar ? "عدم الحضور" : "No-shows",                            value: ef ? grp(ef.noShows) : DASH, color: "#CE5C48" },
      { label: ar ? "حضروا دون فاتورة" : "Shown, not invoiced",           value: ef ? grp(ef.shownNotInvoiced) : DASH, color: "#B07C28" },
    ];

    /* ---- Operations — all live from the case dashboard aggregate --------- */
    const cc = L && L.caseCounts ? L.caseCounts : null;
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
    const avgResolution = L && L.caseAvgResHrs != null
      ? (L.caseAvgResHrs >= 48 ? (L.caseAvgResHrs / 24).toFixed(1) + "d" : L.caseAvgResHrs.toFixed(1) + "h")
      : null;
    const aging = (() => {
      const a = L && L.caseAgeing ? L.caseAgeing : null;
      if (!a) return null;
      const defs = [["< 24h", a.under24h], ["1\u20133d", a.days1to3], ["3\u20137d", a.days3to7], ["> 7d", a.over7d]];
      const mx = Math.max(1, ...defs.map((x) => Number(x[1]) || 0));
      const cols = [COLORS.primary, "#5C86A8", COLORS.gold, COLORS.neg];
      return defs.map((x, i) => ({ label: x[0], count: Number(x[1]) || 0, pct: (((Number(x[1]) || 0) / mx) * 100).toFixed(0), color: cols[i] }));
    })();

    /* ---- Revenue trend (section 05, currently hidden) ------------------- */
    const series = dailySeries.map((x) => ({ label: String(x.date).slice(5), value: Number(x.sales) || 0 }));

    const allSel = selected.size === centres.length;

    return {
      ar, t, dir: ar ? "rtl" : "ltr",
      ranges: RANGE_KEYS.map((k, i) => ({ key: k, label: RANGE_LABELS[ar ? "ar" : "en"][i], active: range === k })),
      centreOptions: centres.map((c) => ({ name: c.name, label: c.label || c.name, on: selected.has(c.name) })),
      allSel,
      centreSummary: allSel ? t.allCentres : ar ? selected.size + " مراكز" : selected.size + " centres",
      showCompare: compare,

      loading: !!(live && live.loading),
      loadFailed: !!(live && live.live === false),
      hasHome: !!HOME,

      // Financial
      totalSales: HT && HT.A_totalSales != null ? fmtSAR(HT.A_totalSales) : DASH,
      tileGroups, extraTiles, heroSpark, spendRows,

      // Growth
      growthKpis, funnelStages, funnelRate, endFunnelTiles, revenueFunnel,
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
  }, [range, compare, overlayPrev, lang, selected, live, centres]);
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

/* ------------------------------------------------------------------ */
/* Loading / empty states — shown INSTEAD of sample figures            */
/* ------------------------------------------------------------------ */
/* The progress bar, tile skeleton, awaiting-feed and error states all come
   from the shared DashboardLoadingBar module so every EazyWeek dashboard shows
   the same indicator. Only the page-level composition lives here.          */

function DashboardLoading({ t }) {
  return (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ maxWidth: 420 }}><DashboardLoadingBar label={t.loading} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
        {["hero", "t1", "t2", "t3", "t4", "t5", "t6"].map((k) => <TileSkeleton key={k} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {["c1", "c2", "c3"].map((k) => (
          <div key={k} style={card}><ChartLoading height={150} label={null} /></div>
        ))}
      </div>
    </div>
  );
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
  const [selected, setSelected] = useState(() => new Set(CENTRES.map((c) => c.name)));
  const [reloadKey, setReloadKey] = useState(0);

  const live = useLiveDashboard({ range, reloadKey });
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
      return next.size ? next : active;
    });
  }, [centreDir]);
  const d = useDashboardData({ range, compare, overlayPrev, lang, selected, live, centres: activeCentres });
  const ar = d.ar;

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
      if (s.has(name)) { if (s.size > 1) s.delete(name); } else s.add(name);
      return s;
    });
  };
  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === activeCentres.length ? new Set([activeCentres[0].name]) : new Set(activeCentres.map((c) => c.name))
    );
  };

  const seg = { border: "1px solid #e2e6ec", borderRadius: 11, padding: 3, background: "#f0f2f5", display: "flex", alignItems: "center", gap: 3 };

  return (
    <div
      dir={d.dir}
      style={{
        fontFamily: "'Lato', system-ui, sans-serif",
        color: COLORS.ink, background: COLORS.bg, minHeight: "100vh", WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* ===================== TOP BAR ===================== */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(255,255,255,0.86)", backdropFilter: "blur(14px)", borderBottom: "1px solid #e2e6ec" }}>
        <div style={{ maxWidth: 1680, margin: "0 auto", padding: "12px 26px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Date range segmented */}
          <div style={{ ...seg, marginInlineEnd: "auto" }}>
            {d.ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
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
                <button
                  onClick={toggleAll}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: COLORS.ink, padding: "9px 11px", borderRadius: 9, background: d.allSel ? "#E7ECF4" : "transparent", border: "none" }}
                >
                  <span>{d.t.allCentres}</span>
                  <span style={{ fontSize: 12, color: COLORS.primary }}>{d.allSel ? "✓ " + (ar ? "" : "all") : ""}</span>
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
        {!d.loading && !d.loadFailed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#E6F1EC", color: COLORS.pos }}>Live data</span>
            <span style={{ fontSize: 12, color: "#8b95a2" }}>
              {d.hasHome
                ? "Widgets with no endpoint yet are marked, not filled with placeholder figures"
                : "Financial tiles need /api/Invoice/HomeDashboard deployed"}
            </span>
          </div>
        )}

        {d.loading ? (
          <DashboardLoading t={d.t} />
        ) : d.loadFailed ? (
          <LoadError height={190} message={d.t.loadFailed} retryLabel={d.t.retry} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : (
        <>
        {/* ===================== 1. FINANCIAL HEALTH ===================== */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="01" title={d.t.financial} />
          {!d.hasHome ? (
            <AwaitingFeed title={d.t.awaiting} height={180} />
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) repeat(auto-fit, minmax(160px, 1fr))", gap: 14, alignItems: "stretch" }}>
            {/* Hero: A — Total Sales */}
            <div style={{ background: COLORS.primary, color: "#fff", borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", boxShadow: "0 12px 30px rgba(24,57,110,0.28)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.16), transparent 60%)", pointerEvents: "none" }} />
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>{d.t.tile.A}</div>
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{d.totalSales}</div>
              {d.heroSpark && (
                <div style={{ marginTop: 16, flex: 1, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%" }}><Sparkline vals={d.heroSpark} color={COLORS.accent} /></div>
                </div>
              )}
            </div>

            {/* Five paired columns: B/C over D, E/F over G, H/I over J, K/L over M, N/O,
                then the supplementary receivables / advance-held pair. */}
            {d.tileGroups.map((g, gi) => (
              <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ ...card, borderRadius: 14, padding: "16px 17px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  {g.top.map((tl, ti) => (
                    <div key={tl.key} style={ti ? { paddingTop: 12, borderTop: "1px solid #eef1f5" } : undefined}>
                      <div style={{ fontSize: 11.5, color: "#7a8593", fontWeight: 500 }}>{d.t.tile[tl.key]}</div>
                      <div style={{ fontSize: ti ? 17 : 21, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
                        {tl.value == null ? "\u2014" : tl.value}
                      </div>
                    </div>
                  ))}
                </div>
                {g.bottom && (
                  <div style={{ ...card, borderRadius: 14, padding: "16px 17px", background: "#F7F9FB" }}>
                    <div style={{ fontSize: 11.5, color: "#7a8593", fontWeight: 500 }}>{d.t.tile[g.bottom.key]}</div>
                    <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 5, fontVariantNumeric: "tabular-nums", color: COLORS.primary }}>
                      {g.bottom.value == null ? "\u2014" : g.bottom.value}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!!d.extraTiles.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ ...card, borderRadius: 14, padding: "16px 17px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  {d.extraTiles.map((tl, ti) => (
                    <div key={tl.label} style={ti ? { paddingTop: 12, borderTop: "1px solid #eef1f5" } : undefined}>
                      <div style={{ fontSize: 11.5, color: "#7a8593", fontWeight: 500 }}>{tl.label}</div>
                      <div style={{ fontSize: ti ? 17 : 21, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
                        {tl.value == null ? "\u2014" : tl.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}
        </section>

        {/* ===================== 2. CENTRE PERFORMANCE ===================== */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="02" title={d.t.centre} />
          {can("multiLocation") ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {/* Target vs actual. Both the ranked bars AND the top/bottom performer
                badges needed a per-centre period figure against a monthly target;
                the target table does not exist yet, and the badges were reading
                the old mock revenue, so the whole card is an explicit gap. */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{d.t.centre}</div>
              <div style={{ fontSize: 11.5, color: "#8b95a2", marginBottom: 15 }}>{d.t.centreSub}</div>
              <AwaitingFeed title={d.t.awaiting} height={210} />
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

        {/* ===================== 3. GROWTH & PIPELINE ===================== */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="03" title={d.t.growth} />
          {(can("opportunity") || can("loyalty")) ? (
          <>
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

          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 16, alignItems: "stretch" }}>
            {/* Col 1: Funnel */}
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
                  : <AwaitingFeed title={d.t.awaiting} height={300} />}
              </div>
            </div>

            {/* Col 2: Leads by source + End-of-funnel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{d.t.leadsBySource}</div>
                <AwaitingFeed title={d.t.awaiting} height={132} />
              </div>
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
                {!d.revenueFunnel ? <AwaitingFeed title={d.t.awaiting} height={96} /> : (
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
            </div>

            {/* Col 3: Loyalty + Campaigns */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Loyalty */}
              {can("loyalty") ? (
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
                <AwaitingFeed title={d.t.awaiting} height={96} />
              </div>
              ) : <LockedBlock feature="loyalty" ar={ar} />}

              {/* Campaigns */}
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{d.t.campaigns}</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 10.5, color: "#9aa4b1", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid #edf0f3" }}>
                    <span style={{ flex: 1 }}>{d.t.campaign}</span>
                    <span style={{ width: 66, textAlign: "end" }}>{d.t.leads}</span>
                    <span style={{ width: 66, textAlign: "end" }}>{d.t.conv}</span>
                  </div>
                  <div style={{ paddingTop: 12 }}>
                    <AwaitingFeed title={d.t.awaiting} height={110} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
          ) : <LockedBlock feature="opportunity" ar={ar} />}
        </section>

        {/* ===================== 4. OPERATIONS ===================== */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="04" title={d.t.ops} />
          {can("caseManagement") ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {/* Cases by status */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d.openCases == null ? "\u2014" : d.openCases}</div>
                <div style={{ fontSize: 12.5, color: "#7a8593" }}>{d.t.openCases}</div>
              </div>
              {!d.caseStatuses ? <AwaitingFeed title={d.t.awaiting} height={120} /> : (
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
              {!d.aging ? <AwaitingFeed title={d.t.awaiting} height={130} /> : (
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