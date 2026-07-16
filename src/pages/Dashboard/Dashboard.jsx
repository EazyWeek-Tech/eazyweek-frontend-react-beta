import { useState, useMemo, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config"; // adjust path to match this file's location
import { resolveFeatures, getFeatureMeta, minimumTierFor, getTierLabel } from "../../config/licenseConfig"; // license helpers (adjust path if needed)

/**
 * EazyWeek — Executive Analytics Dashboard
 * Faithful React port of the eazyweek_Dashboard design mockup.
 *
 * Self-contained: no chart library required (charts are hand-rolled SVG).
 * All figures are mocked to match the design. To go live, replace the data
 * blocks in `useDashboardData` with your API responses (keep the same shape).
 */

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */
const CENTRES = [
  { name: "Bright", rev: 1240000 },
  { name: "GLAM25", rev: 980000 },
  { name: "GL12", rev: 720000 },
  { name: "GLOW123", rev: 1410000 },
  { name: "INFENI", rev: 560000 },
  { name: "Silk", rev: 1120000 },
  { name: "LNS", rev: 430000 },
  { name: "MXM", rev: 890000 },
];

// Month-over-month % change per centre (last 6 months)
const MOM = {
  Bright: [4, 6, -2, 8, 5, 7],
  GLAM25: [2, -3, 5, 4, -1, 6],
  GL12: [-4, 3, 2, -2, 4, 3],
  GLOW123: [7, 9, 6, 11, 8, 12],
  INFENI: [-6, -2, 3, 1, -3, 4],
  Silk: [3, 5, 4, 6, 7, 5],
  LNS: [-8, -4, -2, 3, 1, 2],
  MXM: [1, 4, 6, 3, 5, 8],
};

const RANGE_KEYS = ["Today", "This Week", "This Month", "QTD", "YTD"];
const RANGE_FACTOR = { Today: 0.033, "This Week": 0.23, "This Month": 1, QTD: 3.05, YTD: 11.8 };

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

const heatColor = (v) => {
  const a = Math.min(0.9, (Math.abs(v) / 14) * 0.72 + 0.14);
  const bg = v >= 0 ? `rgba(47,143,107,${a.toFixed(2)})` : `rgba(221,119,102,${a.toFixed(2)})`;
  return { bg, color: a > 0.5 ? "#fff" : v >= 0 ? "#256B52" : "#A5473A" };
};

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
/* Live data — real figures from the module dashboard endpoints.       */
/* Overrides sample where available; the rest stays sample (no endpoint */
/* yet): centre performance, loyalty, campaigns, growth KPIs, SLA/aging.*/
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

function useLiveDashboard({ range }) {
  const [live, setLive] = useState(null);
  const load = useCallback(async (signal) => {
    const { fromDate, toDate } = periodDates(range);
    const base = { headers: { "Content-Type": "application/json", ...(TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}) }, credentials: "include", signal };
    try {
      const [invB, caseB, apptB, oppB, advB, memB, loyB, ltrB] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Invoice/Dashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/CaseOperation/CaseDashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/Appointment/AppDashboard`, { ...base, method: "POST", body: JSON.stringify({ fromDate, toDate }) }).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/Opportunity/LoadOpprotunityList/1`, base).then(okJson).catch(() => null),
        // NOTE: adjust these three base paths to match your route mounts if different
        fetch(`${API_BASE_URL}/api/Advance/Dashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/Membership/Dashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/loyalty/dashboard?fromDate=${fromDate}&toDate=${toDate}`, base).then(okJson).catch(() => null),
        fetch(`${API_BASE_URL}/api/Opportunity/Funnel`, base).then(okJson).catch(() => null),
      ]);
      if (!invB && !caseB && !apptB && !oppB) { setLive({ live: false }); return; }
      const inv = unwrap(invB) || {}, cs = unwrap(caseB) || {}, ap = unwrap(apptB) || {};
      const opp = Array.isArray(oppB) ? oppB : (unwrap(oppB) || []);
      const adv = unwrap(advB), mem = unwrap(memB), loy = unwrap(loyB);
      const ltr = unwrap(ltrB);
      const N = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

      const salesDaily = inv.salesDaily || [];
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
  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [range, load]);
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
    const f = RANGE_FACTOR[range] || 1;
    const posC = COLORS.pos, negC = COLORS.neg, neuC = COLORS.neu;

    const sel = centres.filter((c) => selected.has(c.name));
    const monthRev = sel.reduce((a, c) => a + c.rev, 0);
    const periodRev = monthRev * f;
    const net = periodRev / 1.15;
    const vat = periodRev - net;
    const scale = monthRev / 7350000;

    // Revenue trend series per range
    const S = (labels, base) => labels.map((l, i) => ({ label: l, value: base[i] * scale }));
    let series;
    if (range === "Today") series = S(["9a", "11a", "1p", "3p", "5p", "7p", "9p"], [42000, 88000, 61000, 74000, 96000, 120000, 58000]);
    else if (range === "This Week") series = S(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], [980000, 1120000, 1040000, 1210000, 1380000, 1520000, 890000]);
    else if (range === "This Month") series = S(["W1", "W2", "W3", "W4"], [1680000, 1820000, 1740000, 2110000]);
    else if (range === "QTD") series = S(["May", "Jun", "Jul"], [6980000, 7240000, 7350000].map((v) => (v * 3.05) / 3));
    else series = S(["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      [6100000, 6320000, 6210000, 6540000, 7010000, 6680000, 6920000, 7180000, 7050000, 6980000, 7240000, 7350000]);
    const prevSeries = overlayPrev ? series.map((s) => ({ label: s.label, value: s.value * 0.9 })) : null;

    // Financial secondary KPIs
    const finKpis = [
      { label: ar ? "ضريبة القيمة المضافة" : "VAT collected", value: fmtSAR(vat), delta: "+8.1%", arrow: "▲", sentColor: posC },
      { label: ar ? "صافي الإيرادات" : "Net revenue", value: fmtSAR(net), delta: "+8.5%", arrow: "▲", sentColor: posC },
      { label: ar ? "ذمم مدينة قائمة" : "Outstanding receivables", value: fmtSAR(1840000), delta: "+3.2%", arrow: "▲", sentColor: negC },
      { label: ar ? "دفعات مقدمة محتجزة" : "Advance held", value: fmtSAR(620000), delta: "−1.4%", arrow: "▼", sentColor: neuC },
      { label: ar ? "دفعات مقدمة مستخدمة" : "Advance redeemed", value: fmtSAR(410000 * f), delta: "+6.0%", arrow: "▲", sentColor: posC },
      { label: ar ? "المبالغ المستردة" : "Refunds issued", value: fmtSAR(74000 * f), delta: "+2.1%", arrow: "▲", sentColor: negC },
    ];

    // Centre ranking
    const sorted = [...sel].sort((a, b) => b.rev - a.rev);
    const maxRev = sorted.length ? sorted[0].rev : 1;
    const centreRanked = sorted.map((c, i) => ({
      name: c.label || c.name, value: fmtSAR(c.rev * f), pct: ((c.rev / maxRev) * 100).toFixed(1),
      color: i === 0 ? COLORS.primary : i === sorted.length - 1 ? COLORS.coral : "#85A2AA",
    }));
    const top = sorted[0], bot = sorted[sorted.length - 1];

    // Heatmap
    const heatMonths = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const centreHeat = sorted.map((c) => ({
      name: c.label || c.name,
      cells: (MOM[c.name] || [0, 0, 0, 0, 0, 0]).map((v) => {
        const col = heatColor(v);
        return { label: (v > 0 ? "+" : "") + v + "%", bg: col.bg, color: col.color };
      }),
    }));

    // Growth
    const growthKpis = [
      { label: ar ? "عملاء جدد" : "New customers", value: grp(1284 * f), delta: "+12.6%", arrow: "▲", sentColor: posC },
      { label: ar ? "عملاء نشطون" : "Active customers", value: "18,940", delta: "+2.1%", arrow: "▲", sentColor: posC },
      { label: ar ? "عضويات نشطة" : "Active memberships", value: "2,940", delta: "+4.8%", arrow: "▲", sentColor: posC },
      { label: ar ? "إيرادات العضويات" : "Membership revenue", value: fmtSAR(1100000 * f), delta: "+7.2%", arrow: "▲", sentColor: posC },
      { label: ar ? "أعضاء الولاء" : "Loyalty members", value: "6,210", delta: "+9.3%", arrow: "▲", sentColor: posC },
    ];
    const stageDefs = [
      { key: "captured",          en: "Captured",           ar: "الملتقطة",   base: 5990 },
      { key: "converted",         en: "Converted",          ar: "المحوّلة",   base: 2400 },
      { key: "appointmentBooked", en: "Appointment Booked", ar: "حجز موعد",   base: 1500 },
      { key: "showedUp",          en: "Showed Up",          ar: "الحضور",     base: 900 },
      { key: "purchased",         en: "Purchased",          ar: "شراء",       base: 500 },
    ];
    const funnelStages = stageDefs.map((s) => ({
      label: ar ? s.ar : s.en, value: Math.round(s.base * f), raw: s.base,
    }));
    const funnelRate = ((stageDefs[4].base / stageDefs[0].base) * 100).toFixed(1);

    const srcDefs = [
      { en: "Social media", ar: "وسائل التواصل", base: 420, color: "#5C86A8" },
      { en: "Google Ads", ar: "إعلانات جوجل", base: 310, color: "#2F8F6B" },
      { en: "Manual", ar: "يدوي", base: 280, color: "#B07C28" },
      { en: "WhatsApp", ar: "واتساب", base: 140, color: "#DD7766" },
      { en: "Others", ar: "أخرى", base: 90, color: "#85A2AA" },
    ];
    const srcMax = Math.max(...srcDefs.map((s) => s.base));
    const leadSources = srcDefs.map((s) => ({
      name: ar ? s.ar : s.en, value: grp(s.base * f), pct: ((s.base / srcMax) * 100).toFixed(1), color: s.color,
    }));
    const endFunnelTiles = [
      { label: ar ? "المواعيد التي تم الحضور لها" : "Appointments shown", value: grp(154 * f), color: "#13294B" },
      { label: ar ? "فواتير صادرة" : "Invoices raised", value: grp(121 * f), color: "#13294B" },
      { label: ar ? "عدم الحضور" : "No-shows", value: grp(44 * f), color: "#CE5C48" },
      { label: ar ? "حضروا دون فاتورة" : "Shown, not invoiced", value: grp(33 * f), color: "#B07C28" },
    ];
    const tierData = [["Bronze", 3120, "#DD9A6E"], ["Silver", 1980, "#9aa4b1"], ["Gold", 820, COLORS.gold], ["Platinum", 290, COLORS.primary]];
    const tierTotal = tierData.reduce((a, x) => a + x[1], 0);
    const arTier = { Bronze: "برونزي", Silver: "فضي", Gold: "ذهبي", Platinum: "بلاتيني" };
    const loyaltyTiers = tierData.map((x) => ({
      name: ar ? arTier[x[0]] : x[0], count: grp(x[1]), pct: ((x[1] / tierTotal) * 100).toFixed(1), color: x[2],
    }));
    const campaigns = [
      { name: ar ? "العافية الرمضانية" : "Ramadan Wellness", leads: "1,120", conv: "22.4%", convColor: posC },
      { name: ar ? "إشراقة الصيف" : "Summer Glow", leads: "860", conv: "17.1%", convColor: "#33404e" },
      { name: ar ? "الصحة المؤسسية" : "Corporate Health", leads: "540", conv: "12.8%", convColor: negC },
      { name: ar ? "تعزيز الإحالات" : "Referral Boost", leads: "900", conv: "26.5%", convColor: posC },
    ];

    // Ops
    const cs = [["New", 42, COLORS.accent], ["In progress", 61, COLORS.primary], ["Waiting on customer", 27, COLORS.gold], ["Escalated", 18, COLORS.neg]];
    const csAr = { New: "جديدة", "In progress": "قيد المعالجة", "Waiting on customer": "بانتظار العميل", Escalated: "مصعّدة" };
    const csMax = Math.max(...cs.map((x) => x[1]));
    const caseStatuses = cs.map((x) => ({ label: ar ? csAr[x[0]] : x[0], count: x[1], pct: ((x[1] / csMax) * 100).toFixed(0), color: x[2] }));
    const sla = 94.2, slaTarget = 95, atRisk = sla < slaTarget;
    const ag = [["< 24h", 58], ["1–3d", 49], ["3–7d", 27], ["> 7d", 14]];
    const agMax = Math.max(...ag.map((x) => x[1]));
    const agColors = [COLORS.primary, "#5C86A8", COLORS.gold, COLORS.neg];
    const aging = ag.map((x, i) => ({ label: x[0], count: x[1], pct: ((x[1] / agMax) * 100).toFixed(0), color: agColors[i] }));

    const allSel = selected.size === centres.length;

    // ── Live overrides (real endpoint data replaces sample where available) ──
    const L = live && live.live ? live : null;
    const ePeriodRev = L ? L.periodRev : periodRev;
    const eNet = ePeriodRev / 1.15, eVat = ePeriodRev - eNet;
    const eSeries = (L && L.series && L.series.length) ? L.series : series;
    const ePrevSeries = overlayPrev ? eSeries.map((s) => ({ label: s.label, value: s.value * 0.9 })) : null;
    const eRevSpark = (L && eSeries.length) ? eSeries.slice(-10).map((s) => (s.value / 1e6)) : [6.1, 6.3, 6.2, 6.5, 7.0, 6.7, 6.9, 7.2, 7.05, 7.35];
    const eFinKpis = L ? finKpis.map((k, i) => (
      i === 0 ? { ...k, value: fmtSAR(eVat) } :
      i === 1 ? { ...k, value: fmtSAR(eNet) } :
      i === 2 ? { ...k, value: fmtSAR(L.receivables) } :
      i === 3 ? (L.advanceHeld     == null ? k : { ...k, value: fmtSAR(L.advanceHeld) }) :
      i === 4 ? (L.advanceRedeemed == null ? k : { ...k, value: fmtSAR(L.advanceRedeemed) }) :
      i === 5 ? (L.refunds         == null ? k : { ...k, value: fmtSAR(L.refunds) }) : k
    )) : finKpis;
    const eGrowthKpis = L ? growthKpis.map((k, i) => (
      i === 0 ? (L.newCustomers      == null ? k : { ...k, value: grp(L.newCustomers) }) :
      i === 1 ? (L.activeCustomers   == null ? k : { ...k, value: grp(L.activeCustomers) }) :
      i === 2 ? (L.activeMemberships == null ? k : { ...k, value: grp(L.activeMemberships) }) :
      i === 3 ? (L.membershipRevenue == null ? k : { ...k, value: fmtSAR(L.membershipRevenue) }) :
      i === 4 ? (L.loyaltyMembers    == null ? k : { ...k, value: grp(L.loyaltyMembers) }) : k
    )) : growthKpis;
    const ePointsEarned   = (L && L.pointsEarned   != null) ? grp(L.pointsEarned)   : null;
    const ePointsRedeemed = (L && L.pointsRedeemed != null) ? grp(L.pointsRedeemed) : null;
    const csMaxL = L ? Math.max(1, L.caseCounts.open, L.caseCounts.wip, L.caseCounts.closed) : 1;
    const eCaseStatuses = L ? [
      { label: ar ? "مفتوحة" : "Open", count: L.caseCounts.open, color: COLORS.accent },
      { label: ar ? "قيد المعالجة" : "WIP", count: L.caseCounts.wip, color: COLORS.primary },
      { label: ar ? "مغلقة" : "Closed", count: L.caseCounts.closed, color: "#85A2AA" },
    ].map((x) => ({ ...x, pct: ((x.count / csMaxL) * 100).toFixed(0) })) : caseStatuses;
    const eOpenCases = L ? (L.caseCounts.open + L.caseCounts.wip) : 148;
    const eFunnelStages = L?.ltr?.buckets ? stageDefs.map((s) => ({ label: ar ? s.ar : s.en, value: L.ltr.buckets[s.key] || 0, raw: L.ltr.buckets[s.key] || 0 })) : funnelStages;
    const eFunnelRate = L?.ltr?.buckets ? (L.ltr.buckets.captured ? ((L.ltr.buckets.purchased / L.ltr.buckets.captured) * 100).toFixed(1) : "0.0") : funnelRate;
    const revenueFunnel = L?.ltr?.revenue ? [
      { label: ar ? "معدل الشراء" : "Purchase Rate",          value: `${L.ltr.revenue.purchaseRate ?? 0}%` },
      { label: ar ? "متوسط قيمة السلة" : "Avg Basket Size",   value: fmtSAR(L.ltr.revenue.avgBasketSize || 0) },
      { label: ar ? "إجمالي الإيرادات" : "Total Revenue",     value: fmtSAR(L.ltr.revenue.totalRevenue || 0) },
      { label: ar ? "تكلفة اكتساب العميل" : "Lead Acq. Cost", value: fmtSAR((L.ltr.spend && L.ltr.spend.leadAcquisitionCost) || 0) },
    ] : [
      { label: ar ? "معدل الشراء" : "Purchase Rate",          value: "21.0%" },
      { label: ar ? "متوسط قيمة السلة" : "Avg Basket Size",   value: fmtSAR(1450) },
      { label: ar ? "إجمالي الإيرادات" : "Total Revenue",     value: fmtSAR(377000) },
      { label: ar ? "تكلفة اكتساب العميل" : "Lead Acq. Cost", value: fmtSAR(83) },
    ];
    const efVals = L ? [L.endFunnel.shown, L.endFunnel.invoices, L.endFunnel.noShows, L.endFunnel.shownNotInvoiced] : null;
    const eEndFunnel = L ? endFunnelTiles.map((tile, i) => ({ ...tile, value: grp(efVals[i]) })) : endFunnelTiles;


    return {
      ar, t, dir: ar ? "rtl" : "ltr",
      ranges: RANGE_KEYS.map((k, i) => ({
        key: k, label: RANGE_LABELS[ar ? "ar" : "en"][i], active: range === k,
      })),
      centreOptions: centres.map((c) => ({ name: c.name, label: c.label || c.name, on: selected.has(c.name) })),
      allSel,
      centreSummary: allSel ? t.allCentres : ar ? selected.size + " مراكز" : selected.size + " centres",
      showCompare: compare,
      totalRevenue: fmtSAR(ePeriodRev), revDelta: "8.4%", isLive: !!L,
      revSpark: eRevSpark,
      citizenPct: 63, expatPct: 37, citizenVal: fmtSAR(ePeriodRev * 0.63),
      finKpis: eFinKpis, centreRanked,
      topName: top ? (top.label || top.name) : "—", topVal: top ? fmtSAR(top.rev * f) : "",
      botName: bot ? (bot.label || bot.name) : "—", botVal: bot ? fmtSAR(bot.rev * f) : "",
      heatMonths, centreHeat,
      growthKpis: eGrowthKpis, funnelStages: eFunnelStages, funnelRate: eFunnelRate, loyaltyTiers, leadSources, endFunnelTiles: eEndFunnel, revenueFunnel: revenueFunnel,
      pointsEarned: ePointsEarned != null ? ePointsEarned : grp(1240000 * f), pointsRedeemed: ePointsRedeemed != null ? ePointsRedeemed : grp(780000 * f), campaigns,
      openCases: eOpenCases, caseStatuses: eCaseStatuses, sla, slaTarget,
      slaTag: atRisk ? (ar ? "تحت الخطر" : "At risk") : ar ? "ضمن الهدف" : "On target",
      slaTagBg: atRisk ? "#F6EBD9" : "#E6F1EC", slaTagColor: atRisk ? "#B07C28" : COLORS.pos,
      avgResolution: "6.4h", aging,
      series: eSeries, prevSeries: ePrevSeries, trendRangeLabel: range,
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

// Placeholder shown in place of a block's data when the tenant's plan lacks the feature.
function LockedBlock({ feature, ar }) {
  const meta = getFeatureMeta(feature);
  const tier = minimumTierFor(feature);
  const tierLabel = tier ? getTierLabel(tier) : null;
  const msg = ar ? "قم بالترقية لعرض هذه البيانات" : "Upgrade to view this data";
  const sub = tierLabel
    ? (ar ? `متوفّر في باقة ${tierLabel}` : `Available on the ${tierLabel} plan`)
    : (ar ? "إضافة مخصّصة" : "Custom add-on");
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "44px 24px", minHeight: 190 }}>
      <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(209,154,62,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill={COLORS.gold} />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke={COLORS.gold} strokeWidth="2" fill="none" />
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink }}>{meta.label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.primary, marginTop: 9 }}>{msg}</div>
      <div style={{ fontSize: 12.5, color: "#8b95a2", marginTop: 5 }}>{sub}</div>
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

  const live = useLiveDashboard({ range });
  const centreDir = useCentreDirectory();
  // Effective centre list: active centres from the hierarchy (name from the
  // API, mock rev kept by code). Falls back to the full static list until the
  // hierarchy has loaded.
  const activeCentres = useMemo(() => {
    if (!centreDir || !centreDir.codes.length) return CENTRES;
    const byCode = Object.fromEntries(CENTRES.map((c) => [c.name, c]));
    return centreDir.codes.map((code) => ({
      name: code,
      label: centreDir.names[code] || code,
      rev: byCode[code] ? byCode[code].rev : 0,
    }));
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
        {/* live / sample indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: d.isLive ? "#E6F1EC" : "#F6EBD9", color: d.isLive ? COLORS.pos : "#B07C28" }}>{d.isLive ? "Live data" : "Sample data"}</span>
          <span style={{ fontSize: 12, color: "#8b95a2" }}>{d.isLive ? "Revenue, cases, funnel & trend are live — centre performance, loyalty & campaigns are sample" : "Showing sample figures"}</span>
        </div>
        {/* ===================== 1. FINANCIAL HEALTH ===================== */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="01" title={d.t.financial} />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 380px) 1fr", gap: 16, alignItems: "stretch" }}>
            {/* Hero revenue card */}
            <div style={{ background: COLORS.primary, color: "#fff", borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", boxShadow: "0 12px 30px rgba(15,124,138,0.28)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.16), transparent 60%)", pointerEvents: "none" }} />
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.82)", letterSpacing: "0.01em" }}>{d.t.totalRevenue}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 8 }}>
                <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{d.totalRevenue}</div>
                {d.showCompare && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#c9f7e4", paddingBottom: 4 }}>
                    <span>▲</span>{d.revDelta}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: "rgba(255,255,255,0.7)" }}>{d.t.vsPrev}</div>
              <div style={{ marginTop: 16 }}><Sparkline vals={d.revSpark} color={COLORS.accent} /></div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.16)", margin: "16px 0 14px" }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.02em", marginBottom: 9 }}>{d.t.citizenExpat}</div>
              <div style={{ display: "flex", height: 9, borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.18)" }}>
                <div style={{ width: `${d.citizenPct}%`, background: COLORS.accent }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, fontSize: 12 }}>
                <div><span style={{ fontWeight: 700 }}>{d.citizenPct}%</span> <span style={{ color: "rgba(255,255,255,0.75)" }}>{d.t.citizen}</span> · {d.citizenVal}</div>
                <div style={{ textAlign: "end" }}><span style={{ fontWeight: 700 }}>{d.expatPct}%</span> <span style={{ color: "rgba(255,255,255,0.75)" }}>{d.t.expat}</span></div>
              </div>
            </div>

            {/* Secondary financial KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
              {d.finKpis.map((k, i) => (
                <div key={i} style={{ ...card, borderRadius: 14, padding: "17px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 12, color: "#7a8593", fontWeight: 500 }}>{k.label}</div>
                  <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                  {d.showCompare && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 9, fontSize: 12.5, fontWeight: 600, color: k.sentColor }}>
                      <span style={{ fontSize: 10 }}>{k.arrow}</span>{k.delta}
                      <span style={{ color: "#aeb6c1", fontWeight: 500 }}>{d.t.vsPrevShort}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== 2. CENTRE PERFORMANCE ===================== */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeading num="02" title={d.t.centre} />
          {can("multiLocation") ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {/* Ranked bars */}
            <div style={card}>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, background: "#E6F1EC", border: "1px solid #C6DDD3", borderRadius: 11, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2F8F6B" }}>▲ {d.t.topPerformer}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{d.topName} <span style={{ color: "#7a8593", fontWeight: 500, fontSize: 12.5 }}>{d.topVal}</span></div>
                </div>
                <div style={{ flex: 1, background: "#FBEEEA", border: "1px solid #F2D8D2", borderRadius: 11, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#CE5C48" }}>▼ {d.t.bottomPerformer}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{d.botName} <span style={{ color: "#7a8593", fontWeight: 500, fontSize: 12.5 }}>{d.botVal}</span></div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {d.centreRanked.map((c) => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 74, fontSize: 12.5, fontWeight: 600, color: "#33404e", flex: "none" }}>{c.name}</div>
                    <div style={{ flex: 1, height: 22, background: "#f2f4f7", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, borderRadius: 6 }} />
                    </div>
                    <div style={{ width: 84, textAlign: "end", fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", flex: "none" }}>{c.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{d.t.heatTitle}</div>
              <div style={{ fontSize: 11.5, color: "#8b95a2", marginBottom: 15 }}>{d.t.heatSub}</div>
              <div style={{ display: "grid", gridTemplateColumns: "78px repeat(6, 1fr)", gap: 6, alignItems: "center" }}>
                <div />
                {d.heatMonths.map((m) => (
                  <div key={m} style={{ fontSize: 10.5, color: "#9aa4b1", textAlign: "center", fontWeight: 500 }}>{m}</div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                {d.centreHeat.map((row) => (
                  <div key={row.name} style={{ display: "grid", gridTemplateColumns: "78px repeat(6, 1fr)", gap: 6, alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#33404e" }}>{row.name}</div>
                    {row.cells.map((cell, ci) => (
                      <div key={ci} style={{ height: 30, borderRadius: 6, background: cell.bg, color: cell.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{cell.label}</div>
                    ))}
                  </div>
                ))}
              </div>
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
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 7, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                {d.showCompare && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7, fontSize: 12.5, fontWeight: 600, color: k.sentColor }}>
                    <span style={{ fontSize: 10 }}>{k.arrow}</span>{k.delta}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 16, alignItems: "stretch" }}>
            {/* Col 1: Funnel */}
            <div style={{ ...card, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.t.funnel}</div>
                <div style={{ fontSize: 12, color: "#7a8593" }}>{d.t.convRate} <span style={{ fontWeight: 700, color: "#2F8F6B", fontSize: 14 }}>{d.funnelRate}%</span></div>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <Funnel stages={d.funnelStages} ar={ar} />
              </div>
            </div>

            {/* Col 2: Leads by source + End-of-funnel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{d.t.leadsBySource}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  {d.leadSources.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 92, fontSize: 12.5, fontWeight: 600, color: "#33404e", flex: "none" }}>{s.name}</div>
                      <div style={{ flex: 1, height: 10, background: "#f2f4f7", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: 5 }} />
                      </div>
                      <div style={{ width: 42, textAlign: "end", fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", flex: "none" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {d.revenueFunnel.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                      <span style={{ color: "#7a8593" }}>{r.label}</span>
                      <span style={{ fontWeight: 700, color: "#13294B", fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
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
                <div style={{ display: "flex", height: 12, borderRadius: 7, overflow: "hidden" }}>
                  {d.loyaltyTiers.map((tier, i) => (
                    <div key={i} style={{ width: `${tier.pct}%`, background: tier.color }} />
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 18px", marginTop: 12 }}>
                  {d.loyaltyTiers.map((tier, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: tier.color }} />
                      <span style={{ fontWeight: 600 }}>{tier.name}</span>
                      <span style={{ color: "#8b95a2", fontVariantNumeric: "tabular-nums" }}>{tier.count}</span>
                    </div>
                  ))}
                </div>
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
                  {d.campaigns.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 12.5, padding: "11px 0", borderBottom: "1px solid #f4f6f8" }}>
                      <span style={{ flex: 1, fontWeight: 600, color: "#33404e" }}>{c.name}</span>
                      <span style={{ width: 66, textAlign: "end", fontVariantNumeric: "tabular-nums" }}>{c.leads}</span>
                      <span style={{ width: 66, textAlign: "end", fontWeight: 700, color: c.convColor, fontVariantNumeric: "tabular-nums" }}>{c.conv}</span>
                    </div>
                  ))}
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
                <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d.openCases}</div>
                <div style={{ fontSize: 12.5, color: "#7a8593" }}>{d.t.openCases}</div>
              </div>
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
            </div>

            {/* SLA + resolution */}
            <div style={{ ...card, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.t.sla}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: d.slaTagBg, color: d.slaTagColor }}>{d.slaTag}</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: d.slaTagColor }}>{d.sla}%</div>
                <div style={{ fontSize: 11.5, color: "#8b95a2", paddingBottom: 5 }}>{d.t.target} {d.slaTarget}%</div>
              </div>
              <div style={{ marginTop: 14, height: 10, background: "#f2f4f7", borderRadius: 6, position: "relative", overflow: "visible" }}>
                <div style={{ width: `${d.sla}%`, height: "100%", background: d.slaTagColor, borderRadius: 6 }} />
                <div style={{ position: "absolute", top: -4, insetInlineStart: `${d.slaTarget}%`, width: 2, height: 18, background: "#33404e" }} />
              </div>
              <div style={{ height: 1, background: "#edf0f3", margin: "18px 0" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d.avgResolution}</div>
                <div style={{ fontSize: 12.5, color: "#7a8593" }}>{d.t.avgResolution}</div>
              </div>
            </div>

            {/* Aging */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{d.t.aging}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 130 }}>
                {d.aging.map((a, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{a.count}</div>
                    <div style={{ width: "100%", height: `${a.pct}%`, background: a.color, borderRadius: "7px 7px 3px 3px" }} />
                    <div style={{ fontSize: 10.5, color: "#8b95a2", textAlign: "center" }}>{a.label}</div>
                  </div>
                ))}
              </div>
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
            <div><LineChart series={d.series} prevSeries={d.prevSeries} /></div>
          </div>
        </section>
      </main>
    </div>
  );
}