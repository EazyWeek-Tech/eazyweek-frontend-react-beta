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

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s ?? "").toString().trim());

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
    const [moreCcError, setMoreCcError] = useState("");

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

    const all = Array.isArray(list) ? list : (list?.data ?? []);

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
        const list = Array.isArray(res) ? res : (res?.data ?? []);
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
          const res = await fetchJSON(`${API_BASE_URL}/api/Employee/Dropdown`);
          const list = (Array.isArray(res) ? res : (res?.data ?? [])).map((e) => ({
            employeeCode: trim(e.employeeCode ?? e.code ?? e.EMPLOYEECODE),
            employeeName: trim(e.employeeName ?? e.name ?? `${e.FIRSTNAME || ""} ${e.LASTNAME || ""}`),
            mobileNo: trim(e.mobileNo ?? e.MOBILEPHONE ?? e.mobilephone),
            emailID: trim(e.emailID ?? e.EMAIL ?? e.email),
          }));
          const normList = list.filter(
            (e) => e.employeeCode && e.employeeName !== "Assign To"
          );
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

    // Case Hierarchy (L1/L2/L3 assignee + CC groups) — derived from the embedded
    // CaseDetails payload (point #6). No separate CaseHierarchyDB call. Shape kept
    // identical to the old API result so the CC-switch logic below is unchanged.
    useEffect(() => {
      if (!data) { setHierarchy(null); return; }
      const h = {
        firstAssignement:       trim(data.firstAssignmentName),
        secondAssignement:      trim(data.secondAssignmentName),
        thirdAssignement:       trim(data.thirdAssignmentName),
        firstGroupAssignement:  trim(data.firstGroupCC),
        secondGroupAssignement: trim(data.secondGroupCC),
        thirdGroupAssignement:  trim(data.thirdGroupCC),
        firstAssignmentCode:    trim(data.firstAssignmentCode),
        secondAssignmentCode:   trim(data.secondAssignmentCode),
        thirdAssignmentCode:    trim(data.thirdAssignmentCode),
        status: true,
      };
      const hasAny =
        h.firstAssignement || h.secondAssignement ||
        h.firstGroupAssignement || h.secondGroupAssignement;
      setHierLoading(false);
      setHierErr(hasAny ? "" : "Hierarchy not found");
      setHierarchy(hasAny ? h : null);
    }, [
      data?.firstAssignmentName,
      data?.secondAssignmentName,
      data?.thirdAssignmentName,
      data?.firstGroupCC,
      data?.secondGroupCC,
      data?.thirdGroupCC,
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
      <form className="cd-form--issues cd-form">

        <section className="cd-group">
          <h3 className="cd-eyebrow">The issue</h3>
          <div className="cd-grid">
            <div className="cd-field cd-span">
              <label>Issue Description</label>
              <textarea
                name="issueDescription"
                value={formValues.issueDescription || ""}
                onChange={handleChange}
                rows="5"
              />
            </div>

            <div className="cd-field cd-span">
              <label>Attachment</label>
              {attachment?.attachmentBase64 ? (
                <a
                  className="cd-file"
                  href={attachment.attachmentBase64}
                  download={attachment.fileName}
                >
                  <span className="cd-file-icon" aria-hidden="true">&#128206;</span>
                  <span className="cd-file-name">{attachment.fileName}</span>
                  <span className="cd-file-act">Download</span>
                </a>
              ) : (
                <div className="cd-file cd-file--none">
                  No attachment was added when the case was created.
                </div>
              )}
            </div>

            <div className="cd-field">
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

            <div className="cd-field">
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

            <div className="cd-field cd-span">
              <label>First Time Resolution</label>
              <textarea
                name="firstTimeResolution"
                value={formValues.firstTimeResolution || ""}
                onChange={handleChange}
                rows="5"
              />
            </div>
          </div>
        </section>

        <section className="cd-group cd-group--accent">
          <h3 className="cd-eyebrow">
            Move the case forward
            {stageLabel && <span className="cd-chip">{stageLabel}</span>}
          </h3>

          <div className="cd-grid">
            <div className="cd-field cd-span">
              <label>
                Add Response <span className="cd-req">*</span>
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

            <div className="cd-field">
              <label>Current Assignee</label>
              <input
                type="text"
                name="currentAssignee"
                value={currentAssigneeDisplay || ""}
                disabled
                readOnly
              />
            </div>

            <div className="cd-field">
              <label title={hierTooltip || undefined}>
                Next Assignee
                {!hierLoading && hierErr && (
                  <span className="cd-flag">no hierarchy</span>
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
          </div>

          {/* ---------------- QC Panel (L1/L2 + CC + Current Level) ---------------- */}
          {(l1Emp || l2Emp || hierarchy) && (
            <div className="cd-qc cd-qc">
              <div className="cd-qc-hd">
                <div className="cd-qc-ttl">
                  QC Info{" "}
                  {stageLabel && (
                    <span className="cd-chip">Current Level: {stageLabel}</span>
                  )}
                </div>

                {/* helpful QC flags */}
                <div className="cd-qc-state">
                  {hierLoading ? (
                    <span>Loading hierarchy…</span>
                  ) : hierErr ? (
                    <span className="cd-qc-err">{hierErr}</span>
                  ) : null}
                </div>
              </div>

              <div className="cd-qc-grid">
                <div>
                  <div className="cd-qc-lbl">Level 1 Assignee</div>
                  <div className="cd-qc-val">
                    {l1Emp
                      ? `${l1Emp.employeeName} (${l1Emp.employeeCode})`
                      : hierarchy?.firstAssignement || "-"}
                  </div>
                </div>

                <div>
                  <div className="cd-qc-lbl">Level 2 Assignee</div>
                  <div className="cd-qc-val">
                    {l2Emp
                      ? `${l2Emp.employeeName} (${l2Emp.employeeCode})`
                      : hierarchy?.secondAssignement || "-"}
                  </div>
                </div>

                <div className="cd-span">
                  <div className="cd-qc-lbl">CC (Auto from hierarchy)</div>
                  <div className="cd-qc-val">{computedCc || "-"}</div>
                </div>

                <div>
                  <div className="cd-qc-lbl">Current Assignee (for QC)</div>
                  <div className="cd-qc-val">{currentAssigneeDisplay || "-"}</div>
                  <div className="cd-qc-sub">Code: {currentAssigneeCode || "-"}</div>
                </div>

                <div>
                  <div className="cd-qc-lbl">Current Assignee Matches</div>
                  <div className="cd-qc-val">
                    {curIsL2 ? "Level 2 Assignee" : curIsL1 ? "Level 1 Assignee" : "Other"}
                  </div>
                  <div className="cd-qc-sub">
                    {level === 2
                      ? "Case currently treated as Level 2"
                      : "Case currently treated as Level 1"}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ---------------- /QC Panel ---------------- */}
        </section>

        <section className="cd-group">
          <h3 className="cd-eyebrow">
            Response history
            {responses.length > 0 && (
              <span className="cd-num">
                {responses.length} {responses.length === 1 ? "entry" : "entries"}
              </span>
            )}
          </h3>

          {responses.length > 0 ? (
            <div className="cd-tablewrap">
              <table cellSpacing={0} className="cd-table">
                <thead>
                  <tr className="cd-row">
                    <th width="80">#</th>
                    <th>Details</th>
                    <th width="200">Response By</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((res, idx) => (
                    <tr key={idx} className="cd-row">
                      <td>{String(idx + 1).padStart(2, "0")}</td>
                      <td>{res.responseDetails || res.details}</td>
                      <td>{res.responseBy || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cd-empty">
              No responses yet. The first one lands here once you submit.
            </div>
          )}
        </section>

        <section className="cd-group">
          <h3 className="cd-eyebrow">Notification</h3>

          <div className="cd-mailgrid">
            <div className="cd-field">
              <label>To</label>
              <input
                type="email"
                name="email"
                value={formValues.email || ""}
                readOnly
                title="Auto-filled from the selected Next Assignee"
              />
              <p className="cd-help">Filled from the Next Assignee above.</p>
            </div>

            <div className="cd-field">
              <label>CC</label>
              <input
                type="text"
                name="cc"
                value={formValues.cc || ""}
                readOnly
                title="Configured group CC (not editable)"
              />
              <p className="cd-help">Group CC configured on the hierarchy.</p>
            </div>

            <div className="cd-field cd-span">
              <label>More CC</label>
              <textarea
                name="moreCc"
                value={formValues.moreCc || ""}
                onChange={handleChange}
                rows="3"
                onBlur={() => {
                  const raw = (formValues.moreCc || "").replace(/,+$/g, "");
                  const parts = splitEmails(raw);
                  const valid = parts.filter(isEmail);
                  const invalid = parts.filter((p) => !isEmail(p));
                  setMoreCcError(
                    invalid.length ? `Ignored invalid email(s): ${invalid.join(", ")}` : ""
                  );
                  setFormValues((prev) => ({
                    ...prev,
                    moreCc: normalizeEmailList(valid.join(",")),
                  }));
                }}
              />
              <p className="cd-help">The case owner is already included.</p>
              {moreCcError && <p className="cd-error">{moreCcError}</p>}
            </div>

            <div className="cd-field cd-span">
              <label>Remarks</label>
              <textarea
                name="remarks"
                value={formValues.remarks || ""}
                onChange={handleChange}
                rows="3"
              />
            </div>
          </div>
        </section>

      </form>
    );
  }
);

export default IssuesTab;