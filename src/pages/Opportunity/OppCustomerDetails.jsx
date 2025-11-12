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

// Numeric status expected by backend
const OPP_STATUS = {
  OPEN: '2',
  CLOSED: '2',
};

/** Map disposition -> numeric oppStatus.
 * Closed for: LS008, LS009, LS010, LS011
 * Open for: "", LS012
 */
const oppStatusFromDisposition = (code) => {
  if (!code || code === "LS012") return OPP_STATUS.OPEN; // empty or Appointment Booked
  const closedSet = new Set(["LS008", "LS009", "LS010", "LS011"]);
  return closedSet.has(code) ? OPP_STATUS.CLOSED : OPP_STATUS.OPEN;
};

// Safely read various casings the API might return for RECID
const getRecId = (row) => {
  if (!row) return 0;
  const id =
    row.RECID ??
    row.recID ??
    row.recid ??
    row.RecID ??
    0;
  return Number(id) || 0;
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

  // Prefill disposition/remarks from incoming state row (if any)
  useEffect(() => {
    if (state?.row) {
      setForm((p) => ({
        ...p,
        disposition: state.row.disposition ?? "",
        remarks: state.row.remarks ?? "",
      }));
    }
  }, [state?.row]);

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

        // prefill if found
        if (found) {
          setForm((p) => ({
            ...p,
            disposition: found.disposition ?? "",
            remarks: found.remarks ?? "",
          }));
        }
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

  // Build payload for UpdateOppDetails
  const buildUpdatePayload = () => {
    const recID = getRecId(row);
    const oppStatus = oppStatusFromDisposition(form.disposition); // numeric (1=open, 2=closed)
    return {
      recID,                          // number
      disposition: form.disposition,  // string (e.g., "LS012")
      remarks: form.remarks,          // string
      oppCode,                        // string
      oppStatus,                      // number
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
    try {
      data = await res.json();
    } catch {
      // ignore parse error; we'll still treat non-OK as failure
    }
    if (!res.ok) {
      const msg = data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (data && data.success === false) {
      throw new Error(data.message || "UpdateOppDetails returned success:false");
    }
    return data || {};
  };

  const handleSave = async () => {
    if (!form.disposition) {
      setError("Please select a Disposition before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await callUpdate();
      // stay on page for Save
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.disposition) {
      setError("Please select a Disposition before submitting.");
      return;
    }
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

  if (loading) {
    return <div className="load">Loading…</div>;
  }
  if (error && !row) {
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

        {error && (
          <div style={{ color: "#c33", margin: "8px 0" }}>
            {error}
          </div>
        )}

        <div className="btnrow">
          <button className="btn" disabled={saving} onClick={handleSave}>Save</button>
          <button className="btn" disabled={saving} onClick={handleSubmit}>Submit</button>
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
