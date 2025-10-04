import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { API_BASE_URL } from "../../../config";

const trim = (s) => (s ?? "").toString().trim();
const normCode = (s) => trim(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
const normNameBase = (s) =>
  trim(s)
    .toLowerCase()
    .replace(/^dr\.?\s*/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    const t = trim(v);
    if (t) return t;
  }
  return "";
};

// email helpers
const splitEmails = (s) =>
  (s ?? "")
    .toString()
    .replace(/;/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const normalizeEmailList = (s) => {
  const seen = new Set();
  const out = [];
  for (const p of splitEmails(s)) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out.join(",");
};

// Safe JSON fetch
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

// read logged-in user (code + name) from sessionStorage (same approach as parent)
const readSessionUser = () => {
  const get = (k) => (sessionStorage.getItem(k) ?? "").toString();
  const objKeys = ["user", "userDetails", "currentUser", "authUser", "sessionUser"];
  let code = "", name = "", firstName = "", lastName = "";

  for (const k of objKeys) {
    const raw = sessionStorage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      code = firstNonEmpty(code, obj.userId, obj.userID, obj.employeeCode, obj.empCode, obj.code);
      firstName = firstNonEmpty(firstName, obj.firstName, obj.firstname, obj.FirstName);
      lastName  = firstNonEmpty(lastName,  obj.lastName,  obj.lastname,  obj.LastName);
      name = firstNonEmpty(
        name,
        obj.userName,
        obj.username,
        obj.name,
        (firstName || lastName) ? `${firstName || ""} ${lastName || ""}` : ""
      );
    } catch {}
  }
  code = firstNonEmpty(code, get("userId"), get("userid"), get("employeeCode"), get("empCode"));
  firstName = firstNonEmpty(firstName, get("firstName"), get("firstname"), get("FirstName"));
  lastName  = firstNonEmpty(lastName,  get("lastName"),  get("lastname"),  get("LastName"));
  name = firstNonEmpty(name, get("userName"), get("username"),
    (firstName || lastName) ? `${firstName || ""} ${lastName || ""}` : ""
  );

  if (!code && !name && !firstName && !lastName) return null;
  const fullName = firstNonEmpty(`${firstName} ${lastName}`.trim(), name);
  return { code: trim(code), fullName: trim(fullName), name: trim(name) };
};

/**
 * Props:
 *  - data
 *  - assignedToName
 *  - assignedToCode
 *  - onResponseChange?: (hasResponse: boolean, responseText: string) => void
 */
