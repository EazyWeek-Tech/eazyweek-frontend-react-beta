// src/pages/Opportunity/OppCustomerDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const DISPOSITION_OPTIONS = [
  { value: "", label: "" },
  { value: "LS008", label: "Converted" },
  { value: "LS009", label: "Bad Lead" },
  { value: "LS010", label: "No response" },
  { value: "LS011", label: "Not Converted" },
  { value: "LS012", label: "Appointment Booked" },
];

// Simple status mapping; tweak if your backend expects different strings
const inferOppStatusFromDisposition = (code) => {
  if (!code) return "Open";
  const closedSet = new Set(["LS008", "LS009", "LS010", "LS011"]); // Converted/Bad/No response/Not Converted
  return closedSet.has(code) ? "Closed" : "Open"; // Appointment Booked stays Open
};

// Safely read various casings the API might return for RECID
const getRecId = (row) => {
  if (!row) return 0;
  return (
    row.RECID ??
    row.recID ??
    row.recid ??
    row.RecID ??
    0
  );
};

const OppCustomerDetails = () => {
  const { oppCode, custId } = useParams();
  const { state } = useLocation(); // { row, header, isManual }
  const navigate = useNavigate();

  const [row, setRow] = useState(() => state?.row || null);
  const [header] = useState(() => state?.header || null);
  const [loading, setLoading] = useState(!state?.row);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    disposition: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);

  // fetch if opened directly
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
        setError("Failed to load customer details.");
      } finally {
        setLoading(false);
      }
    };
    fetchIfNeeded();
  }, [oppCode, custId, row]);

  const safe = (v) => (v === null || v === undefined ? "" : v);

  const top = useMemo(() => {
    // prefer row fields; fall back to header for general opp context
    return {
      custID: safe(row?.custID),
      custName: safe(row?.custName),
      custMobileNo: safe(row?.custMobileNo),
      category: safe(row?.category),
      appointmentDate: safe(row?.appointmentdatetime),
      therapist: safe(row?.therapistname),
      oppName: safe(header?.oppName || row?.oppName),
    };
  }, [row, header]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // 👉 New payload builder for UpdateOppDetails API
  const buildUpdatePayload = () => {
    const recID = getRecId(row);
    const oppStatus = inferOppStatusFromDisposition(form.disposition);
    return {
      recID,                          // number
      disposition: form.disposition,  // string (e.g., "LS012")
      remarks: form.remarks,          // string
      oppCode,                        // string from route
      oppStatus,                      // "Open" | "Closed" (adjust as needed)
    };
  };

  const handleSaveOrSubmit = async (/* isDraft not needed for new API */) => {
    // light validation
    if (!form.disposition) {
      setError("Please select a Disposition before saving.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/Opportunity/UpdateOppDetails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildUpdatePayload()),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // On success: for "Submit" we navigate back; for "Save" we can stay.
      // Since both buttons now hit same API, treat second button as submit (navigate back).
      // You can split handlers if you want different UX.
      // Here we'll keep your existing semantics:
      // - First button: Save (stay)
      // - Second button: Submit (go back)
      // We'll detect which button called us via an argument (see below).
    } catch (e) {
      console.error(e);
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Separate wrappers to preserve your button semantics:
  const onClickSave = async () => {
    await handleSaveOrSubmit(true);   // stays on page
  };
  const onClickSubmit = async () => {
    const ok = await (async () => {
      // reuse same API; if it succeeds, navigate back
      try {
        await handleSaveOrSubmit(false);
        return true;
      } catch {
        return false;
      }
    })();
    if (ok) navigate(-1);
  };

  if (loading) {
    return <div className="load">Loading…</div>;
  }
  if (error) {
    return <div className="load" style={{ color: "#c33" }}>{error}</div>;
  }
  if (!row) {
    return <div className="load">No customer data found.</div>;
  }

  return (
    <>
      <div className="wrap">
        <div className="grid">
          <div className="col">
            <div className="pair"><span className="lab">Customer ID :</span> <span className="val">{top.custID}</span></div>
            <div className="pair"><span className="lab">Customer Name :</span> <span className="val">{top.custName}</span></div>
            <div className="pair"><span className="lab">Mobile No :</span> <span className="val">{top.custMobileNo}</span></div>
          </div>

          <div className="col">
            <div className="pair"><span className="lab">Paid For Category :</span> <span className="val">{top.category}</span></div>
            <div className="pair"><span className="lab">Recent Appointment Date :</span> <span className="val">{top.appointmentDate}</span></div>
            <div className="pair"><span className="lab">App with Therapist/Doctors :</span> <span className="val">{top.therapist}</span></div>
          </div>
        </div>

        <div className="formrow">
          <label className="lab" htmlFor="disposition">Disposition :</label>
          <select
            id="disposition"
            name="disposition"
            value={form.disposition}
            onChange={handleChange}
            className="inp"
          >
            {DISPOSITION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="formrow">
          <label className="lab" htmlFor="remarks">Remarks :</label>
          <textarea
            id="remarks"
            name="remarks"
            className="txta"
            rows={6}
            value={form.remarks}
            onChange={handleChange}
            placeholder=""
          />
        </div>

        <div className="btnrow">
          <button className="btn" disabled={saving} onClick={onClickSave}>Save</button>
          <button className="btn" disabled={saving} onClick={onClickSubmit}>Submit</button>
          <button className="btn" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      <style jsx="true">{`
        .wrap { background:#fff; padding:28px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:18px; }
        .col { display:grid; gap:12px; }
        .pair { font-size:15px; color:#333; }
        .lab { display:inline-block; min-width:180px; color:#555; font-weight:600; }
        .val { color:#222; }
        .formrow { display:flex; align-items:flex-start; gap:12px; margin:12px 0; }
        .inp { flex:1; max-width:520px; height:36px; padding:6px 8px; border:1px solid #d8dee9; border-radius:6px; background:#fff; }
        .txta { flex:1; max-width:520px; padding:8px; border:1px solid #d8dee9; border-radius:6px; resize:vertical; }
        .btnrow { display:flex; gap:14px; margin-top:10px; }
        .btn { background:#14233c; color:#fff; border:0; border-radius:8px; padding:10px 18px; font-weight:600; cursor:pointer; }
        .btn:disabled { opacity:.6; cursor:not-allowed; }
        .btn:hover:not(:disabled) { opacity:.95; }
        .load { padding:40px; text-align:center; color:#666; }
        @media (max-width: 900px) {
          .grid { grid-template-columns:1fr; }
          .lab { min-width:140px; }
        }
      `}</style>
    </>
  );
};

export default OppCustomerDetails;
