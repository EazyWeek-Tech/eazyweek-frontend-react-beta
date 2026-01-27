// src/pages/Opportunity/NoShowEntryDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/** ✅ same as your file (you can adjust label list later if needed) */
const DISPOSITION_OPTIONS = [
  { value: "", label: "" },
  { value: "LS008", label: "Converted" },
  { value: "LS011", label: "Not Converted" },
  { value: "LS004", label: "WIP" },
];

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

const DEFAULT_TIME = "01:30";
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

const normalizeDispCode = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";

  // already LS### code
  if (/^LS\d{3}$/i.test(s)) return s.toUpperCase();

  // if backend sends label text
  const t = s.toLowerCase();
  if (t === "converted") return "LS008";
  if (t === "not converted") return "LS011";

  return s;
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

const NoShowEntryDetails = () => {
  const { oppCode, custId } = useParams();
  const { state } = useLocation(); // { recId, oppCode, row, header, isManual }
  const navigate = useNavigate();

  const [row] = useState(state?.row || null);
  const [header] = useState(state?.header || null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [details, setDetails] = useState(null);

  // ✅ requirement defaults:
  const [followUpDate, setFollowUpDate] = useState(tomorrowISO()); // yyyy-MM-dd
  const [followUpTime, setFollowUpTime] = useState(DEFAULT_TIME);   // "01:30"
  const [followUpAmPm, setFollowUpAmPm] = useState(DEFAULT_AMPM);   // "PM"

  const [initialDisp, setInitialDisp] = useState(""); // ✅ API disposition on load (normalized)
  const [form, setForm] = useState({ disposition: "", remarks: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const doFetch = async () => {
      setLoading(true);
      setError("");

      try {
        const recId = state?.recId || getRecId(state?.row) || 0;
        if (!oppCode || !recId) throw new Error("Missing OppCode or RecId.");

        const res = await fetch(
          `${API_BASE_URL}/api/Opportunity/OpportunityMoreDetails/${encodeURIComponent(oppCode)}/${recId}`,
          { method: "POST", headers: { Accept: "*/*" }, credentials: "include", body: "" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setDetails(data || null);

        // follow-up date
        const apiDateYMD = parseApiFollowUpDateToYMD(data?.followUpDate);
        const safeDate = !apiDateYMD || isPastYMD(apiDateYMD) ? tomorrowISO() : apiDateYMD;
        setFollowUpDate(safeDate);

        // time + AM/PM
        const apiTime = String(data?.followUpTime || "").trim();
        const apiAmPm = normalizeAmPm(data?.followUpTimeAmPM);
        setFollowUpTime(apiTime || DEFAULT_TIME);
        setFollowUpAmPm((apiTime ? apiAmPm : DEFAULT_AMPM) || DEFAULT_AMPM);

        // ✅ disposition from API (on load)
        const apiDisp = normalizeDispCode(data?.distpositionCode || data?.distpositionName);
        setInitialDisp(apiDisp);

        const apiRemarks = String(data?.remarts || "").trim();

        // ✅ set form values once
        setForm((p) => ({
          ...p,
          disposition: normalizeDispCode(state?.row?.disposition) || apiDisp || "",
          remarks: String(state?.row?.remarks ?? "").trim() || apiRemarks || "",
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
    appointmentHeading: safe(details?.appointmentHeading || ""),
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
    setForm((p) => ({ ...p, [name]: value }));
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
      followUpDate: toISODateTimeZ(followUpDate || tomorrowISO()),
      followUpTime: (followUpTime || DEFAULT_TIME),
      followUpTimeAmPM: (followUpAmPm || DEFAULT_AMPM),
    };
  };

  const callUpdate = async () => {
    const res = await fetch(`${API_BASE_URL}/api/Opportunity/UpdateOppDetails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(buildUpdatePayload()),
    });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    if (data && data.success === false) throw new Error(data.message || "UpdateOppDetails returned success:false");
    return data || {};
  };

  const ensureValidFollowUpDate = () => {
    if (!followUpDate) {
      setFollowUpDate(tomorrowISO());
      return true;
    }
    if (isPastYMD(followUpDate)) {
      setError("Follow Up Date cannot be before today.");
      setFollowUpDate(tomorrowISO());
      return false;
    }
    return true;
  };

  const ensureDefaultTime = () => {
    if (!followUpTime) setFollowUpTime(DEFAULT_TIME);
    if (!followUpAmPm) setFollowUpAmPm(DEFAULT_AMPM);
  };

  const handleSubmit = async () => {
    if (!form.disposition) {
      setError("Please select a Disposition before submitting.");
      return;
    }
    if (!ensureValidFollowUpDate()) return;

    ensureDefaultTime();

    setSaving(true);
    setError("");
    try {
      await callUpdate();
      navigate(-1);
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="load">Loading…</div>;
  if (error && !details) return <div className="load" style={{ color: "#c33" }}>{error}</div>;

  // ✅ IMPORTANT: lock based ONLY on API disposition (on load)
  const wasClosedOnLoad = initialDisp === "LS008" || initialDisp === "LS011";
  const isLocked = wasClosedOnLoad;

  // ✅ Submit hidden ONLY on load condition (no change logic needed, because dropdown is disabled when locked)
  const hideSubmit = wasClosedOnLoad;

  return (
    <>
      <div className="wrap">

        <div className="titleBlock">
            <div className="pageTitle"> No Show Details</div>
           
          </div>

        <div className="grid">
          <div className="col">
            <div className="pair"><span className="lab">Customer ID :</span> <span className="val">{top.custID}</span></div>
            <div className="pair"><span className="lab">Customer Name :</span> <span className="val">{top.custName}</span></div>
            <div className="pair"><span className="lab">Mobile No :</span> <span className="val">{top.custMobileNo}</span></div>
          </div>

          <div className="col">
            <div className="pair"><span className="lab">Appointment Service :</span> <span className="val">{top.category}</span></div>
            <div className="pair"><span className="lab">Recent Appointment Date :</span> <span className="val">{top.appointmentDate}</span></div>
            <div className="pair"><span className="lab">Appointment with Therapist/Doctors :</span> <span className="val">{top.therapist}</span></div>
          </div>
        </div>

        <fieldset className="fs">
        <legend>Lead Disposition</legend>

        <div className="ldform">
          <div className="formrow">
          <label className="lab" htmlFor="disposition">Disposition <span className="req">*</span>:</label>
          <select
            id="disposition"
            name="disposition"
            value={form.disposition}
            disabled={isLocked}
            onChange={(e) => !isLocked && handleChange(e)}
            className="inp"
          >
            {DISPOSITION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

         <div className="formrow">
          <label className="lab" htmlFor="disposition">Sub-Disposition <span className="req">*</span>:</label>
          <select
            id="sbdisposition"
            name="sbdisposition"
            value={form.sbdisposition}
            disabled={isLocked}
            onChange={(e) => !isLocked && handleChange(e)}
            className="inp"
          >
          
          </select>
        </div>
        </div>


        <div className="ldform">
           {/* Follow-up inputs */}
        <div className="formrow">
          <label className="lab" htmlFor="fuDate">Follow Up Date :</label>
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
                setFollowUpDate(tomorrowISO());
                return;
              }
              setError("");
              setFollowUpDate(v);
            }}
          />
        </div>

        <div className="formrow">
          <label className="lab">Follow Up Time :</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="inp"
              style={{ minWidth: 180 }}
              value={followUpTime}
              disabled={isLocked}
              onChange={(e) => !isLocked && setFollowUpTime(e.target.value)}
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
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

         
        </div>
        </div>

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
            <button className="btn" disabled={saving} onClick={handleSubmit}>
              Submit
            </button>
          )}
          <button className="btn" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      <style jsx="true">{`
      .pageTitle {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 30px;
          color: #1d2a3b;
        }
        .wrap { background:#fff; padding:28px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:18px; }
        .req{color: #f00;}
        .col { display:grid; gap:12px; }
        .pair { font-size:15px; color:#333; margin: 0 0 20px; }
        .lab { display:inline-block; min-width:140px; color:#555; font-weight:600; font-size:14px;margin: 0 0 10px; }
        .val { color:#222; display: flex; align-items: center; padding: 6px 8px; height: 36px; max-width: 390px; border:1px solid #d8dee9; border-radius:6px; }
        .formrow { display:flex; align-items:center; gap:12px; margin:12px 0;  }
        .inp { flex:1; max-width:520px; min-width: 270px; height:36px; padding:6px 8px; border:1px solid #d8dee9; border-radius:6px; background:#fff; }
        .txta { flex:1; max-width:520px; padding:8px; border:1px solid #d8dee9; border-radius:6px; resize:vertical; }
        .btnrow { display:flex; gap:14px; margin-top:10px; }
        .btn { background:#14233c; color:#fff; border:0; border-radius:8px; padding:10px 18px; font-weight:600; cursor:pointer; }
        .btn:disabled { opacity:.6; cursor:not-allowed; }
        .btn:hover:not(:disabled) { opacity:.95; }
        .load { padding:40px; text-align:center; color:#666; }
        .ldform{display: flex; gap: 40px; align-items: center;}
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

        @media (max-width: 900px) {
          .grid { grid-template-columns:1fr; }
          .lab { min-width:160px; }
        }
      `}</style>
    </>
  );
};

export default NoShowEntryDetails;
