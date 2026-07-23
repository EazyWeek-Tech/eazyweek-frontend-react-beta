"use client";

  import React, { useEffect, useMemo, useState } from "react";
  import { useLocation, useNavigate, useParams } from "react-router-dom";
  import { API_BASE_URL } from "../../config";
  import CallButton from "../../components/CallButton";

  /** ---------------- Helpers ---------------- */
  const safe = (v) => (v === null || v === undefined ? "" : String(v));
  const pad2 = (n) => String(n).padStart(2, "0");

  const DEFAULT_FOLLOWUP_TIME_LABEL = "01:30 PM";
  const OPP_TYPE = "ExternalSource";

  const getTodayInputDate = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  /** Convert API date (ISO / dd-MM-yyyy / dd/MM/yyyy) -> "yyyy-MM-dd" for date input */
  const toInputDate = (v) => {
    const s = safe(v).trim();
    if (!s) return "";

    // already yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // ISO like 2026-02-06T00:00:00...
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);

    // dd/MM/yyyy
    let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;

    // dd-MM-yyyy
    m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;

    // fallback try Date parse
    const d = new Date(s);
    if (Number.isNaN(+d)) return "";
    d.setHours(0, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };


  const getTomorrowInputDate = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  /** "13:30:00" + "PM" -> "01:30 PM" (dropdown label) */
  const toUiTimeLabel = (hhmmss, ampm) => {
    const t = safe(hhmmss).trim();
    if (!t) return "";

    const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return "";

    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);

    // If AM/PM not provided, infer from hh
    const ap =
      safe(ampm).trim().toUpperCase() || (hh >= 12 ? "PM" : "AM");

    // convert to 12-hour
    let h12 = hh % 12;
    if (h12 === 0) h12 = 12;

    return `${pad2(h12)}:${pad2(mm)} ${ap}`;
  };


  const isValidEmail = (email) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Time dropdown options: "12:00 AM" ... "11:30 PM"
  const TIME_OPTIONS = (() => {
    const out = [{ label: "--", value: "" }];
    for (let h24 = 0; h24 < 24; h24++) {
      for (const m of [0, 30]) {
        const ampm = h24 >= 12 ? "PM" : "AM";
        let h12 = h24 % 12;
        if (h12 === 0) h12 = 12;
        const label = `${pad2(h12)}:${pad2(m)} ${ampm}`;
        out.push({ label, value: label });
      }
    }
    return out;
  })();

  /** Keep only digits */
  const digitsOnly = (s) => safe(s).replace(/\D/g, "");

  /**
   * Normalize mobile for API:
   * - If mobile has >10 digits, send last 10 digits as mobileNo
   * - Put remaining prefix into countryCode (if countryCode not provided)
   * - countryCode returned as "+<digits>" or ""
   */
  const normalizeMobileForApi = (countryCode, mobile) => {
    const cc = digitsOnly(countryCode);
    const m = digitsOnly(mobile);

    if (!m) return { countryCode: cc ? `+${cc}` : "", mobileNo: "" };

    // already a 10-digit local number
    if (m.length === 10) {
      return { countryCode: cc ? `+${cc}` : "", mobileNo: m };
    }

    // includes country code (e.g., 12-13 digits)
    if (m.length > 10) {
      const local = m.slice(-10);
      const prefix = m.slice(0, m.length - 10);
      const finalCC = cc || prefix;
      return { countryCode: finalCC ? `+${finalCC}` : "", mobileNo: local };
    }

    // less than 10 digits
    return { countryCode: cc ? `+${cc}` : "", mobileNo: m };
  };

  const AUTH_TOKEN = () => {
    try { return localStorage.getItem("token") || sessionStorage.getItem("token") || ""; }
    catch { return ""; }
  };
  const AUTH_HEADERS = () => (AUTH_TOKEN() ? { Authorization: `Bearer ${AUTH_TOKEN()}` } : {});

  const fetchJson = async (url) => {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...AUTH_HEADERS() },
      credentials: "include",
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  const postJson = async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...AUTH_HEADERS(),
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  };

  const readList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.table)) return data.table;
    return [];
  };

  /** Parse "01:30 PM" -> { hhmmss: "13:30:00", ampm: "PM" } */
  const toApiFollowUpTimeParts = (label) => {
    const s = safe(label).trim();
    const m = s.match(/^(\d{2}):(\d{2})\s?(AM|PM)$/i);
    if (!m) return { hhmmss: "", ampm: "" };

    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ap = m[3].toUpperCase();

    if (ap === "AM") {
      if (hh === 12) hh = 0;
    } else {
      if (hh !== 12) hh = hh + 12;
    }

    return { hhmmss: `${pad2(hh)}:${pad2(mm)}:00`, ampm: ap };
  };

  /** Date input "yyyy-MM-dd" -> ISO string with time "T00:00:00.000Z" */
  const toApiFollowUpDateISO = (yyyyMMdd) => {
    const s = safe(yyyyMMdd).trim();
    if (!s) return "";
    return `${s}T00:00:00.000Z`;
  };

  /** ---------------- Session Center Resolver ----------------
   * Finds the session JSON that contains loginCode/topCode anywhere in sessionStorage.
   */
  /** ---------------- Center Resolver (LOCAL first) ----------------
 * Tries:
 *  1) localStorage.userSession (topCode/loginCode)
 *  2) sessionStorage.userSession (topCode/loginCode)
 *  3) scan localStorage for any JSON containing loginCode/topCode
 *  4) scan sessionStorage for any JSON containing loginCode/topCode
 * Returns: centerCode string
 */
