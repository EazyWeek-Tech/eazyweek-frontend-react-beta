import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

const CustomerFormHistory = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const custId = searchParams.get("custid") || "";
  const customerName = searchParams.get("fullname") || "Customer";
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const fetchForms = async () => {
      if (!custId) {
        setErr("Missing custid in URL.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr("");

        // GET with custId in path (as specified). If your API needs a body, add it.
       // inside useEffect -> fetchForms
const res = await fetch(
  `${API_BASE_URL}/api/consultation/get/${encodeURIComponent(custId)}`,
  {
    method: "GET",
    credentials: "include",
  }
);

if (!res.ok) throw new Error(`Failed to load forms (${res.status})`);
const data = await res.json();
const list = Array.isArray(data) ? data : (data ? [data] : []);
setForms(list);

      } catch (e) {
        console.error(e);
        setErr("Failed to load consultation forms.");
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [custId]);

  const viewForm = (form) => {
    // Navigate to your consultation view/editor with params
    const qp = new URLSearchParams();
    qp.set("custid", form.custId || custId);
    if (customerName) qp.set("custname", customerName);
    if (form.appointmentId) qp.set("appointmentid", form.appointmentId);
    navigate(`/consultation?${qp.toString()}`);
  };

  return (
    <div className="frbformlistpg">
      <h2>Consultation</h2>
      

      {loading ? (
        <div>Loading…</div>
      ) : err ? (
        <div style={{ color: "crimson" }}>{err}</div>
      ) : (
        <table className="frbformtable">
          <thead>
            <tr>
              <th>Appointment Date</th>
              <th>Form Filled Date</th>   
              <th>Filled</th>    
              <th>Filled by</th>       
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    {forms.length === 0 ? (
      <tr>
        <td colSpan="5" style={{ textAlign: "center" }}>
          No forms found.
        </td>
      </tr>
    ) : (
      forms.map((f) => {
        const apptDate =
          f.appointmentDate ? new Date(f.appointmentDate).toLocaleDateString() : "-";
        const filledDate =
          f.signatureDate ? new Date(f.signatureDate).toLocaleDateString() : "-";
        const isFilled = Boolean(f.signatureDate);

        return (
          <tr key={f.id}>
            <td>{apptDate}</td>
            <td>{filledDate}</td>
            <td>
              {isFilled ? (
                <span className="filledpill">
                  <span className="check">✓</span> Filled
                </span>
              ) : (
                <span className="unfilledpill">—</span>
              )}
            </td>
            <td>
              {f.providerName}
            </td>
            <td>
              <button onClick={() => viewForm(f)}>View</button>
            </td>
          </tr>
        );
      })
    )}
  </tbody>
        </table>
      )}

      <style>{`
      .frbformlistpg h2{font-size: 20px; line-height: 28px; margin: 0 0 20px;   }
        .frbformlistpg { padding: 20px; font-family: Arial, sans-serif; width: 80%; }
        .frbformtable { width: 100%; border-collapse: collapse; margin-top: 10px;background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
    overflow: hidden; }
        .frbformtable td {padding: 12px 18px;
    font-size: 14px;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
 }
        .frbformtable th { background: #f8fafc;
    color: #0f172a;
    font-weight: 700;
    font-size: 14px;
    text-align: left;
    padding: 14px 18px;
    border-bottom: 1px solid #e2e8f0;
    letter-spacing: .2px; }
        .frbformtable button { background-color: #334b71; color: #fff; padding: 5px 12px; border: none; border-radius: 4px; cursor: pointer; }
        .frbformtable button:hover { background-color: #0056b3; }
      `}</style>
    </div>
  );
};

export default CustomerFormHistory;
