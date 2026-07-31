// src/pages/Opportunity/NoShowEntryDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { OPP_THEME_CSS } from "./opportunityTheme";

/** Bearer auth — app authenticates via Authorization header, not a cookie. */
const AUTH_HEADERS = () => {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
};


// Disposition + sub-disposition options are loaded live from the API
// (CLINIC_LEADSTATUS / CLINIC_LEADSUBSTATUS) — no hardcoded lists.

// (kept consistent with your existing app)
const OPP_STATUS = { OPEN: "1", CLOSED: "2" };

const oppStatusFromDisposition = (code) => {
  const c = String(code || "").trim();
  if (c === "LS008" || c === "LS011") return OPP_STATUS.CLOSED; // "2"
  return OPP_STATUS.OPEN; // "1"
};

const getRecId = (row) => {
  const id =
    row?.RECID ?? row?.recID ?? row?.RecID ?? row?.recid ?? row?.id ?? 0;
  return Number(id) || 0;
};

const HALF_HOURS_1_TO_12_30 = [
  "01:00","01:30","02:00","02:30","03:00","03:30",
  "04:00","04:30","05:00","05:30","06:00","06:30",
  "07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30",
];

const DEFAULT_AMPM = "PM";

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const tomorrowISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
/** Follow-up belongs to WIP only — any other disposition hides the pair.
 *  Matched on the master label, with the LS013 code as a fallback. */
const isWipLabel = (label) => {
  const t = String(label || "").trim().toLowerCase();
  return t === "wip" || t === "work in progress";
};
const isWipDisp = (code, label) =>
  isWipLabel(label) || String(code || "").trim().toUpperCase() === "LS013";

const normalizeDispCode = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";

  // already LS### code
  if (/^LS\d{3}$/i.test(s)) return s.toUpperCase();

  // if backend sends label text
  const t = s.toLowerCase();
  if (t === "converted") return "LS008";
  if (t === "not converted") return "LS011";
  if (t === "wip") return "LS013"; // ✅ ADD THIS

  return s;
};

const normalizeSubDispForDisposition = (_dispCode, subValueOrLabel) => {
  const raw = String(subValueOrLabel ?? "").trim();
  if (!raw) return "";
  // Keep an LS code as-is; otherwise return the saved value unchanged. Sub-
  // dispositions are curated in the master data and loaded from the API, so a
  // saved value is never dropped against a stale hardcoded list.
  const maybeCode = normalizeLSCode(raw);
  return /^LS\d{2,6}$/.test(maybeCode) ? maybeCode : raw;
};

// ---------- helpers to sanitize API follow-up dates ----------
const isPlaceholderDate = (yyyyMmDd) => {
  const s = String(yyyyMmDd || "").trim();
  if (!s) return true;
  return (
    s.startsWith("1900-01-01") ||
    s.startsWith("0001-01-01") ||
    s === "1900-01-01" ||
    s === "0001-01-01"
  );
};

const normalizeLSCode = (v) => {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return "";
  // accept LS + 2..6 digits (covers LS022, LS0021, etc.)
  if (/^LS\d{2,6}$/.test(s)) return s;
  return s;
};

const isPastYMD = (yyyyMmDd) => {
  if (!yyyyMmDd) return false;
  return yyyyMmDd < todayISO(); // YYYY-MM-DD compares safely as string
};

const parseApiFollowUpDateToYMD = (apiValue) => {
  const raw = String(apiValue || "").trim();
  if (!raw) return "";

  let m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const ymd = `${m[3]}-${m[2]}-${m[1]}`;
    return isPlaceholderDate(ymd) ? "" : ymd;
  }

  m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) {
    const ymd = `${m[3]}-${m[2]}-${m[1]}`;
    return isPlaceholderDate(ymd) ? "" : ymd;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const ymd = raw.slice(0, 10);
    return isPlaceholderDate(ymd) ? "" : ymd;
  }

  const d = new Date(raw);
  if (!isNaN(d)) {
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const ymd = `${y}-${mm}-${dd}`;
    return isPlaceholderDate(ymd) ? "" : ymd;
  }

  return "";
};

const toISODateTimeZ = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return new Date().toISOString();
  const d = new Date(`${yyyy_mm_dd}T00:00:00Z`);
  return d.toISOString();
};

