"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/** ---------------- Helpers ---------------- */
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const pad2 = (n) => String(n).padStart(2, "0");

const DEFAULT_FOLLOWUP_TIME_LABEL = "01:30 PM";

const getTomorrowInputDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

const toOppStatusInt = (dispositionId) => {
  const d = safe(dispositionId).trim();
  return d === "LS004" ? 1 : 2; // WIP => 1 else 2
};


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



const fetchJson = async (url) => {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
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
  // expecting "hh:mm AM/PM"
  const m = s.match(/^(\d{2}):(\d{2})\s?(AM|PM)$/i);
  if (!m) {
    return { hhmmss: "", ampm: "" };
  }
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();

  // 12h -> 24h
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
  // force UTC midnight
  return `${s}T00:00:00.000Z`;
};

/** ---------------- Hardcoded Disposition Masters ---------------- */
const DISPOSITIONS = [
  { label: "< - Select one - >", value: "" },
  { label: "Not Converted", value: "LS003" },
  { label: "WIP", value: "LS004" },
  { label: "Converted", value: "LS007" },
];

const SUBDISPOSITIONS_MASTER = [
  { code: "LS001", name: "Duplicate", leadStatusCode: "LS001" },
  { code: "LS002", name: "Unreachable", leadStatusCode: "LS002" },
  { code: "LS003", name: "DND", leadStatusCode: "LS002" },
  { code: "LS004", name: "Wrong Invalid Number", leadStatusCode: "LS002" },
  { code: "LS005", name: "Not related to our Services", leadStatusCode: "LS002" },
  { code: "LS006", name: "Test Lead", leadStatusCode: "LS002" },

  { code: "LS007", name: "Will Visit Personally", leadStatusCode: "LS003" },
  { code: "LS008", name: "Doctor not available", leadStatusCode: "LS003" },
  { code: "LS009", name: "Price", leadStatusCode: "LS003" },
  { code: "LS010", name: "Clinic too far", leadStatusCode: "LS003" },
  { code: "LS011", name: "Machine_Service Availibility", leadStatusCode: "LS003" },
  { code: "LS012", name: "Took Service Outside", leadStatusCode: "LS003" },

  { code: "LS013", name: "Inquiry only", leadStatusCode: "LS005" },
  { code: "LS014", name: "Feedback", leadStatusCode: "LS005" },
  { code: "LS015", name: "Complaint Doctor", leadStatusCode: "LS005" },
  { code: "LS016", name: "Existing Appointment", leadStatusCode: "LS005" },
  { code: "LS017", name: "Follow up Session Consultation", leadStatusCode: "LS005" },
  { code: "LS018", name: "Complaint Service", leadStatusCode: "LS005" },

  { code: "LS019", name: "WIP", leadStatusCode: "LS004" },
  { code: "LS0020", name: "Converted", leadStatusCode: "LS007" },
];

const buildSubDispositionOptions = (leadStatusCode) => {
  const list = SUBDISPOSITIONS_MASTER.filter(
    (x) => safe(x.leadStatusCode).trim() === safe(leadStatusCode).trim()
  );
  return [
    { label: "< - Select one - >", value: "" },
    ...list.map((x) => ({ label: x.name, value: x.code })),
  ];
};


/** ---------------- Logged-in Center Resolver ---------------- */

const getLoggedInCenterCode = () => {
  const candidates = [
    sessionStorage.getItem("user"),
    localStorage.getItem("user"),
    sessionStorage.getItem("loginUser"),
    localStorage.getItem("loginUser"),
  ].filter(Boolean);

  for (const raw of candidates) {
    try {
      const u = JSON.parse(raw);
      const code =
        u?.centerCode ||
        u?.clinicCentre_FK ||
        u?.clinicCenterCode ||
        u?.centreCode ||
        u?.center ||
        u?.CenterCode;
      if (code) return safe(code).trim();
    } catch {
      // ignore parse errors
    }
  }

  const direct =
    sessionStorage.getItem("centerCode") || localStorage.getItem("centerCode");
  return safe(direct).trim();
};



