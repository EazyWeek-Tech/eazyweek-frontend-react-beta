import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Toast from "../../components/Toast";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
const getCenterCode = () => (getUser().centerCode || "").trim();
const getEmployeeCode = () => { const u = getUser(); return (u.employeeCode || u.userId || "").trim(); };
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` });


const CourtesyCallDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const referenceID = new URLSearchParams(location.search).get("referenceID");

  const [details, setDetails] = useState(null);
  const [services, setServices] = useState([]); // For "Customer Complaint for Service"
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const sessionUserId = getEmployeeCode();

  // Keep strings for API fields, except we keep agentRating in UI as number | ""
  const [formData, setFormData] = useState({
    referenceID: "",
    customerType: "New",

    // yes/no → "1" | "2" | "0"
    futureAppointmentTaken: "0",
    googleReview: "0",
    receivedPostCareCmmunication: "0",
    receivedInvoice: "0",
    overallSatisfied: "0",

    // complaint service is a service "value" (e.g., "446"), not yes/no
    customerComplaintforService: "",

    // ratings
    experienceRating: "",          // keep as string for API
    agentRating: "",               // UI uses number; payload converts to string

    // free text
    customerComplaintRemarks: "",
    agentdecision: "",
    complaintDetails: "",

    // UI-only; mapped to complaintDetails on submit
    customerFeedback: "",

    // meta
    isDraft: 0,
    createdBy: "system",
  });

  const mapYesNo = (val) => {
    const v = String(val ?? "").trim();
    if (v === "1" || v.toLowerCase() === "yes" || val === true) return "1";
    if (v === "2" || v.toLowerCase() === "no" || val === false) return "2";
    return "0";
  };

  // Normalize agent rating from API -> number 1..5 or "" for blank/out-of-range
  const normalizeRatingNumber = (v) => {
    const s = String(v ?? "").trim();
    const m = s.match(/^([1-5])(?:\.0+)?$/);
    return m ? Number(m[1]) : "";
  };

  useEffect(() => {
    if (!referenceID) return;
    (async () => {
      await fetchDetails();
      await fetchServices();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceID]);

const fetchDetails = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Courtesy/LoadCourtesyDetails/${referenceID}`,
        { headers: { Authorization: `Bearer ${TOKEN()}` } }
      );
      const json = await res.json();
      const data = json?.data ?? json;
      setDetails(data);
      setFormData((prev) => ({
        ...prev,
        referenceID: data.referenceID || referenceID,
        customerType: (data.customerType ?? "New").toString(),

        futureAppointmentTaken: mapYesNo(data.futureAppointmentTaken),
        googleReview: mapYesNo(data.googleReview),
        receivedPostCareCmmunication: mapYesNo(data.receivedPostCareCmmunication),
        receivedInvoice: mapYesNo(data.receivedInvoice),
        overallSatisfied: mapYesNo(data.overallSatisfied),

        experienceRating: (data.experienceRating ?? "").toString().trim(),

        // agentRating now normalized to number for UI select
        agentRating: normalizeRatingNumber(data.agentRating),

        customerComplaintforService: (data.customerComplaintforService ?? "")
          .toString()
          .trim(),

        customerComplaintRemarks: data.customerComplaintRemarks || "",
        agentdecision: data.agentdecision || "",
        // backend may store this under complaintDetails; keep UI copy
        customerFeedback: (data.complaintDetails ?? "").toString().trim(),

        isDraft: 0,
        createdBy: getEmployeeCode() || "system",
      }));
    } catch (err) {
      console.error("Failed to fetch details", err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Courtesy/LoadCourtesyServices/${referenceID}`,
        { headers: { Authorization: `Bearer ${TOKEN()}` } }
      );
      const json = await res.json();
      const data = json?.data ?? json;
      const list = Array.isArray(data) ? data : [];
      setServices(list);

      setFormData((prev) => {
        const current = String(prev.customerComplaintforService ?? "").trim();
        if (current) return prev;
        const zeroOption = list.find((x) => String(x?.value) === "0");
        return { ...prev, customerComplaintforService: zeroOption ? "0" : "" };
      });
    } catch (err) {
      console.error("Failed to fetch services", err);
      setServices([]);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (isDraft) => {
    const effectiveUserId = sessionUserId || formData.createdBy || "system";

    const payload = {
      referenceID: formData.referenceID || referenceID,
      customerType: formData.customerType ?? "New",

      futureAppointmentTaken: formData.futureAppointmentTaken ?? "0",
      googleReview: formData.googleReview ?? "0",
      receivedPostCareCmmunication: formData.receivedPostCareCmmunication ?? "0",
      receivedInvoice: formData.receivedInvoice ?? "0",
      overallSatisfied: formData.overallSatisfied ?? "0",

      // keep experienceRating as string for API
      experienceRating: (formData.experienceRating ?? "").toString(),

      customerComplaintforService:
        (formData.customerComplaintforService ?? "").toString(),

      customerComplaintRemarks: formData.customerComplaintRemarks ?? "",
      agentdecision: formData.agentdecision ?? "",
      complaintDetails: formData.customerFeedback ?? "",

      isDraft, // ← 1 for Save, 2 for Submit
      createdBy: effectiveUserId,

      // convert numeric UI value back to string for API
      agentRating:
        formData.agentRating === "" ? "" : String(Number(formData.agentRating)),
    };

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Courtesy/CourtesyDetailsInsert`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      const data = json?.data ?? json;

      if (data?.success) {
        navigate(-1); // back on success
        return;
      } else {
        setToast({ type: "error", message: data?.message || "Failed to save." });
      }
    } catch (err) {
      console.error("Failed to submit", err);
      setToast({ type: "error", message: "Error submitting data." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ fontFamily:"Lato,sans-serif",  minHeight:"100vh" }}>
        <style>{`
          .cd-inp { width:100%; padding:9px 12px; border:1px solid #e7ecf4; border-radius:8px;
            font-size:13px; color:#334B71; font-family:Lato,sans-serif; background:#fff;
            outline:none; box-sizing:border-box; }
          .cd-inp:focus { border-color:#334B71; box-shadow:0 0 0 3px rgba(51,75,113,.1); }
          .cd-inp:disabled { background:#f8fafc; color:#94a3b8; cursor:not-allowed; }
          select.cd-inp { cursor:pointer; }
          textarea.cd-inp { min-height:90px; resize:vertical; direction:auto; }
          .cd-label { font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase;
            letter-spacing:.04em; margin-bottom:6px; display:block; }
          .cd-card { background:#fff; border:1px solid #e7ecf4; border-radius:12px;
            padding:20px 24px; margin-bottom:16px; }
          .cd-sec-title { font-size:11px; font-weight:800; color:#334B71; text-transform:uppercase;
            letter-spacing:.06em; padding-bottom:10px; margin-bottom:16px;
            border-bottom:2px solid #334B71; }
          .cd-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
          .cd-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
          .cd-info-row { display:flex; flex-wrap:wrap; gap:0; }
          .cd-info-cell { flex:1; min-width:180px; padding:10px 16px; border-right:1px solid #f1f5f9; }
          .cd-info-cell:last-child { border-right:none; }
          .cd-info-key { font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase;
            letter-spacing:.04em; margin-bottom:4px; }
          .cd-info-val { font-size:14px; color:#071D49; font-weight:600; }
          .cd-btn { border:none; border-radius:8px; padding:10px 24px; font-size:13px; font-weight:700;
            cursor:pointer; font-family:Lato,sans-serif; transition:opacity .15s; }
          .cd-btn:disabled { opacity:.55; cursor:not-allowed; }
          .cd-btn-pri { background:#334B71; color:#fff; }
          .cd-btn-pri:hover:not(:disabled) { background:#071D49; }
          .cd-btn-sec { background:#f1f5f9; color:#334B71; border:1px solid #e7ecf4; }
          .cd-btn-sec:hover:not(:disabled) { background:#e7ecf4; }
          @media(max-width:640px){ .cd-grid{grid-template-columns:1fr;} .cd-grid-2{grid-template-columns:1fr;} }
        `}</style>

        {/* Breadcrumb */}
        <div style={{ fontSize:12, color:"#94a3b8", marginBottom:16 }}>
          <span style={{ color:"#334B71", cursor:"pointer", fontWeight:600 }}
            onClick={() => navigate(-1)}>Courtesy Call</span>
          <span style={{ margin:"0 6px" }}>›</span>
          <span>Details</span>
        </div>

        {/* Page header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:"#071D49", margin:0 }}>{referenceID}</h1>
            <div style={{ fontSize:13, color:"#64748b", marginTop:3 }}>Courtesy Call Details</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="cd-btn cd-btn-sec" onClick={() => navigate(-1)} disabled={loading}>← Back</button>
            <button className="cd-btn cd-btn-pri" onClick={() => handleSubmit(1)} disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </button>
            <button className="cd-btn cd-btn-pri" onClick={() => handleSubmit(2)} disabled={loading}>
              {loading ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>

        {/* Customer Info Card */}
        {details && (
          <div className="cd-card" style={{ padding:0, overflow:"hidden" }}>
            <div className="cd-info-row">
              <div className="cd-info-cell">
                <div className="cd-info-key">Reference ID</div>
                <div className="cd-info-val">{details.referenceID || "—"}</div>
              </div>
              <div className="cd-info-cell">
                <div className="cd-info-key">Appointment Date</div>
                <div className="cd-info-val">{details.appointmentDate || "—"}</div>
              </div>
              <div className="cd-info-cell">
                <div className="cd-info-key">Customer Name</div>
                <div className="cd-info-val" style={{ direction:"auto" }}>{details.custName || "—"}</div>
              </div>
              <div className="cd-info-cell">
                <div className="cd-info-key">Mobile No</div>
                <div className="cd-info-val">{details.mobileNo || "—"}</div>
              </div>
              <div className="cd-info-cell">
                <div className="cd-info-key">Category</div>
                <div className="cd-info-val">{details.category || "—"}</div>
              </div>
              <div className="cd-info-cell">
                <div className="cd-info-key">Sub Category</div>
                <div className="cd-info-val">{details.subCategory || "—"}</div>
              </div>
            </div>

            {/* Services grid */}
            {services.filter(s => s.value !== "0").length > 0 && (
              <div style={{ borderTop:"1px solid #f1f5f9", padding:"12px 0 0" }}>
                <div style={{ padding:"0 16px 8px", fontSize:11, fontWeight:800, color:"#334B71",
                  textTransform:"uppercase", letterSpacing:".04em" }}>Services</div>
                <div style={{ maxHeight:160, overflowY:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ background:"#f8fafc" }}>
                        <th style={{ padding:"8px 16px", textAlign:"left", fontWeight:700,
                          color:"#334B71", fontSize:11, textTransform:"uppercase", letterSpacing:".04em",
                          borderBottom:"1px solid #f1f5f9" }}>Service Name</th>
                        <th style={{ padding:"8px 16px", textAlign:"left", fontWeight:700,
                          color:"#334B71", fontSize:11, textTransform:"uppercase", letterSpacing:".04em",
                          borderBottom:"1px solid #f1f5f9" }}>Doctor / Therapist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.filter(s => s.value !== "0").map((s, i) => (
                        <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                          <td style={{ padding:"8px 16px", color:"#334B71" }}>{s.label || s.serviceName || "—"}</td>
                          <td style={{ padding:"8px 16px", color:"#64748b" }}>{s.doctorName || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Before Call Parameters */}
        <div className="cd-card">
          <div className="cd-sec-title">Before Call Parameters</div>
          <div className="cd-grid">
            <div>
              <span className="cd-label">Customer Type</span>
              <div style={{ padding:"9px 12px", background:"#f8fafc", border:"1px solid #e7ecf4",
                borderRadius:8, fontSize:13, color:"#334B71", fontWeight:600 }}>
                {details?.customerType || "—"}
              </div>
            </div>
            <div>
              <label className="cd-label">Future Appointment Taken</label>
              <select className="cd-inp" value={formData.futureAppointmentTaken} disabled={loading}
                onChange={e => handleChange("futureAppointmentTaken", e.target.value)}>
                <option value="0">Select</option>
                <option value="1">Yes</option>
                <option value="2">No</option>
              </select>
            </div>
          </div>
        </div>

        {/* After Call Parameters */}
        <div className="cd-card">
          <div className="cd-sec-title">After Call Parameters</div>
          <div className="cd-grid">
            <div>
              <label className="cd-label">Google Review</label>
              <select className="cd-inp" value={formData.googleReview} disabled={loading}
                onChange={e => handleChange("googleReview", e.target.value)}>
                <option value="0">Select</option>
                <option value="1">Yes</option>
                <option value="2">No</option>
              </select>
            </div>
            <div>
              <label className="cd-label">Received Post Care Communication</label>
              <select className="cd-inp" value={formData.receivedPostCareCmmunication} disabled={loading}
                onChange={e => handleChange("receivedPostCareCmmunication", e.target.value)}>
                <option value="0">Select</option>
                <option value="1">Yes</option>
                <option value="2">No</option>
              </select>
            </div>
            <div>
              <label className="cd-label">Received Invoice</label>
              <select className="cd-inp" value={formData.receivedInvoice} disabled={loading}
                onChange={e => handleChange("receivedInvoice", e.target.value)}>
                <option value="0">Select</option>
                <option value="1">Yes</option>
                <option value="2">No</option>
              </select>
            </div>
            <div>
              <label className="cd-label">Customer Feedback</label>
              <select className="cd-inp" value={formData.customerFeedback} disabled={loading}
                onChange={e => handleChange("customerFeedback", e.target.value)}>
                <option value="">Select</option>
                <option>Satisfied client</option>
                <option>Price Conscious</option>
                <option>Process related complaints</option>
                <option>Infrastructure</option>
                <option>Adverse reaction of service</option>
                <option>Waiting Time</option>
                <option>Not satisfied with employee</option>
                <option>Not satisfied with service experience</option>
              </select>
            </div>
            <div>
              <label className="cd-label">Overall Satisfied</label>
              <select className="cd-inp" value={formData.overallSatisfied} disabled={loading}
                onChange={e => handleChange("overallSatisfied", e.target.value)}>
                <option value="0">Select</option>
                <option value="1">Yes</option>
                <option value="2">No</option>
              </select>
            </div>
            <div>
              <label className="cd-label">Experience Rating (1–5)</label>
              <select className="cd-inp" value={formData.experienceRating} disabled={loading}
                onChange={e => handleChange("experienceRating", e.target.value)}>
                <option value="">Select</option>
                {["1","2","3","4","5"].map(s => <option key={s} value={s}>{s} ★</option>)}
              </select>
            </div>
            <div>
              <label className="cd-label">Call Center Agent Rating (1–5)</label>
              <select className="cd-inp"
                value={formData.agentRating === "" ? "" : Number(formData.agentRating)}
                disabled={loading}
                onChange={e => handleChange("agentRating", e.target.value === "" ? "" : Number(e.target.value))}>
                <option value="">Select</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
            <div>
              <label className="cd-label">Customer Complaint for Service</label>
              <select className="cd-inp" value={formData.customerComplaintforService} disabled={loading}
                onChange={e => handleChange("customerComplaintforService", e.target.value)}>
                {services.length === 0 ? (
                  <option value="">Loading...</option>
                ) : (
                  <>
                    {!services.some(s => String(s?.value) === "0") && <option value="">Select</option>}
                    {services.map((s, idx) => (
                      <option key={`${s.value}-${idx}`} value={String(s.value)}>
                        {(s.name ?? "").trim() || ""}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Remarks — full width row */}
          <div className="cd-grid-2" style={{ marginTop:16 }}>
            <div>
              <label className="cd-label">Customer Remarks</label>
              <textarea className="cd-inp" value={formData.customerComplaintRemarks} disabled={loading}
                placeholder="ملاحظات العميل سواء جيدة أو سيئة"
                onChange={e => handleChange("customerComplaintRemarks", e.target.value)} />
            </div>
            <div>
              <label className="cd-label">Agent Decision</label>
              <textarea className="cd-inp" value={formData.agentdecision} disabled={loading}
                placeholder="قرارك والدخل المحسبي من ذلك العميل بخصوص الملاحظة"
                onChange={e => handleChange("agentdecision", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Action buttons — bottom */}
        <div style={{ display:"flex", gap:10, paddingTop:4 }}>
          <button className="cd-btn cd-btn-pri" onClick={() => handleSubmit(1)} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
          <button className="cd-btn cd-btn-pri" onClick={() => handleSubmit(2)} disabled={loading}>
            {loading ? "Submitting…" : "Submit"}
          </button>
          <button className="cd-btn cd-btn-sec" onClick={() => navigate(-1)} disabled={loading}>Back</button>
        </div>

        {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      </div>

      {loading && (
        <div style={{ position:"fixed", inset:0, background:"rgba(255,255,255,.6)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:40, height:40, border:"4px solid #334B71",
            borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </>
  );
};

export default CourtesyCallDetails;