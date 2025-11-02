import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Toast from "../../components/Toast";

const CourtesyCallDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const referenceID = new URLSearchParams(location.search).get("referenceID");

  const [details, setDetails] = useState(null);
  const [services, setServices] = useState([]); // For "Customer Complaint for Service"
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [sessionUserId, setSessionUserId] = useState(""); // from /api/session/get

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
      await fetchSessionUserId();
      await fetchDetails();
      await fetchServices();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceID]);

  const fetchSessionUserId = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/session/get`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      const id =
        data?.userId ||
        data?.userID ||
        data?.UserID ||
        data?.user?.id ||
        data?.session?.userId ||
        "";
      if (id) {
        setSessionUserId(String(id));
        setFormData((prev) => ({ ...prev, createdBy: String(id) }));
      }
    } catch {
      /* fallback to "system" */
    }
  };

  const fetchDetails = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Courtesy/LoadCourtesyDetails/${referenceID}`,
        { credentials: "include" }
      );
      const data = await res.json();

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
        createdBy: sessionUserId || prev.createdBy || "system",
      }));
    } catch (err) {
      console.error("Failed to fetch details", err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Courtesy/LoadCourtesyServices/${referenceID}`,
        { credentials: "include" }
      );
      const data = await res.json();
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

      isDraft,
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
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

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
      <div className="cc-wrapper">
        <style>{`
          .cc-breadcrumb { font-size: 14px; margin-bottom: 20px; color: #666; }
          .cc-header { display: flex; flex-wrap: wrap; gap: 40px; justify-content: space-between; font-size: 15px; margin: 30px 0; }
          .cc-header div { min-width: 327px; max-width: 327px; }
          .cc-section-label { font-weight: bold; margin: 30px 0 15px; display: inline-block; padding: 6px 12px; background: #e2e2e2; border-radius: 4px; font-size: 14px; }
          .cc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px 30px; align-items: start; margin: 12px 0 0; }
          .cc-group { display: flex; flex-direction: column; }
          .cc-group label { margin-bottom: 12px; font-weight: 600; color: #333; font-size: 14px; }
          .cc-group select, .cc-group textarea { padding: 8px 10px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px; }
          textarea { resize: vertical; min-height: 80px; }
          .cc-actions { margin-top: 30px; display: flex; gap: 15px; flex-wrap: wrap; }
          .cc-actions button { padding: 10px 20px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; color: white; }
          .cc-btn-save { background-color: #334b71; }
          .cc-btn-submit { background-color: #334b71; }
          .cc-btn-back { background-color: #6c757d; }
          .cc-group span { font-size: 15px; display: inline-block; margin: 0 0 5px; font-weight: 400; }
          .cc-header strong { font-weight: 700; }
          @media (max-width: 768px) { .cc-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); } }
        `}</style>

        <div className="breadcrumb">
          <span
            className="breadcrumb-link"
            onClick={(e) => {
              e.preventDefault();
              navigate(-1);
            }}
          >
            Courtesy Call
          </span>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">Courtesy Call Details</span>
        </div>

        <br />
        <h1 className="page-title">Details: {referenceID}</h1>

        {details && (
          <div className="cc-header">
            <div className="cc-hd-cell">
              <strong>Reference ID:</strong> {details.referenceID}
            </div>
            <div className="cc-hd-cell">
              <strong>Appointment Date:</strong> {details.appointmentDate}
            </div>
            <div className="cc-hd-cell">
              <strong>Customer Name:</strong> {details.custName}
            </div>
            <div className="cc-hd-cell">
              <strong>Mobile No:</strong> {details.mobileNo}
            </div>
            <div className="cc-hd-cell">
              <strong>Services:</strong> {details.servies}
            </div>
            <div className="cc-hd-cell">
              <strong>Category:</strong> {details.category}
            </div>
            <div className="cc-hd-cell">
              <strong>Sub Category:</strong> {details.subCategory}
            </div>
            <div className="cc-hd-cell">
              <strong>Therapist/ Doctors:</strong> {details.therapist}
            </div>
          </div>
        )}

        <div className="cc-section-label">Before Call Parameters :</div>
        <div className="cc-grid">
          <div className="cc-group">
            <label>
              Customer Type: <span>{details?.customerType}</span>
            </label>
          </div>

          <div className="cc-group">
            <label>Future Appointment Taken:</label>
            <select
              value={formData.futureAppointmentTaken}
              onChange={(e) =>
                handleChange("futureAppointmentTaken", e.target.value)
              }
              disabled={loading}
            >
              <option value="0">Select</option>
              <option value="1">Yes</option>
              <option value="2">No</option>
            </select>
          </div>
        </div>

        <div className="cc-section-label">After Call Parameters :</div>
        <div className="cc-grid">
          <div className="cc-group">
            <label>Google Review:</label>
            <select
              value={formData.googleReview}
              onChange={(e) => handleChange("googleReview", e.target.value)}
              disabled={loading}
            >
              <option value="0">Select</option>
              <option value="1">Yes</option>
              <option value="2">No</option>
            </select>
          </div>

          <div className="cc-group">
            <label>Received Post Care Communication:</label>
            <select
              value={formData.receivedPostCareCmmunication}
              onChange={(e) =>
                handleChange("receivedPostCareCmmunication", e.target.value)
              }
              disabled={loading}
            >
              <option value="0">Select</option>
              <option value="1">Yes</option>
              <option value="2">No</option>
            </select>
          </div>

          <div className="cc-group">
            <label>Received Invoice:</label>
            <select
              value={formData.receivedInvoice}
              onChange={(e) => handleChange("receivedInvoice", e.target.value)}
              disabled={loading}
            >
              <option value="0">Select</option>
              <option value="1">Yes</option>
              <option value="2">No</option>
            </select>
          </div>

          <div className="cc-group">
            <label>Customer Feedback:</label>
            <select
              value={formData.customerFeedback}
              onChange={(e) => handleChange("customerFeedback", e.target.value)}
              disabled={loading}
            >
              <option value=""></option>
              <option value="Satisfied client">Satisfied client</option>
              <option value="Price Conscious">Price Conscious</option>
              <option value="Process related complaints">Process related complaints</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Adverse reaction of service">Adverse reaction of service</option>
              <option value="Waiting Time">Waiting Time</option>
              <option value="Not satisfied with employee">Not satisfied with employee</option>
              <option value="Not satisfied with service experience">Not satisfied with service experience</option>
            </select>
          </div>

          <div className="cc-group">
            <label>Overall Satisfied ?</label>
            <select
              value={formData.overallSatisfied}
              onChange={(e) => handleChange("overallSatisfied", e.target.value)}
              disabled={loading}
            >
              <option value="0">Select</option>
              <option value="1">Yes</option>
              <option value="2">No</option>
            </select>
          </div>

          <div className="cc-group">
            <label>Experience Rating (1–5):</label>
            <select
              value={formData.experienceRating}
              onChange={(e) => handleChange("experienceRating", e.target.value)}
              disabled={loading}
            >
              <option value="">Select</option>
              {["1", "2", "3", "4", "5"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="cc-group">
            <label>Call Center Agent Rating (1–5):</label>
            <select
              value={formData.agentRating === "" ? "" : Number(formData.agentRating)}
              onChange={(e) =>
                handleChange(
                  "agentRating",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              disabled={loading}
            >
              <option value="">Select</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="cc-group">
            <label>Customer Complaint for Service:</label>
            <select
              value={formData.customerComplaintforService}
              onChange={(e) =>
                handleChange("customerComplaintforService", e.target.value)
              }
              disabled={loading}
            >
              {services.length === 0 ? (
                <option value="">Loading...</option>
              ) : (
                <>
                  {!services.some((s) => String(s?.value) === "0") && (
                    <option value="">Select</option>
                  )}
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

        <div className="cc-grid">
          <div className="cc-group">
            <label>Customer Remarks:</label>
            <textarea
              value={formData.customerComplaintRemarks}
              onChange={(e) =>
                handleChange("customerComplaintRemarks", e.target.value)
              }
              placeholder="ملاحظات العميل سواء جيدة أو سيئة"
              disabled={loading}
            />
          </div>

          <div className="cc-group">
            <label>Agent Decision:</label>
            <textarea
              value={formData.agentdecision}
              onChange={(e) => handleChange("agentdecision", e.target.value)}
              placeholder="قرارك والدخل المحسبي من ذلك العميل بخصوص الملاحظة"
              disabled={loading}
            />
          </div>
        </div>

        <div className="cc-actions">
          <button className="cc-btn-save" onClick={() => handleSubmit(1)} disabled={loading}>
            Save
          </button>
          <button className="cc-btn-submit" onClick={() => handleSubmit(0)} disabled={loading}>
            Submit
          </button>
          <button className="cc-btn-back" onClick={() => navigate(-1)} disabled={loading}>
            Back
          </button>
        </div>

        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </div>

      {loading && (
        <div className="loader-wrapper">
          <div className="loader"></div>
        </div>
      )}
    </>
  );
};

export default CourtesyCallDetails;