/** ---------------- Component ---------------- */
const ExternalLeadForm = () => {
  const params = useParams();
  const navigate = useNavigate();
  const locationObj = useLocation();
  const { state } = locationObj;

  // expected from table navigation:
  // state: { row, oppCode, header, leadKind, leadOppId }
  const row = state?.row || null;

  const oppCodeFromState = safe(state?.oppCode).trim();
  const oppCodeFromParams = safe(params?.oppCode).trim();
  const resolvedOppCode = oppCodeFromState || oppCodeFromParams;

  const leadOppIdFromState = safe(state?.leadOppId).trim();
  const leadOppIdFromParams = safe(params?.leadOppId).trim();
  const resolvedLeadOppId = leadOppIdFromState || leadOppIdFromParams;

  // ✅ recID per your URL: /opportunity/external/:oppCode/lead/:leadOppId
  const recID = Number(safe(params?.leadOppId || resolvedLeadOppId).trim() || 0) || 0;

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

  const [centerOptions, setCenterOptions] = useState([
    { label: "< - Select one - >", value: "" },
  ]);
  const [doctorOptions, setDoctorOptions] = useState([
    { label: "< - Select one - >", value: "" },
  ]);
  const [verticalOptions, setVerticalOptions] = useState([
    { label: "< - Select one - >", value: "" },
  ]);

  const [dispositionOptions] = useState(DISPOSITIONS);
  const [subDispositionOptions, setSubDispositionOptions] = useState([
    { label: "< - Select one - >", value: "" },
  ]);

  /** ---------------- Form ---------------- */
  const minFollowUpDate = useMemo(() => getTomorrowInputDate(), []);

  const [isSubmitHidden, setIsSubmitHidden] = useState(false);

useEffect(() => {
  // Decide hiding ONLY from the loaded/initial disposition (row/initial value)
  const initialDisp =
    safe(row?.dispositionCode).trim() || safe(form.dispositionId).trim();

  const initialOppStatus = initialDisp === "LS004" ? "1" : "2";

  const shouldHide =
    initialOppStatus === "2" && (initialDisp === "LS003" || initialDisp === "LS007");

  setIsSubmitHidden(shouldHide);
  // run only once on load (row is stable from navigation state)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


 const [form, setForm] = useState(() => {
  const custName = safe(row?.custName);
  const first = safe(row?.firstName || (custName ? custName.split(" ")[0] : ""));
  const last = safe(
    row?.lastName || (custName ? custName.split(" ").slice(1).join(" ") : "")
  );

  return {
    countryCode: "",
    mobile: safe(row?.custMobileNo || ""),
    firstName: first,
    lastName: last,
    email: safe(row?.email || ""),

    preferredLanguage: "English",

    centerCode: "",
    doctor: safe(row?.therapistCode || ""),
    doctorName: safe(row?.therapistname || ""),

    interestedVerticalCode: safe(row?.interestedInCode || ""),
    interestedVerticalName: safe(row?.interestedInName || ""),
    interestedOther: "",

dispositionId: safe(row?.dispositionCode || ""),      // ✅
subDispositionId: safe(row?.subDispositionCode || ""), // ✅

    followUpDate: getTomorrowInputDate(),
    followUpTime: DEFAULT_FOLLOWUP_TIME_LABEL,

    remarks: safe(row?.remarks || ""),
  };
});



  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /** ---------------- Load Centers + Default center = logged-in center ---------------- */
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

        // ✅ default to logged-in center
        const loggedCenter = getLoggedInCenterCode();
        if (loggedCenter) {
          setForm((p) => ({ ...p, centerCode: loggedCenter }));
        }
      } catch (e) {
        console.error("LoadCenters failed", e);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

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
          `${API_BASE_URL}/api/Master/LoadAllPractioner/${encodeURIComponent(
            centerCode
          )}`
        );
        const list = readList(data);

        const opts = [
          { label: "< - Select one - >", value: "" },
          ...list.map((x) => ({
            value: safe(x?.code || x?.recid || x?.id).trim(),
            label: safe(x?.name).trim() || safe(x?.code).trim(),
          })),
        ];

        if (!alive) return;
        setDoctorOptions(opts);
      } catch (e) {
        console.error("LoadAllPractioner failed", e);
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
        const data = await fetchJson(
          `${API_BASE_URL}/api/Opportunity/OppInterestedVertical`
        );
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

  /** ---------------- SubDisposition depends on Disposition ---------------- */
  useEffect(() => {
    const disp = safe(form.dispositionId).trim();
    const opts = buildSubDispositionOptions(disp);
    setSubDispositionOptions(opts);

    // reset invalid sub disposition when disposition changes
    setForm((p) => {
      if (!disp) return { ...p, subDispositionId: "" };
      const ok = opts.some((o) => o.value && o.value === p.subDispositionId);
      return ok ? p : { ...p, subDispositionId: "" };
    });
  }, [form.dispositionId]);

  const onChange = (e) => {
    const { name, value } = e.target;

    setForm((p) => {
      const next = { ...p, [name]: value };

      if (name === "followUpDate") {
        const v = safe(value).trim();
        const min = getTomorrowInputDate();
        if (!v) next.followUpDate = min;
        else next.followUpDate = v < min ? min : v;
      }

      if (name === "followUpTime" && !safe(value).trim()) {
        next.followUpTime = DEFAULT_FOLLOWUP_TIME_LABEL;
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

    setErrors(e);
    return Object.keys(e).length === 0;
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

      // ✅ force string exactly like swagger
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
therapistName: safe(form.doctorName).trim(),

interesedIn: safe(form.interestedVerticalCode).trim(),
interesedInName: safe(form.interestedVerticalName).trim(),

others: safe(form.interestedOther),
    };

    console.log("UpdateOppDetails payload", payload, "typeof oppStatus:", typeof payload.oppStatus);

    await postJson(`${API_BASE_URL}/api/Opportunity/UpdateOppDetails`, payload);

    showToast("Saved successfully");
    navigate(-1);
  } catch (e) {
    console.error("UpdateOppDetails failed", e);
    alert(`Save failed: ${e?.message || e}`);
  } finally {
    setSaving(false);
  }
};




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

          <div className="formGrid3">
            <div className="col">
              <div className="field">
                <label>
                  First Name <span className="req">*</span>
                </label>
                <input
                  className={`inp ${errors.firstName ? "err" : ""}`}
                  name="firstName"
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
                  name="lastName"
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
                  name="countryCode"
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
                  name="mobile"
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
                  name="email"
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
                <select className="inp" name="preferredLanguage" value={form.preferredLanguage} onChange={onChange}>
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
  }}
>
  {verticalOptions.map((o) => (
    <option key={o.value || o.label} value={o.value}>
      {o.label}
    </option>
  ))}
</select>
                {errors.interestedVerticalCode && <div className="errText">{errors.interestedVerticalCode}</div>}
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
                <label>Other</label>
                <input className="inp" name="interestedOther" value={form.interestedOther} onChange={onChange} />
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
                {errors.subDispositionId && <div className="errText">{errors.subDispositionId}</div>}
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
                <select className="inp" name="followUpTime" value={form.followUpTime} onChange={onChange}>
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
            <textarea className="txta" rows={5} name="remarks" value={form.remarks} onChange={onChange} />
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
    </>
  );
};

export default ExternalLeadForm;
