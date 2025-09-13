"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/* ----- constants ----- */
const SLA_OPTIONS = Array.from({ length: 48 }, (_, i) => i + 1); // 1..48
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const BASE_MAIL_TEMPLATES = ["", "M001", "M002"];

/* helpers */
const safe = (v) => (v ?? "").toString();
const emptyLevel = () => ({
  assignee: "", // employeeCode
  assigneeName: "",
  postSlaAssignee: "", // employeeCode
  postSlaAssigneeName: "",
  group: "",
  sla: "",
  exclusions: [], // array of days -> payload joins to comma string
  assignTemplate: "",
  escalateTemplate: "",
});
const parseDays = (str) =>
  (str || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

async function fetchJSON(url) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* click-outside hook */
function useClickOutside(cb) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cb?.();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

/* MultiSelect (Excluding SLA days) */
function MultiSelect({ options, value, onChange, placeholder = "None selected", width = 260 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useClickOutside(() => setOpen(false));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? options : options.filter((o) => o.toLowerCase().includes(s));
  }, [options, q]);

  const toggle = (opt) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => value.includes(o));
  const toggleAll = () =>
    allFilteredSelected
      ? onChange(value.filter((v) => !filtered.includes(v)))
      : onChange(Array.from(new Set([...value, ...filtered])));

  const summary =
    value.length === 0 ? placeholder : value.length <= 2 ? value.join(", ") : `${value.length} selected`;

  return (
    <div className="ms-root" ref={rootRef} style={{ "--w": `${width}px` }}>
      <button type="button" className={`ms-btn ${open ? "open" : ""}`} onClick={() => setOpen((s) => !s)}>
        {summary}
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="ms-pop">
          <div className="ms-row search">
            <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="button" className="ms-icon" onClick={() => setQ("")}>
              ✕
            </button>
          </div>
          <label className="ms-row selall">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} /> Select all
          </label>
          <div className="ms-list">
            {filtered.map((opt) => (
              <label key={opt} className="ms-row">
                <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
            {filtered.length === 0 && <div className="ms-empty">No matches</div>}
          </div>
        </div>
      )}

      <style jsx>{`
        .ms-root {
          position: relative;
          width: var(--w);
        }
        .ms-btn {
          width: 100%;
          height: 38px;
          text-align: left;
          border: 1px solid #d8dee8;
          background: #fff;
          border-radius: 8px;
          padding: 0 34px 0 10px;
          color: #1b2636;
          font-weight: 600;
          cursor: pointer;
        }
        .ms-btn .chev {
          position: absolute;
          right: 10px;
          top: 9px;
          font-size: 12px;
          color: #6a778a;
        }
        .ms-pop {
          position: absolute;
          z-index: 20;
          top: 40px;
          left: 0;
          width: var(--w);
          background: #fff;
          border: 1px solid #d8dee8;
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
        }
        .ms-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
        }
        .ms-row.search {
          border-bottom: 1px solid #eef1f6;
        }
        .ms-row.search input {
          flex: 1;
          height: 30px;
          border: 1px solid #e3e8f1;
          border-radius: 6px;
          padding: 0 8px;
        }
        .ms-icon {
          border: none;
          background: none;
          color: #8b97aa;
          cursor: pointer;
          font-size: 14px;
        }
        .ms-list {
          max-height: 220px;
          overflow: auto;
          padding: 6px 0;
        }
        .ms-empty {
          padding: 10px;
          color: #8a93a4;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

/* Autocomplete (Assignment + Escalation) with exclusion */
function AutoComplete({
  options, // [{employeeCode, employeeName}]
  value, // code
  display, // text
  onSelect, // (code, name)
  excludeCodes = [], // codes to hide (except current value)
  placeholder = "None selected",
  width = 260,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(display || "");
  const rootRef = useClickOutside(() => setOpen(false));

  useEffect(() => {
    setQ(display || "");
  }, [display]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = !s
      ? options
      : options.filter(
          (o) => o.employeeName?.toLowerCase().includes(s) || o.employeeCode?.toLowerCase().includes(s)
        );
    const excludeSet = new Set(excludeCodes.filter((c) => c && c !== value));
    return base.filter((o) => !excludeSet.has(o.employeeCode)).slice(0, 50);
  }, [options, q, excludeCodes, value]);

  const choose = (o) => {
    onSelect(o.employeeCode, o.employeeName);
    setOpen(false);
  };
  const clear = () => {
    onSelect("", "");
    setQ("");
    setOpen(false);
  };

  return (
    <div className="ac-root" ref={rootRef} style={{ "--w": `${width}px` }}>
      <div className={`ac-box ${open ? "open" : ""}`}>
        <input
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {value ? (
          <button type="button" className="ac-x" onClick={clear} aria-label="Clear">
            ✕
          </button>
        ) : (
          <span className="ac-chev">▾</span>
        )}
      </div>
      {open && (
        <div className="ac-pop">
          {filtered.map((o) => (
            <button key={o.employeeCode} className="ac-opt" onClick={() => choose(o)} type="button">
              <div className="name">{o.employeeName}</div>
              <div className="code">{o.employeeCode}</div>
            </button>
          ))}
          {filtered.length === 0 && <div className="ac-empty">Already selected elsewhere</div>}
        </div>
      )}

      <style jsx>{`
        .ac-root {
          position: relative;
          width: var(--w);
        }
        .ac-box {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
          background: #fff;
          padding: 0 8px;
          height: 38px;
        }
        .ac-box input {
          flex: 1;
          border: none;
          outline: none;
          height: 28px;
          font-weight: 600;
          color: #1b2636;
          border: none;
        }
        .ac-chev {
          color: #8da0b8;
          font-size: 12px;
        }
        .ac-x {
          border: none;
          background: none;
          cursor: pointer;
          color: #8b97aa;
          font-size: 14px;
        }
        .ac-pop {
          position: absolute;
          z-index: 25;
          top: 40px;
          left: 0;
          width: var(--w);
          background: #fff;
          border: 1px solid #d8dee8;
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
          max-height: 280px;
          overflow: auto;
        }
        .ac-opt {
          width: 100%;
          text-align: left;
          background: #fff;
          border: none;
          padding: 10px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ac-opt:hover {
          background: #f5f8fd;
        }
        .ac-opt .name {
          font-weight: 700;
          color: #0b1f3a;
        }
        .ac-opt .code {
          color: #6b7484;
          font-size: 12px;
        }
        .ac-empty {
          padding: 12px;
          color: #8a93a4;
        }
      `}</style>
    </div>
  );
}

/* ---------- Page ---------- */
const CaseHierarchyCreate = () => {
  const navigate = useNavigate();
  const { recId: routeRecId } = useParams(); // <-- edit mode if defined

  const [recId, setRecId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // form stores **codes**
  const [form, setForm] = useState({
    centerCode: "",
    categoryCode: "",
    subCategoryCode: "",
    subSubCategoryCode: "",
    subSubSubCategoryCode: "",
  });

  const [levels, setLevels] = useState([emptyLevel(), emptyLevel(), emptyLevel()]);

  // options
  const [clinics, setClinics] = useState([]); // [{code,name}]
  const [employees, setEmployees] = useState([]); // [{employeeCode, employeeName}]
  const [mailTemplates, setMailTemplates] = useState(BASE_MAIL_TEMPLATES);

  // dropdown options via APIs
  const [categoryOptions, setCategoryOptions] = useState([]); // [{code,name}]
  const [subCategoryOptions, setSubCategoryOptions] = useState([]); // [{code,name}]
  const [subSubCategoryOptions, setSubSubCategoryOptions] = useState([]); // [{code,name}]
  const [subSubSubCategoryOptions, setSubSubSubCategoryOptions] = useState([]); // [{code,name}]

  // code<->name maps for payload conversion
  const [nameToCode, setNameToCode] = useState({
    Category: {},
    SubCategory: {},
    SubSubCategory: {},
    SubSubSubCategory: {},
  });
  const [codeToName, setCodeToName] = useState({
    Category: {},
    SubCategory: {},
    SubSubCategory: {},
    SubSubSubCategory: {},
  });

  // distinguish user changes vs edit-mode hydration
  const hydratingRef = useRef(false);

  const showToast = (message, type = "error", ms = 2400) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  const mergeMapEntry = (type, code, name) => {
    if (!code || !name) return;
    setCodeToName((prev) => {
      if (prev[type]?.[code]) return prev;
      return { ...prev, [type]: { ...(prev[type] || {}), [code]: name } };
    });
    setNameToCode((prev) => {
      if (prev[type]?.[name]) return prev;
      return { ...prev, [type]: { ...(prev[type] || {}), [name]: code } };
    });
  };

  const ensureSelectedInOptions = (opts, selectedCode, type) => {
    if (!selectedCode) return opts;
    const exists = opts.some((o) => o.code === selectedCode);
    if (exists) return opts;
    const name = codeToName[type]?.[selectedCode] || selectedCode;
    return [...opts, { code: selectedCode, name }];
  };

  /* load initial data */
  useEffect(() => {
    (async () => {
      try {
        // Clinics -> centerCode
        try {
          const d = await fetchJSON(`${API_BASE_URL}/api/Master/LoadCenters`);
          if (Array.isArray(d)) setClinics(d);
        } catch {
          setClinics([{ code: "Bright", name: "Bright Clinics" }]);
        }

        // Employees
        try {
          const d = await fetchJSON(`${API_BASE_URL}/api/Employees`);
          if (Array.isArray(d)) setEmployees(d);
        } catch {
          setEmployees([
            { employeeCode: "CENT-00047", employeeName: "Zoya Kazi" },
            { employeeCode: "CENT-00101", employeeName: "Khaled Abdelraheem Quenawy" },
            { employeeCode: "CENT-00102", employeeName: "Nahlah Hassan Altayeb" },
          ]);
        }

        // Categories
        try {
          const cats = await fetchJSON(`${API_BASE_URL}/api/CaseCategory/CaseCategory`);
          const opts = (Array.isArray(cats) ? cats : []).map((it) => {
            const code = it.categoryCode ?? it.code ?? it.id ?? it.name;
            const name = it.categoryName ?? it.name ?? String(code);
            mergeMapEntry("Category", code, name);
            return { code, name };
          });
          setCategoryOptions(opts);
        } catch (e) {
          console.error(e);
          setCategoryOptions([]);
        }
      } catch (e) {
        console.error(e);
        showToast("Failed to load initial data.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Cascades via APIs (NO auto-clearing here; clearing is handled in setField for user actions) */
  useEffect(() => {
    if (!form.categoryCode) {
      setSubCategoryOptions([]);
      return;
    }
    (async () => {
      try {
        const url = `${API_BASE_URL}/api/CaseCategory/CaseSubCategory?categoryCode=${encodeURIComponent(
          form.categoryCode
        )}`;
        const list = await fetchJSON(url);
        let opts = (Array.isArray(list) ? list : []).map((it) => {
          const code = it.subCategoryCode ?? it.code ?? it.id ?? it.subCategoryName ?? it.name;
          const name = it.subCategoryName ?? it.name ?? String(code);
          mergeMapEntry("SubCategory", code, name);
          return { code, name };
        });
        // Keep edit-mode selection visible even if not present in API response
        opts = ensureSelectedInOptions(opts, form.subCategoryCode, "SubCategory");
        setSubCategoryOptions(opts);
      } catch (e) {
        console.error(e);
        setSubCategoryOptions((prev) => ensureSelectedInOptions(prev || [], form.subCategoryCode, "SubCategory"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryCode]);

  useEffect(() => {
    if (!form.categoryCode || !form.subCategoryCode) {
      setSubSubCategoryOptions([]);
      return;
    }
    (async () => {
      try {
        const url = `${API_BASE_URL}/api/CaseCategory/CaseSubSubCategory?categoryCode=${encodeURIComponent(
          form.categoryCode
        )}&subCategoryCode=${encodeURIComponent(form.subCategoryCode)}`;
        const list = await fetchJSON(url);
        let opts = (Array.isArray(list) ? list : []).map((it) => {
          // Some payloads may not have a subSubCategoryCode; fall back to name.
          const code =
            it.subSubCategoryCode ?? it.code ?? it.id ?? it.subSubCategoryName ?? it.name;
          const name = it.subSubCategoryName ?? it.name ?? String(code);
          mergeMapEntry("SubSubCategory", code, name);
          return { code, name };
        });
        opts = ensureSelectedInOptions(opts, form.subSubCategoryCode, "SubSubCategory");
        setSubSubCategoryOptions(opts);
      } catch (e) {
        console.error(e);
        setSubSubCategoryOptions((prev) =>
          ensureSelectedInOptions(prev || [], form.subSubCategoryCode, "SubSubCategory")
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subCategoryCode]);

  useEffect(() => {
    if (!form.categoryCode || !form.subCategoryCode || !form.subSubCategoryCode) {
      setSubSubSubCategoryOptions([]);
      return;
    }
    (async () => {
      try {
        const url = `${API_BASE_URL}/api/CaseCategory/CaseSubSubSubCategory?categoryCode=${encodeURIComponent(
          form.categoryCode
        )}&subCategoryCode=${encodeURIComponent(form.subCategoryCode)}&subSubCategoryCode=${encodeURIComponent(
          form.subSubCategoryCode
        )}`;
        const list = await fetchJSON(url);
        let opts = (Array.isArray(list) ? list : []).map((it) => {
          const code =
            it.subSubSubCategoryCode ?? it.code ?? it.id ?? it.subSubSubCategoryName ?? it.name;
          const name = it.subSubSubCategoryName ?? it.name ?? String(code);
          mergeMapEntry("SubSubSubCategory", code, name);
          return { code, name };
        });
        opts = ensureSelectedInOptions(opts, form.subSubSubCategoryCode, "SubSubSubCategory");
        setSubSubSubCategoryOptions(opts);
      } catch (e) {
        console.error(e);
        setSubSubSubCategoryOptions((prev) =>
          ensureSelectedInOptions(prev || [], form.subSubSubCategoryCode, "SubSubSubCategory")
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subSubCategoryCode]);

  const setField = (key, val) => {
    // Only clear dependent fields when the change is initiated by the user
    if (key === "categoryCode") {
      setForm((p) => ({
        ...p,
        categoryCode: val,
        subCategoryCode: "",
        subSubCategoryCode: "",
        subSubSubCategoryCode: "",
      }));
      return;
    }
    if (key === "subCategoryCode") {
      setForm((p) => ({
        ...p,
        subCategoryCode: val,
        subSubCategoryCode: "",
        subSubSubCategoryCode: "",
      }));
      return;
    }
    if (key === "subSubCategoryCode") {
      setForm((p) => ({
        ...p,
        subSubCategoryCode: val,
        subSubSubCategoryCode: "",
      }));
      return;
    }
    setForm((p) => ({ ...p, [key]: val }));
  };

  /* EDIT MODE: fetch details when recId param exists and PREFILL USING CODES */
  useEffect(() => {
    const id = Number(routeRecId || 0);
    if (!id) return;
    setRecId(id);
    hydratingRef.current = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/CaseOperation/GetCaseHierarchyDetails/${id}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const arr = await res.json();
        const row = Array.isArray(arr) ? arr[0] : arr;
        if (!row) return;

        // Prefill map so selected values render even before options arrive
        const ensure = (t, code, name) => mergeMapEntry(t, code, name);
        ensure("Category", row.categoryCode, row.categoryName);
        ensure("SubCategory", row.subCategoryCode, row.subCategoryName);
        ensure("SubSubCategory", row.subSubCategoryCode, row.subSubCategoryName);
        ensure("SubSubSubCategory", row.subSubSubCategoryCode, row.subSubSubCategoryName);

        // PREFILL BY CODE
        setForm({
          centerCode: row.clinicCode || "",
          categoryCode: row.categoryCode || "",
          subCategoryCode: row.subCategoryCode || "",
          subSubCategoryCode: row.subSubCategoryCode || "",
          subSubSubCategoryCode: row.subSubSubCategoryCode || "",
        });

        // levels
        setLevels([
          {
            assignee: row.firstAssignment || "",
            assigneeName: "", // filled once employees arrive
            postSlaAssignee: row.firstEscalationToPostSLA || "",
            postSlaAssigneeName: "",
            group: row.firstGroupAssignment || "",
            sla: row.firstSLA || "",
            exclusions: parseDays(row.firstExcludingSLA),
            assignTemplate: row.firstMailFormatForAssignment || "",
            escalateTemplate: row.firstMailFormatForEscalation || "",
          },
          {
            assignee: row.secondAssignment || "",
            assigneeName: "",
            postSlaAssignee: row.secondEscalationToPostSLA || "",
            postSlaAssigneeName: "",
            group: row.secondGroupAssignment || "",
            sla: row.secondSLA || "",
            exclusions: parseDays(row.secondExcludingSLA),
            assignTemplate: row.secondMailFormatForAssignment || "",
            escalateTemplate: row.secondMailFormatForEscalation || "",
          },
          {
            assignee: row.thirdAssignment || "",
            assigneeName: "",
            postSlaAssignee: row.thirdEscalationToPostSLA || "",
            postSlaAssigneeName: "",
            group: row.thirdGroupAssignment || "",
            sla: row.thirdSLA || "",
            exclusions: parseDays(row.thirdExcludingSLA),
            assignTemplate: row.thirdMailFormatForAssignment || "",
            escalateTemplate: row.thirdMailFormatForEscalation || "",
          },
        ]);
      } catch (e) {
        console.error(e);
        showToast("Failed to load case details.");
      } finally {
        // allow user-driven clears thereafter
        hydratingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeRecId]);

  /* When employees list arrives, resolve display names for codes we already have */
  useEffect(() => {
    if (!employees.length) return;
    const nameOf = (code) => employees.find((e) => e.employeeCode === code)?.employeeName || "";

    setLevels((prev) =>
      prev.map((L) => ({
        ...L,
        assigneeName: L.assignee ? nameOf(L.assignee) : "",
        postSlaAssigneeName: L.postSlaAssignee ? nameOf(L.postSlaAssignee) : "",
      }))
    );
  }, [employees]);

  /* validation & payload */
  const validate = () => {
    if (!form.centerCode) return "Please choose Clinic";
    if (!form.categoryCode) return "Please choose Category";
    if (!form.subCategoryCode) return "Please choose Sub Category";
    if (!form.subSubCategoryCode) return "Please choose Sub Sub Category";
    if (!form.subSubSubCategoryCode) return "Please choose Sub Sub Sub Category";
    for (let i = 0; i < 3; i++) {
      const L = levels[i];
      if (L.sla && !(L.assignee || L.group)) return `Level ${i + 1}: SLA set but no Assignee/Group provided.`;
      if (L.assignee && L.postSlaAssignee && L.assignee === L.postSlaAssignee)
        return `Level ${i + 1}: Escalation to Post SLA cannot be the same as Assignment.`;
    }
    return null;
  };
  const toComma = (arr) => (arr && arr.length ? arr.join(",") : "");

  // Convert codes back to names for submission (preserve current API shape).
  const buildPayload = (isDraft) => ({
    centerCode: form.centerCode,

    category: codeToName.Category[form.categoryCode] || form.categoryCode || "",
    subCategory: codeToName.SubCategory[form.subCategoryCode] || form.subCategoryCode || "",
    subSubCategory: codeToName.SubSubCategory[form.subSubCategoryCode] || form.subSubCategoryCode || "",
    subSubSubCategory:
      codeToName.SubSubSubCategory[form.subSubSubCategoryCode] || form.subSubSubCategoryCode || "",

    firstAssignment: levels[0].assignee,
    firstGroupAssignment: levels[0].group,
    firstSLA: safe(levels[0].sla),
    firstEscalationToPostSLA: levels[0].postSlaAssignee,
    firstExcludingSLA: toComma(levels[0].exclusions),
    firstMailFormatForAssignment: safe(levels[0].assignTemplate),
    firstMailFormatForEscalation: safe(levels[0].escalateTemplate),

    secondAssignment: levels[1].assignee,
    secondGroupAssignment: levels[1].group,
    secondSLA: safe(levels[1].sla),
    secondEscalationToPostSLA: levels[1].postSlaAssignee,
    secondExcludingSLA: toComma(levels[1].exclusions),
    secondMailFormatForAssignment: safe(levels[1].assignTemplate),
    secondMailFormatForEscalation: safe(levels[1].escalateTemplate),

    thirdAssignment: levels[2].assignee,
    thirdGroupAssignment: levels[2].group,
    thirdSLA: safe(levels[2].sla),
    thirdEscalationToPostSLA: levels[2].postSlaAssignee,
    thirdExcludingSLA: toComma(levels[2].exclusions),
    thirdMailFormatForAssignment: safe(levels[2].assignTemplate),
    thirdMailFormatForEscalation: safe(levels[2].escalateTemplate),

    isDraft: isDraft ? 1 : 0,
    recId: recId || 0,
  });

  const submit = async (isDraft) => {
    const err = validate();
    if (err) return showToast(err);

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CreateCaseHierarchy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(isDraft)),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.status === false || payload?.success === false) {
        throw new Error(payload?.message || `HTTP ${res.status}`);
      }
      showToast(isDraft ? "Saved as draft." : recId ? "Updated successfully." : "Submitted successfully.", "success");
      navigate("/case-hierarchy");
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  /* Level UI */
  const setLevel = (idx, patch) => setLevels((prev) => prev.map((L, i) => (i === idx ? { ...L, ...patch } : L)));
  const clearLevel = (idx) => setLevel(idx, emptyLevel());

  const selectedCodesGlobal = useMemo(() => {
    const codes = [];
    for (const L of levels) {
      if (L.assignee) codes.push(L.assignee);
      if (L.postSlaAssignee) codes.push(L.postSlaAssignee);
    }
    return codes;
  }, [levels]);

  const LevelCard = ({ idx, title }) => {
    const L = levels[idx];
    const excludeForAssignment = selectedCodesGlobal.filter((c) => c && c !== L.assignee);
    const excludeForPostSla = selectedCodesGlobal.filter((c) => c && c !== L.postSlaAssignee);

    return (
      <div className="card">
        <div className="card-hdr">
          <h3>{title}</h3>
          <button className="ghost" onClick={() => clearLevel(idx)} title="Clear this level">
            Clear
          </button>
        </div>

        <div className="grid">
          <div className="field">
            <label>Assignment</label>
            <AutoComplete
              options={employees}
              value={L.assignee}
              display={L.assigneeName}
              onSelect={(code, name) => setLevel(idx, { assignee: code, assigneeName: name })}
              excludeCodes={excludeForAssignment}
              placeholder="None selected"
              width={260}
            />
          </div>

          <div className="field">
            <label>Escalation to Post SLA</label>
            <AutoComplete
              options={employees}
              value={L.postSlaAssignee}
              display={L.postSlaAssigneeName}
              onSelect={(code, name) => setLevel(idx, { postSlaAssignee: code, postSlaAssigneeName: name })}
              excludeCodes={excludeForPostSla}
              placeholder="None selected"
              width={260}
            />
          </div>

          <div className="field">
            <label>Group Assignment</label>
            <input
              placeholder="Enter group/distribution list"
              value={L.group}
              onChange={(e) => setLevel(idx, { group: e.target.value })}
            />
          </div>

          <div className="field">
            <label>SLA In Hours</label>
            <select value={L.sla} onChange={(e) => setLevel(idx, { sla: e.target.value })}>
              <option value="">Select</option>
              {SLA_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Excluding SLA</label>
            <MultiSelect
              options={DAYS}
              value={L.exclusions}
              onChange={(arr) => setLevel(idx, { exclusions: arr })}
              placeholder="None selected"
              width={260}
            />
          </div>

          <div className="field">
            <label>Mail Format For Assignment</label>
            <select value={L.assignTemplate} onChange={(e) => setLevel(idx, { assignTemplate: e.target.value })}>
              {mailTemplates.map((t, i) => (
                <option key={`mt-a-${i}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Mail Format For Escalation</label>
            <select value={L.escalateTemplate} onChange={(e) => setLevel(idx, { escalateTemplate: e.target.value })}>
              {mailTemplates.map((t, i) => (
                <option key={`mt-e-${i}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pg">
      <div className="hdr">
        <div>
          <div className="crumbs">
            <a href="/case-hierarchy" className="crumb">
              Case Hierarchy
            </a>
            <span className="sep">›</span>
            <span className="muted">{recId ? `Edit #${recId}` : "Creation of Case Hierarchy"}</span>
          </div>
          <h1 className="title">{recId ? "Edit Case Hierarchy" : "Create Case Hierarchy"}</h1>
        </div>
        <div className="hdr-actions">
          <button className="btn ghost" onClick={() => navigate(-1)}>
            Close
          </button>
          <button className="btn" disabled={busy} onClick={() => submit(true)}>
            Save
          </button>
          <button className="btn primary" disabled={busy} onClick={() => submit(false)}>
            {recId ? "Update" : "Submit"}
          </button>
        </div>
      </div>

      {/* Top selectors (VALUES = CODES, labels = names) */}
      <div className="top-grid">
        <div className="field">
          <label>Clinic Name</label>
          <select value={form.centerCode} onChange={(e) => setField("centerCode", e.target.value)}>
            <option value="">Select one</option>
            {clinics.map((c) => (
              <option key={c.code ?? c.name} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Category</label>
          <select
            value={form.categoryCode}
            onChange={(e) => setField("categoryCode", e.target.value)}
            disabled={!categoryOptions.length}
          >
            <option value="">Select Category</option>
            {categoryOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Sub Category</label>
          <select
            value={form.subCategoryCode}
            onChange={(e) => setField("subCategoryCode", e.target.value)}
            disabled={!subCategoryOptions.length}
          >
            <option value="">Select Sub Category</option>
            {subCategoryOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Sub Sub Category</label>
          <select
            value={form.subSubCategoryCode}
            onChange={(e) => setField("subSubCategoryCode", e.target.value)}
            disabled={!subSubCategoryOptions.length}
          >
            <option value="">Select Sub Sub Category</option>
            {subSubCategoryOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Sub Sub Sub Category</label>
          <select
            value={form.subSubSubCategoryCode}
            onChange={(e) => setField("subSubSubCategoryCode", e.target.value)}
            disabled={!subSubSubCategoryOptions.length}
          >
            <option value="">Select Sub Sub Sub Category</option>
            {subSubSubCategoryOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <LevelCard idx={0} title="1st Level" />
      <LevelCard idx={1} title="2nd Level" />
      <LevelCard idx={2} title="3rd Level" />

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style jsx>{`
        .hdr {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .title {
          margin: 6px 0 0;
          font-size: 22px;
          color: #0b1f3a;
        }
        .crumbs {
          color: #6c7a89;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .crumb {
          color: #334b71;
          text-decoration: none;
          font-weight: 600;
        }
        .sep {
          color: #a7b2c2;
        }
        .muted {
          color: #9aa4b2;
        }
        .hdr-actions {
          display: flex;
          gap: 10px;
        }
        .btn {
          background: #1d2c43;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 9px 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn.primary {
          background: #334b71;
        }
        .btn.ghost {
          background: #fff;
          color: #1d2c43;
          border: 1px solid #d8dee8;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .top-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(180px, 1fr));
          gap: 12px;
          background: #fff;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          margin-bottom: 14px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 180px;
        }
        .field label {
          font-size: 13px;
          font-weight: 700;
          color: #5a6270;
        }
        .field select,
        .field input {
          height: 38px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          padding: 0 10px;
          outline: none;
          background: #fff;
        }
        .field select:disabled {
          background: #f2f4f8;
          color: #9aa4b2;
        }

        .card {
          background: #fff;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          margin-bottom: 14px;
        }
        .card-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .card-hdr h3 {
          margin: 0;
          font-size: 14px;
          background: #112032;
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
        }
        .ghost {
          border: 1px solid #d8dee8;
          background: #fff;
          color: #1d2c43;
          border-radius: 8px;
          padding: 6px 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(220px, 1fr));
          gap: 12px;
        }
        @media (max-width: 1100px) {
          .top-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .grid {
            grid-template-columns: 1fr;
          }
        }

        .toast {
          position: fixed;
          bottom: 16px;
          right: 16px;
          color: #fff;
          background: #d7263d;
          padding: 10px 14px;
          border-radius: 8px;
          font-weight: 600;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
          z-index: 9999;
        }
        .toast.success {
          background: #138a36;
        }
        .toast.info {
          background: #2f6fef;
        }
      `}</style>
    </div>
  );
};

export default CaseHierarchyCreate;