const IssuesTab = forwardRef(({ data, assignedToName, assignedToCode, onResponseChange }, ref) => {
  const [formValues, setFormValues] = useState({ ...data });
  const [employees, setEmployees] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [therapistClicked, setTherapistClicked] = useState(false);
  const [responses, setResponses] = useState([]);

  // Hierarchy
  const [hierarchy, setHierarchy] = useState(null);
  const [hierLoading, setHierLoading] = useState(false);
  const [hierErr, setHierErr] = useState("");

  // Expose to parent
  useImperativeHandle(ref, () => ({
    getIssuesData: () => formValues,
    hasResponse: () => trim(formValues.response) !== "",
    reloadResponses: () => loadResponses(),
  }));

  // Notify parent about response field status
  useEffect(() => {
    if (typeof onResponseChange === "function") {
      onResponseChange(trim(formValues.response) !== "", formValues.response ?? "");
    }
  }, [formValues.response, onResponseChange]);

  // Seed from case (ignore CaseDetails CC; derive from hierarchy)
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

      assignedTo: firstNonEmpty(assignedToName, data.assignedTo, prev.assignedTo, ""),

      assignToCode: firstNonEmpty(
        assignedToCode,
        data.assignToCode,
        data.assignTOCode,
        prev.assignToCode,
        ""
      ),

      employeeMobile: trim(data.employeeMobile || data.empMobileNo || prev.employeeMobile || ""),
      email: trim(data.email || data.assignedemailid || prev.email || ""),

      cc: "", // derive from hierarchy
      moreCc: trim((data.moreCc || prev.moreCc || "").replace(/\s*,\s*/g, ",").replace(/,+$/g, "")),

      categorySpecificResolution: data.categorySpecificResolution || prev.categorySpecificResolution || "",
      remarks: data.remarks || prev.remarks || "",
    }));
  }, [data?.caseNo]); // only when case changes

  // Responses
  const loadResponses = async () => {
    if (!data?.caseNo) {
      setResponses([]);
      return;
    }
    try {
      const list = await fetchJSON(
        `${API_BASE_URL}/api/CaseOperation/CaseResponse/${data.caseNo}/ActualResponse`
      );
      const filtered = (Array.isArray(list) ? list : []).filter(
        (r) => trim(r.responseDetails || r.details) !== ""
      );
      setResponses(filtered);
    } catch (e) {
      console.error("Error fetching responses:", e);
      setResponses([]);
    }
  };
  useEffect(() => { loadResponses(); }, [data?.caseNo]);

  // Employees (for Next Assignee)
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetchJSON(`${API_BASE_URL}/api/Employees`);
        const valid = (Array.isArray(res) ? res : []).filter(
          (e) => e.employeeCode && e.employeeName !== "Assign To"
        );
        const normList = valid.map((e) => ({
          ...e,
          employeeCode: trim(e.employeeCode),
          employeeName: trim(e.employeeName),
          mobileNo: trim(e.mobileNo),
          emailID: trim(e.emailID),
        }));
        setEmployees(normList);

        const codeRaw = trim(
          firstNonEmpty(
            assignedToCode,
            data?.assignToCode,
            data?.assignTOCode,
            formValues.assignToCode
          )
        );
        const byCode = codeRaw ? normList.find((e) => e.employeeCode === codeRaw) : null;

        const nameRaw = trim(
          firstNonEmpty(
            assignedToName,
            data?.assignedTo,
            data?.assignTOName,
            data?.assignName,
            formValues.assignedTo
          )
        );
        const byName = !byCode && nameRaw ? normList.find((e) => e.employeeName === nameRaw) : null;

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
  }, [data?.assignedTo, data?.assignToCode, data?.assignTOCode, assignedToName, assignedToCode]);

  // Therapists
  const fetchTherapists = async () => {
    try {
      const res = await fetchJSON(`${API_BASE_URL}/api/CaseDropDown/Medium/Doctors`);
      const mapped = (Array.isArray(res) ? res : [])
        .filter((d) => trim(d.name) !== "< - Select one - >")
        .map((d) => {
          const code = normCode(d.code || "");
          const name = trim(d.name || code);
          return code || name ? { code, name } : null;
        })
        .filter(Boolean);

      const seen = new Set();
      const list = mapped.filter((x) => {
        const k = x.code || `n:${x.name}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      setTherapists(list);

      const haveCode = normCode(formValues.therapistCode);
      const haveName = trim(formValues.therapistName);
      let sel = haveCode ? list.find((d) => d.code === haveCode) : null;
      if (!sel && haveName) sel = list.find((d) => d.name === haveName) || null;

      if (sel) {
        setFormValues((prev) => ({ ...prev, therapistCode: sel.code, therapistName: sel.name }));
      }
    } catch (e) {
      console.error("Error fetching therapists:", e);
      setTherapists([]);
    }
  };
  useEffect(() => {
    if (!therapistClicked && (formValues.therapistCode || formValues.therapistName)) {
      fetchTherapists().finally(() => setTherapistClicked(true));
    }
  }, [formValues.therapistCode, formValues.therapistName, therapistClicked]);

  // --- Current Assignee display (prefer server fields) ---
  const currentAssigneeDisplay = firstNonEmpty(
  assignedToName,          // ← prefer URL (matches header's "Assigned To")
  data?.assignName,
  data?.assignToCode,
  formValues?.assignedTo,
  "-"
);

  // Fetch Case Hierarchy
  useEffect(() => {
    const cat  = trim(data?.caseCategory || data?.categoryName);
    const sub  = trim(data?.subCategoryName);
    const sub2 = trim(data?.subSubCategoryName);
    const sub3 = trim(data?.subSubSubCategoryName || "NA");

    if (!cat || !sub || !sub2) {
      setHierarchy(null);
      return;
    }

    const run = async () => {
      setHierLoading(true);
      setHierErr("");
      try {
        const url = `${API_BASE_URL}/api/CaseOperation/CaseHierarchyDB` +
          `?categoryName=${encodeURIComponent(cat)}` +
          `&subCategoryName=${encodeURIComponent(sub)}` +
          `&subSubCategoryName=${encodeURIComponent(sub2)}` +
          `&subSubSubCategoryName=${encodeURIComponent(sub3)}`;

        let res = await fetchJSON(url);

        if (Array.isArray(res)) {
          const hit = res.find(
            (r) =>
              trim(r?.categoryName).toLowerCase() === cat.toLowerCase() &&
              trim(r?.subCategoryName).toLowerCase() === sub.toLowerCase() &&
              trim(r?.subSubCategoryName).toLowerCase() === sub2.toLowerCase() &&
              trim(r?.subSubSubCategoryName || "NA").toLowerCase() === sub3.toLowerCase()
          );
          res = hit || null;
        }
        setHierarchy(res?.status ? res : res || null);
      } catch (err) {
        console.error("Hierarchy fetch failed:", err);
        setHierarchy(null);
        setHierErr("Hierarchy not found");
      } finally {
        setHierLoading(false);
      }
    };

    run();
  }, [
    data?.caseCategory,
    data?.categoryName,
    data?.subCategoryName,
    data?.subSubCategoryName,
    data?.subSubSubCategoryName,
  ]);

  // Determine CURRENT level
  const currentLevel = (() => {
    if (!hierarchy) return 0;
    const curr = normNameBase(currentAssigneeDisplay || "");
    if (!curr) return 0;

    const l1 = normNameBase(trim(hierarchy?.firstAssignement || ""));
    const l2 = normNameBase(trim(hierarchy?.secondAssignement || ""));
    const l3 = normNameBase(trim(hierarchy?.thirdAssignement || ""));

    if (l1 && curr === l1) return 1;
    if (l2 && curr === l2) return 2;
    if (l3 && curr === l3) return 3;
    return -1;
  })();

  // Determine NEXT assignee level (for CC)
  const nextAssigneeLevel = (() => {
    if (!hierarchy) return 0;
    const selected =
      employees.find((e) => e.employeeCode === trim(formValues.assignToCode)) || null;
    const selectedNameNorm = normNameBase(selected?.employeeName || formValues.assignedTo || "");
    if (!selectedNameNorm) return 0;

    const l1 = normNameBase(trim(hierarchy.firstAssignement || ""));
    const l2 = normNameBase(trim(hierarchy.secondAssignement || ""));
    if (l1 && selectedNameNorm === l1) return 1;
    if (l2 && selectedNameNorm === l2) return 2;
    return 0;
  })();

  // Compute CC from hierarchy rule
  const computedCc = (() => {
    if (!hierarchy) return "";
    const l1cc = normalizeEmailList(hierarchy.firstGroupAssignement || "");
    const l2cc = normalizeEmailList(hierarchy.secondGroupAssignement || "");

    if (nextAssigneeLevel === 2) return l2cc;
    if (nextAssigneeLevel === 1) return l1cc;

    if (currentLevel === 2) return l2cc;
    if (currentLevel === 1) return l1cc;

    return "";
  })();

  // Apply CC
  useEffect(() => {
    const ccFromRule = computedCc;
    if (trim(formValues.cc) !== ccFromRule) {
      setFormValues((prev) => ({ ...prev, cc: ccFromRule }));
    }
  }, [computedCc]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ If L2 is logged in AND is the current assignee, force the "Next Assignee" UI selection to "Assign To"
  const sessionUser = readSessionUser();
const isLoggedInCurrentAssignee = (() => {
  if (!sessionUser) return false;
  const byCode = !!trim(sessionUser.code) && trim(sessionUser.code) === trim(data?.assignToCode);
  // Prefer URL/display (same as header), then fall back to server name
  const targetName = firstNonEmpty(assignedToName, data?.assignName);
  const byName = normNameBase(sessionUser.fullName || sessionUser.name) === normNameBase(targetName || "");
  return byCode || byName;
})();


  const forceAssignToUI = currentLevel === 2 && isLoggedInCurrentAssignee;

  useEffect(() => {
    if (forceAssignToUI) {
      setFormValues((prev) => ({
        ...prev,
        assignToCode: "",         // nothing selected in employee list
        assignedTo: "Assign To",  // UI label for the top option
      }));
    }
  }, [forceAssignToUI]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (name === "assignToCode") {
      const vRaw = trim(value);
      const selected = employees.find((emp) => emp.employeeCode === vRaw);
      setFormValues((prev) => ({
        ...prev,
        assignToCode: selected?.employeeCode || vRaw || "",
        assignedTo: selected?.employeeName || prev.assignedTo || "",
        employeeMobile: selected?.mobileNo || prev.employeeMobile || "",
        email: selected?.emailID || prev.email || "",
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

    if (name === "cc") {
      const cleaned = trim(value.replace(/\s*,\s*/g, ",").replace(/,+$/g, ""));
      setFormValues((prev) => ({ ...prev, cc: cleaned }));
      return;
    }

    if (name === "moreCc") {
      const cleaned = trim(value.replace(/\s*,\s*/g, ",").replace(/,+$/g, ""));
      setFormValues((prev) => ({ ...prev, moreCc: cleaned }));
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
  };

  const responseIsEmpty = trim(formValues.response) === "";

  const hierTooltip = hierarchy
    ? [
        hierarchy.firstAssignement ? `L1: ${hierarchy.firstAssignement}` : "",
        hierarchy.secondAssignement ? `L2: ${hierarchy.secondAssignement}` : "",
        hierarchy.thirdAssignement ? `L3: ${hierarchy.thirdAssignement}` : "",
        hierarchy.firstGroupAssignement ? `L1 CC: ${hierarchy.firstGroupAssignement}` : "",
        hierarchy.secondGroupAssignement ? `L2 CC: ${hierarchy.secondGroupAssignement}` : "",
        hierarchy.thirdGroupAssignement ? `L3 CC: ${hierarchy.thirdGroupAssignement}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const currentLevelNote =
    currentLevel === 1
      ? "Case is still at Level 1"
      : currentLevel === 2
      ? "Case is still at Level 2"
      : currentLevel === 3
      ? "Case is still at Level 3"
      : "Case is at previous level";

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
          {therapists.map((doc, idx) => (
            <option key={idx} value={doc.code}>
              {doc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>
          Add Response <span style={{ color: "#d33" }}>*</span>
        </label>
        <textarea
          name="response"
          value={formValues.response || ""}
          onChange={handleChange}
          rows="5"
          aria-invalid={responseIsEmpty}
          placeholder="Type your response to move the case forward…"
        />
        {responseIsEmpty && (
          <small>A response is required before submitting.</small>
        )}
      </div>

      <div className="form-group">
        <label>Current Assignee</label>
        <input
          type="text"
          name="currentAssignee"
          value={currentAssigneeDisplay || ""}
          disabled
          readOnly
        />

        {currentLevel > 0 && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              lineHeight: "16px",
              padding: "2px 8px",
              display: "inline-block",
              borderRadius: 10,
              border: "1px solid #d0d7de",
              background: "#f6f8fa",
              color: "#065f46",
            }}
            title="Resolved from Case Hierarchy API"
          >
            {currentLevelNote}
          </div>
        )}
      </div>

      <div className="form-group">
        <label title={hierTooltip || undefined} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Next Assignee
          {hierLoading && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>(loading…)</span>
          )}
          {!hierLoading && hierarchy?.recId && (
            <span
              style={{
                fontSize: 11,
                lineHeight: "16px",
                padding: "1px 6px",
                borderRadius: 10,
                border: "1px solid #d0d7de",
                background: "#f6f8fa",
                color: "#57606a",
                whiteSpace: "nowrap",
              }}
              title={hierTooltip || "Case hierarchy match"}
            >
              Rec ID: {hierarchy.recId}
            </span>
          )}
          {!hierLoading && hierErr && (
            <span style={{ fontSize: 12, color: "#b91c1c" }}>(no hierarchy)</span>
          )}
        </label>

        <select name="assignToCode" value={formValues.assignToCode || ""} onChange={handleChange}>
          {/* When L2 is the logged-in current assignee, show "Assign To" as the selected placeholder */}
          {forceAssignToUI ? (
            <option value="">Assign To</option>
          ) : (
            <option value="">Select User</option>
          )}

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

        {hierarchy && (hierarchy.firstGroupAssignement || hierarchy.secondGroupAssignement || hierarchy.thirdGroupAssignement) && (
          <div style={{ marginTop: 6 }}>
            {hierarchy.firstGroupAssignement && (
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                L1 CC: {hierarchy.firstGroupAssignement}
              </div>
            )}
            {hierarchy.secondGroupAssignement && (
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                L2 CC: {hierarchy.secondGroupAssignement}
              </div>
            )}
            {hierarchy.thirdGroupAssignement && (
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                L3 CC: {hierarchy.thirdGroupAssignement}
              </div>
            )}
          </div>
        )}
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
              <th width="160">Response #</th>
              <th>Details</th>
              <th>Response By</th>
            </tr>
          </thead>
          <tbody>
            {responses.length > 0 ? (
              responses.map((res, idx) => (
                <tr key={idx} className="Hrline">
                  <td>{idx + 1}</td>
                  <td>{res.responseDetails || res.details}</td>
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
          <input
            type="text"
            name="cc"
            value={formValues.cc || ""}
            onChange={handleChange}
          />
          {(currentLevel === 1 || currentLevel === 2 || nextAssigneeLevel === 1 || nextAssigneeLevel === 2) && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              CC is auto-set from Case Hierarchy ({nextAssigneeLevel === 2
                ? "L2 via Next Assignee"
                : nextAssigneeLevel === 1
                ? "L1 via Next Assignee"
                : currentLevel === 2
                ? "L2 (current level)"
                : "L1 (current level)"}).
            </div>
          )}
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