const getCenterFromStorage = () => {
  const pickFromObj = (obj) => {
    if (!obj || typeof obj !== "object") return "";
    const code = safe(obj?.loginCode || obj?.topCode || obj?.TopCode || obj?.LoginCode).trim();
    return code || "";
  };

  const tryParse = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // 1) localStorage.userSession preferred
  try {
    const raw = localStorage.getItem("userSession");
    const obj = tryParse(raw);
    const code = pickFromObj(obj);
    if (code) return code;
  } catch {}

  // 2) sessionStorage.userSession
  try {
    const raw = sessionStorage.getItem("userSession");
    const obj = tryParse(raw);
    const code = pickFromObj(obj);
    if (code) return code;
  } catch {}

  // helper: scan storage keys
  const scan = (storage) => {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        const raw = storage.getItem(key);
        if (!raw) continue;

        // quick filter to avoid parsing everything
        if (!raw.includes("loginCode") && !raw.includes("topCode") && !raw.includes("TopCode") && !raw.includes("LoginCode"))
          continue;

        const obj = tryParse(raw);
        const code = pickFromObj(obj);
        if (code) return code;
      }
    } catch {}
    return "";
  };

  // 3) scan localStorage
  const lc = scan(localStorage);
  if (lc) return lc;

  // 4) scan sessionStorage
  const sc = scan(sessionStorage);
  if (sc) return sc;

  return "";
};


  const SearchableSingleSelect = ({
  options,
  value,
  onChange,
  placeholder = "Type to search...",
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const wrapRef = React.useRef(null);

  // keep input text synced with selected value (show label)
  React.useEffect(() => {
    const opt = (options || []).find((o) => safe(o.value).trim() === safe(value).trim());
    setQ(opt?.label || "");
  }, [value, options]);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = React.useMemo(() => {
    const t = safe(q).toLowerCase().trim();
    const list = (options || []).filter((o) => safe(o.value).trim() !== "");
    if (!t) return list.slice(0, 80);
    return list
      .filter((o) => safe(o.label).toLowerCase().includes(t) || safe(o.value).toLowerCase().includes(t))
      .slice(0, 80);
  }, [q, options]);

  return (
    <div className={`ssWrap ${disabled ? "isDisabled" : ""}`} ref={wrapRef}>
      <input
        className="inp"
        value={q}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => !disabled && setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          // if user clears -> clear selection
          if (!safe(e.target.value).trim()) onChange("");
        }}
      />

      {open && !disabled && (
        <div className="ssMenu">
          {filtered.length === 0 ? (
            <div className="ssItem muted">No results</div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.value || o.label}
                className={`ssItem ${safe(o.value).trim() === safe(value).trim() ? "active" : ""}`}
                onMouseDown={(e) => {
                  // prevent blur before click
                  e.preventDefault();
                  onChange(o.value);
                  setOpen(false);
                }}
                title={o.label}
              >
                <div className="ssLabel">{o.label}</div>
                <div className="ssCode">{o.value}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};


  /** ---------------- Component ---------------- */
  const ExternalLeadForm = () => {
    const params = useParams();
    const navigate = useNavigate();
    // LTR: mount path of the Appointment module.  VERIFY against your router.
    const APPOINTMENT_ROUTE = "/appointment";
    const locationObj = useLocation();
    const { state } = locationObj;

    const row = state?.row || null;

    console.log(row)

    const oppCodeFromState = safe(state?.oppCode).trim();
    const oppCodeFromParams = safe(params?.oppCode).trim();
    const resolvedOppCode = oppCodeFromState || oppCodeFromParams;

    const leadOppIdFromState = safe(state?.leadOppId).trim();
    const leadOppIdFromParams = safe(params?.leadOppId).trim();
    const resolvedLeadOppId = leadOppIdFromState || leadOppIdFromParams;

    const recID =
      Number(safe(params?.leadOppId || resolvedLeadOppId).trim() || 0) || 0;

    const [toast, setToast] = useState({ show: false, msg: "" });
    const showToast = (msg) => {
      setToast({ show: true, msg });
      window.clearTimeout(showToast._t);
      showToast._t = window.setTimeout(
        () => setToast({ show: false, msg: "" }),
        2500
      );
    };

    /** ---------------- Options ---------------- */
    const [langOptions] = useState(["Arabic", "English"]);

    // ✅ Source / SubSource options
  const [sourceOptions, setSourceOptions] = useState([
  ]);
  const [subSourceOptions, setSubSourceOptions] = useState([
  ]);


    const [centerOptions, setCenterOptions] = useState([
      { label: "< - Select one - >", value: "" },
    ]);
    const [doctorOptions, setDoctorOptions] = useState([
      { label: "< - Select one - >", value: "" },
    ]);
    const [verticalOptions, setVerticalOptions] = useState([
      { label: "< - Select one - >", value: "" },
    ]);

    // ✅ Disposition / Sub-disposition from API
    const [dispositionOptions, setDispositionOptions] = useState([
      { label: "< - Select one - >", value: "" },
    ]);
    const [subDispositionOptions, setSubDispositionOptions] = useState([
      { label: "< - Select one - >", value: "" },
    ]);

    /** ---------------- Form ---------------- */
    const minFollowUpDate = useMemo(() => getTodayInputDate(), []);

    const [isSubmitHidden, setIsSubmitHidden] = useState(false);

    const [form, setForm] = useState(() => {
      const custName = safe(row?.custName);
      const first = safe(row?.firstName || (custName ? custName.split(" ")[0] : ""));
      const last = safe(
        row?.lastName || (custName ? custName.split(" ").slice(1).join(" ") : "")
      );

      return {
        countryCode: safe(row?.countryCode || ""),
        mobile: safe(row?.custMobileNo || ""),
        firstName: first,
        lastName: last,
        email: safe(row?.email || ""),

        preferredLanguage: safe(row?.preferedLang || "English"),

        centerCode: safe(row?.centercode || ""),
        doctor: safe(row?.therapistCode || ""),
        doctorName: safe(row?.therapistname || ""),

        interestedVerticalCode: safe(row?.interestedInCode || ""),
        interestedVerticalName: safe(row?.interestedInName || ""),
        interestedOther: "",

        // from row if present
        dispositionId: safe(row?.dispositionCode || ""),
        subDispositionId: safe(row?.subDispositionCode || ""),

        followUpDate: toInputDate(row?.followUpDate) || getTomorrowInputDate(),

        followUpTime: DEFAULT_FOLLOWUP_TIME_LABEL,

        medium: safe(row?.medium || ""),          // ✅ text (disabled)
  subMedium: safe(row?.subMedium || ""),    // ✅ text (disabled)
  // API returns: source, subSource
  source: safe(row?.source || ""),        // optional
  subSource: safe(row?.subSource || ""),  // optional

  // API returns: followUptime + followUpAMPM
  followUpTime: toUiTimeLabel(row?.followUptime, row?.followUpAMPM) || DEFAULT_FOLLOWUP_TIME_LABEL,





        remarks: safe(row?.remarks || ""),
      };
    });

    // ✅ sessionCenter computed safely
    const [sessionCenter, setSessionCenter] = useState("");
    useEffect(() => {
      const code = getCenterFromStorage();
console.log("Detected center (local-first) =", code);
setSessionCenter(code);

      console.log("Detected sessionCenter =", code);
      setSessionCenter(code);
    }, []);

    // hide submit on initial load (kept same logic as your current file)
    useEffect(() => {
      const initialDisp = safe(row?.dispositionCode).trim() || safe(form.dispositionId).trim();
      const initialOppStatus = initialDisp === "LS004" ? "1" : "2";
      const shouldHide =
        initialOppStatus === "2" && (initialDisp === "LS003" || initialDisp === "LS007");
      setIsSubmitHidden(shouldHide);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // ── Convert → Create-Customer popup ──
    const [showCustomerPopup, setShowCustomerPopup] = useState(false);
    // LTR: conversion context captured on a converting save (Case A routing).
    const [convertCtx, setConvertCtx] = useState(null);
    const [creatingCustomer, setCreatingCustomer]   = useState(false);
    const [nationalityOptions, setNationalityOptions] = useState([]);
    const [customerForm, setCustomerForm] = useState({
      firstName: "", lastName: "", mobileNo: "", email: "",
      countryCode: "", nationalityId: "", dateOfBirth: "", gender: "",
    });
    const cInput = { width: "100%", marginTop: 4, padding: "8px 10px", border: "1px solid #cfd6e4", borderRadius: 8, boxSizing: "border-box" };
    const cBtn   = { background: "#0b1b37", color: "#fff", border: 0, borderRadius: 10, padding: "10px 22px", fontWeight: 700, cursor: "pointer" };

    useEffect(() => {
      let alive = true;
      (async () => {
        try {
          const data = await fetchJson(`${API_BASE_URL}/api/Master/Nationality`);
          const list = Array.isArray(data) ? data : (data.items || data.data || []);
          if (alive) {
            setNationalityOptions(
              list.map((n) => ({ id: n.id ?? n.RECID ?? n.value, name: n.name ?? n.NATIONALITYNAME ?? n.label }))
            );
          }
        } catch { /* non-fatal: popup can still be filled manually */ }
      })();
      return () => { alive = false; };
    }, []);

    /** ---------------- Load Sources ---------------- */
  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const data = await fetchJson(`${API_BASE_URL}/api/Master/Source`);
        const list = readList(data);

        const opts = [
          { label: "< - Select one - >", value: "" },
          ...list.map((x) => ({
            value: safe(x?.code).trim(),
            label: safe(x?.name).trim() || safe(x?.code).trim(),
          })),
        ];

        if (!alive) return;
        setSourceOptions(opts);
      } catch (e) {
        console.error("OppSource failed", e);
        if (!alive) return;
        setSourceOptions([{ label: "< - Select one - >", value: "" }]);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

/** ---------------- Load SubSources (API depends on source) ---------------- */
useEffect(() => {
  let alive = true;
  const src = safe(form.source).trim();

  const run = async () => {
    if (!src) {
      setSubSourceOptions([{ label: "< - Select one - >", value: "" }]);
      setForm((p) => ({ ...p, subSource: "" }));
      return;
    }

    try {
      const data = await fetchJson(
        `${API_BASE_URL}/api/Master/SubSource/${encodeURIComponent(src)}`
      );
      const list = readList(data);

      const opts = [
        { label: "", value: "" },
        ...list.map((x) => ({
          value: safe(x?.code).trim(),
          label: safe(x?.name).trim() || safe(x?.code).trim(),
        })),
      ];

      if (!alive) return;
      setSubSourceOptions(opts);

      // if current selected subSource not in list -> clear it
      setForm((p) => {
        const cur = safe(p.subSource).trim();
        if (!cur) return p;
        const exists = opts.some((o) => safe(o.value).trim() === cur);
        return exists ? p : { ...p, subSource: "" };
      });
    } catch (e) {
      console.error("OppSubSource failed", e);
      if (!alive) return;
      setSubSourceOptions([{ label: "< - Select one - >", value: "" }]);
      setForm((p) => ({ ...p, subSource: "" }));
    }
  };

  run();
  return () => {
    alive = false;
  };
}, [form.source]);


    /** ---------------- Load Dispositions (API) ---------------- */
    useEffect(() => {
      let alive = true;

      const run = async () => {
        try {
          const data = await fetchJson(
            `${API_BASE_URL}/api/Opportunity/Dispostion/${encodeURIComponent(OPP_TYPE)}`
          );
          const list = readList(data);

          let opts = (Array.isArray(list) ? list : []).map((x) => ({
            value: safe(x?.code).trim(),
            label: safe(x?.name).trim() || safe(x?.code).trim(),
          })).filter((o) => ["wip","converted","not converted"].includes(String(o.label||"").trim().toLowerCase()));

          // ensure "< - Select one - >" exists at top
          const hasBlank = opts.some((o) => safe(o.value).trim() === "");
          if (!hasBlank) opts = [{ label: "< - Select one - >", value: "" }, ...opts];
          else {
            const blank = opts.find((o) => safe(o.value).trim() === "");
            opts = [blank, ...opts.filter((o) => safe(o.value).trim() !== "")];
          }

          if (!alive) return;
          setDispositionOptions(opts);
        } catch (e) {
          console.error("Dispostion failed", e);
          if (!alive) return;
          setDispositionOptions([{ label: "< - Select one - >", value: "" }]);
        }
      };

      run();
      return () => {
        alive = false;
      };
    }, []);

    /** ---------------- Load Sub-Dispositions (API) ---------------- */
    useEffect(() => {
      let alive = true;

      const run = async () => {
        const disp = safe(form.dispositionId).trim();

        if (!disp) {
          setSubDispositionOptions([{ label: "< - Select one - >", value: "" }]);
          setForm((p) => ({ ...p, subDispositionId: "" }));
          return;
        }

        try {
          const data = await fetchJson(
            `${API_BASE_URL}/api/Opportunity/SubDispostion/${encodeURIComponent(
              OPP_TYPE
            )}/${encodeURIComponent(disp)}`
          );
          const list = readList(data);

          let opts = (Array.isArray(list) ? list : []).map((x) => ({
            value: safe(x?.code).trim(),
            label: safe(x?.name).trim() || safe(x?.code).trim(),
          }));

          // ensure select one at top
          const hasBlank = opts.some((o) => safe(o.value).trim() === "");
          if (!hasBlank) opts = [{ label: "< - Select one - >", value: "" }, ...opts];
          else {
            const blank = opts.find((o) => safe(o.value).trim() === "");
            opts = [blank, ...opts.filter((o) => safe(o.value).trim() !== "")];
          }

          if (!alive) return;
          setSubDispositionOptions(opts);

          // if current selected subDisposition not in list -> clear it
          setForm((p) => {
            const cur = safe(p.subDispositionId).trim();
            if (!cur) return p;
            const exists = opts.some((o) => safe(o.value).trim() === cur);
            return exists ? p : { ...p, subDispositionId: "" };
          });
        } catch (e) {
          console.error("SubDispostion failed", e);
          if (!alive) return;
          setSubDispositionOptions([{ label: "< - Select one - >", value: "" }]);
          setForm((p) => ({ ...p, subDispositionId: "" }));
        }
      };

      run();
      return () => {
        alive = false;
      };
    }, [form.dispositionId]);

    /** ---------------- Load Centers ---------------- */
    useEffect(() => {
      let alive = true;

      const run = async () => {
        try {
          const data = await fetchJson(`${API_BASE_URL}/api/Master/LoadCenters`);
          const list = readList(data);

          const opts = [
            { label: "< - Select one - >", value: "" },
            ...list.map((x) => ({
              value: safe(x?.code).trim(),
              label: safe(x?.name).trim() || safe(x?.code).trim(),
            })),
          ];

          if (!alive) return;
          setCenterOptions(opts);
        } catch (e) {
          console.error("LoadCenters failed", e);
        }
      };

      run();
      return () => {
        alive = false;
      };
    }, []);

    /** ✅ Apply session center once the option exists */
    useEffect(() => {
      if (form.centerCode) return;
      if (!sessionCenter) return;
      if (!centerOptions?.length) return;

      const exists = centerOptions.some(
        (o) => safe(o.value).trim() === safe(sessionCenter).trim()
      );
      if (!exists) return;

      setForm((p) => ({ ...p, centerCode: safe(sessionCenter).trim() }));
    }, [centerOptions, sessionCenter, form.centerCode]);

    /** ---------------- Load Doctors (depends on center) ---------------- */
    useEffect(() => {
      let alive = true;

      const run = async () => {
        const centerCode = safe(form.centerCode).trim();

        if (!centerCode) {
          setDoctorOptions([{ label: "< - Select one - >", value: "" }]);
          return;
        }

        try {
          const data = await fetchJson(
            `${API_BASE_URL}/api/Master/Doctors/${encodeURIComponent(centerCode)}`
          );
          const list = readList(data);

          let opts = (Array.isArray(list) ? list : [])
            .map((x) => ({
              value: safe(x?.code).trim(),
              label: safe(x?.name).trim() || safe(x?.code).trim(),
            }))
            .filter(
              (o, idx, arr) =>
                idx === arr.findIndex((p) => p.value === o.value && p.label === o.label)
            );

          const hasSelectOne = opts.some((o) => safe(o.value).trim() === "");
          if (!hasSelectOne) {
            opts = [{ label: "< -- Select one -- >", value: "" }, ...opts];
          } else {
            const blank = opts.find((o) => safe(o.value).trim() === "");
            opts = [blank, ...opts.filter((o) => safe(o.value).trim() !== "")];
          }

          const hasNone = opts.some((o) => safe(o.value).trim() === "__NONE__");
if (!hasNone) {
  opts = [...opts, { label: "None", value: "None" }];
}

          if (!alive) return;
          setDoctorOptions(opts);

          setForm((p) => {
            const cur = safe(p.doctor).trim();
            if (!cur) return p;
            const exists = opts.some((o) => safe(o.value).trim() === cur);
            return exists ? p : { ...p, doctor: "", doctorName: "" };
          });
        } catch (e) {
          console.error("OppDoctors failed", e);
          if (!alive) return;
          setDoctorOptions([{ label: "< - Select one - >", value: "" }]);
        }
      };

      run();
      return () => {
        alive = false;
      };
    }, [form.centerCode]);

    /** ---------------- Load Verticals ---------------- */
    useEffect(() => {
      let alive = true;

      const run = async () => {
        try {
          const data = await fetchJson(`${API_BASE_URL}/api/Master/InterestedVertical`);
          const list = readList(data);

          const opts = [
            { label: "< - Select one - >", value: "" },
            ...list.map((x) => ({
              value: safe(x?.code).trim(),
              label: safe(x?.name).trim() || safe(x?.code).trim(),
            })),
          ];

          if (!alive) return;
          setVerticalOptions(opts);
        } catch (e) {
          console.error("OppInterestedVertical failed", e);
          if (!alive) return;
          setVerticalOptions([{ label: "< - Select one - >", value: "" }]);
        }
      };

      run();
      return () => {
        alive = false;
      };
    }, []);

    const onChange = (e) => {
      const { name, value } = e.target;

      setForm((p) => {
        const next = { ...p, [name]: value };

        if (name === "followUpDate") {
    const v = safe(value).trim();
    const min = getTodayInputDate(); // ✅ allow today
    if (!v) {
      // if user clears, go back to tomorrow default
      next.followUpDate = getTomorrowInputDate();
    } else {
      // don’t allow selecting before today
      next.followUpDate = v < min ? min : v;
    }
  }


        if (name === "followUpTime" && !safe(value).trim()) {
          next.followUpTime = DEFAULT_FOLLOWUP_TIME_LABEL;
        }

        // if disposition changes, clear subDisposition immediately (API will repopulate)
        if (name === "dispositionId") {
          next.subDispositionId = "";
        }

        return next;
      });

      setErrors((prev) => {
        if (!prev[name]) return prev;
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    };

    const validate = () => {
      const e = {};
      if (!form.mobile.trim()) e.mobile = "Mobile is required.";
      if (!form.firstName.trim()) e.firstName = "First name is required.";
      if (!form.lastName.trim()) e.lastName = "Last name is required.";

      if (!form.centerCode) e.centerCode = "Centre is required.";
      if (!form.doctor) e.doctor = "Doctor/Therapist is required.";
      if (!form.interestedVerticalCode) e.interestedVerticalCode = "Interested in is required.";
      if (!isValidEmail(form.email)) e.email = "Please enter a valid email.";

      if (!safe(form.dispositionId).trim()) e.dispositionId = "Disposition is required.";
      if (!safe(form.subDispositionId).trim()) e.subDispositionId = "Sub-Disposition is required.";

      if (!safe(form.source).trim()) e.source = "Source is required.";

      setErrors(e);
      return Object.keys(e).length === 0;
    };

    const handleCreateCustomer = async () => {
      const cf = customerForm;
      const miss = [];
      if (!safe(cf.firstName).trim())   miss.push("First name");
      if (!safe(cf.lastName).trim())    miss.push("Last name");
      if (!safe(cf.countryCode).trim()) miss.push("Country code");
      if (!safe(cf.mobileNo).trim())    miss.push("Mobile");
      if (!isValidEmail(cf.email))      miss.push("Email");
      if (!String(cf.nationalityId || "").trim()) miss.push("Nationality");
      if (!safe(cf.dateOfBirth).trim()) miss.push("Date of birth");
      if (!safe(cf.gender).trim())      miss.push("Gender");
      if (miss.length) { alert("Please fill: " + miss.join(", ")); return; }

      setCreatingCustomer(true);
      try {
        const resC = await postJson(`${API_BASE_URL}/api/Opportunity/CreateCustomer`, {
          firstName:     safe(cf.firstName).trim(),
          lastName:      safe(cf.lastName).trim(),
          countryCode:   safe(cf.countryCode).trim(),
          mobileNo:      safe(cf.mobileNo).trim(),
          email:         safe(cf.email).trim(),
          nationalityId: cf.nationalityId,
          dateOfBirth:   cf.dateOfBirth,
          gender:        cf.gender,
          oppCode:       safe(resolvedOppCode).trim(),
          recID,
        });
        setCreatingCustomer(false);
        setShowCustomerPopup(false);
        showToast(`Customer created${resC && resC.custId ? " - " + resC.custId : ""}`);
        // LTR Case A (FRD §6.2): if booking is mandatory, route to the Appointment
        // Booking screen with the new customer pre-filled; else go back (Case B → Pending).
        const newCustId = resC?.custId || resC?.customerId || "";
        if (convertCtx?.apptMandatory && newCustId) {
          navigate(APPOINTMENT_ROUTE, { state: {
            ltrConversion: {
              leadSource: convertCtx.leadSource,
              leadRecId:  convertCtx.leadRecId,
              oppCode:    convertCtx.oppCode,
              custId:     newCustId,
            },
            newCustomer: {
              custId: newCustId, custid: newCustId,
              firstName: safe(cf.firstName).trim(),
              lastName:  safe(cf.lastName).trim(),
              mobile:    safe(cf.mobileNo).trim(),
              name:      `${safe(cf.firstName).trim()} ${safe(cf.lastName).trim()}`.trim(),
            },
          }});
          return;
        }
        navigate(-1);
      } catch (err) {
        setCreatingCustomer(false);
        alert(`Create customer failed: ${err?.message || err}`);
      }
    };

    const handleSubmit = async () => {
      if (!validate()) {
        alert("Submit blocked by validation. Check required fields.");
        return;
      }

      setSaving(true);
      try {
        const { hhmmss, ampm } = toApiFollowUpTimeParts(form.followUpTime);
        const nm = normalizeMobileForApi(form.countryCode, form.mobile);

      const payload = {
    recID,
    disposition: safe(form.dispositionId).trim(),
    remarks: safe(form.remarks),
    oppCode: safe(resolvedOppCode).trim(),
    oppStatus: safe(form.dispositionId).trim() === "LS004" ? "1" : "2",

    followUpDate: toApiFollowUpDateISO(form.followUpDate),
    followUpTime: hhmmss,
    followUpTimeAmPM: ampm,

    firstName: safe(form.firstName),
    lastName: safe(form.lastName),

    countryCode: nm.countryCode,
    mobileNo: nm.mobileNo,

    email: safe(form.email),
    preferedLang: safe(form.preferredLanguage),
    subDisposition: safe(form.subDispositionId).trim(),

    therapistCode: safe(form.doctor).trim(),
    interesedIn: safe(form.interestedVerticalCode).trim(),
    others: safe(form.interestedOther),

    // ✅ ONLY these, as per your API contract
    source: safe(form.source).trim(),
    subSource: safe(form.subSource).trim(),

    // optional if you add later
    // reasonCode: safe(form.reasonCode).trim(),
  };


        console.log("UpdateOppDetails payload", payload, "typeof oppStatus:", typeof payload.oppStatus);

        const saveRes = await postJson(`${API_BASE_URL}/api/Opportunity/UpdateOppDetails`, payload);

        // Converting disposition → collect remaining customer details, then create the customer.
        if (saveRes && saveRes.convert) {
          const pf = saveRes.prefill || {};
          // LTR: remember whether this campaign mandates appointment booking (Case A)
          setConvertCtx({
            apptMandatory: saveRes.apptMandatory !== false,
            leadSource:    saveRes.leadSource || "EXTERNAL",
            leadRecId:     String(saveRes.leadRecId || recID),
            oppCode:       safe(resolvedOppCode).trim(),
          });
          setCustomerForm((prev) => ({
            ...prev,
            firstName:   pf.firstName   || safe(form.firstName),
            lastName:    pf.lastName    || safe(form.lastName),
            mobileNo:    pf.mobileNo    || nm.mobileNo,
            countryCode: pf.countryCode || nm.countryCode,
            email:       pf.email       || safe(form.email),
          }));
          setShowCustomerPopup(true);
          setSaving(false);
          return;
        }

        showToast("Saved successfully");
        navigate(-1);
      } catch (e) {
        console.error("UpdateOppDetails failed", e);
        alert(`Save failed: ${e?.message || e}`);
      } finally {
        setSaving(false);
      }
    };

    const loggedInMobile = "8454801741";         // replace with your real logged-in user mobile
  const clientMobile = "9819061936";  

    return (
      <>
        {toast.show && <div className="toast">{toast.msg}</div>}

        <div className="pageWrap">
          <div className="pageHeader">
            <div className="titleBlock">
              <div className="pageTitle">External Lead Details</div>
              <div className="subTitle">
                OppCode: <strong>{safe(resolvedOppCode) || "—"}</strong> &nbsp;|&nbsp; LeadOppId:{" "}
                <strong>{safe(resolvedLeadOppId) || "—"}</strong> &nbsp;|&nbsp; recID:{" "}
                <strong>{recID || "—"}</strong>
              </div>
            </div>
          </div>

          <fieldset className="fs">
            <legend>Lead Details</legend>
          <div>
              {/* <CallButton
        firstNumber={loggedInMobile}
        secondNumber={clientMobile}
        label="Call Client"
        onSuccess={(data) => console.log("Call OK:", data)}
        onError={(e) => console.error("Call failed:", e)}
      /> */}
          </div>
            

            <div className="formGrid3">
              <div className="col">
                <div className="field">
                  <label>
                    First Name <span className="req">*</span>
                  </label>
                  <input
                    className={`inp ${errors.firstName ? "err" : ""}`}
                    name="firstName" autoComplete="one-time-code"
                    value={form.firstName}
                    onChange={onChange}
                    placeholder="First Name"
                  />
                  {errors.firstName && <div className="errText">{errors.firstName}</div>}
                </div>

                <div className="field">
                  <label>
                    Last Name <span className="req">*</span>
                  </label>
                  <input
                    className={`inp ${errors.lastName ? "err" : ""}`}
                    name="lastName" autoComplete="one-time-code"
                    value={form.lastName}
                    onChange={onChange}
                    placeholder="Last Name"
                  />
                  {errors.lastName && <div className="errText">{errors.lastName}</div>}
                </div>

                <div className="field">
                  <label>Country Code</label>
                  <input
                    className="inp"
                    name="countryCode" autoComplete="one-time-code"
                    value={form.countryCode}
                    onChange={onChange}
                    placeholder="Country Code"
                  />
                </div>

                <div className="field">
                  <label>
                    Mobile <span className="req">*</span>
                  </label>
                  <input
                    className={`inp ${errors.mobile ? "err" : ""}`}
                    name="mobile" autoComplete="one-time-code"
                    value={form.mobile}
                    onChange={onChange}
                    placeholder="Mobile"
                  />
                  {errors.mobile && <div className="errText">{errors.mobile}</div>}
                </div>

                <div className="field">
                  <label>Email</label>
                  <input
                    className={`inp ${errors.email ? "err" : ""}`}
                    name="email" autoComplete="one-time-code"
                    value={form.email}
                    onChange={onChange}
                    placeholder="Email"
                  />
                  {errors.email && <div className="errText">{errors.email}</div>}
                </div>
              </div>

              <div className="col">
                <div className="field">
                  <label>Preferred Language</label>
                  <select
                    className="inp"
                    name="preferredLanguage"
                    value={form.preferredLanguage}
                    onChange={onChange}
                  >
                    {langOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>
                    Centre <span className="req">*</span>
                  </label>
                  <select
                    className={`inp ${errors.centerCode ? "err" : ""}`}
                    name="centerCode"
                    value={form.centerCode}
                    onChange={onChange}
                  >
                    {centerOptions.map((o) => (
                      <option key={o.value || o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {errors.centerCode && <div className="errText">{errors.centerCode}</div>}
                </div>

                <div className="field">
                  <label>
                    Interested In <span className="req">*</span>
                  </label>
                  <select
                    className={`inp ${errors.interestedVerticalCode ? "err" : ""}`}
                    name="interestedVerticalCode"
                    value={form.interestedVerticalCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const opt = verticalOptions.find((x) => x.value === code);
                      setForm((p) => ({
                        ...p,
                        interestedVerticalCode: code,
                        interestedVerticalName: opt?.label || "",
                      }));
                      setErrors((prev) => {
                        if (!prev.interestedVerticalCode) return prev;
                        const { interestedVerticalCode: _, ...rest } = prev;
                        return rest;
                      });
                    }}
                  >
                    {verticalOptions.map((o) => (
                      <option key={o.value || o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {errors.interestedVerticalCode && (
                    <div className="errText">{errors.interestedVerticalCode}</div>
                  )}
                </div>

                <div className="field">
                  <label>
                    Doctor / Therapist <span className="req">*</span>
                  </label>
                  <select
                    className={`inp ${errors.doctor ? "err" : ""}`}
                    name="doctor"
                    value={form.doctor}
                    onChange={(e) => {
                      const code = e.target.value;
                      const opt = doctorOptions.find((x) => x.value === code);
                      setForm((p) => ({
                        ...p,
                        doctor: code,
                        doctorName: opt?.label || "",
                      }));
                      setErrors((prev) => {
                        if (!prev.doctor) return prev;
                        const { doctor: _, ...rest } = prev;
                        return rest;
                      });
                    }}
                  >
                    {doctorOptions.map((d) => (
                      <option key={d.value || d.label} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {errors.doctor && <div className="errText">{errors.doctor}</div>}
                </div>

                <div className="field">
    <label>Medium</label>
    <input
      className="inp"
      name="medium"
      value={form.medium}
      onChange={onChange}
      disabled
      placeholder="Medium"
    />
  </div>

  <div className="field">
    <label>Sub Medium</label>
    <input
      className="inp"
      name="subMedium"
      value={form.subMedium}
      onChange={onChange}
      disabled
      placeholder="Sub Medium"
    />
  </div>

  <div className="field">
  <label>
    Source <span className="req">*</span>
  </label>

  <select
    className={`inp ${errors.source ? "err" : ""}`}
    name="source"
    value={form.source}
    onChange={(e) => {
      const code = e.target.value;
      setForm((p) => ({
        ...p,
        source: code,
        subSource: "", // reset
      }));

      setErrors((prev) => {
        if (!prev.source) return prev;
        const { source: _, ...rest } = prev;
        return rest;
      });
    }}
  >
    {sourceOptions.map((o) => (
      <option key={o.value || o.label} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>

  {errors.source && <div className="errText">{errors.source}</div>}
</div>


  <div className="field">
    <label>Subsource</label>
    <SearchableSingleSelect
    options={subSourceOptions}
    value={form.subSource}
    disabled={!safe(form.source).trim()}
    placeholder={!safe(form.source).trim() ? "Select Source first" : "Type to search subsource..."}
    onChange={(val) => setForm((p) => ({ ...p, subSource: val }))}
  />


  </div>



                <div className="field">
                  <label>Other</label>
                  <input
                    className="inp"
                    name="interestedOther"
                    value={form.interestedOther}
                    onChange={onChange}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="fs">
            <legend>Lead Disposition</legend>

            <div className="formGrid2">
              <div className="col">
                <div className="field">
                  <label>
                    Disposition <span className="req">*</span>
                  </label>
                  <select
                    className={`inp ${errors.dispositionId ? "err" : ""}`}
                    name="dispositionId"
                    value={form.dispositionId}
                    onChange={onChange}
                  >
                    {dispositionOptions.map((d) => (
                      <option key={d.value || d.label} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {errors.dispositionId && <div className="errText">{errors.dispositionId}</div>}
                </div>

                <div className="field">
                  <label>
                    Sub-Disposition <span className="req">*</span>
                  </label>
                  <select
                    className={`inp ${errors.subDispositionId ? "err" : ""}`}
                    name="subDispositionId"
                    value={form.subDispositionId}
                    onChange={onChange}
                    disabled={!form.dispositionId}
                  >
                    {subDispositionOptions.map((s) => (
                      <option key={s.value || s.label} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {errors.subDispositionId && (
                    <div className="errText">{errors.subDispositionId}</div>
                  )}
                </div>
              </div>

              <div className="col">
                <div className="field">
                  <label>Follow Up Date</label>
                  <input
                    type="date"
                    className="inp"
                    name="followUpDate"
                    value={form.followUpDate}
                    onChange={onChange}
                    min={minFollowUpDate}
                  />
                </div>

                <div className="field">
                  <label>Follow Up Time</label>
                  <select
                    className="inp"
                    name="followUpTime"
                    value={form.followUpTime}
                    onChange={onChange}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value || t.label} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="field mtWide">
              <label>Remarks</label>
              <textarea
                className="txta"
                rows={5}
                name="remarks"
                value={form.remarks}
                onChange={onChange}
              />
            </div>
          </fieldset>

          <div className="btnRow">
            {!isSubmitHidden && (
              <button className="btn" onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : "Submit"}
              </button>
            )}

            <button className="btn" onClick={() => navigate(-1)} disabled={saving}>
              Back
            </button>
          </div>
        </div>

        <style jsx="true">{`
          .toast {
            position: fixed;
            right: 18px;
            top: 40%;
            background: #c66752;
            color: #fff;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
            z-index: 9999;
            text-align: center;
            display: flex;
            justify-content: center;
          }

          .pageWrap {
            padding: 18px 18px 28px;
            background: #fff;
          }
          .pageHeader {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 14px;
          }
          .pageTitle {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 10px;
            color: #1d2a3b;
          }
          .subTitle {
            margin-bottom: 15px;
            font-size: 12px;
            color: #7b8798;
            font-weight: 700;
          }

          .ssWrap {
  position: relative;
  width: 100%;
}
.ssWrap.isDisabled {
  opacity: 0.7;
}
.ssMenu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  background: #fff;
  border: 1px solid #d7dee8;
  border-radius: 10px;
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.12);
  max-height: 280px;
  overflow: auto;
  z-index: 9999;
}
.ssItem {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ssItem:last-child {
  border-bottom: 0;
}
.ssItem:hover {
  background: #f8fafc;
}
.ssItem.active {
  background: #eef2ff;
}
.ssItem.muted {
  cursor: default;
  color: #6b7280;
}
.ssLabel {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}
.ssCode {
  font-size: 12px;
  font-weight: 800;
  color: #64748b;
  flex: 0 0 auto;
  display:none;
}


          .fs {
            border: 1px solid #e6ebf2;
            border-radius: 10px;
            padding: 14px 14px 16px;
            margin-bottom: 14px;
            background: #fff;
          }
          .fs legend {
            padding: 0 8px;
            font-weight: 800;
            font-size: 16px;
            color: #1f2937;
          }

          .formGrid3 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 18px;
            margin-top: 8px;
          }
          .formGrid2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 18px;
            margin-top: 8px;
          }

          .col {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .col .field {
            min-width: 35%;
          }

          .field label {
            display: inline-block;
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 6px;
          }
          .req {
            color: #c62828;
            font-weight: 900;
          }

          .inp {
            width: 100%;
            height: 40px;
            border-radius: 8px;
            border: 1px solid #d7dee8;
            padding: 0 12px;
            background: #fff;
            outline: none;
          }
          .inp:focus {
            border-color: #94a3b8;
          }
          .txta {
            width: 100%;
            border-radius: 8px;
            border: 1px solid #d7dee8;
            padding: 10px 12px;
            background: #fff;
            outline: none;
            resize: vertical;
          }

          .errText {
            margin-top: 6px;
            font-size: 12px;
            color: #d32f2f;
            font-weight: 600;
          }
          .mtWide {
            margin-top: 12px;
          }

          .btnRow {
            display: flex;
            gap: 16px;
            margin-top: 16px;
          }
          .btn {
            background: #0b1b37;
            color: #fff;
            border: 0;
            border-radius: 10px;
            padding: 11px 26px;
            font-weight: 700;
            cursor: pointer;
          }
          .btn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
          }
          .btn:hover:not(:disabled) {
            opacity: 0.95;
          }

          @media (max-width: 1100px) {
            .formGrid3 {
              grid-template-columns: 1fr;
            }
            .formGrid2 {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

      {showCustomerPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "min(560px, 92vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 4px", color: "#0b1b37" }}>Create Customer</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#555" }}>
              This lead is being converted. Confirm the details below to add them as a customer.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ fontSize: 13 }}>First name*
                <input value={customerForm.firstName} onChange={(e) => setCustomerForm((p) => ({ ...p, firstName: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Last name*
                <input value={customerForm.lastName} onChange={(e) => setCustomerForm((p) => ({ ...p, lastName: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Country code*
                <input value={customerForm.countryCode} onChange={(e) => setCustomerForm((p) => ({ ...p, countryCode: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Mobile*
                <input value={customerForm.mobileNo} onChange={(e) => setCustomerForm((p) => ({ ...p, mobileNo: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13, gridColumn: "1 / -1" }}>Email*
                <input value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Nationality*
                <select value={customerForm.nationalityId} onChange={(e) => setCustomerForm((p) => ({ ...p, nationalityId: e.target.value }))} style={cInput}>
                  <option value="">Select...</option>
                  {nationalityOptions.map((n) => (<option key={n.id} value={n.id}>{n.name}</option>))}
                </select>
              </label>
              <label style={{ fontSize: 13 }}>Date of birth*
                <input type="date" value={customerForm.dateOfBirth} onChange={(e) => setCustomerForm((p) => ({ ...p, dateOfBirth: e.target.value }))} style={cInput} />
              </label>
              <label style={{ fontSize: 13 }}>Gender*
                <select value={customerForm.gender} onChange={(e) => setCustomerForm((p) => ({ ...p, gender: e.target.value }))} style={cInput}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCustomerPopup(false)} disabled={creatingCustomer} style={{ ...cBtn, background: "#e0e0e0", color: "#333" }}>Cancel</button>
              <button onClick={handleCreateCustomer} disabled={creatingCustomer} style={cBtn}>{creatingCustomer ? "Creating..." : "Create Customer"}</button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  };

  export default ExternalLeadForm;