import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config";
import FormFillModal from "../../Appointment/FormFillModal";

const TOKEN   = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json(); return j.data ?? j;
};

const authPost = async (url, body) => {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(body || {}),
  });
  const j = await r.json(); return j.data ?? j;
};

const fmt = (d) => d
  ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

// Customer Master writes 1900-01-01 when DOB is left blank — that is a
// placeholder, not a birth date, and it must not print on a clinical form.
const isPlaceholderDate = (d) => {
  if (!d) return true;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return false;
  return t.getFullYear() <= 1900;
};

// DOB comes back in a few shapes depending on the source — don't turn an
// already-formatted date into "Invalid Date".
const fmtLoose = (d) => {
  if (!d) return "";
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? String(d) : fmt(d);
};

const fmtDT = (d) => d
  ? new Date(d).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric",
      hour:"2-digit", minute:"2-digit", hour12:true })
  : "—";

const sessionUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); }
  catch { return {}; }
};

// ─── Centre branding (logo / name / address) for the printed header ────────────
// Reads the same centre config the invoice print already uses. Falls back to the
// Centre Setup endpoint, then degrades to the centre name/code as text.
let _brandCache = null;

const _pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

const _asImageSrc = (raw, mime) => {
  if (!raw) return "";
  if (/^(data:|https?:|\/)/i.test(raw)) return raw;
  return `data:${mime || "image/png"};base64,${raw}`;
};

const loadCentreBrand = async (centerCode) => {
  if (_brandCache) return _brandCache;

  const urls = [
    `${API_BASE_URL}/api/Invoice/CentreSettings`,
    centerCode ? `${API_BASE_URL}/api/Settings/Centre/${encodeURIComponent(centerCode)}` : null,
  ].filter(Boolean);

  const brand = { logo:"", name:"", address:"", centerCode: centerCode || "" };

  for (const url of urls) {
    try {
      const d   = await authGet(url);
      const src = Array.isArray(d) ? d[0] : (d?.centre || d?.center || d);
      if (!src || typeof src !== "object") continue;

      const logo = _asImageSrc(
        _pick(src, ["centreLogo","centerLogo","logoUrl","logo","logoBase64","LOGOURL"]),
        _pick(src, ["logoMimeType","logoMime","LOGOMIMETYPE"])
      );
      const name = _pick(src, ["centreName","centerName","centreDisplayName","centerName",
        "name","description","CENTERNAME"]);
      let address = _pick(src, ["centreAddress","centerAddress","address","addressLine","ADDRESS"]);
      if (!address && Array.isArray(src.addresses) && src.addresses.length) {
        const primary = src.addresses.find(a => a.isPrimary) || src.addresses[0];
        address = _pick(primary, ["address","ADDRESS","addressLine","description"]);
      }

      if (logo)    brand.logo    = brand.logo    || logo;
      if (name)    brand.name    = brand.name    || name;
      if (address) brand.address = brand.address || address;
      if (brand.logo && brand.name) break;
    } catch { /* endpoint unavailable — try the next one */ }
  }

  _brandCache = brand;
  return brand;
};

// ─── Annotation assets (body / face diagram base images) ──────────────────────
let _assetCache = null;
const loadAnnotationAssets = async () => {
  if (_assetCache) return _assetCache;
  try {
    const d = await authGet(`${API_BASE_URL}/api/EMR/Annotations`);
    _assetCache = Array.isArray(d) ? d : [];
  } catch { _assetCache = []; }
  return _assetCache;
};

// ─── Value helpers ────────────────────────────────────────────────────────────
const normType = (t) => String(t || "").toLowerCase().replace(/[\s_-]/g, "");

const SKIP_TYPES    = new Set(["logo","macro","spacer","divider","separator","pagebreak","button","submit"]);
// Static copy only — NOT "text", which the form builder uses for a text INPUT.
// Anything here that turns out to hold an answer is rendered as a field instead
// (see renderField), so a rich-text input never prints as its own label.
const TEXTBLOCK     = new Set(["content","paragraph","statictext","html","richtext","instruction",
  "instructions","terms","consenttext","disclaimer","infotext","info","description"]);
const SECTION_TYPES = new Set(["section","sectionheader","heading","header","title","subheading","subtitle",
  "group","groupbox","panel","fieldset","container","columns","column","row","grid","tabs","step","repeater","block"]);
const ANNOT_TYPES   = new Set(["annotation","annotations","bodymap","bodychart","bodydiagram","body","facemap",
  "facechart","facediagram","diagram","drawing","canvas","sketch","imageannotation","marking","markup","imagemarker"]);
const SIG_TYPES     = new Set(["signature","sign","esign","drawsignature"]);
const LONG_TYPES    = new Set(["textarea","longtext","multiline","richtexteditor","comments","remarks","table","grid"]);
// Layout scaffolding from the builder — the container is meaningful, its name
// ("Columns", "Row", "Section 1") is not, so it never becomes a printed heading.
const GENERIC_LABELS = new Set(["columns","column","row","rows","section","sections","container",
  "grid","panel","group","block","step","tabs","tab","layout","div","wrapper","field","fields"]);
const isGenericLabel = (label, type) => {
  const l = String(label || "").trim().toLowerCase().replace(/\s*\d+$/, "");
  if (!l) return true;
  return GENERIC_LABELS.has(l.replace(/[\s_-]/g, "")) || l.replace(/[\s_-]/g, "") === normType(type);
};
const cleanLabel = (label) => String(label || "").replace(/\s*[:：]\s*$/, "").trim();

const looksLikeImage = (s) =>
  typeof s === "string" &&
  (s.startsWith("data:image") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s));

const maybeParse = (v) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try { return JSON.parse(t); } catch { return v; }
  }
  return v;
};

const deepFindImage = (v, depth = 0) => {
  if (depth > 4 || v == null) return "";
  if (looksLikeImage(v)) return v;
  if (Array.isArray(v)) {
    for (const it of v) { const f = deepFindImage(it, depth + 1); if (f) return f; }
    return "";
  }
  if (typeof v === "object") {
    for (const k of Object.keys(v)) { const f = deepFindImage(v[k], depth + 1); if (f) return f; }
  }
  return "";
};

const SNAPSHOT_KEYS = ["annotatedImage","annotatedUrl","renderedImage","finalImage","snapshot",
  "dataUrl","dataURL","imageData","canvasData","image","imageUrl","url","src","png"];
const snapshotOf = (item) => {
  if (!item || typeof item !== "object") return "";
  for (const k of SNAPSHOT_KEYS) {
    const v = item[k];
    if (looksLikeImage(v)) return v;
    if (v && typeof v === "object" && looksLikeImage(v.url)) return v.url;
  }
  return "";
};

