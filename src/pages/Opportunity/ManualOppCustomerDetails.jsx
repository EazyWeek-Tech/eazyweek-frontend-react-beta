// src/pages/Opportunity/ManualOppCustomerDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const langOptions = ["Arabic", "English", "Hindi"];
const leadTypeOptions = ["Existing", "New"];
// Fallback mediums (used only if API fails)
const fallbackMediumOptions = [
  { label: "< - Select one - >", value: "" },
  { label: "Walkin", value: "Walkin" },
  { label: "Phone", value: "Phone" },
  { label: "Online", value: "Online" },
  { label: "Social", value: "Social" },
];
const sourceOptions = ["Walkin", "Referral", "Campaign", "Website"];
const interestedVerticalOptions = ["Anti Ageing", "Acne Treatment", "Volume filling", "Laser", "Skin"];
const subSourceOptions = ["", "Instagram", "Facebook", "Google", "SMS", "Other"];

const leadStatusOptions = ["WIP", "Converted", "Not Interested", "Follow-up"];
const leadSubStatusOptions = ["WIP", "Hot", "Warm", "Cold", "Closed"];
const apptVerticalOptions = ["Anti Ageing", "Acne Treatment", "Volume filling", "Laser", "Skin"];
const doctorOptions = ["Dr. Ma", "Dr. Reham", "Agnes Inocencio", "Aaliya", "Dr. Hasna"];

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

