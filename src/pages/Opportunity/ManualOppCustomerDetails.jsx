// src/pages/Opportunity/ManualOppCustomerDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/** ---------------- Helpers ---------------- */
const safe = (v) => (v === null || v === undefined ? "" : String(v));

function toInputDate(value) {
  if (!value) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const d = new Date(value);
    if (!isNaN(d)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch {}
  return "";
}

const LEAD_STATUS_OPTIONS = [
  { label: "Duplicate", value: "LS001" },
  { label: "Bad Lead", value: "LS002" },
  { label: "Not Converted", value: "LS003" },
  { label: "WIP", value: "LS004" },
  { label: "Inquiry Feedback", value: "LS005" },
  { label: "Appointment Set(for service)", value: "LS006" },
  { label: "Converted", value: "LS007" },
];

const pad8 = (n) => String(n).padStart(8, "0");

// Lead ID generators (separate counters)
const nextLeadId = (kind /* "External" | "Manual" */) => {
  const counterKey =
    kind === "External" ? "ew_lead_counter_external" : "ew_lead_counter_manual";
  const current = parseInt(localStorage.getItem(counterKey) || "0", 10) || 0;
  const next = current + 1;
  localStorage.setItem(counterKey, String(next));

  const prefix = kind === "External" ? "LD-EX-" : "LD-MN-";
  return `${prefix}${pad8(next)}`;
};

// basic email check (optional)
const isValidEmail = (email) => {
  if (!email) return true; // not mandatory
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Time dropdown options (like screenshot)
const TIME_OPTIONS = (() => {
  const out = [{ label: "--", value: "" }];
  for (let h = 1; h <= 12; h++) {
    out.push({
      label: `${String(h).padStart(2, "0")}:00`,
      value: `${String(h).padStart(2, "0")}:00`,
    });
    out.push({
      label: `${String(h).padStart(2, "0")}:30`,
      value: `${String(h).padStart(2, "0")}:30`,
    });
  }
  return out;
})();

/** ---------------- Defaults ---------------- */
const LANG_INIT = ["Arabic", "English"];

// IMPORTANT: Source / SubSource same as before (also for External opportunity)
const SOURCE_INIT = ["Walkin", "Referral", "Campaign", "Website"];
const SUBSOURCE_INIT = ["", "Instagram", "Facebook", "Google", "SMS", "Other"];

const DOCTOR_INIT = ["Dr. Ma", "Dr. Reham", "Agnes Inocencio", "Aaliya", "Dr. Hasna"];

const fallbackMediumOptions = [
  { label: "< - Select one - >", value: "" },
  { label: "Walkin", value: "Walkin" },
  { label: "Phone", value: "Phone" },
  { label: "Online", value: "Online" },
  { label: "Social", value: "Social" },
];

// ✅ Your centers API
const LOAD_CENTER_URL = `${API_BASE_URL}/api/Master/LoadCenters`;

// ✅ NEW: key used by OpportunityDetails to prepend just submitted lead
const LS_NEW_LEAD_KEY = (oppCode) => `EW_OPP_NEW_LEAD_${oppCode}`;

/** ---------------- Component ---------------- */
const ManualOppCustomerDetails = () => {
  const { oppCode, custId } = useParams();
  const { state } = useLocation(); // { row, header, leadKind }
  const navigate = useNavigate();

  // We will rely on state.row (no OppMleadDetails call anymore)
  const row = state?.row || null;
  const header = state?.header || null;

  // Decide lead kind:
  // - If caller passes state.leadKind use it.
  // - Else if header has rule (oRuleCode) treat as External, otherwise Manual.
  const leadKind = state?.leadKind || (header?.oRuleCode ? "External" : "Manual");

  // Generate leadId once per page open
  const [leadId] = useState(() => nextLeadId(leadKind));

  /** ---- Option lists (API + defaults) ---- */
  const [langOptions] = useState(LANG_INIT);
  const [sourceOptions] = useState(SOURCE_INIT);
  const [subSourceOptions] = useState(SUBSOURCE_INIT);
  const [doctorOptions] = useState(DOCTOR_INIT);

  // Medium (API)
  const [mediumOptions, setMediumOptions] = useState(fallbackMediumOptions);
  const [mediumLoading, setMediumLoading] = useState(false);

  // Verticals (Interested In) (API)
  const [verticalOptions, setVerticalOptions] = useState([
    { label: "< - Select one - >", value: "" },
  ]);
  const [verticalLoading, setVerticalLoading] = useState(false);

  // Centre (LoadCenter API)
  const [centerOptions, setCenterOptions] = useState([
    { label: "< - Select one - >", value: "" },
  ]);
  const [centerLoading, setCenterLoading] = useState(false);

  // ✅ Lead Sub-Status (API) /api/Opportunity/OppLeadSubStatus/{LStatus}
  const [leadSubStatusOptions, setLeadSubStatusOptions] = useState([
    { label: "< - Select one - >", value: "" },
  ]);
  const [leadSubStatusLoading, setLeadSubStatusLoading] = useState(false);

  /** ---- Form ---- */
  const [form, setForm] = useState({
    // Lead Details
    countryCode: "",
    mobile: safe(row?.custMobileNo || row?.mobileNo || row?.mobile || ""),
    firstName: safe(
      row?.firstName || (row?.custName ? String(row?.custName).split(" ")[0] : "")
    ),
    lastName: safe(
      row?.lastName ||
        (row?.custName ? String(row?.custName).split(" ").slice(1).join(" ") : "")
    ),
    email: safe(row?.email || row?.emailID || ""),
    preferredLanguage: safe(row?.preferredLanguage || row?.preferedLanguage || "English"),

    centerCode: "", // mandatory
    interestedVerticalCode: "", // mandatory
    interestedOther: "",

    doctor: "", // mandatory
    mediumCode: "", // mandatory
    sourceName: "Walkin", // mandatory
    subSourceName: "",

    // Lead Disposition
    leadStatus: "LS004", // mandatory (default WIP)
    leadSubStatus: "",
    followUpDate: toInputDate(row?.followUpDate || ""),
    followUpTime: "", // dropdown HH:MM
    followUpTimeAmPm: "AM",
    remarks: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /** ---- Top labels (read-only) like screenshot ---- */
  const top = useMemo(() => {
    return {
      custID: safe(row?.custID || custId || ""),
      custName: safe(row?.custName || ""),
      mobile: safe(row?.custMobileNo || row?.mobileNo || row?.mobile || ""),
      paidForCategory: safe(row?.paidForCategory || row?.paidCategory || ""),
      recentAppointmentDate: safe(row?.recentAppointmentDate || row?.appointmentDate || ""),
      appWithDoctors: safe(
        row?.appWithDoctors || row?.therapistDoctors || row?.doctorName || ""
      ),
    };
  }, [row, custId]);

  /** ---------------- API loads ---------------- */

  // Medium options
  useEffect(() => {
    const loadMediums = async () => {
      setMediumLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/Opportunity/OppMedium`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];

        const mapped = arr
          .map((o) => ({
            label: (o?.name ?? o?.Name ?? o?.text ?? o?.label ?? "").toString().trim(),
            value: (o?.code ?? o?.Code ?? o?.value ?? o?.Value ?? "").toString().trim(),
          }))
          .filter((o) => o.label && o.value);

        setMediumOptions([{ label: "< - Select one - >", value: "" }, ...mapped]);
      } catch (e) {
        console.error("Failed to load mediums", e);
        setMediumOptions(fallbackMediumOptions);
      } finally {
        setMediumLoading(false);
      }
    };
    loadMediums();
  }, []);

  // Verticals (Interested In) ✅ /api/Opportunity/OppAppointmentVertical
  useEffect(() => {
    const loadVerticals = async () => {
      setVerticalLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/Opportunity/OppAppointmentVertical`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];

        const mapped = arr
          .map((o) => ({
            label: (o?.name ?? o?.Name ?? "").toString().trim(),
            value: (o?.code ?? o?.Code ?? o?.value ?? "").toString().trim(),
          }))
          .filter((x) => x.label && x.value);

        setVerticalOptions([{ label: "< - Select one - >", value: "" }, ...mapped]);
      } catch (e) {
        console.error("Failed to load verticals", e);
        setVerticalOptions([{ label: "< - Select one - >", value: "" }]);
      } finally {
        setVerticalLoading(false);
      }
    };
    loadVerticals();
  }, []);

  // Centre options ✅ LoadCenters
  useEffect(() => {
    const loadCenters = async () => {
      setCenterLoading(true);
      try {
        const res = await fetch(LOAD_CENTER_URL, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];

        const mapped = arr
          .map((o) => ({
            label: (o?.centerName ?? o?.name ?? o?.Name ?? o?.text ?? "").toString().trim(),
            value: (o?.centerCode ?? o?.code ?? o?.Code ?? o?.value ?? "").toString().trim(),
          }))
          .filter((x) => x.label && x.value);

        setCenterOptions([{ label: "< - Select one - >", value: "" }, ...mapped]);
      } catch (e) {
        console.error("Failed to load centers", e);
        setCenterOptions([{ label: "< - Select one - >", value: "" }]);
      } finally {
        setCenterLoading(false);
      }
    };
    loadCenters();
  }, []);

  /** ---------------- Lead Sub-Status API ---------------- */
  const loadLeadSubStatuses = async (leadStatusCode) => {
    if (!leadStatusCode) {
      setLeadSubStatusOptions([{ label: "< - Select one - >", value: "" }]);
      return;
    }

    setLeadSubStatusLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Opportunity/OppLeadSubStatus/${encodeURIComponent(
          leadStatusCode
        )}`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data ? [data] : [];

      const mapped = arr
        .map((o) => ({
          label: (o?.name ?? o?.Name ?? "").toString().trim(),
          value: (o?.code ?? o?.Code ?? "").toString().trim(),
        }))
        .filter((x) => x.label && x.value);

      setLeadSubStatusOptions([{ label: "< - Select one - >", value: "" }, ...mapped]);
    } catch (e) {
      console.error("Failed to load lead sub status", e);
      setLeadSubStatusOptions([{ label: "< - Select one - >", value: "" }]);
    } finally {
      setLeadSubStatusLoading(false);
    }
  };

  // Auto-load Lead Sub-Status when Lead Status changes
  useEffect(() => {
    loadLeadSubStatuses(form.leadStatus);
    setForm((p) => ({ ...p, leadSubStatus: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.leadStatus]);

  /** ---------------- Events ---------------- */
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
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
    if (!form.mediumCode) e.mediumCode = "Lead medium is required.";
    if (!form.sourceName) e.sourceName = "Lead source is required.";
    if (!form.leadStatus) e.leadStatus = "Lead status is required.";

    if (!isValidEmail(form.email)) e.email = "Please enter a valid email.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const persistLead = (status /* "Draft" | "Submitted" */) => {
    const key = "ew_leads_local";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");

    const leadStatusName =
      LEAD_STATUS_OPTIONS.find((x) => x.value === form.leadStatus)?.label || "";

    const leadSubStatusName =
      leadSubStatusOptions.find((x) => x.value === form.leadSubStatus)?.label || "";

    const payload = {
      leadId,
      leadKind,
      oppCode: safe(oppCode),
      custId: safe(custId),
      oppName: safe(header?.oppName),
      oRuleCode: safe(header?.oRuleCode || header?.oRuleDetails),

      // Lead Details
      countryCode: form.countryCode,
      mobile: form.mobile,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      preferredLanguage: form.preferredLanguage,

      centerCode: form.centerCode,
      interestedVerticalCode: form.interestedVerticalCode,
      interestedOther: form.interestedOther,

      doctor: form.doctor,
      mediumCode: form.mediumCode,
      sourceName: form.sourceName,
      subSourceName: form.subSourceName,

      // Lead Disposition
      leadStatusCode: form.leadStatus,
      leadStatusName,
      leadSubStatusCode: form.leadSubStatus,
      leadSubStatusName,

      followUpDate: form.followUpDate,
      followUpTime: form.followUpTime,
      followUpTimeAmPm: form.followUpTimeAmPm,
      remarks: form.remarks,

      status,
      createdAt: new Date().toISOString(),

      customerMeta: {
        custID: top.custID,
        custName: top.custName,
        mobileNo: top.mobile,
        paidForCategory: top.paidForCategory,
        recentAppointmentDate: top.recentAppointmentDate,
        appWithDoctors: top.appWithDoctors,
      },
    };

    existing.unshift(payload);
    localStorage.setItem(key, JSON.stringify(existing));
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      persistLead("Draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const saved = persistLead("Submitted");

      // ✅ NEW: store one-time payload for OpportunityDetails to consume and prepend
      try {
        localStorage.setItem(LS_NEW_LEAD_KEY(oppCode), JSON.stringify(saved));
      } catch {}

      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  /** ---------------- UI ---------------- */
  return (
    <>
      {/* ...UNCHANGED UI (your full JSX + styles) ... */}
      <div className="pageWrap">
        <div className="pageHeader">
          <div className="titleBlock">
            <div className="pageTitle">Lead Details</div>
            <div className="subTitle">
              {leadKind} Lead • {oppCode ? `Opportunity: ${oppCode}` : "Opportunity"}
            </div>
          </div>

          <div className="leadIdPill">
            <span className="pillLab">Lead ID</span>
            <span className="pillVal">{leadId}</span>
          </div>
        </div>

        {/* Fieldset 1: Lead Details */}
        <fieldset className="fs">
          <legend>Lead Details</legend>

          <div className="formGrid3">
            {/* Left column */}
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
                <label>
                  Centre <span className="req">*</span>
                </label>
                <select
                  className={`inp ${errors.centerCode ? "err" : ""}`}
                  name="centerCode"
                  value={form.centerCode}
                  onChange={onChange}
                  disabled={centerLoading}
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
                  Doctor / Therapist <span className="req">*</span>
                </label>
                <select
                  className={`inp ${errors.doctor ? "err" : ""}`}
                  name="doctor"
                  value={form.doctor}
                  onChange={onChange}
                >
                  <option value="">{`< - Select one - >`}</option>
                  {doctorOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.doctor && <div className="errText">{errors.doctor}</div>}
              </div>

              <div className="field">
                <label>
                  Lead Source <span className="req">*</span>
                </label>
                <select
                  className={`inp ${errors.sourceName ? "err" : ""}`}
                  name="sourceName"
                  value={form.sourceName}
                  onChange={onChange}
                >
                  {sourceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.sourceName && <div className="errText">{errors.sourceName}</div>}
              </div>
            </div>

            {/* Middle column */}
            <div className="col">
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
                <label>Lead Sub-Source</label>
                <select
                  className="inp"
                  name="subSourceName"
                  value={form.subSourceName}
                  onChange={onChange}
                >
                  {subSourceOptions.map((s) => (
                    <option key={s || "blank"} value={s}>
                      {s || "< - Select one - >"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right column */}
            <div className="col">
              <div className="field">
                <label>
                  Lead Medium <span className="req">*</span>
                </label>
                <select
                  className={`inp ${errors.mediumCode ? "err" : ""}`}
                  name="mediumCode"
                  value={form.mediumCode}
                  onChange={onChange}
                  disabled={mediumLoading}
                >
                  {mediumOptions.map((opt) => (
                    <option key={opt.value || opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.mediumCode && <div className="errText">{errors.mediumCode}</div>}
              </div>

              <div className="field">
                <label>
                  Interested in <span className="req">*</span>
                </label>
                <select
                  className={`inp ${errors.interestedVerticalCode ? "err" : ""}`}
                  name="interestedVerticalCode"
                  value={form.interestedVerticalCode}
                  onChange={onChange}
                  disabled={verticalLoading}
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
                <label>Other</label>
                <input
                  className="inp"
                  name="interestedOther"
                  value={form.interestedOther}
                  onChange={onChange}
                  placeholder="Other"
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Fieldset 2: Lead Disposition */}
        <fieldset className="fs">
          <legend>Lead Disposition</legend>

          <div className="formGrid2">
            <div className="col">
              <div className="field">
                <label>
                  Lead Status <span className="req">*</span>
                </label>
                <select
                  className={`inp ${errors.leadStatus ? "err" : ""}`}
                  name="leadStatus"
                  value={form.leadStatus}
                  onChange={onChange}
                >
                  {LEAD_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {errors.leadStatus && <div className="errText">{errors.leadStatus}</div>}
              </div>

              <div className="field">
                <label>Follow Up Date</label>
                <input
                  type="date"
                  className="inp"
                  name="followUpDate"
                  value={form.followUpDate}
                  onChange={onChange}
                />
              </div>
            </div>

            <div className="col">
              <div className="field">
                <label>Lead Sub-Status</label>
                <select
                  className="inp"
                  name="leadSubStatus"
                  value={form.leadSubStatus}
                  onChange={onChange}
                  disabled={leadSubStatusLoading || !form.leadStatus}
                >
                  {leadSubStatusOptions.map((s) => (
                    <option key={s.value || s.label} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Follow Up Time</label>
                <div className="timeRow">
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

                  <select
                    className="inp ampm"
                    name="followUpTimeAmPm"
                    value={form.followUpTimeAmPm}
                    onChange={onChange}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
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
              placeholder="Remarks"
            />
          </div>
        </fieldset>

        <div className="btnRow">
          <button className="btn" onClick={handleSave} disabled={saving}>
            Save
          </button>
          <button className="btn" onClick={handleSubmit} disabled={saving}>
            Submit
          </button>
          <button className="btn" onClick={() => navigate(-1)} disabled={saving}>
            Back
          </button>
        </div>
      </div>

      <style jsx="true">{`
        .pageWrap { padding: 18px 18px 28px; background: #fff; }
        .pageHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
        .pageTitle { font-size: 18px; font-weight: 700; color: #1d2a3b; }
        .subTitle { margin-top: 2px; font-size: 12px; color: #7b8798; }
        .leadIdPill { display: inline-flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid #e3e8ef; background: #fafbfc; }
        .pillLab { font-size: 12px; color: #6b7280; font-weight: 700; }
        .pillVal { font-size: 13px; font-weight: 800; color: #111827; letter-spacing: 0.4px; }
        .fs { border: 1px solid #e6ebf2; border-radius: 10px; padding: 14px 14px 16px; margin-bottom: 14px; background: #fff; }
        .fs legend { padding: 0 8px; font-weight: 800; font-size: 16px; color: #1f2937; }
        .formGrid3 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 8px; }
        .formGrid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 8px; }
        .col { display: grid; gap: 12px; }
        .field label { display: inline-block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        .req { color: #c62828; font-weight: 900; }
        .inp { width: 100%; height: 40px; border-radius: 8px; border: 1px solid #d7dee8; padding: 0 12px; background: #fff; outline: none; }
        .inp:focus { border-color: #94a3b8; }
        .inp.err { border-color: #d32f2f; box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.08); }
        .txta { width: 100%; border-radius: 8px; border: 1px solid #d7dee8; padding: 10px 12px; background: #fff; outline: none; resize: vertical; }
        .errText { margin-top: 6px; font-size: 12px; color: #d32f2f; font-weight: 600; }
        .timeRow { display: grid; grid-template-columns: 1fr 110px; gap: 10px; }
        .ampm { max-width: 110px; }
        .mtWide { margin-top: 12px; }
        .btnRow { display: flex; gap: 16px; margin-top: 16px; }
        .btn { background: #0b1b37; color: #fff; border: 0; border-radius: 10px; padding: 11px 26px; font-weight: 700; cursor: pointer; }
        .btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .btn:hover:not(:disabled) { opacity: 0.95; }
        @media (max-width: 1100px) {
          .formGrid3 { grid-template-columns: 1fr; }
          .formGrid2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default ManualOppCustomerDetails;