const normalizeAmPm = (v) => {
  const s = String(v || "").trim().toUpperCase();
  return s === "PM" ? "PM" : "AM";
};

/* ─── Master-list cache ───────────────────────────────────────────────────────
   Disposition / sub-disposition / reason lists are master data — identical for
   every lead. Without a cache, opening each lead re-fetched all three, so three
   round trips were paid per lead on top of the detail load. Cached in memory for
   the tab and in sessionStorage so a remount (back → open next lead) is free.
   A browser refresh clears it, which is the intended escape hatch after master
   maintenance.                                                                */
const MASTER_CACHE = {};

const cachedJson = async (key, url, init) => {
  if (MASTER_CACHE[key] !== undefined) return MASTER_CACHE[key];
  try {
    const hit = sessionStorage.getItem(`nse:${key}`);
    if (hit) { MASTER_CACHE[key] = JSON.parse(hit); return MASTER_CACHE[key]; }
  } catch { /* private mode / quota — fall through to the network */ }

  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${key} HTTP ${res.status}`);
  const data = await res.json();

  MASTER_CACHE[key] = data;
  try { sessionStorage.setItem(`nse:${key}`, JSON.stringify(data)); } catch { /* ignore */ }
  return data;
};

const NoShowEntryDetails = () => {
  const { oppCode, custId } = useParams();
  const { state } = useLocation(); // { recId, oppCode, row, header, isManual }
  const navigate = useNavigate();
  // LTR: mount path of the Appointment module (matches the sidebar route).
  const APPOINTMENT_ROUTE = "/appointment";

  const [row] = useState(state?.row || null);
  const [header] = useState(state?.header || null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [details, setDetails] = useState(null);

  // ✅ Follow-up is optional — date, time and AM/PM all start blank and are only
  //    filled from a genuine stored value or by the user.
  const [followUpDate, setFollowUpDate] = useState(""); // yyyy-MM-dd
  const [followUpTime, setFollowUpTime] = useState(""); // "01:30"
  const [followUpAmPm, setFollowUpAmPm] = useState(""); // "AM" | "PM"

  const [initialDisp, setInitialDisp] = useState(""); // ✅ API disposition on load (normalized)

  // ✅ Reasons dropdown options
  const [reasonOptions, setReasonOptions] = useState([{ code: "", name: "" }]);
  const [reasonsLoading, setReasonsLoading] = useState(false);

  const OPP_TYPE = "Transaction"; // as per your requirement

const [dispOptions, setDispOptions] = useState([{ value: "", label: "" }]);
const [dispLoading, setDispLoading] = useState(false);

const [subDispOptions, setSubDispOptions] = useState([{ value: "", label: "" }]);
const [subDispLoading, setSubDispLoading] = useState(false);


  // ✅ include reasonCode in form
  // Disposition is seeded from the grid row we were navigated with. The detail
  // response resolves to the same value (it prefers state.row.disposition over
  // the API's), so seeding changes nothing about the end state — it just lets the
  // sub-disposition list load alongside the detail call rather than one round
  // trip after it.
  const [form, setForm] = useState({
    disposition: normalizeDispCode(state?.row?.disposition) || "",
    sbdisposition: "",
    reasonCode: "", // ✅ NEW
    remarks: "",
  });

  const [saving, setSaving] = useState(false);

// Follow-up date/time are shown only while the lead is still WIP; for WIP they are
// mandatory. Any other disposition hides them (and clears them on change).
const isWipSelected = useMemo(() => {
  const sel = String(form?.disposition || "").trim();
  if (!sel) return false;
  const opt = dispOptions.find((o) => String(o.value).trim() === sel);
  return isWipDisp(sel, opt?.label);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [dispOptions, form?.disposition]);


useEffect(() => {
  const loadDispositions = async () => {
    setDispLoading(true);
    try {
      const data = await cachedJson(
        `disp:${OPP_TYPE}`,
        `${API_BASE_URL}/api/Opportunity/Dispostion/${encodeURIComponent(OPP_TYPE)}`,
        { method: "GET", headers: { Accept: "application/json, */*", ...AUTH_HEADERS() }, credentials: "include" }
      );
      const arr = Array.isArray(data) ? data : (data?.data || data?.result || []);

      const mapped = (Array.isArray(arr) ? arr : [])
        .map((x) => ({
          value: normalizeLSCode(x?.code),
          label: String(x?.name ?? "").trim(),
        }))
        .filter((x) => x.value || x.label)
        .filter((x) => ["wip","converted","not converted"].includes(String(x.label||"").trim().toLowerCase()));

      setDispOptions([{ value: "", label: "" }, ...mapped]);
    } catch (e) {
      console.error("Dispostion load failed:", e);
      setDispOptions([{ value: "", label: "" }]);
    } finally {
      setDispLoading(false);
    }
  };

  loadDispositions();
}, []);

useEffect(() => {
  const dispCode = normalizeLSCode(form.disposition);

  // reset list when no disposition selected
  if (!dispCode) {
    setSubDispOptions([{ value: "", label: "" }]);
    setForm((p) => ({ ...p, sbdisposition: "" }));
    return;
  }

  const loadSubDispositions = async () => {
    setSubDispLoading(true);
    try {
      const data = await cachedJson(
        `subdisp:${OPP_TYPE}:${dispCode}`,
        `${API_BASE_URL}/api/Opportunity/SubDispostion/${encodeURIComponent(OPP_TYPE)}/${encodeURIComponent(dispCode)}`,
        { method: "GET", headers: { Accept: "application/json, */*", ...AUTH_HEADERS() }, credentials: "include" }
      );
      const arr = Array.isArray(data) ? data : (data?.data || data?.result || []);

      const mapped = (Array.isArray(arr) ? arr : [])
        .map((x) => ({
          value: normalizeLSCode(x?.code),
          label: String(x?.name ?? "").trim(),
        }))
        .filter((x) => x.value || x.label);

      setSubDispOptions([{ value: "", label: "" }, ...mapped]);

      // ✅ ensure current selected subdisp is valid
      setForm((p) => {
        const allowed = new Set(mapped.map((m) => m.value));
        if (p.sbdisposition && !allowed.has(normalizeLSCode(p.sbdisposition))) {
          return { ...p, sbdisposition: "" };
        }
        return p;
      });
    } catch (e) {
      console.error("SubDispostion load failed:", e);
      setSubDispOptions([{ value: "", label: "" }]);
      setForm((p) => ({ ...p, sbdisposition: "" }));
    } finally {
      setSubDispLoading(false);
    }
  };

  loadSubDispositions();
}, [form.disposition]);



  // ✅ Load reasons list
  useEffect(() => {
    const loadReasons = async () => {
      setReasonsLoading(true);
      try {
        const data = await cachedJson("reasons", `${API_BASE_URL}/api/Opportunity/LoadOpprotunityReason`, {
          method: "GET",
          headers: { Accept: "application/json, */*", ...AUTH_HEADERS() },
          credentials: "include",
        });

        const arr = Array.isArray(data) ? data : (data?.data || data?.result || []);
        const mapped = (Array.isArray(arr) ? arr : [])
          .map((x) => ({
            code: String(x?.code ?? "").trim(),
            name: String(x?.name ?? "").trim(),
            value: x?.value ?? null,
          }))
          .filter((x) => x.code || x.name);

        setReasonOptions([{ code: "", name: "" }, ...mapped]);
      } catch (e) {
        console.error("LoadOpprotunityReason failed:", e);
        // keep dropdown usable even if API fails
        setReasonOptions([{ code: "", name: "" }]);
      } finally {
        setReasonsLoading(false);
      }
    };

    loadReasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const doFetch = async () => {
      setLoading(true);
      setError("");

      try {
        const recId = state?.recId || getRecId(state?.row) || 0;
        if (!oppCode || !recId) throw new Error("Missing OppCode or RecId.");

        const res = await fetch(
          `${API_BASE_URL}/api/Opportunity/OpportunityMoreDetails/${encodeURIComponent(oppCode)}/${recId}`,
          { method: "POST", headers: { Accept: "*/*", ...AUTH_HEADERS() }, credentials: "include", body: "" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setDetails(data || null);

        // follow-up date
        const apiDateYMD = parseApiFollowUpDateToYMD(data?.followUpDate);
        // No stored date (or a stale past one) leaves the field blank rather than
        // pre-filling tomorrow.
        setFollowUpDate(!apiDateYMD || isPastYMD(apiDateYMD) ? "" : apiDateYMD);

        // time + AM/PM
        const apiTime = String(data?.followUpTime || "").trim();
        const apiAmPm = normalizeAmPm(data?.followUpTimeAmPM);
        setFollowUpTime(apiTime);
        setFollowUpAmPm(apiTime ? apiAmPm : "");
const apiDisp = normalizeDispCode(data?.distpositionCode || data?.distpositionName);
setInitialDisp(apiDisp);

const resolvedDisp =
  normalizeDispCode(state?.row?.disposition) ||
  apiDisp ||
  "";
const apiSubDispRaw = data?.subDistpositionCode || data?.subDistpositionName;
const apiSubDisp = normalizeSubDispForDisposition(apiDisp, apiSubDispRaw);

const apiReasonCode = String(
  data?.reasonCode ?? data?.reason ?? data?.oppReasonCode ?? ""
).trim();

const apiRemarks = String(data?.remarts || "").trim();

// ✅ choose UI disposition

// ✅ set form
setForm((p) => ({
  ...p,
  disposition: resolvedDisp,
  sbdisposition: p.sbdisposition || apiSubDisp  || "",
  remarks: String(state?.row?.remarks ?? "").trim() || apiRemarks || "",
  reasonCode: p.reasonCode || apiReasonCode || "",
}));

      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to load details.");
      } finally {
        setLoading(false);
      }
    };

    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppCode, custId, state?.recId]);

  const safe = (v) => (v === null || v === undefined ? "" : v);

  const top = useMemo(() => ({
    custID: safe(details?.custID || row?.custID),
    custName: safe(details?.custName || row?.custName),
    custMobileNo: safe(details?.mobileNo || row?.custMobileNo),
    category: safe(details?.category || row?.category),
    appointmentDate: safe(details?.appointmentDate || row?.appointmentdatetime),
    therapist: safe(details?.therapist || row?.therapistname),
    oppName: safe(header?.oppName || row?.oppName),
    serviceName: safe(details?.serviceName || ""),
    dispCode: safe(details?.distpositionCode || ""),
    dispName: safe(details?.distpositionName || ""),
    remarks: safe(details?.remarts || ""),
  }), [details, row, header]);

  useEffect(() => {
    if (top.remarks && !form.remarks) {
      setForm((p) => ({ ...p, remarks: top.remarks }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.remarks]);

  const handleChange = (e) => {
  const { name, value } = e.target;

  // Moving off WIP hides the follow-up trio — drop whatever it held so a stale
  // date/time is never submitted.
  if (name === "disposition") {
    const opt = dispOptions.find((o) => String(o.value).trim() === String(value).trim());
    if (!isWipDisp(value, opt?.label)) {
      setFollowUpDate("");
      setFollowUpTime("");
      setFollowUpAmPm("");
    }
  }

  setForm((p) => {
    // ✅ when disposition changes, reset only subdisp
    if (name === "disposition") {
      return { ...p, disposition: value, sbdisposition: "" };
    }
    return { ...p, [name]: value };
  });
};

  const buildUpdatePayload = () => {
    const recID = state?.recId || getRecId(state?.row);
    const oppStatus = oppStatusFromDisposition(form.disposition);

    return {
  recID,
  disposition: form.disposition,
  remarks: form.remarks,
  oppCode,
  oppStatus,
  // Blank follow-up is sent through as blank — no silent default.
  followUpDate: followUpDate ? toISODateTimeZ(followUpDate) : "",
  followUpTime: followUpTime || "",
  followUpTimeAmPM: followUpTime ? (followUpAmPm || DEFAULT_AMPM) : "",

  subDisposition: form.sbdisposition || "",
  reasonCode: form.reasonCode || "",
};
  };

  const callUpdate = async () => {
    const res = await fetch(`${API_BASE_URL}/api/Opportunity/UpdateOppDetails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...AUTH_HEADERS() },
      credentials: "include",
      body: JSON.stringify(buildUpdatePayload()),
    });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    if (data && data.success === false) throw new Error(data.message || "UpdateOppDetails returned success:false");
    return data || {};
  };

  // Blank is valid (follow-up is optional); only a past date blocks submit.
  const ensureValidFollowUpDate = () => {
    if (!followUpDate) return true;
    if (isPastYMD(followUpDate)) {
      setError("Follow Up Date cannot be before today.");
      setFollowUpDate("");
      return false;
    }
    return true;
  };

  // Only meaningful once a time has been picked — keeps AM/PM from going out empty.
  const ensureDefaultTime = () => {
    if (followUpTime && !followUpAmPm) setFollowUpAmPm(DEFAULT_AMPM);
  };

  const handleSubmit = async () => {
    if (!form.disposition) {
      setError("Please select a Disposition before submitting.");
      return;
    }
    // Follow-up is mandatory only when the disposition is WIP.
    if (isWipSelected) {
      if (!followUpDate) {
        setError("Follow Up Date is required.");
        return;
      }
      if (!followUpTime) {
        setError("Follow Up Time is required.");
        return;
      }
    }
    if (!ensureValidFollowUpDate()) return;

    ensureDefaultTime();

    setSaving(true);
    setError("");
    try {
      const saveRes = await callUpdate();
      // LTR Case A (FRD §6.2): R1–R4 leads already have a customer — on a converting
      // save with booking mandatory, route straight to the Appointment Booking screen.
      const ltrCid = safe(top.custID).trim();
      const pf = saveRes?.prefillCustomer || {};
      if (saveRes && saveRes.convert && saveRes.apptMandatory !== false && ltrCid) {
        navigate(APPOINTMENT_ROUTE, { state: {
          ltrConversion: {
            leadSource: saveRes.leadSource || "TRANS",
            leadRecId:  String(saveRes.leadRecId || state?.recId || getRecId(state?.row)),
            oppCode:    oppCode,
            custId:     ltrCid,
          },
          // The lead row only carries one CustName string and no email/gender —
          // UpdateOppDetails resolves the real customer and returns it as
          // prefillCustomer, so booking gets the full identity, not just mobile.
          newCustomer: {
            custId: ltrCid, custid: ltrCid,
            firstName:   String(pf.firstName || "").trim(),
            lastName:    String(pf.lastName  || "").trim(),
            name:        String(pf.name || top.custName || "").trim(),
            mobile:      String(pf.mobile || top.custMobileNo || "").trim(),
            email:       String(pf.email || "").trim(),
            gender:      String(pf.gender || "").trim(),
            countryCode: String(pf.countryCode || "").trim(),
          },
        }});
        return;
      }
      navigate(-1);
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // The appointment details below come from the grid row we were navigated with,
  // so the page paints straight away instead of sitting on a full-page spinner
  // for the whole detail round trip.
  if (error && !details) return <div className="load" style={{ color: "#c33" }}>{error}</div>;

  // ✅ IMPORTANT: lock based ONLY on API disposition (on load)
  const wasClosedOnLoad = initialDisp === "LS008" || initialDisp === "LS011";

  // Inert while the detail call is still in flight: initialDisp is not known yet,
  // so a closed lead must not be editable for those first few hundred ms.
  const isLocked = loading || wasClosedOnLoad;

  // ✅ Submit hidden ONLY on load condition (no change logic needed, because dropdown is disabled when locked)
  const hideSubmit = wasClosedOnLoad || loading;

  return (
    <div className="ewOpp">
      <div className="wrap">

        <div className="titleBlock">
          <div className="pageTitle">Opportunity Details{top.custID ? ` - ${top.custID}` : ""}</div>
        </div>

        <fieldset className="fs">
          <legend> Details of Appointment</legend>

          <div className="grid">
            <div className="col">
              <div className="pair"><span className="lab">Customer ID :</span> <span className="val">{top.custID}</span></div>
              <div className="pair"><span className="lab">Customer Name :</span> <span className="val">{top.custName}</span></div>
              <div className="pair"><span className="lab">Mobile No :</span> <span className="val">{top.custMobileNo}</span></div>
            </div>

            <div className="col">
              <div className="pair"><span className="lab">Appointment Service :</span> <span className="val">{top.serviceName}</span></div>
              <div className="pair"><span className="lab">Recent Appointment Date :</span> <span className="val">{top.appointmentDate}</span></div>
              <div className="pair"><span className="lab">Appointment with Therapist/Doctors :</span> <span className="val">{top.therapist}</span></div>
            </div>
          </div>

          {/* Reason sits with the appointment details rather than the disposition block. */}
          <div className="ldform">
            <div className="formrow">
              <label className="lab" htmlFor="reasonCode">Reason <span className="req">*</span>:</label>
              <select
                id="reasonCode"
                name="reasonCode"
                value={form.reasonCode}
                disabled={isLocked || reasonsLoading}
                onChange={(e) => !isLocked && handleChange(e)}
                className="inp"
              >
                {reasonOptions.map((r) => (
                  <option key={`rs-${r.code || r.name}`} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="fs">
          <legend>Lead Disposition</legend>

          {loading && (
            <div className="load" style={{ padding: "6px 0 10px", fontSize: 13, color: "#64748b" }}>
              Loading lead details…
            </div>
          )}

          <div className="ldform">
            <div className="formrow">
              <label className="lab" htmlFor="disposition">Disposition <span className="req">*</span>:</label>
              <select
  id="disposition"
  name="disposition"
  value={form.disposition}
  disabled={isLocked || dispLoading}
  onChange={(e) => !isLocked && handleChange(e)}
  className="inp"
>
  {dispOptions.map((opt) => (
    <option key={opt.value || opt.label} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>

            </div>

            <div className="formrow">
              <label className="lab" htmlFor="sbdisposition">Sub-Disposition <span className="req">*</span>:</label>
             <select
  id="sbdisposition"
  name="sbdisposition"
  value={form.sbdisposition}
  disabled={isLocked || !form.disposition || subDispLoading}
  onChange={(e) => !isLocked && handleChange(e)}
  className="inp"
>
  <option value="">—</option>
  {subDispOptions
    .filter((x) => x.value) // skip blank here since we already show "—"
    .map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
</select>


            </div>

          </div>

          {/* Follow-up is a WIP-only field group. */}
          {isWipSelected && (
          <div className="ldform">
            {/* Follow-up inputs */}
            <div className="formrow">
              <label className="lab" htmlFor="fuDate">Follow Up Date <span className="req">*</span>:</label>
              <input
                id="fuDate"
                type="date"
                className="inp"
                value={followUpDate}
                min={todayISO()}
                disabled={isLocked}
                onChange={(e) => {
                  if (isLocked) return;
                  const v = e.target.value;
                  if (!v) {
                    setError("");
                    setFollowUpDate("");
                    return;
                  }
                  if (isPastYMD(v)) {
                    setError("Follow Up Date cannot be before today.");
                    setFollowUpDate("");
                    return;
                  }
                  setError("");
                  setFollowUpDate(v);
                }}
              />
            </div>

            <div className="formrow">
              <label className="lab">Follow Up Time <span className="req">*</span>:</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="inp"
                  style={{ minWidth: 180 }}
                  value={followUpTime}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (isLocked) return;
                    const v = e.target.value;
                    setFollowUpTime(v);
                    // AM/PM only applies when a time is chosen.
                    if (!v) setFollowUpAmPm("");
                    else if (!followUpAmPm) setFollowUpAmPm(DEFAULT_AMPM);
                  }}
                >
                  <option value="">—</option>
                  {HALF_HOURS_1_TO_12_30.map((t) => (
                    <option key={`fu-${t}`} value={t}>{t}</option>
                  ))}
                </select>

                <select
                  className="inp"
                  style={{ minWidth: 120 }}
                  value={followUpAmPm}
                  disabled={isLocked}
                  onChange={(e) => !isLocked && setFollowUpAmPm(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
          )}

          <div className="formrow">
            <label className="lab" htmlFor="remarks">Remarks :</label>
            <textarea
              id="remarks"
              name="remarks"
              className="txta"
              rows={6}
              value={form.remarks}
              readOnly={isLocked}
              onChange={(e) => !isLocked && handleChange(e)}
              placeholder=""
            />
          </div>

          {error && <div style={{ color: "#c33", margin: "8px 0" }}>{error}</div>}
        </fieldset>

        <div className="btnrow">
          {!hideSubmit && (
            <button
  className="btn"
  disabled={saving || !form.disposition || !form.sbdisposition || !form.reasonCode}
  onClick={handleSubmit}
> 
              Submit
            </button>
          )}
          <button className="btn ghost" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      <style jsx="true">{OPP_THEME_CSS}</style>
    </div>
  );
};

export default NoShowEntryDetails;