const ManualOppCustomerDetails = () => {
  const { oppCode, custId } = useParams();
  const { state } = useLocation(); // { row, header }
  const navigate = useNavigate();

  const [row, setRow] = useState(() => state?.row || null);
  const [header] = useState(() => state?.header || null);
  const [loading, setLoading] = useState(!state?.row);
  const [error, setError] = useState("");

  // ---- Medium options from API
  const [mediumOptions, setMediumOptions] = useState(fallbackMediumOptions);
  const [mediumLoading, setMediumLoading] = useState(false);

  const [form, setForm] = useState({
    preferredLanguage: "Arabic",
    followUpDate: "",
    leadType: "Existing",
    medium: "", // now stores the API code/value
    source: "Walkin",
    interestedVertical: "Anti Ageing",
    subSource: "",
    leadStatus: "WIP",
    leadSubStatus: "WIP",
    apptVertical: "Anti Ageing",
    doctor: "Dr. Ma",
    remarks: "",
    clinicLocation: "",
    email: "",
  });

  // Load mediums
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
        const arr = Array.isArray(data) ? data : (data ? [data] : []);
        // Map generic shapes: prefer code as value; fallback to value/name
        const mapped = arr
          .map((o) => ({
            label: o?.name ?? o?.Name ?? o?.text ?? o?.label ?? "",
            value: (o?.code ?? o?.Code ?? o?.value ?? o?.Value ?? ""),
          }))
          .filter((o) => o.label !== "" || o.value !== "");
        const withPlaceholder = [{ label: "< - Select one - >", value: "" }, ...mapped.filter(o => o.value !== "")];
        setMediumOptions(withPlaceholder.length ? withPlaceholder : fallbackMediumOptions);
      } catch (e) {
        console.error("Failed to load mediums", e);
        setMediumOptions(fallbackMediumOptions);
      } finally {
        setMediumLoading(false);
      }
    };
    loadMediums();
  }, [API_BASE_URL]);

  // If opened directly, pull the row so we can prefill top section
  useEffect(() => {
    const fetchIfNeeded = async () => {
      if (row) return;
      setLoading(true);
      setError("");
      try {
        const now = new Date();
        const from = new Date(now);
        from.setMonth(now.getMonth() - 1);

        const payload = {
          oppCode,
          fromDate: from.toISOString(),
          toDate: now.toISOString(),
        };

        const res = await fetch(`${API_BASE_URL}/api/Opportunity/LoadOppDetails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data ? [data] : []);
        const found = arr.find((o) => (o?.custID || "").toString() === (custId || "").toString());
        setRow(found || null);
      } catch (e) {
        console.error(e);
        setError("Failed to load manual lead details.");
      } finally {
        setLoading(false);
      }
    };
    fetchIfNeeded();
  }, [oppCode, custId, row]);

  const safe = (v) => (v === null || v === undefined ? "" : v);

  const top = useMemo(() => {
    return {
      custID: safe(row?.custID),
      custName: safe(row?.custName),
      mobile: safe(row?.custMobileNo),
      clinicLocation: safe(row?.clinicLocation || "Lines Clinics"),
      email: safe(row?.email),
      preferredLanguage: safe(row?.preferredLanguage || "Arabic"),
      followUpDate: toInputDate(row?.followUpDate || ""),
      mediumCode: safe(row?.mediumCode || row?.medium || ""), // prefill attempt if backend sends it
    };
  }, [row]);

  // Prefill
  useEffect(() => {
    setForm((p) => ({
      ...p,
      clinicLocation: top.clinicLocation,
      email: top.email,
      preferredLanguage: top.preferredLanguage || p.preferredLanguage,
      followUpDate: top.followUpDate || p.followUpDate,
      medium: top.mediumCode || p.medium,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.clinicLocation, top.email, top.preferredLanguage, top.followUpDate, top.mediumCode]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const payload = () => ({
    oppCode,
    custID: top.custID,
    preferredLanguage: form.preferredLanguage,
    followUpDate: form.followUpDate, // yyyy-MM-dd
    leadType: form.leadType,
    medium: form.medium, // send the code/value from the API
    source: form.source,
    interestedVertical: form.interestedVertical,
    subSource: form.subSource,
    leadStatus: form.leadStatus,
    leadSubStatus: form.leadSubStatus,
    appointmentVertical: form.apptVertical,
    doctor: form.doctor,
    remarks: form.remarks,
    clinicLocation: form.clinicLocation,
    email: form.email,
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/Opportunity/ManualLeadUpsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload()),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate(-1);
    } catch (e) {
      console.error(e);
      setError("Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="ld">Loading…</div>;
  if (error) return <div className="ld" style={{ color: "#c33" }}>{error}</div>;

  return (
    <>
      <div className="card">
        <div className="sec">
          <div className="sectitle">GENERAL DETAILS :</div>

          <div className="grid2">
            <div className="col">
              <div className="row"><span className="lab">Customer ID :</span><span className="val">{top.custID}</span></div>
              <div className="row"><span className="lab">Mobile No :</span><span className="val">{top.mobile}</span></div>
              <div className="row">
                <span className="lab">Clinic Location :</span>
                <input className="inp" name="clinicLocation" value={form.clinicLocation} onChange={onChange} />
              </div>
            </div>

            <div className="col">
              <div className="row"><span className="lab">Customer Name :</span><span className="val">{top.custName}</span></div>
              <div className="row">
                <span className="lab">Email ID :</span>
                <input className="inp" name="email" value={form.email} onChange={onChange} />
              </div>
              <div className="row">
                <span className="lab">Preferred Language :</span>
                <select className="inp" name="preferredLanguage" value={form.preferredLanguage} onChange={onChange}>
                  {langOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="row">
                <span className="lab">Follow up Date :</span>
                <input type="date" className="inp" name="followUpDate" value={form.followUpDate} onChange={onChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sectitle">LEAD DETAILS :</div>

          <div className="grid3">
            <div className="col">
              <div className="row">
                <span className="lab">Lead Type :</span>
                <select className="inp" name="leadType" value={form.leadType} onChange={onChange}>
                  {leadTypeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="row">
                <span className="lab">Medium :</span>
                <select
                  className="inp"
                  name="medium"
                  value={form.medium}
                  onChange={onChange}
                  disabled={mediumLoading}
                >
                  {mediumOptions.map((opt) => (
                    <option key={opt.value || opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <span className="lab">Source :</span>
                <select className="inp" name="source" value={form.source} onChange={onChange}>
                  {sourceOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="col">
              <div className="row">
                <span className="lab">Interested Vertical :</span>
                <select className="inp" name="interestedVertical" value={form.interestedVertical} onChange={onChange}>
                  {interestedVerticalOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="row">
                <span className="lab">Sub-Source :</span>
                <select className="inp" name="subSource" value={form.subSource} onChange={onChange}>
                  {subSourceOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sectitle">LEAD DISPOSITIONS :</div>

          <div className="grid3">
            <div className="col">
              <div className="row">
                <span className="lab">Lead Status :</span>
                <select className="inp" name="leadStatus" value={form.leadStatus} onChange={onChange}>
                  {leadStatusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="row">
                <span className="lab">Appointment Vertical(s) :</span>
                <select className="inp" name="apptVertical" value={form.apptVertical} onChange={onChange}>
                  {apptVerticalOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="col">
              <div className="row">
                <span className="lab">Lead Sub-Status :</span>
                <select className="inp" name="leadSubStatus" value={form.leadSubStatus} onChange={onChange}>
                  {leadSubStatusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="row">
                <span className="lab">Doctor / Therapist :</span>
                <select className="inp" name="doctor" value={form.doctor} onChange={onChange}>
                  {doctorOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="row mt">
            <span className="lab">Remarks :</span>
            <textarea className="txta" rows={5} name="remarks" value={form.remarks} onChange={onChange} />
          </div>
        </div>

        <div className="btnrow">
          <button className="btn" disabled={submitting} onClick={handleSubmit}>Submit</button>
          <button className="btn" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      <style jsx="true">{`
        .ld { padding:40px; text-align:center; color:#666; }
        .card { background:#fff; padding:18px 18px 24px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .sec { background:#f7f9fc; border:1px solid #e7edf6; border-radius:8px; padding:14px 14px 10px; margin-bottom:14px; }
        .sectitle { font-size:12px; font-weight:700; color:#6b7a90; letter-spacing:.4px; margin-bottom:12px; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
        .grid3 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
        .col { display:grid; gap:10px; }
        .row { display:flex; align-items:center; gap:12px; }
        .mt { margin-top:10px; align-items:flex-start; }
        .lab { min-width:190px; color:#555; font-weight:600; }
        .val { color:#222; }
        .inp { flex:1; height:36px; padding:6px 8px; border:1px solid #d8dee9; border-radius:6px; background:#fff; }
        .txta { flex:1; padding:8px; border:1px solid #d8dee9; border-radius:6px; resize:vertical; }
        .btnrow { display:flex; gap:12px; justify-content:flex-start; margin-top:10px; }
        .btn { background:#14233c; color:#fff; border:0; border-radius:8px; padding:10px 18px; font-weight:600; cursor:pointer; }
        .btn:disabled { opacity:.6; cursor:not-allowed; }
        .btn:hover:not(:disabled) { opacity:.95; }
        @media (max-width: 1000px) {
          .grid2, .grid3 { grid-template-columns:1fr; }
          .lab { min-width:150px; }
        }
      `}</style>
    </>
  );
};

export default ManualOppCustomerDetails;
