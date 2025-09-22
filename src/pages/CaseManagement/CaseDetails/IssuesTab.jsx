import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { API_BASE_URL } from "../../../config";

const trim = (s) => (s ?? "").toString().trim();
const normCode = (s) => trim(s).toUpperCase().replace(/[^A-Z0-9]/g, ""); // strip dashes/spaces/punct
const normNameBase = (s) =>
  trim(s)
    .toLowerCase()
    .replace(/^dr\.?\s*/g, "")     // drop leading "Dr." variations w/ or w/o space
    .replace(/[^a-z0-9\s]/g, "")   // remove punctuation
    .replace(/\s+/g, " ");         // collapse spaces
const normNameNoSpace = (s) => normNameBase(s).replace(/\s+/g, ""); // also remove spaces

// Safe JSON helper
const fetchJSON = async (url) => {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const text = await res.text();

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0,180)}`);

  const ct = res.headers.get("content-type") || "";
  if (!/application\/json/i.test(ct)) {
    if (/session/i.test(text) || /login/i.test(text) || text.startsWith("<!DOCTYPE")) {
      throw new Error("Session expired or non-JSON response from server.");
    }
    throw new Error(`Expected JSON but got: ${text.slice(0,180)}`);
  }

  try { return JSON.parse(text); }
  catch { throw new Error(`Invalid JSON: ${text.slice(0,180)}`); }
};

const IssuesTab = forwardRef(({ data }, ref) => {
  const [formValues, setFormValues] = useState({ ...data });
  const [employees, setEmployees] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [therapistClicked, setTherapistClicked] = useState(false);
  const [responses, setResponses] = useState([]);

  useImperativeHandle(ref, () => ({
    getIssuesData: () => formValues,
  }));

  // Seed local state from incoming data
  useEffect(() => {
    if (!data) return;
    setFormValues((prev) => ({
      ...prev,
      issueDescription: data.issueDescription ?? prev.issueDescription ?? "",
      firstTimeResolution: data.firstTimeResolution ?? prev.firstTimeResolution ?? "",
      response: prev.response ?? "",
      clientThreat: data.clientThreat ?? prev.clientThreat ?? "",

      therapistName: trim(data.therapistName || data.therapist || prev.therapistName || ""),
      therapistCode: normCode(data.therapistCode || prev.therapistCode || ""),

      assignedTo: trim(data.assignedTo || prev.assignedTo || ""),
      assignToCode: trim(data.assignToCode || data.assignTOCode || prev.assignToCode || ""),

      employeeMobile: trim(data.employeeMobile || data.empMobileNo || prev.employeeMobile || ""),
      email: trim(data.email || data.assignedemailid || prev.email || ""),

      cc: trim((data.cc || prev.cc || "").replace(/\s*,\s*/g, ",").replace(/,+$/g, "")),
      moreCc: trim((data.moreCc || prev.moreCc || "").replace(/\s*,\s*/g, ",").replace(/,+$/g, "")),

      categorySpecificResolution: data.categorySpecificResolution || prev.categorySpecificResolution || "",
      remarks: data.remarks || prev.remarks || "",
    }));
  }, [data]);

  // Case responses (Actual)
  useEffect(() => {
    const run = async () => {
      try {
        const list = await fetchJSON(
          `${API_BASE_URL}/api/CaseOperation/CaseResponse/${data.caseNo}/ActualResponse`
        );
        console.log(list)
        setResponses(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("Error fetching responses:", e);
        setResponses([]);
      }
    };
    if (data?.caseNo) run();
  }, [data?.caseNo]);

  // Employees for "Assigned To"
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetchJSON(`${API_BASE_URL}/api/Employees`);
        const valid = (Array.isArray(res) ? res : []).filter(
          (e) => e.employeeCode && e.employeeName !== "Assign To"
        );
        const norm = valid.map((e) => ({
          ...e,
          employeeCode: trim(e.employeeCode),
          employeeName: trim(e.employeeName),
          mobileNo: trim(e.mobileNo),
          emailID: trim(e.emailID),
        }));
        setEmployees(norm);

        // Prefer selecting by code, then by name
        const code = trim(data?.assignToCode || data?.assignTOCode || formValues.assignToCode || "");
        const byCode = code ? norm.find((e) => e.employeeCode === code) : null;
        const byName = !byCode
          ? norm.find(
              (e) =>
                e.employeeName.toLowerCase() ===
                trim(data?.assignedTo || formValues.assignedTo || "").toLowerCase()
            )
          : null;
        const selected = byCode || byName;
        if (selected) {
          setFormValues((prev) => ({
            ...prev,
            assignedTo: selected.employeeName,
            assignToCode: selected.employeeCode,
            employeeMobile: selected.mobileNo || "",
            email: selected.emailID || "",
          }));
        }
      } catch (e) {
        console.error("Error fetching employees:", e);
        setEmployees([]);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.assignedTo, data?.assignToCode, data?.assignTOCode]);

  // Therapists: load + preselect (handles no-space names + dash codes)
  const fetchTherapists = async () => {
    try {
      const res = await fetchJSON(`${API_BASE_URL}/api/CaseDropDown/Medium/Doctors`);
      // shape: [{ name, code, value }, ...]
      const mapped = (Array.isArray(res) ? res : [])
        .filter((d) => trim(d.name) !== "< - Select one - >") // drop placeholder
        .map((d) => {
          const code = normCode(d.code || "");
          const name = trim(d.name || code);
          return code || name ? { code, name } : null;
        })
        .filter(Boolean);

      // Dedupe by code
      const seen = new Set();
      const list = mapped.filter((x) => {
        const k = x.code || `n:${x.name}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      setTherapists(list);

      // --- Preselect by code/name ---
      const haveCode = normCode(formValues.therapistCode);
      const haveName = trim(formValues.therapistName);

      // 1) exact code
      let sel = haveCode ? list.find((d) => d.code === haveCode) : null;

      // 2) exact name (normalized, with/without spaces)
      if (!sel && haveName) {
        const t1 = normNameBase(haveName);
        const t2 = normNameNoSpace(haveName);
        sel =
          list.find((d) => normNameBase(d.name) === t1 || normNameNoSpace(d.name) === t2) || null;
      }

      // 3) fuzzy includes (normalized)
      if (!sel && haveName) {
        const t1 = normNameBase(haveName);
        const t2 = normNameNoSpace(haveName);
        sel =
          list.find(
            (d) =>
              normNameBase(d.name).includes(t1) ||
              t1.includes(normNameBase(d.name)) ||
              normNameNoSpace(d.name).includes(t2) ||
              t2.includes(normNameNoSpace(d.name))
          ) || null;
      }

      if (sel) {
        setFormValues((prev) => ({
          ...prev,
          therapistCode: sel.code,
          therapistName: sel.name,
        }));
      }
    } catch (e) {
      console.error("Error fetching therapists:", e);
      setTherapists([]);
    }
  };

  // Auto-load therapists if we already have a code/name (so it preselects)
  useEffect(() => {
    if (!therapistClicked && (formValues.therapistCode || formValues.therapistName)) {
      fetchTherapists().finally(() => setTherapistClicked(true));
    }
  }, [formValues.therapistCode, formValues.therapistName, therapistClicked]);

  // Unified change handler
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (name === "assignToCode") {
      const v = trim(value);
      const selected = employees.find((emp) => emp.employeeCode === v);
      setFormValues((prev) => ({
        ...prev,
        assignToCode: selected?.employeeCode || "",
        assignedTo: selected?.employeeName || "",
        employeeMobile: selected?.mobileNo || "",
        email: selected?.emailID || "",
      }));
      return;
    }

    if (name === "therapistCode") {
      const v = normCode(value);
      const selected = therapists.find((doc) => doc.code === v);
      setFormValues((prev) => ({
        ...prev,
        therapistCode: selected?.code || v || "",
        therapistName: selected?.name || prev.therapistName || "",
      }));
      return;
    }

    if (name === "cc" || name === "moreCc") {
      const cleaned = trim(value.replace(/\s*,\s*/g, ",").replace(/,+$/g, ""));
      setFormValues((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
  };

  return (
    <form className="issueform tabform">
      <div className="form-group">
        <label>Issue Description</label>
        <textarea
          name="issueDescription"
          value={formValues.issueDescription || ""}
          onChange={handleChange}
          rows="5"
        />
      </div>

      <div className="form-group">
        <label>Attachment</label>
        <input type="file" name="attachment" onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Client Threat</label>
        <select name="clientThreat" value={formValues.clientThreat || ""} onChange={handleChange}>
          <option value="">-- Select --</option>
          <option value="Legal">Legal</option>
          <option value="Verbal">Verbal</option>
          <option value="Written">Written</option>
          <option value="Physical">Physical</option>
        </select>
      </div>

      <div className="form-group">
        <label>Therapist</label>
        <select
          name="therapistCode"
          value={normCode(formValues.therapistCode) || ""}
          onChange={handleChange}
          onClick={() => {
            if (!therapistClicked) {
              fetchTherapists();
              setTherapistClicked(true);
            }
          }}
        >
          <option value="">Select Therapist</option>
          {/* Fallback if current code not in list yet */}
          {normCode(formValues.therapistCode) &&
            !therapists.some((d) => d.code === normCode(formValues.therapistCode)) && (
              <option value={normCode(formValues.therapistCode)}>
                {formValues.therapistName || normCode(formValues.therapistCode)}
              </option>
            )}
          {therapists.map((doc, idx) => (
            <option key={idx} value={doc.code}>
              {doc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>First Time Resolution</label>
        <textarea
          name="firstTimeResolution"
          value={formValues.firstTimeResolution || ""}
          onChange={handleChange}
          rows="5"
        />
      </div>

      <div className="form-group">
        <label>Add Response</label>
        <textarea name="response" value={formValues.response || ""} onChange={handleChange} rows="5" />
      </div>

      <div className="form-group">
        <label>Assigned To</label>
        <select name="assignToCode" value={formValues.assignToCode || ""} onChange={handleChange}>
          <option value="">Select User</option>
          {formValues.assignToCode &&
            !employees.some((e) => e.employeeCode === formValues.assignToCode) && (
              <option value={formValues.assignToCode}>
                {formValues.assignedTo || formValues.assignToCode}
              </option>
            )}
          {employees.map((emp, index) => (
            <option key={index} value={emp.employeeCode}>
              {emp.employeeName}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Employee Mobile</label>
        <input
          type="text"
          name="employeeMobile"
          value={formValues.employeeMobile || ""}
          onChange={handleChange}
        />
      </div>

      <div className="tablewrp">
        <table cellSpacing={0} className="respTable">
          <thead>
            <tr className="Hrline">
              <th width="160">Response Code</th>
              <th>Details</th>
              <th>Response By</th>
            </tr>
          </thead>
          <tbody>
            {responses.length > 0 ? (
              responses.map((res, idx) => (
                <tr key={idx} className="Hrline">
                  <td>{res.responseCode || res.reseponseCode || "-"}</td>
                  <td>{res.responseDetails || res.details || "-"}</td>
                  <td>{res.responseBy || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>
                  No responses available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="emaildiv">
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" value={formValues.email || ""} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>CC</label>
          <input type="text" name="cc" value={formValues.cc || ""} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>More CC</label>
          <textarea name="moreCc" value={formValues.moreCc || ""} onChange={handleChange} rows="5" />
        </div>

        

        <div className="form-group">
          <label>Remarks</label>
          <textarea name="remarks" value={formValues.remarks || ""} onChange={handleChange} rows="5" />
        </div>
      </div>
    </form>
  );
});

export default IssuesTab;