const MARK_KEYS = ["marks","markers","points","pins","annotations","spots","selections","tags","hotspots"];
const getMarks  = (o) => {
  if (!o || typeof o !== "object") return [];
  for (const k of MARK_KEYS) if (Array.isArray(o[k]) && o[k].length) return o[k];
  return [];
};

const PATH_KEYS = ["paths","strokes","lines","freehand","drawings"];
const getPaths  = (o) => {
  if (!o || typeof o !== "object") return [];
  for (const k of PATH_KEYS) if (Array.isArray(o[k]) && o[k].length) return o[k];
  return [];
};

const firstNum = (...c) => {
  for (const v of c) if (typeof v === "number" && !Number.isNaN(v)) return v;
  return null;
};

// Marks are stored either normalised (0–1), as percentages (0–100) or as canvas
// pixels. Convert whatever we get into a % offset for absolute positioning.
const toPct = (v, size) => {
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  if (v >= 0 && v <= 1)        return v * 100;
  if (size && size > 1)        return (v / size) * 100;
  if (v >= 0 && v <= 100)      return v;
  return null;
};

const markLabel = (m) => {
  if (m == null) return "";
  if (typeof m === "string") return m;
  return _pick(m, ["label","text","note","title","name","comment","remark","value","type","assetName"]) || "";
};

const isEmptyVal = (v) =>
  v === undefined || v === null || v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

// ─── Diagram / annotation renderer ────────────────────────────────────────────
const DiagramView = ({ value, assets }) => {
  const raw   = maybeParse(value);
  const items = Array.isArray(raw) ? raw : [raw];

  const baseFor = (item) => {
    if (!item || typeof item !== "object") return "";
    const code = _pick(item, ["assetCode","asset","assetId","diagram","template","baseAsset","view","region"]);
    if (code) {
      const a = (assets || []).find(x => x.assetCode === code || x.assetName === code);
      if (a?.imageUrl) return a.imageUrl;
    }
    const direct = _pick(item, ["baseImage","background","backgroundImage","templateUrl","assetUrl","baseUrl"]);
    if (looksLikeImage(direct)) return direct;
    return "";
  };

  const blocks = items.map((item, idx) => {
    const obj    = (item && typeof item === "object") ? item : {};
    const marks  = getMarks(obj);
    const paths  = getPaths(obj);
    const base   = baseFor(obj);
    const snap   = snapshotOf(obj);
    const plain  = looksLikeImage(item) ? item : "";
    const deep   = (!base && !snap && !plain) ? deepFindImage(item) : "";
    const img    = plain || (snap && snap !== base ? snap : "") || base || deep;
    const overlay = !!(base && img === base && (marks.length || paths.length));

    const w = firstNum(obj.width,  obj.canvasWidth,  obj.imageWidth);
    const h = firstNum(obj.height, obj.canvasHeight, obj.imageHeight);

    const caption = _pick(obj, ["label","assetName","view","region","title","name"]);
    const stored  = obj.stored === true && !img;

    if (!img && !marks.length && !stored) return null;

    return (
      <figure className="ps-diagram ps-avoid" key={idx}>
        {img ? (
          <div className="ps-diagram-canvas">
            <img src={img} alt={caption || "Diagram"} />
            {overlay && (
              <>
                {paths.length > 0 && (
                  <svg className="ps-diagram-paths" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {paths.map((p, i) => {
                      const pts = Array.isArray(p) ? p : (p.points || p.path || []);
                      const d = (Array.isArray(pts) ? pts : [])
                        .map((pt) => {
                          const px = toPct(firstNum(pt?.x, pt?.[0]), w);
                          const py = toPct(firstNum(pt?.y, pt?.[1]), h);
                          return (px == null || py == null) ? null : `${px},${py}`;
                        })
                        .filter(Boolean).join(" ");
                      if (!d) return null;
                      return <polyline key={i} points={d} fill="none"
                        stroke={p?.color || "#b91c1c"} strokeWidth="0.6"
                        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />;
                    })}
                  </svg>
                )}
                {marks.map((m, i) => {
                  const px = toPct(firstNum(m?.x, m?.left, m?.cx, m?.position?.x, m?.point?.x), w);
                  const py = toPct(firstNum(m?.y, m?.top,  m?.cy, m?.position?.y, m?.point?.y), h);
                  if (px == null || py == null) return null;
                  return (
                    <span key={i} className="ps-mark" style={{ left:`${px}%`, top:`${py}%` }}>
                      {i + 1}
                    </span>
                  );
                })}
              </>
            )}
          </div>
        ) : stored ? (
          <div className="ps-diagram-missing">
            Diagram saved with this submission but its image could not be linked
            {obj.fileName ? ` (${obj.fileName})` : ""}.
          </div>
        ) : null}

        {caption && <figcaption className="ps-diagram-cap">{caption}</figcaption>}

        {marks.length > 0 && (
          <ol className="ps-legend">
            {marks.map((m, i) => (
              <li key={i}>
                <span className="ps-legend-num">{i + 1}</span>
                <span>{markLabel(m) || "Marked area"}</span>
              </li>
            ))}
          </ol>
        )}
      </figure>
    );
  }).filter(Boolean);

  if (!blocks.length) return <span className="ps-empty">—</span>;
  return <div className="ps-diagram-wrap">{blocks}</div>;
};

