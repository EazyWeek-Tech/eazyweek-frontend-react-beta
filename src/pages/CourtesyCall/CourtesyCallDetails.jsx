import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Toast from "../../components/Toast";

const CourtesyCallDetails = () => {
  const location = useLocation();
    const navigate = useNavigate();

  const referenceID = new URLSearchParams(location.search).get("referenceID");

  const [details, setDetails] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

const [formData, setFormData] = useState({
  futureAppointmentTaken: "0",
  googleReview: "0",
  receivedPostCareCmmunication: "0",
  receivedInvoice: "0",
  overallSatisfied: "0",
  customerComplaintforService: "0",
  experienceRating: "",
  agentRating: ""
});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (referenceID) {
      fetchDetails();
      fetchServices();
    }
  }, [referenceID]);

  const mapYesNo = (val) => {
  if (val === true || String(val).trim().toUpperCase() === "YES" || String(val) === "1") return "1";
  if (val === false || String(val).trim().toUpperCase() === "NO" || String(val) === "2") return "2";
  return "0";
};


  const fetchDetails = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Courtesy/LoadCourtesyDetails/${referenceID}`, {
        credentials: "include"
      });
      const data = await res.json();
      console.log(data)
      setDetails(data);
      setFormData({
  referenceID: data.referenceID,
  customerType: data.customerType || "New",

  // YES/NO fields → 1/2/0
  futureAppointmentTaken: mapYesNo(data.futureAppointmentTaken),
  googleReview: mapYesNo(data.googleReview),
  receivedPostCareCmmunication: mapYesNo(data.receivedPostCareCmmunication),
  receivedInvoice: mapYesNo(data.receivedInvoice),
  overallSatisfied: mapYesNo(data.overallSatisfied),
  customerComplaintforService: mapYesNo(data.customerComplaintforService),

  // Ratings come as "" or a number/string — keep as string for <select>
  experienceRating: data.experienceRating ? String(data.experienceRating) : "",
  agentRating: data.agentRating ? String(data.agentRating) : "",

  // Free-text fields (leave as-is)
  customerComplaintRemarks: data.customerComplaintRemarks || "",
  agentdecision: data.agentdecision || "",
  complaintDetails: data.complaintDetails || "",

  isDraft: 0,
  createdBy: "system",
});



      console.log("Dropdown values:", {
  googleReview: data.googleReview,
  futureAppointmentTaken: data.futureAppointmentTaken,
  receivedInvoice: data.receivedInvoice,
  overallSatisfied: data.overallSatisfied
});
    } catch (err) {
      console.error("Failed to fetch details", err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Courtesy/LoadCourtesyServices/${referenceID}`, {
        credentials: "include"
      });
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error("Failed to fetch services", err);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (isDraft) => {
    const payload = {
  ...formData,
  isDraft,
  referenceID: formData.referenceID || referenceID,
  createdBy: formData.createdBy || "system",
};

setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/Courtesy/CourtesyDetailsInsert`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: "success", message: "Saved successfully!" });
      } else {
        setToast({ type: "error", message: "Failed to save." });
      }
    } catch (err) {
      console.error("Failed to submit", err);
      setToast({ type: "error", message: "Error submitting data." });
    } finally {
    setLoading(false); // Hide loader
  }
  };

 

  return (
    <>
    <div className="cc-wrapper">
     <style>{`
        

        .cc-breadcrumb {
          font-size: 14px;
          margin-bottom: 20px;
          color: #666;
        }

        .cc-header {
          display: flex;
          flex-wrap: wrap;
          gap: 40px;
          justify-content: space-between;
          font-size: 15px;
          margin: 30px 0;
        }

        .cc-header div {
          min-width: 327px;
          max-width: 327px;
        }

        .cc-section-label {
          font-weight: bold;
          margin: 30px 0 15px;
          display: inline-block;
          padding: 6px 12px;
          background: #e2e2e2;
          border-radius: 4px;
          font-size: 14px;
        }

        .cc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px 30px;
          align-items: start;
          margin: 12px 0 0;
        }

        .cc-group {
          display: flex;
          flex-direction: column;
        }

        .cc-group label {
          margin-bottom: 12px;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .cc-group select,
        .cc-group textarea {
          padding: 8px 10px;
          border-radius: 4px;
          border: 1px solid #ccc;
          font-size: 14px;
        }

        textarea {
          resize: vertical;
          min-height: 80px;
        }

        .cc-actions {
          margin-top: 30px;
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .cc-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          color: white;
        }

        .cc-btn-save {
          background-color: #28a745;
        }

        .cc-btn-submit {
          background-color: #007bff;
        }

        .cc-btn-back {
          background-color: #6c757d;
        }

        .cc-btn-save:hover {
          background-color: #218838;
        }

        .cc-btn-submit:hover {
          background-color: #0069d9;
        }

        .cc-btn-back:hover {
          background-color: #5a6268;
        }
          .cc-group span{font-size: 15px;display: inline-block; margin: 0 0 5px; font-weight: 400;}
        .cc-header strong{font-weight: 700; }
        @media (max-width: 768px) {
          .cc-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
        }
      `}</style>

      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={(e) => { e.preventDefault(); navigate(-1); }}>
          Courtesy Call
        </span>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Courtesy Call Details</span>
      </div>
        <br></br>
<h1 className="page-title">Details: {referenceID}</h1>
     {details && (
        <div className="cc-header">
          <div className="cc-hd-cell"><strong>Reference ID:</strong> {details.referenceID}</div>
          <div className="cc-hd-cell"><strong>Appointment Date:</strong> {details.appointmentDate}</div>
          <div className="cc-hd-cell"><strong>Customer Name:</strong> {details.custName}</div>
          <div className="cc-hd-cell"><strong>Mobile No:</strong> {details.mobileNo}</div>
          <div className="cc-hd-cell"><strong>Services:</strong> {details.servies}</div>
          <div className="cc-hd-cell"><strong>Category:</strong> {details.category}</div>
          <div className="cc-hd-cell"><strong>Sub Category:</strong> {details.subCategory}</div>
          <div className="cc-hd-cell"><strong>Therapist/ Doctors:</strong> {details.therapist}</div>
        </div>
      )}

      <div className="cc-section-label">Before Call Parameters :</div>
      <div className="cc-grid">
        <div className="cc-group">
          <label>Customer Type:  <span>{details?.customerType}</span></label>
         
        </div>
        <div className="cc-group">
          <label>Future Appointment Taken:</label>
           <select value={formData.futureAppointmentTaken} onChange={(e) => handleChange("futureAppointmentTaken", e.target.value)}>
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
            <select value={formData.googleReview} onChange={(e) => handleChange("googleReview", e.target.value)}>
        <option value="0">Select</option>
        <option value="1">Yes</option>
        <option value="2">No</option>
      </select>
        </div>
        <div className="cc-group">
          <label>Received Post Care Communication:</label>
          <select value={formData.receivedPostCareCmmunication} onChange={(e) => handleChange("receivedPostCareCmmunication", e.target.value)}>
        <option value="0">Select</option>
        <option value="1">Yes</option>
        <option value="2">No</option>
      </select>
        </div>
        <div className="cc-group">
          <label>Received Invoice:</label>
         <select value={formData.receivedInvoice} onChange={(e) => handleChange("receivedInvoice", e.target.value)}>
        <option value="0">Select</option>
        <option value="1">Yes</option>
        <option value="2">No</option>
      </select>
        </div>
        <div className="cc-group">
          <label>Customer Feedback:</label>
          <select value={formData.customerComplaintRemarks} onChange={(e) => handleChange("customerComplaintRemarks", e.target.value)}>
            <option value="0">Select</option>
            <option value="1">Yes</option>
            <option value="2">No</option>
          </select>
        </div>
        <div className="cc-group">
          <label>Overall Satisfied ?</label>
          <select value={formData.overallSatisfied} onChange={(e) => handleChange("overallSatisfied", e.target.value)}>
        <option value="0">Select</option>
        <option value="1">Yes</option>
        <option value="2">No</option>
      </select>
        </div>
        <div className="cc-group">
        <label>Experience Rating (1–5):</label>
        <select value={formData.experienceRating} onChange={(e) => handleChange("experienceRating", e.target.value)}>
          <option value="">Select</option>
          {[1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>
         <div className="cc-group">
        <label>Call Center Agent Rating (1–5):</label>
        <select value={formData.agentRating} onChange={(e) => handleChange("agentRating", e.target.value)}>
          <option value="">Select</option>
          {[1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>
        <div className="cc-group">
          <label>Customer Complaint for Service:</label>
         <select value={formData.customerComplaintforService} onChange={(e) => handleChange("customerComplaintforService", e.target.value)}>
        <option value="0">Select</option>
        <option value="1">Yes</option>
        <option value="2">No</option>
      </select>
        </div>
      </div>

      <div className="cc-grid">
        <div className="cc-group">
          <label>Customer Remarks:</label>
          <textarea value={formData.customerComplaintRemarks} onChange={(e) => handleChange("customerComplaintRemarks", e.target.value)} placeholder="ملاحظات العميل سواء جيدة أو سيئة" />
        </div>
         <div className="cc-group">
          <label>Agent Decision:</label>
          <textarea value={formData.agentdecision} onChange={(e) => handleChange("agentdecision", e.target.value)} placeholder="قرارك والدخل المحسبي من ذلك العميل بخصوص الملاحظة" />
        </div>
      </div>
      <div className="cc-actions">
       <button className="cc-btn-save" onClick={() => handleSubmit(1)}>Save</button>
<button className="cc-btn-submit" onClick={() => handleSubmit(0)}>Submit</button>

        <button className="cc-btn-back" onClick={() => navigate(-1)}>Back</button>
      </div>

      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
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
