import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
} from "react";
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

  if (!res.ok)
    throw new Error(
      `HTTP ${res.status} ${res.statusText}: ${text.slice(0, 180)}`
    );

  const ct = res.headers.get("content-type") || "";
  if (!/application\/json/i.test(ct)) {
    if (
      /session/i.test(text) ||
      /login/i.test(text) ||
      text.startsWith("<!DOCTYPE")
    ) {
      throw new Error("Session expired or non-JSON response from server.");
    }
    throw new Error(`Expected JSON but got: ${text.slice(0, 180)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON: ${text.slice(0, 180)}`);
  }
};

/**
 * Props:
 *  - data             (full CaseDetails mapped object)
 *  - assignedToName   (for Current Assignee display – now caseWithName)
 *  - onResponseChange?: (hasResponse: boolean, responseText: string) => void
 */
const IssuesTab = forwardRef(
  ({ data, assignedToName, onResponseChange }, ref) => {
    const [formValues, setFormValues] = useState({ ...data });
    const [employees, setEmployees] = useState([]);
    const [therapists, setTherapists] = useState([]);
    const [therapistClicked, setTherapistClicked] = useState(false);
    const [responses, setResponses] = useState([]);
    const [attachment, setAttachment] = useState(null);

    // Hierarchy (used for L1/L2 + CC)
    const [hierarchy, setHierarchy] = useState(null);
    const [hierLoading, setHierLoading] = useState(false);
    const [hierErr, setHierErr] = useState("");

    // Track: did user manually change Next Assignee?
    const userTouchedAssignRef = useRef(false);

    // Expose to parent
    useImperativeHandle(ref, () => ({
      getIssuesData: () => formValues,
      hasResponse: () => trim(formValues.response) !== "",
      reloadResponses: () => loadResponses(),
    }));

    // Notify parent about response field status
    useEffect(() => {
      if (typeof onResponseChange === "function") {
        onResponseChange(
          trim(formValues.response) !== "",
          formValues.response ?? ""
        );
      }
    }, [formValues.response, onResponseChange]);

    
const moreCcRef = useRef(null);

const insertAtCursor = (el, text) => {
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;

  // Insert text at cursor
  el.setRangeText(text, start, end, "end");

  // Sync React state
  setFormValues((prev) => ({ ...prev, moreCc: el.value }));
};

    // Seed from case (strictly from API)
    useEffect(() => {
      if (!data) return;
      setFormValues((prev) => ({
        ...prev,
        issueDescription: data.issueDescription ?? prev.issueDescription ?? "",
        firstTimeResolution:
          data.firstTimeResolution ?? prev.firstTimeResolution ?? "",
        //response: prev.response ?? "",
        clientThreat: data.clientThreat ?? prev.clientThreat ?? "",

        therapistName: trim(
          data.therapistName || data.therapist || prev.therapistName || ""
        ),
        therapistCode: normCode(
          data.therapistCode || prev.therapistCode || ""
        ),

        // CURRENT assignee we only show; not used for next
        // Next Assignee (dropdown) should come from assignToCode / assignTOName
        assignedTo: firstNonEmpty(
          data.assignTOName,
          data.assignName,
          prev.assignedTo,
          ""
        ),

        assignToCode: firstNonEmpty(
          data.assignToCode,
          data.assignTOCode,
          prev.assignToCode,
          ""
        ),

        employeeMobile: trim(
          data.employeeMobile || data.empMobileNo || prev.employeeMobile || ""
        ),
        email: trim(
          data.email ||
            data.assignedemailid ||
            data.emailTOEMailID ||
            prev.email ||
            ""
        ),

        cc: normalizeEmailList(data.emailCC || prev.cc || ""),
        moreCc: trim(
          (data.moreCc || prev.moreCc || "")
            .replace(/\s*,\s*/g, ",")
            .replace(/,+$/g, "")
        ),

        categorySpecificResolution:
          data.categorySpecificResolution ||
          data.specificResolutionName ||
          prev.categorySpecificResolution ||
          "",
        remarks: data.remarks || prev.remarks || "",
      }));
      userTouchedAssignRef.current = false;
    }, [data?.caseNo]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadResponses = async () => {
  if (!data?.caseNo) {
    setResponses([]);
    setFormValues((prev) => ({ ...prev, response: "" }));
    return;
  }
  try {
    const list = await fetchJSON(
      `${API_BASE_URL}/api/CaseOperation/CaseResponse/${data.caseNo}/ActualResponse`
    );

    const all = Array.isArray(list) ? list : [];

    // ✅ Find latest draft response (isDraft = true)
    const draftResponse = all.find((r) => r.isDraft === true || r.isDraft === 1);

    // ✅ Only show submitted non-empty responses in table
    const submittedResponses = all.filter(
      (r) =>
        r.isDraft !== true &&
        r.isDraft !== 1 &&
        trim(r.responseDetails || r.details) !== ""
    );

    setResponses(submittedResponses);

    // ✅ Prefill textbox with draft if exists, else empty
    setFormValues((prev) => ({
      ...prev,
      response: draftResponse
        ? trim(draftResponse.responseDetails || draftResponse.details || "")
        : "",
    }));
  } catch (e) {
    console.error("Error fetching responses:", e);
    setResponses([]);
    setFormValues((prev) => ({ ...prev, response: "" }));
  }
};

useEffect(() => {
  const run = async () => {
    await loadResponses();

    // ✅ Fetch attachment if case exists
    if (data?.caseNo) {
      try {
        const res = await fetchJSON(
          `${API_BASE_URL}/api/CaseOperation/CaseAttachment/${data.caseNo}`
        );
        const list = Array.isArray(res) ? res : [];
        if (list.length > 0) {
          setAttachment(list[0]); // show first attachment
        }
      } catch (e) {
        console.error("Error fetching attachment:", e);
      }
    }
  };
  run();
}, [data?.caseNo]);

    // --- Current Assignee display (from API caseWithName) ---
    const currentAssigneeDisplay = data?.caseWithName;
    const currentAssigneeCode = normCode(data?.caseWithCode || "");
    const currentAssigneeNameNorm = normNameBase(
      data?.caseWithName || ""
    );

    // Employees (for Next Assignee dropdown)
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
          // IMPORTANT: we DO NOT override assignToCode/assignedTo from hierarchy/URL here.
        } catch (e) {
          console.error("Error fetching employees:", e);
          setEmployees([]);
        }
      };
      run();
    }, []);

    // Therapists
    const fetchTherapists = async () => {
      try {
        const res = await fetchJSON(
          `${API_BASE_URL}/api/CaseDropDown/Medium/Doctors`
        );
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
        if (!sel && haveName)
          sel = list.find((d) => d.name === haveName) || null;

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
    useEffect(() => {
      if (
        !therapistClicked &&
        (formValues.therapistCode || formValues.therapistName)
      ) {
        fetchTherapists().finally(() => setTherapistClicked(true));
      }
    }, [
      formValues.therapistCode,
      formValues.therapistName,
      therapistClicked,
    ]);

    // Fetch Case Hierarchy (L1 / L2 details + CC groups)
    useEffect(() => {
      const cat = trim(data?.caseCategory || data?.categoryName);
      const sub = trim(data?.subCategoryName);
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
          const url =
            `${API_BASE_URL}/api/CaseOperation/CaseHierarchyDB` +
            `?categoryName=${encodeURIComponent(cat)}` +
            `&subCategoryName=${encodeURIComponent(sub)}` +
            `&subSubCategoryName=${encodeURIComponent(sub2)}` +
            `&subSubSubCategoryName=${encodeURIComponent(sub3)}`;

          let res = await fetchJSON(url);

          if (Array.isArray(res)) {
            const hit = res.find(
              (r) =>
                trim(r?.categoryName).toLowerCase() === cat.toLowerCase() &&
                trim(r?.subCategoryName).toLowerCase() ===
                  sub.toLowerCase() &&
                trim(r?.subSubCategoryName).toLowerCase() ===
                  sub2.toLowerCase() &&
                trim(r?.subSubSubCategoryName || "NA").toLowerCase() ===
                  sub3.toLowerCase()
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

    
    // ------------------------------------------------------
    // LEVEL 1 / LEVEL 2 detection + Next Assignee auto rules
    // ------------------------------------------------------

    const levelMeta = useMemo(() => {
      if (!hierarchy) {
        return {
          l1Emp: null,
          l2Emp: null,
          level: 1,
          curIsL1: false,
          curIsL2: false,
          hasL2Responder: false,
        };
      }

      const findEmpFromHierarchyField = (raw) => {
        const text = trim(raw);
        if (!text) return null;

        const codeGuess = normCode(text);
        const nameNormGuess = normNameBase(text);

        // Try match by code
        if (codeGuess) {
          const byCode = employees.find(
            (e) => normCode(e.employeeCode) === codeGuess
          );
          if (byCode) return byCode;
        }

        // Try match by normalized name
        if (nameNormGuess) {
          const byName = employees.find(
            (e) => normNameBase(e.employeeName) === nameNormGuess
          );
          if (byName) return byName;
        }

        return null;
      };

      const l1Emp = findEmpFromHierarchyField(
        hierarchy.firstAssignement || ""
      );
      const l2Emp = findEmpFromHierarchyField(
        hierarchy.secondAssignement || ""
      );

      const curCode = currentAssigneeCode;
      const curName = currentAssigneeNameNorm;

      const curIsL1 =
        !!l1Emp &&
        ((curCode &&
          normCode(l1Emp.employeeCode) === curCode) ||
          (curName &&
            normNameBase(l1Emp.employeeName) === curName));

      const curIsL2 =
        !!l2Emp &&
        ((curCode &&
          normCode(l2Emp.employeeCode) === curCode) ||
          (curName &&
            normNameBase(l2Emp.employeeName) === curName));

      // Has Level 2 employee responded in ActualResponse table?
      let hasL2Responder = false;
      if (l2Emp) {
        const l2Code = normCode(l2Emp.employeeCode || "");
        const l2NameNorm = normNameBase(l2Emp.employeeName || "");
        hasL2Responder = (responses || []).some((r) => {
          const by = trim(r.responseBy || "");
          if (!by) return false;
          const byCode = normCode(by);
          const byNameNorm = normNameBase(by);
          return (
            (l2Code && byCode && l2Code === byCode) ||
            (l2NameNorm && byNameNorm && l2NameNorm === byNameNorm)
          );
        });
      }

      // Determine Level:
      // - Default Level 1
      // - If any response by L2 OR current assignee is L2 => Level 2
      let level = 1;
      if (l2Emp && (hasL2Responder || curIsL2)) {
        level = 2;
      }

      return { l1Emp, l2Emp, level, curIsL1, curIsL2, hasL2Responder };
    }, [hierarchy, employees, currentAssigneeCode, currentAssigneeNameNorm, responses]);

    
    const { l1Emp, l2Emp, level, curIsL1, curIsL2 } = levelMeta;

    // Compute CC based on current level + next assignee selection
const computedCc = useMemo(() => {
  if (!hierarchy) return "";

  const l1cc = normalizeEmailList(hierarchy.firstGroupAssignement || "");
  const l2cc = normalizeEmailList(hierarchy.secondGroupAssignement || "");

  const nextCode = normCode(formValues.assignToCode || "");
  const l1Code = normCode(l1Emp?.employeeCode || "");
  const l2Code = normCode(l2Emp?.employeeCode || "");

  // If Level 2 → always L2 CC (if available), else fallback to L1 CC
  if (level === 2) return l2cc || l1cc;

  // Level 1:
  // - default: L1 CC
  // - exception: if next assignee is L2 assignee → L2 CC
  if (level === 1) {
    if (l2Code && nextCode && nextCode === l2Code) return l2cc || l1cc;
    return l1cc || l2cc;
  }

  // Fallback (shouldn't really hit)
  return l1cc || l2cc;
}, [hierarchy, level, formValues.assignToCode, l1Emp, l2Emp]);


    // Apply CC to the form (auto-fill)
    useEffect(() => {
      const ccFromRule = computedCc;
      if (trim(formValues.cc) !== ccFromRule) {
        setFormValues((prev) => ({ ...prev, cc: ccFromRule }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [computedCc]);

    const handleChange = (e) => {
      const { name, value, type, files } = e.target;

      if (type === "file") {
  const file = files[0];
  if (!file) return;

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];

  const maxSize = 2 * 1024 * 1024; // 2MB

  //  Type validation
  if (!allowedTypes.includes(file.type)) {
    alert("Only PDF, JPG, and PNG files are allowed.");
    return;
  }

  //  Size validation
  if (file.size > maxSize) {
    alert("File size should not exceed 2MB.");
    return;
  }

  //  Valid file
  setFormValues((prev) => ({
    ...prev,
    attachment: file,
  }));

  return;
}

      if (name === "assignToCode") {
  userTouchedAssignRef.current = true;

  const vRaw = trim(value);
  const selected = employees.find((emp) => emp.employeeCode === vRaw);

  setFormValues((prev) => ({
    ...prev,
    assignToCode: selected?.employeeCode || vRaw || "",
    assignedTo: selected?.employeeName || (vRaw ? prev.assignedTo : "Assign To"),

    // KEEP mobile logic as-is
    employeeMobile: selected?.mobileNo || prev.employeeMobile || "",

    // ✅ If user selects placeholder (empty) -> clear email
    // ✅ If user selects an employee -> prefill that employee emailID
    email: vRaw ? trim(selected?.emailID || "") : "",
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
        const cleaned = trim(
          value.replace(/\s*,\s*/g, ",").replace(/,+$/g, "")
        );
        setFormValues((prev) => ({ ...prev, cc: cleaned }));
        return;
      }

      if (name === "moreCc") {
  const cleanedLive = (value || "")
    .replace(/؛/g, ",")
    .replace(/;/g, ",")
    .replace(/،/g, ",")          // Arabic comma -> comma
    .replace(/\s*,\s*/g, ",")    // normalize spaces around commas
    .replace(/,{2,}/g, ",");     // collapse multiple commas
  setFormValues((prev) => ({ ...prev, moreCc: cleanedLive }));
  return;
}


      setFormValues((prev) => ({
        ...prev,
         [name]: value,
      }));
    };

    const responseIsEmpty = trim(formValues.response) === "";

    const hierTooltip = hierarchy
      ? [
          hierarchy.firstAssignement
            ? `L1: ${hierarchy.firstAssignement}`
            : "",
          hierarchy.secondAssignement
            ? `L2: ${hierarchy.secondAssignement}`
            : "",
          hierarchy.thirdAssignement
            ? `L3: ${hierarchy.thirdAssignement}`
            : "",
          hierarchy.firstGroupAssignement
            ? `L1 CC: ${hierarchy.firstGroupAssignement}`
            : "",
          hierarchy.secondGroupAssignement
            ? `L2 CC: ${hierarchy.secondGroupAssignement}`
            : "",
          hierarchy.thirdGroupAssignement
            ? `L3 CC: ${hierarchy.thirdGroupAssignement}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";



    // Human-readable stage label
    const stageLabel =
      l1Emp || l2Emp ? (level === 2 ? "Level 2" : "Level 1") : "";

    // Auto-select Next Assignee based on level rules
    useEffect(() => {
      if (!hierarchy) return;
      if (!l1Emp && !l2Emp) return;
      if (userTouchedAssignRef.current) return; // user has changed dropdown → don't auto adjust

      let desiredCode = formValues.assignToCode || "";

      if (level === 1) {
        // If Level is 1, Current assignee is someone other than level 1 assignee
        // then next assignee is Level 1 assignee.
        if (!curIsL1) {
          if (l1Emp?.employeeCode) {
            desiredCode = l1Emp.employeeCode;
          }
        } else {
          // If Level is 1, current assignee is level 1 employee
          // then next assignee is level 2 employee.
          if (l2Emp?.employeeCode) {
            desiredCode = l2Emp.employeeCode;
          }
        }
      } else if (level === 2) {
        // If Level is 2, Current assignee is someone other than level 2 assignee
        // then next assignee is Level 2 assignee.
        if (!curIsL2) {
          if (l2Emp?.employeeCode) {
            desiredCode = l2Emp.employeeCode;
          }
        } else {
          // If Level is 2, current assignee is level 2 employee
          // then next assignee is "Assign To" value in drop down.
          desiredCode = "";
        }
      }

      if (desiredCode === formValues.assignToCode) return;

      const selected =
        desiredCode &&
        employees.find((e) => e.employeeCode === desiredCode);

      setFormValues((prev) => ({
        ...prev,
        assignToCode: desiredCode,
        assignedTo: desiredCode
          ? selected?.employeeName || prev.assignedTo || ""
          : "Assign To",
        employeeMobile:
          selected?.mobileNo || prev.employeeMobile || "",
        email: selected?.emailID || prev.email || "",
      }));
      // Note: we intentionally do NOT set userTouchedAssignRef.current here.
      // If user later changes the dropdown, then it becomes manual.
    }, [
      hierarchy,
      l1Emp,
      l2Emp,
      level,
      curIsL1,
      curIsL2,
      employees,
      formValues.assignToCode,
    ]);

    // ------------------------- JSX -------------------------
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

  {attachment?.attachmentBase64 ? (
    <div style={{ marginTop: 10 }}>
      {attachment.fileName?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
        <>
          
          <a
            href={attachment.attachmentBase64}
            download={attachment.fileName}
            style={{ color: "#0d6486", fontWeight: 600 }}
          >
            📎 {attachment.fileName}
          </a>
        </>
      ) : (
        <a
          href={attachment.attachmentBase64}
          download={attachment.fileName}
          style={{ color: "#0d6486", fontWeight: 600 }}
        >
          📎 {attachment.fileName}
        </a>
      )}
    </div>
  ) : (
    <div
      style={{
        marginTop: 10,
        color: "#6b7280",
        fontStyle: "italic",
      }}
    >
      No attachment was added during case creation.
    </div>
  )}
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
          <label>Client Threat</label>
          <select
            name="clientThreat"
            value={formValues.clientThreat || ""}
            onChange={handleChange}
            disabled
          >
            <option value="">-- Select --</option>
            <option value="Legal">Legal</option>
            <option value="Verbal">Verbal</option>
            <option value="Written">Written</option>
            <option value="Physical">Physical</option>
             <option value="NA">NA</option>
          </select>
        </div>

        <div className="form-group">
  <label>Therapist</label>

  <select
    name="therapistCode"
    value={formValues.therapistCode || ""}
    onChange={handleChange}
    disabled
    onFocus={() => {
      // fetch list when user opens dropdown (fast & avoids unnecessary calls)
      if (!therapists.length) fetchTherapists();
    }}
  >
    <option value="">-- Select Therapist --</option>

    {/* ✅ If we have a therapistCode from API but it's not in dropdown list yet */}
    {!!formValues.therapistCode &&
      !therapists.some((t) => normCode(t.code) === normCode(formValues.therapistCode)) && (
        <option value={formValues.therapistCode}>
          {formValues.therapistName || formValues.therapistCode}
        </option>
      )}

    {therapists.map((t) => (
      <option key={t.code || t.name} value={t.code}>
        {t.name}
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
        </div>

        <div className="form-group">
          <label
            title={hierTooltip || undefined}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            Next Assignee
            {!hierLoading && hierErr && (
              <span
                style={{ fontSize: 12, color: "#b91c1c", marginLeft: 4 }}
              >
                (no hierarchy)
              </span>
            )}

            {/* Stage chip: Level 1 / Level 2 */}
            {stageLabel && (
              <span
                className="qaLevelChip"
                style={{
                  marginLeft: 8,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: "#eef2ff",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#4f46e5",
                  textTransform: "uppercase",
                  border: "1px solid #e0e7ff",
                }}
              >
                {stageLabel}
              </span>
            )}
          </label>

          <select
            name="assignToCode"
            value={formValues.assignToCode || ""}
            onChange={handleChange}
          >
            <option value="">
              {formValues.assignToCode ? "Select User" : "Assign To"}
            </option>

            {formValues.assignToCode &&
              !employees.some(
                (e) => e.employeeCode === formValues.assignToCode
              ) && (
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
                    {/* ---------------- QC Panel (L1/L2 + CC + Current Level) ---------------- */}
        {(l1Emp || l2Emp || hierarchy) && (
          <div
            className="qcPanel"
            style={{
              margin: "12px 0",
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#fafafa",
              display:"block"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 700, display: 'none' }}>
                QC Info{" "}
                {stageLabel && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#eef2ff",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#4f46e5",
                      textTransform: "uppercase",
                      border: "1px solid #e0e7ff",
                    }}
                  >
                    Current Level: {stageLabel}
                  </span>
                )}
              </div>

              {/* helpful QC flags */}
              <div style={{ fontSize: 12, color: "#374151" }}>
                {hierLoading ? (
                  <span>Loading hierarchy…</span>
                ) : hierErr ? (
                  <span style={{ color: "#b91c1c" }}>{hierErr}</span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                display: "none",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Level 1 Assignee
                </div>
                <div style={{ fontWeight: 600 }}>
                  {l1Emp
                    ? `${l1Emp.employeeName} (${l1Emp.employeeCode})`
                    : hierarchy?.firstAssignement || "-"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Level 2 Assignee
                </div>
                <div style={{ fontWeight: 600 }}>
                  {l2Emp
                    ? `${l2Emp.employeeName} (${l2Emp.employeeCode})`
                    : hierarchy?.secondAssignement || "-"}
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  CC (Auto from hierarchy)
                </div>
                <div style={{ fontWeight: 600, wordBreak: "break-word" }}>
                  {computedCc || "-"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Current Assignee (for QC)
                </div>
                <div style={{ fontWeight: 600 }}>
                  {currentAssigneeDisplay || "-"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Code: {currentAssigneeCode || "-"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Current Assignee Matches
                </div>
                <div style={{ fontWeight: 600 }}>
                  {curIsL2 ? "Level 2 Assignee" : curIsL1 ? "Level 1 Assignee" : "Other"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {/* extra QC detail */}
                  {level === 2
                    ? "Case currently treated as Level 2"
                    : "Case currently treated as Level 1"}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ---------------- /QC Panel ---------------- */}

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
            <input
              type="email"
              name="email"
              value={formValues.email || ""}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>CC</label>
            <input
              type="text"
              name="cc"
              value={formValues.cc || ""}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>More CC (Case Owner Email is prefilled in the More CC field)</label>
           <textarea
  name="moreCc"
  value={formValues.moreCc || ""}
  onChange={handleChange}
  rows="5"
  onBlur={() => {
    setFormValues((prev) => ({
      ...prev,
      moreCc: trim((prev.moreCc || "").replace(/,+$/g, "")),
    }));
  }}
/>



          </div>

          <div className="form-group">
            <label>Remarks</label>
            <textarea
              name="remarks"
              value={formValues.remarks || ""}
              onChange={handleChange}
              rows="5"
            />
          </div>
        </div>
      </form>
    );
  }
);

export default IssuesTab;