// ─── Single value renderer ────────────────────────────────────────────────────
const ValueView = ({ comp, value, assets }) => {
  const type = normType(comp?.componentType);
  const val  = maybeParse(value);

  if (ANNOT_TYPES.has(type)) return <DiagramView value={val} assets={assets} />;
  if (isEmptyVal(val))       return <span className="ps-empty">—</span>;

  if (typeof val === "boolean") return <>{val ? "Yes" : "No"}</>;

  if (typeof val === "string") {
    if (val.startsWith("data:image"))
      return <img className={SIG_TYPES.has(type) ? "ps-sig" : "ps-img"} src={val} alt={comp?.label || ""} />;
    if (looksLikeImage(val)) return <img className="ps-img" src={val} alt={comp?.label || ""} />;
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return <>{fmt(val)}</>;
    return <>{val}</>;
  }

  if (Array.isArray(val)) {
    const allSimple = val.every(v => typeof v !== "object" || v === null);
    if (allSimple) {
      if (val.length <= 3) return <>{val.join(", ")}</>;
      return <ul className="ps-list">{val.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>;
    }
    const img = deepFindImage(val);
    if (img) return <DiagramView value={val} assets={assets} />;
    return <ul className="ps-list">{val.map((v, i) => <li key={i}>{markLabel(v) || JSON.stringify(v)}</li>)}</ul>;
  }

  if (typeof val === "object") {
    if (looksLikeImage(val.url) || (val.url && String(val.mimeType || "").startsWith("image/")))
      return (
        <span className="ps-imgwrap">
          <img className={SIG_TYPES.has(type) ? "ps-sig" : "ps-img"} src={val.url} alt={val.fileName || ""} />
          {val.fileName && <span className="ps-imgcap">{val.fileName}</span>}
        </span>
      );
    if (val.stored === true)
      return (
        <span className="ps-empty">
          File saved with this submission but not linked{val.fileName ? ` (${val.fileName})` : ""}.
        </span>
      );
    if (getMarks(val).length || snapshotOf(val) || deepFindImage(val))
      return <DiagramView value={val} assets={assets} />;

    const entries = Object.entries(val).filter(([, v]) => !isEmptyVal(v));
    if (!entries.length) return <span className="ps-empty">—</span>;
    return (
      <ul className="ps-list">
        {entries.map(([k, v]) => (
          <li key={k}><strong>{k}:</strong> {typeof v === "object" ? JSON.stringify(v) : String(v)}</li>
        ))}
      </ul>
    );
  }

  return <>{String(val)}</>;
};

// ─── The printable sheet — same markup on screen and on paper ─────────────────
const PrintSheet = ({ data, formDef, assets, brand, patient, custId, meta }) => {
  const components = formDef?.components || [];

  const { roots, kids } = useMemo(() => {
    const byId = new Map(components.map(c => [c.componentId, c]));
    const kidMap = new Map();
    const rootArr = [];
    components.forEach(c => {
      const pid = c.parentId && byId.has(c.parentId) ? c.parentId : null;
      if (pid) {
        if (!kidMap.has(pid)) kidMap.set(pid, []);
        kidMap.get(pid).push(c);
      } else rootArr.push(c);
    });
    const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    rootArr.sort(bySort);
    kidMap.forEach(v => v.sort(bySort));
    return { roots: rootArr, kids: kidMap };
  }, [components]);

  const responses = data?.responseData || {};

  const textOf = (comp) =>
    _pick(comp?.config || {}, ["text","content","html","body","value","description","label"]) || comp?.label || "";

  // Some forms carry Patient / D.O.B / Gender / Doctor fields that the fill
  // screen shows but doesn't persist, so they come back blank. Fall back to the
  // record we already have rather than printing a dash on a clinical document.
  const autoFill = (comp) => {
    const t = normType(comp.componentType);
    if (ANNOT_TYPES.has(t) || SIG_TYPES.has(t)) return "";
    const l = String(comp.label || "").toLowerCase();
    if (!l || /(sign|signature|initial)/.test(l)) return "";

    // Doctor first — "Dr's Name" also matches /name/, and it must never take
    // the patient's name.
    if (/(doctor|physician|practitioner|therapist|consultant|provider|performed by|treated by|dr\.?\b|dr'?s)/.test(l))
      return data?.practitionerName || data?.filledByName || "";
    if (/(d\.?\s?o\.?\s?b|date of birth|birth ?date|dob)/.test(l))
      return isPlaceholderDate(patient?.dob) ? "" : fmtLoose(patient?.dob);
    if (/\b(gender|sex)\b/.test(l))          return patient?.gender || "";
    if (/(mobile|phone|contact no|contact number)/.test(l)) return patient?.mobile || "";
    if (/(patient|client|customer)/.test(l) && !/(id|code|number|email|type)/.test(l))
      return patient?.name || "";
    return "";
  };

  const isWide = (comp, val) => {
    const t = normType(comp.componentType);
    if (ANNOT_TYPES.has(t) || SIG_TYPES.has(t) || LONG_TYPES.has(t)) return true;
    if (typeof val === "string" && val.length > 90) return true;
    if (Array.isArray(val) && val.length > 3) return true;
    if (val && typeof val === "object") return true;
    return false;
  };

  const renderField = (comp) => {
    const t = normType(comp.componentType);
    if (SKIP_TYPES.has(t)) return null;

    const answered = !isEmptyVal(maybeParse(responses[comp.componentId]));

    // A component only prints as static copy when it carries no answer — a
    // rich-text or free-text INPUT must never print as its own label.
    if (TEXTBLOCK.has(t) && !answered) {
      const html = textOf(comp);
      if (!html) return null;
      const clean = String(html).replace(/<script[\s\S]*?<\/script>/gi, "");
      return /<[a-z][\s\S]*>/i.test(clean)
        ? <div className="ps-textblock ps-avoid" key={comp.componentId}
             dangerouslySetInnerHTML={{ __html: clean }} />
        : <div className="ps-textblock ps-avoid" key={comp.componentId}>{clean}</div>;
    }

    const val = maybeParse(responses[comp.componentId]);
    return (
      <div key={comp.componentId}
        className={`ps-field ps-avoid${isWide(comp, val) ? " ps-wide" : ""}`}>
        <div className="ps-label">
          {cleanLabel(comp.label) || comp.componentId}
          {comp.isMandatory ? <span className="ps-req">*</span> : null}
        </div>
        <div className="ps-value">
          {answered
            ? <ValueView comp={comp} value={responses[comp.componentId]} assets={assets} />
            : (autoFill(comp) || <ValueView comp={comp} value={undefined} assets={assets} />)}
        </div>
      </div>
    );
  };

  const renderNode = (comp) => {
    const t        = normType(comp.componentType);
    const children = kids.get(comp.componentId) || [];

    if (SECTION_TYPES.has(t) || children.length) {
      const inner = children.map(renderNode).filter(Boolean);
      const flat  = [];
      inner.forEach(n => Array.isArray(n) ? flat.push(...n) : flat.push(n));
      const heading = isGenericLabel(comp.label, comp.componentType) ? "" : cleanLabel(comp.label);
      if (!flat.length && !heading) return null;
      return (
        <section className="ps-section" key={comp.componentId}>
          {heading ? <h2 className="ps-section-title">{heading}</h2> : null}
          {flat.length ? <div className="ps-grid">{flat}</div> : null}
        </section>
      );
    }
    return renderField(comp);
  };

  // Top-level fields that don't sit inside a section still need a grid wrapper.
  const body = [];
  let bucket = [];
  const flushBucket = () => {
    if (!bucket.length) return;
    body.push(<div className="ps-grid" key={`g${body.length}`}>{bucket}</div>);
    bucket = [];
  };
  roots.forEach(c => {
    const t = normType(c.componentType);
    const hasKids = (kids.get(c.componentId) || []).length > 0;
    if (SECTION_TYPES.has(t) || hasKids) {
      flushBucket();
      const node = renderNode(c);
      if (node) body.push(node);
    } else if (TEXTBLOCK.has(t) && isEmptyVal(maybeParse(responses[c.componentId]))) {
      flushBucket();
      const node = renderField(c);
      if (node) body.push(node);
    } else {
      const node = renderField(c);
      if (node) bucket.push(node);
    }
  });
  flushBucket();

  const centreName = patient?.centreName || brand?.name || brand?.centerCode || "";

  const metaRows = [
    ["Patient",         patient?.name || "—"],
    ["Customer ID",     custId || data?.custId || "—"],
    ["Mobile",          patient?.mobile || ""],
    ["Gender",          patient?.gender || ""],
    ["Date of Birth",   isPlaceholderDate(patient?.dob) ? "" : fmtLoose(patient?.dob)],
    ["Service",         meta?.serviceName || data?.serviceName || ""],
    ["Practitioner",    data?.practitionerName || meta?.practitionerName || ""],
    ["Appointment Ref", meta?.appointmentId || data?.appointmentId || ""],
    ["Submitted On",    fmtDT(data?.submittedAt)],
    ["Filled By",       data?.filledByName || meta?.filledByName || "—"],
    ["Centre",          centreName],
    ["Version",         meta?.version || data?.version ? `v${meta?.version || data?.version}` : ""],
  ].filter(([, v]) => v !== "" && v !== null && v !== undefined);

  return (
    <div className="ps">
      <header className="ps-header">
        <div className="ps-brand">
          {brand?.logo
            ? <img className="ps-logo" src={brand.logo} alt="" />
            : <div className="ps-logo-fallback">{centreName || "Clinic"}</div>}
          <div>
            <div className="ps-centre">{centreName}</div>
            {brand?.address ? <div className="ps-addr">{brand.address}</div> : null}
          </div>
        </div>
        <div className="ps-titlewrap">
          {data?.formType ? <div className="ps-kicker">{data.formType}</div> : null}
          <h1 className="ps-title">{data?.formName || "Form"}</h1>
          {data?.formCode ? <div className="ps-code">{data.formCode}</div> : null}
        </div>
      </header>

      <section className="ps-meta ps-avoid">
        {metaRows.map(([k, v]) => (
          <div className="ps-meta-cell" key={k}>
            <span className="ps-meta-k">{k}</span>
            <span className="ps-meta-v">{v}</span>
          </div>
        ))}
      </section>

      <main className="ps-body">
        {body.length ? body : <div className="ps-empty">No components found for this form.</div>}
      </main>

      <footer className="ps-footer">
        <div>
          {data?.formName}{data?.formCode ? ` · ${data.formCode}` : ""} · Submitted {fmtDT(data?.submittedAt)} by {data?.filledByName || "—"}
        </div>
        <div>Printed {fmtDT(new Date())} · {patient?.name || ""}{custId ? ` (${custId})` : ""}</div>
      </footer>
    </div>
  );
};

const SHEET_CSS = `
.ps { background:#fff; color:#10223f; font-family:Lato,Segoe UI,sans-serif; font-size:12.5px;
  line-height:1.5; max-width:860px; margin:0 auto; }
.ps-header { display:flex; justify-content:space-between; align-items:flex-start; gap:20px;
  padding-bottom:14px; border-bottom:2px solid #334b71; }
.ps-brand { display:flex; align-items:center; gap:12px; min-width:0; }
.ps-logo { max-height:58px; max-width:190px; object-fit:contain; }
.ps-logo-fallback { font-weight:800; font-size:18px; color:#2b3f73; letter-spacing:.02em; }
.ps-centre { font-weight:800; font-size:14px; color:#2b3f73; }
.ps-addr { font-size:11px; color:#64748b; max-width:280px; }
.ps-titlewrap { text-align:right; }
.ps-kicker { font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#94a3b8; }
.ps-title { margin:2px 0 0; font-size:19px; font-weight:800; color:#10223f; }
.ps-code { font-size:11px; color:#94a3b8; margin-top:2px; }
.ps-meta { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin:14px 0 18px;
  border:1px solid #e5e9f0; border-radius:8px; overflow:hidden; }
.ps-meta-cell { padding:8px 12px; border-right:1px solid #eef1f6; border-bottom:1px solid #eef1f6;
  display:flex; flex-direction:column; gap:2px; min-width:0; }
.ps-meta-k { font-size:9.5px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#94a3b8; }
.ps-meta-v { font-size:12.5px; font-weight:600; color:#10223f; overflow-wrap:anywhere; }
.ps-section { margin-bottom:18px; }
.ps-section-title { font-size:12px; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
  color:#334b71; margin:0 0 6px; padding-bottom:4px; border-bottom:1px solid #e5e9f0; }
.ps-grid { display:grid; grid-template-columns:1fr 1fr; border:1px solid #e5e9f0;
  border-radius:8px; overflow:hidden; margin-bottom:14px; }
.ps-field { padding:8px 12px; border-right:1px solid #eef1f6; border-bottom:1px solid #eef1f6; min-width:0; }
.ps-wide { grid-column:1 / -1; border-right:none; }
.ps-label { font-size:9.5px; font-weight:700; letter-spacing:.07em; text-transform:uppercase;
  color:#94a3b8; margin-bottom:3px; }
.ps-req { color:#b91c1c; margin-left:2px; }
.ps-value { font-size:12.5px; color:#10223f; overflow-wrap:anywhere; }
.ps-empty { color:#94a3b8; }
.ps-list { margin:0; padding-left:16px; }
.ps-list li { margin-bottom:2px; }
.ps-textblock { font-size:12px; color:#334155; background:#f8fafc; border:1px solid #eef1f6;
  border-radius:8px; padding:10px 12px; margin-bottom:14px; }
.ps-textblock p { margin:0 0 6px; }
.ps-img { max-width:260px; max-height:220px; border:1px solid #e5e9f0; border-radius:6px; display:block; }
.ps-imgwrap { display:inline-block; }
.ps-imgcap { display:block; font-size:10px; color:#94a3b8; margin-top:3px; }
.ps-sig { max-width:240px; max-height:110px; border:1px solid #cbd5e1; border-radius:6px;
  background:#fff; display:block; }
.ps-diagram-wrap { display:flex; flex-wrap:wrap; gap:16px; }
.ps-diagram { margin:4px 0 0; }
.ps-diagram-canvas { position:relative; display:inline-block; border:1px solid #e5e9f0;
  border-radius:8px; overflow:hidden; background:#fff; }
.ps-diagram-canvas img { display:block; max-width:320px; max-height:380px; object-fit:contain; }
.ps-diagram-paths { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
.ps-mark { position:absolute; transform:translate(-50%,-50%); width:17px; height:17px;
  border-radius:50%; background:#b91c1c; color:#fff; font-size:10px; font-weight:700;
  display:flex; align-items:center; justify-content:center; border:1.5px solid #fff; }
.ps-diagram-cap { font-size:10.5px; font-weight:700; color:#334b71; margin-top:5px; }
.ps-diagram-missing { font-size:11.5px; color:#94a3b8; border:1px dashed #cbd5e1;
  border-radius:8px; padding:12px; }
.ps-legend { margin:6px 0 0; padding:0; list-style:none; font-size:11px; color:#334155; }
.ps-legend li { display:flex; align-items:flex-start; gap:6px; margin-bottom:3px; }
.ps-legend-num { flex:0 0 auto; width:15px; height:15px; border-radius:50%; background:#b91c1c;
  color:#fff; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.ps-footer { margin-top:18px; padding-top:8px; border-top:1px solid #e5e9f0;
  display:flex; justify-content:space-between; gap:12px; font-size:10px; color:#94a3b8; }
`;

// Loaded INSIDE the print iframe only. The sheet prints from its own document,
// so no app-level rule (index.css / the invoice screen's
// `@media print { body * { visibility:hidden } }`) can blank it out — that is
// what produced empty pages when the sheet printed from the main document.
const FRAME_CSS = `
html, body { background:#fff; margin:0; padding:0; }
body { font-family:Lato,"Segoe UI",sans-serif; color:#10223f; }
@page { size:A4 portrait; margin:12mm; }
@media print {
  * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important;
      visibility:visible !important; }
  .ps { max-width:none; font-size:11.5px; }
  .ps-avoid, .ps-diagram, .ps-section-title { break-inside:avoid; page-break-inside:avoid; }
  .ps-section-title, .ps-header { break-after:avoid; page-break-after:avoid; }
  .ps-diagram-canvas img { max-height:300px; }
}
`;

// ─── Image Compare Modal ───────────────────────────────────────────────────────
const ImageCompare = ({ images, onClose }) => {
  const [selected,  setSelected]  = useState([]);
  const [comparing, setComparing] = useState(false);

  const toggleSelect = (img) => {
    setSelected(prev => {
      if (prev.find(i => i.imageId === img.imageId))
        return prev.filter(i => i.imageId !== img.imageId);
      if (prev.length >= 2) return prev;
      return [...prev, img];
    });
  };

  const left  = selected[0] || null;
  const right = selected[1] || null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:24, maxWidth:960, width:"95%",
        maxHeight:"90vh", overflow:"auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:16, color:"#2b3f73" }}>🔍 Image Comparison</div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#94a3b8" }}>×</button>
        </div>

        {/* Side-by-side panel */}
        {comparing && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            {[left, right].map((img, idx) => (
              <div key={idx}>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:6 }}>
                  {idx === 0 ? "IMAGE 1" : "IMAGE 2"}
                </div>
                {img ? (
                  <>
                    <img src={img.imageUrl} alt={img.imageType}
                      style={{ width:"100%", borderRadius:10, border:"1px solid #e7ecf4",
                        maxHeight:360, objectFit:"contain", background:"#f8fafc" }} />
                    <div style={{ marginTop:8, fontSize:11, color:"#64748b" }}>
                      <div><strong>Type:</strong> {img.imageType}</div>
                      <div><strong>Service:</strong> {img.serviceName || "—"}</div>
                      <div><strong>Date captured:</strong> {fmt(img.capturedAt)}</div>
                      <div><strong>Appointment ref:</strong> {img.appointmentId || "—"}</div>
                    </div>
                  </>
                ) : (
                  <div style={{ height:200, border:"2px dashed #e7ecf4", borderRadius:10,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#94a3b8", fontSize:13 }}>No image selected</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Gallery */}
        <div style={{ fontWeight:700, fontSize:12, color:"#94a3b8", marginBottom:8 }}>
          {comparing
            ? "COMPARISON VIEW"
            : `SELECT 2 IMAGES TO COMPARE (${selected.length}/2 selected)`}
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {images.map(img => {
            const isSelected = !!selected.find(i => i.imageId === img.imageId);
            const selIdx     = selected.findIndex(i => i.imageId === img.imageId);
            const isDisabled = selected.length === 2 && !isSelected;
            return (
              <div key={img.imageId}
                onClick={() => !isDisabled && toggleSelect(img)}
                style={{ cursor: isDisabled ? "not-allowed" : "pointer", position:"relative", width:110 }}>
                <img src={img.imageUrl} alt={img.imageType}
                  style={{ width:100, height:100, objectFit:"cover", borderRadius:8,
                    border:`3px solid ${isSelected ? "#334b71" : "#e7ecf4"}`,
                    opacity: isDisabled ? 0.4 : 1 }} />
                {isSelected && (
                  <span style={{ position:"absolute", top:4, right:8, background:"#334b71",
                    color:"#fff", borderRadius:"50%", width:20, height:20,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:700 }}>
                    {selIdx + 1}
                  </span>
                )}
                <div style={{ fontSize:9, marginTop:4, color:"#334b71", fontWeight:700,
                  textAlign:"center", lineHeight:1.4 }}>
                  {img.imageType}
                  <div style={{ color:"#94a3b8" }}>{fmt(img.capturedAt)}</div>
                  <div style={{ color:"#94a3b8", fontSize:8 }}>
                    {img.serviceName || "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          {!comparing ? (
            <button
              disabled={selected.length !== 2}
              onClick={() => setComparing(true)}
              style={{ background: selected.length === 2 ? "#2e7d5e" : "#94a3b8",
                color:"#fff", border:"none", borderRadius:8, padding:"9px 20px",
                fontWeight:700, fontSize:13,
                cursor: selected.length === 2 ? "pointer" : "not-allowed" }}>
              {selected.length === 2
                ? "▶ Compare"
                : `Select ${2 - selected.length} more image${2 - selected.length !== 1 ? "s" : ""}`}
            </button>
          ) : (
            <button onClick={() => { setComparing(false); setSelected([]); }}
              style={{ background:"#f1f5f9", border:"none", borderRadius:8,
                padding:"9px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              ← Back to Gallery
            </button>
          )}
          <button onClick={onClose}
            style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:8,
              padding:"9px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Submission Viewer Modal ───────────────────────────────────────────────────
const SubmissionViewer = ({ submissionId, onClose, autoPrint = false,
  customerName = "", custId = "", meta = null, centerCode = "" }) => {
  const [data,    setData]    = useState(null);
  const [formDef, setFormDef] = useState(null);
  const [assets,  setAssets]  = useState([]);
  const [custExtra, setCustExtra] = useState(null);   // Customer-master fallback
  const [brand,   setBrand]   = useState({ logo:"", name:"", address:"", centerCode });
  const [loading, setLoading] = useState(true);
  const frameRef   = useRef(null);
  const printedRef = useRef(false);

  // The sheet is rendered into an off-screen iframe with its own stylesheet and
  // printed from there. That keeps it out of the modal's scroll container (which
  // was clipping the output) and out of reach of the app's global print rules
  // (which were hiding it, giving blank pages).
  const [frameBody, setFrameBody] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.title = "print";
    f.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;";
    document.body.appendChild(f);

    const doc = f.contentDocument || f.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
    doc.close();

    const st = doc.createElement("style");
    st.appendChild(doc.createTextNode(SHEET_CSS + FRAME_CSS));
    doc.head.appendChild(st);

    frameRef.current = f;
    setFrameBody(doc.body);

    return () => {
      frameRef.current = null;
      if (f.parentNode) f.parentNode.removeChild(f);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sub = await authGet(`${API_BASE_URL}/api/EMR/Submissions/${submissionId}`);
        if (!alive) return;
        setData(sub);
        const [def, ast, br] = await Promise.all([
          authGet(`${API_BASE_URL}/api/EMR/Forms/${sub.formCode}`).catch(() => null),
          loadAnnotationAssets(),
          loadCentreBrand(centerCode),
        ]);
        if (!alive) return;
        setFormDef(def);
        setAssets(ast || []);
        setBrand(br || {});

        // Older backends don't return the patient block on the submission —
        // fall back to the customer master so the header is never blank.
        if (!sub?.customerName) {
          const id = custId || sub?.custId;
          if (id) {
            const cust = await authPost(
              `${API_BASE_URL}/api/Customer/FetchCustomerDetails`, { custID: id }
            ).catch(() => null);
            if (alive) setCustExtra(cust || null);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [submissionId, centerCode]);

  // Wait for logo / signature / diagram images to decode before opening the
  // print dialog — otherwise they come out blank.
  const doPrint = async () => {
    const f   = frameRef.current;
    const win = f && f.contentWindow;
    const doc = f && (f.contentDocument || win.document);

    if (!win || !doc || !doc.body || !doc.body.firstChild) { window.print(); return; }

    // Logo, signatures and diagrams are data URIs — they still need a tick to
    // decode, and printing before they do gives blank boxes.
    const imgs = Array.from(doc.images || []);
    await Promise.all(imgs.map(img => img.complete
      ? Promise.resolve()
      : new Promise(res => { img.onload = res; img.onerror = res; })));
    await new Promise(res => setTimeout(res, 120));

    try { win.focus(); win.print(); }
    catch { window.print(); }
  };

  // C360-005: auto-print once the content has finished loading
  useEffect(() => {
    if (!autoPrint || loading || printedRef.current) return;
    printedRef.current = true;
    const id = requestAnimationFrame(() => { doPrint(); });
    return () => cancelAnimationFrame(id);
  }, [autoPrint, loading]);

  const patient = useMemo(() => {
    const full = [custExtra?.firstName, custExtra?.middleName, custExtra?.lastName]
      .filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    return {
      name:       data?.customerName   || full                    || customerName || "",
      mobile:     data?.customerMobile || custExtra?.mobilePhone   || "",
      gender:     data?.customerGender || custExtra?.gender        || "",
      dob:        data?.customerDob    || custExtra?.birthDay      || "",
      centreName: data?.centreName     || custExtra?.centerName    || "",
    };
  }, [data, custExtra, customerName]);

  const sheet = (
    <PrintSheet
      data={data} formDef={formDef} assets={assets} brand={brand}
      patient={patient} custId={custId} meta={meta}
    />
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <style>{SHEET_CSS}</style>

      <div style={{ background:"#fff", borderRadius:14, padding:"18px 20px", maxWidth:900,
        width:"95%", maxHeight:"92vh", display:"flex", flexDirection:"column" }}>

        <div className="emr-no-print" style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:12, flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:"#2b3f73" }}>{data?.formName || "Form"}</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
              {patient.name ? `${patient.name} · ` : ""}Submitted {fmt(data?.submittedAt)} · By {data?.filledByName || meta?.filledByName || "—"}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#94a3b8" }}>×</button>
        </div>

        {/* Preview — identical markup to what prints */}
        <div style={{ flex:1, overflowY:"auto", background:"#f8fafc", borderRadius:10,
          border:"1px solid #eef1f6", padding:18 }}>
          {loading
            ? <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading…</div>
            : sheet}
        </div>

        <div className="emr-no-print" style={{ flexShrink:0, paddingTop:12, borderTop:"1px solid #f1f5f9",
          display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button onClick={doPrint} disabled={loading}
            style={{ background: loading ? "#94a3b8" : "#334b71", color:"#fff", border:"none",
              borderRadius:8, padding:"9px 18px", fontWeight:700, fontSize:13,
              cursor: loading ? "not-allowed" : "pointer" }}>
             Print
          </button>
          <button onClick={onClose}
            style={{ background:"#fff", border:"1px solid #e7ecf4", borderRadius:8,
              padding:"9px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Close
          </button>
        </div>
      </div>

      {/* Print copy — lives inside the off-screen print iframe */}
      {frameBody && !loading && createPortal(sheet, frameBody)}
    </div>
  );
};

// ─── Main CustomerFormHistory ─────────────────────────────────────────────────
const CustomerFormHistory = () => {
  const [searchParams] = useSearchParams();
  const custId       = searchParams.get("custid")   || "";
  const customerName = searchParams.get("fullname") || "Customer";

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [err,         setErr]         = useState("");
  const [activeTab,   setActiveTab]   = useState("submissions");
  const [viewSub,     setViewSub]     = useState(null);   // { id, meta } to view
  const [printSub,    setPrintSub]    = useState(null);   // { id, meta } to print (auto-prints on open)
  const [showCompare, setShowCompare] = useState(false);

  // Edit / Fill Customer Form state
  const [editingForm,         setEditingForm]         = useState(null); // { recId, formCode, prefill }
  const [editCentreCode,      setEditCentreCode]      = useState("");
  const [customerFormTemplates, setCustomerFormTemplates] = useState(null); // null=not loaded
  const [templatePicker,      setTemplatePicker]      = useState(false);

  useEffect(() => {
    if (!custId) { setErr("Missing custid in URL."); setLoading(false); return; }
    const user = sessionUser();
    setEditCentreCode(user.centerCode || "");
    loadCentreBrand(user.centerCode || "");   // warm the logo cache for printing

    Promise.all([
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`),
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Images`),
    ]).then(([forms, images]) => {
      setData({ forms, images: Array.isArray(images) ? images : [] });
    }).catch(() => setErr("Failed to load EMR data."))
    .finally(() => setLoading(false));
  }, [custId]);

  // Load Customer-type form templates when customer tab is opened
  useEffect(() => {
    if (activeTab !== "customer" || customerFormTemplates !== null) return;
    authGet(`${API_BASE_URL}/api/EMR/Forms/Active?formType=Customer`)
      .then(d => setCustomerFormTemplates(Array.isArray(d) ? d : []))
      .catch(() => setCustomerFormTemplates([]));
  }, [activeTab]);

  const reload = () => {
    setLoading(true);
    Promise.all([
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Forms`),
      authGet(`${API_BASE_URL}/api/EMR/Customer/${encodeURIComponent(custId)}/Images`),
    ]).then(([forms, images]) => {
      setData({ forms, images: Array.isArray(images) ? images : [] });
    }).finally(() => setLoading(false));
  };

  // ── Shared table styles ──
  const thStyle = {
    padding:"9px 12px", fontWeight:700, fontSize:11, color:"#64748b",
    textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"2px solid #e7ecf4",
    textAlign:"left", background:"#f8fafc", whiteSpace: "nowrap"
  };
  const tdStyle = {
    padding:"12px", fontSize:13, borderBottom:"1px solid #f1f5f9",
    verticalAlign:"middle", color:"#10223f",
  };

  const ActionBtn = ({ label, onClick, variant = "primary" }) => {
    const bg = variant === "print"  ? "#334b71"
             : variant === "edit"   ? "#BA7517"
             : "#334b71";
    return (
      <button onClick={onClick}
        style={{ background:bg, color:"#fff", border:"none", borderRadius:7,
          padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer",
          marginRight:4, whiteSpace:"nowrap" }}>
        {label}
      </button>
    );
  };

  return (
    <div style={{ padding:20, fontFamily:"Lato,sans-serif", maxWidth:1100 }}>
      <style>{`
        .emr-tab { padding:9px 18px; border:none; border-radius:8px; font-weight:700; font-size:13px;
          cursor:pointer; transition:all .15s; margin-right:6px; }
        .emr-tab.active { background:#334b71; color:#fff; }
        .emr-tab:not(.active) { background:#f1f5f9; color:#64748b; }
        .emr-card { background:#fff; border:1px solid #e7ecf4; border-radius:12px;
          overflow:hidden; margin-top:14px; }
        .emr-tbl { width:100%; border-collapse:collapse; }
        .emr-badge { border-radius:999px; padding:2px 9px; font-size:11px; font-weight:700; }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:20, color:"#2b3f73" }}> EMR Forms</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{customerName}</div>
        </div>
        {(data?.images?.length || 0) > 1 && (
          <button
            style={{ background:"#2e7d5e", color:"#fff", border:"none", borderRadius:8,
              padding:"9px 18px", fontWeight:700, fontSize:13, cursor:"pointer" }}
            onClick={() => setShowCompare(true)}>
             Compare Images
          </button>
        )}
      </div>

      {/* Tabs */}
      <div>
        <button className={`emr-tab ${activeTab==="submissions"?"active":""}`}
          onClick={() => setActiveTab("submissions")}>
          📝 Submitted Forms ({(data?.forms?.submissions||[]).filter(s => s.formType === "Consent/Treatment").length || 0})
        </button>
        <button className={`emr-tab ${activeTab==="customer"?"active":""}`}
          onClick={() => setActiveTab("customer")}>
          👤 Customer Form ({data?.forms?.customerForms?.length || 0})
        </button>
        <button className={`emr-tab ${activeTab==="images"?"active":""}`}
          onClick={() => setActiveTab("images")}>
           Images ({data?.images?.length || 0})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#64748b" }}>Loading EMR records…</div>
      ) : err ? (
        <div style={{ padding:20, color:"#b91c1c", background:"#fdf3f3", borderRadius:8 }}>{err}</div>
      ) : (
        <>
          {/* ── Submissions Tab — Consent + Treatment forms ── */}
          {activeTab === "submissions" && (
            <div className="emr-card">
              {!(data?.forms?.submissions||[]).filter(s => s.formType === "Consent/Treatment").length ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
                  No consent/treatment forms submitted yet.
                </div>
              ) : (
                <table className="emr-tbl">
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Service</th>
                      <th style={thStyle}>Form Name</th>
                      <th style={thStyle}>Form Type</th>
                      <th style={thStyle}>Filled By</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.forms.submissions.filter(s => s.formType === "Consent/Treatment").map(s => {
                      const typeStyle = s.formType === "Consent/Treatment"
                        ? { background:"#e9edf5", color:"#334b71" }
                        : { background:"#e6f4ef", color:"#2e7d5e" };
                      const rowMeta = {
                        serviceName:   s.serviceName  || "",
                        appointmentId: s.appointmentId || "",
                        filledByName:  s.filledByName || s.filledBy || "",
                      };
                      return (
                        <tr key={s.submissionId}>
                          <td style={tdStyle}>{fmt(s.submittedAt)}</td>
                          <td style={tdStyle}>{s.serviceName || "—"}</td>
                          <td style={{ ...tdStyle, fontWeight:600 }}>{s.formName}</td>
                          <td style={tdStyle}>
                            <span className="emr-badge" style={typeStyle}>{s.formType}</span>
                          </td>
                          <td style={tdStyle}>
                            {s.filledByName || s.filledBy || "—"}
                          </td>
                          <td style={tdStyle}>
                            <ActionBtn label="View"
                              onClick={() => setViewSub({ id: s.submissionId, meta: rowMeta })} />
                            <ActionBtn label=" Print" variant="print"
                              onClick={() => setPrintSub({ id: s.submissionId, meta: rowMeta })} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Customer Form Tab ── */}
          {activeTab === "customer" && (
            <div className="emr-card">
              {/* Header row with Fill button */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 16px", borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#2b3f73" }}>
                  Customer Medical History
                </div>
                <button
                  onClick={() => {
                    if (!customerFormTemplates) return;
                    if (customerFormTemplates.length === 0) {
                      alert("No active Customer-type forms found. Please create one in the Form Builder first.");
                      return;
                    }
                    if (customerFormTemplates.length === 1) {
                      // Only one template — open it directly
                      const tpl = customerFormTemplates[0];
                      const latest = data?.forms?.customerForms?.find(cf => cf.isLatest);
                      setEditingForm({
                        recId:     latest?.recId    || null,
                        formCode:  tpl.formCode,
                        isNew:     !latest,
                      });
                    } else {
                      // Multiple templates — show picker
                      setTemplatePicker(true);
                    }
                  }}
                  style={{ background:"#334b71", color:"#fff", border:"none", borderRadius:8,
                    padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  {data?.forms?.customerForms?.length ? "✏ Edit / Update" : "+ Fill Customer Form"}
                </button>
              </div>

              {!data?.forms?.customerForms?.length ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
                  No customer form submitted yet. Click "+ Fill Customer Form" to add one.
                </div>
              ) : (
                <table className="emr-tbl">
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Service</th>
                      <th style={thStyle}>Form Name</th>
                      <th style={thStyle}>Form Type</th>
                      <th style={thStyle}>Filled By</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.forms.customerForms.map(cf => (
                      <tr key={cf.recId}>
                        <td style={tdStyle}>
                          {fmt(cf.submittedAt)}
                          {/* Version badges — satisfy R19: edits show as separate rows with dates */}
                          <div style={{ display:"flex", gap:4, marginTop:4 }}>
                            <span className="emr-badge" style={{ background:"#f1f5f9", color:"#64748b" }}>
                              v{cf.version}
                            </span>
                            {cf.isLatest && (
                              <span className="emr-badge" style={{ background:"#dcfce7", color:"#166534" }}>
                                Latest
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color:"#94a3b8" }}>N/A</td>
                        <td style={{ ...tdStyle, fontWeight:600 }}>
                          {cf.formName || "Customer Form"}
                        </td>
                        <td style={tdStyle}>
                          <span className="emr-badge" style={{ background:"#e6f4ef", color:"#2e7d5e" }}>
                            Customer
                          </span>
                        </td>
                        <td style={tdStyle}>
                         {cf.filledByName || cf.filledBy || "—"}
                        </td>
                        <td style={tdStyle}>
                          <ActionBtn label="View"
                            onClick={() => setViewSub({ id: cf.recId, meta: {
                              version: cf.version,
                              filledByName: cf.filledByName || cf.filledBy || "" } })} />
                          <ActionBtn label=" Print" variant="print"
                            onClick={() => setPrintSub({ id: cf.recId, meta: {
                              version: cf.version,
                              filledByName: cf.filledByName || cf.filledBy || "" } })} />
                          {/* Edit only allowed on latest version — FRD Rule 17 */}
                          {cf.isLatest && (
                            <ActionBtn label="Edit" variant="edit"
                              onClick={() => setEditingForm({ recId: cf.recId, formCode: cf.formCode })} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Images Tab ── */}
          {activeTab === "images" && (
            <div className="emr-card">
              <div style={{ padding:"12px 16px", fontWeight:800, fontSize:14, color:"#2b3f73",
                borderBottom:"1px solid #f1f5f9" }}>Before / After Images</div>
              {!data?.images?.length ? (
                <div style={{ textAlign:"center", padding:30, color:"#94a3b8", fontSize:13 }}>
                  No images uploaded yet.
                </div>
              ) : (
                <div style={{ padding:16, display:"flex", flexWrap:"wrap", gap:12 }}>
                  {data.images.map(img => (
                    <div key={img.imageId} style={{ width:140 }}>
                      <img src={img.imageUrl} alt={img.imageType}
                        style={{ width:140, height:140, objectFit:"cover", borderRadius:10,
                          border:"1px solid #e7ecf4", cursor:"pointer" }}
                        onClick={() => window.open(img.imageUrl, "_blank")} />
                      <div style={{ marginTop:6, fontSize:11, color:"#334b71", fontWeight:700 }}>{img.imageType}</div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>{img.serviceName || "—"}</div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>{fmt(img.capturedAt)}</div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>Appt: {img.appointmentId?.slice(-6) || "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Submission Viewer — View mode */}
      {viewSub && (
        <SubmissionViewer
          submissionId={viewSub.id}
          meta={viewSub.meta}
          customerName={customerName}
          custId={custId}
          centerCode={editCentreCode}
          onClose={() => setViewSub(null)}
        />
      )}

      {/* Submission Viewer — Print mode (auto-prints after load) */}
      {printSub && (
        <SubmissionViewer
          submissionId={printSub.id}
          meta={printSub.meta}
          customerName={customerName}
          custId={custId}
          centerCode={editCentreCode}
          autoPrint={true}
          onClose={() => setPrintSub(null)}
        />
      )}

      {/* Image Compare */}
      {showCompare && (data?.images?.length || 0) > 0 && (
        <ImageCompare images={data.images} onClose={() => setShowCompare(false)} />
      )}

      {/* Template picker — shown when multiple Customer-type forms exist */}
      {templatePicker && customerFormTemplates && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:28, maxWidth:480,
            width:"95%", boxShadow:"0 8px 32px rgba(0,0,0,.18)" }}>
            <div style={{ fontWeight:800, fontSize:16, color:"#2b3f73", marginBottom:6 }}>
              Select Customer Form
            </div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
              Multiple customer form templates are available. Choose one to fill.
            </div>
            {customerFormTemplates.map(tpl => {
              const latest = data?.forms?.customerForms?.find(cf => cf.isLatest && cf.formCode === tpl.formCode);
              return (
                <div key={tpl.formCode}
                  onClick={() => {
                    setTemplatePicker(false);
                    setEditingForm({
                      recId:    latest?.recId || null,
                      formCode: tpl.formCode,
                      isNew:    !latest,
                    });
                  }}
                  style={{ border:"1px solid #e7ecf4", borderRadius:10, padding:"14px 16px",
                    marginBottom:10, cursor:"pointer", display:"flex", justifyContent:"space-between",
                    alignItems:"center", transition:"background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="#f0f4fa"}
                  onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#334b71" }}>{tpl.formName}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{tpl.formCode}</div>
                  </div>
                  <div style={{ fontSize:12, color:"#334b71", fontWeight:600 }}>
                    {latest ? "✏ Edit / Update" : "+ Fill"} →
                  </div>
                </div>
              );
            })}
            <button onClick={() => setTemplatePicker(false)}
              style={{ marginTop:8, width:"100%", padding:"10px", border:"1px solid #e7ecf4",
                borderRadius:8, background:"#fff", fontSize:13, cursor:"pointer", color:"#64748b" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fill / Edit Customer Form — opens FormFillModal */}
      {editingForm && (
        <FormFillModal
          key={editingForm.recId || ("new-" + editingForm.formCode)}
          appointmentId={null}
          serviceCode={null}
          custId={custId}
          centerCode={editCentreCode}
          whenToFill={null}
          isCustomerFormEdit={true}
          existingRecId={editingForm.isNew ? null : editingForm.recId}
          formCodeOverride={editingForm.formCode}
          onComplete={() => {
            setEditingForm(null);
            reload();
          }}
          onClose={() => setEditingForm(null)}
        />
      )}
    </div>
  );
};

export default CustomerFormHistory;