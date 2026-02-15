"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

/**
 * Create / Edit Case Category Mapping
 * POST /api/Master/CreateCaseCategoryMapping
 */

const CreateCaseCategoryMapping = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer router state
  let stateMode = location.state?.mode;
  let stateMapping = location.state?.mapping;

  // Fallback: sessionStorage (set by dashboard before navigate)
  if (!stateMapping) {
    try {
      const cached = sessionStorage.getItem("editMapping");
      if (cached) {
        stateMapping = JSON.parse(cached);
        stateMode = "edit";
      }
    } catch {}
  }

  // Fallback: query params (mode, recId) – useful just for UI hints
  const query = new URLSearchParams(location.search);
  const qpMode = query.get("mode");
  const qpRecId = query.get("recId");

  const isEdit = (stateMode === "edit" && stateMapping) || qpMode === "edit";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Clinic
  const [clinicCode, setClinicCode] = useState("");
  const [clinicName, setClinicName] = useState("");

  // ✅ Centers (Clinic dropdown)
  const [centers, setCenters] = useState([]);

  // Select values
  const [categoryCode, setCategoryCode] = useState("");
  const [subCategoryCode, setSubCategoryCode] = useState("");
  const [subSubCategoryCode, setSubSubCategoryCode] = useState("");
  const [subSubSubCategoryCode, setSubSubSubCategoryCode] = useState("");
  const [priority, setPriority] = useState("");
  const [defaultAssignment, setDefaultAssignment] = useState("");

  // recId (for edit)
  const [recId, setRecId] = useState(0);

  // Option lists
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [subSubSubCategories, setSubSubSubCategories] = useState([]);
  const [employees, setEmployees] = useState([]);

  /** ---------------- Helpers ---------------- */
  const coerceArray = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (raw && typeof raw === "object") return [raw];
    return [];
  };

  const safeStr = (v) => (v === null || v === undefined ? "" : String(v).trim());

  /**
   * ✅ IMPORTANT:
   * Your session has BOTH:
   *  - sessionStorage.user.centerCode = "Bright"
   *  - sessionStorage.userSession.topCode/loginCode = "Silk"
   *
   * We MUST prefer userSession.topCode/loginCode to preselect clinic.
   */
  const pickClinicFromSession = () => {
    // 1) Highest priority: userSession -> topCode/loginCode
    try {
      const rawSess = sessionStorage.getItem("userSession");
      if (rawSess) {
        const s = JSON.parse(rawSess);
        const code = safeStr(s.topCode) || safeStr(s.loginCode);
        if (code) return { code, name: "" };
      }
    } catch {}

    // 2) Fallback: user object -> centerCode/centerName
    try {
      const rawUser =
        sessionStorage.getItem("user") ||
        sessionStorage.getItem("userDetails") ||
        sessionStorage.getItem("sessionUser");

      if (rawUser) {
        const u = JSON.parse(rawUser);
        const code = safeStr(u.centerCode) || safeStr(u.job);
        const name = safeStr(u.centerName) || safeStr(u.clinicName);
        if (code) return { code, name };
      }
    } catch {}

    // 3) Fallback: flat keys (if any)
    const flat = safeStr(sessionStorage.getItem("topCode")) || safeStr(sessionStorage.getItem("loginCode"));
    if (flat) return { code: flat, name: "" };

    return { code: "", name: "" };
  };

  // ✅ Initialize clinic ONLY ONCE (and NEVER override after)
  const clinicInitializedRef = useRef(false);

  useEffect(() => {
    if (clinicInitializedRef.current) return;
    clinicInitializedRef.current = true;

    const picked = pickClinicFromSession();
    if (picked.code) setClinicCode(picked.code);
    if (picked.name) setClinicName(picked.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Load centers for Clinic dropdown
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Master/LoadCenters`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`LoadCenters: HTTP ${res.status}`);
        const raw = await res.json();

        const list = coerceArray(raw)
          .map((r, i) => ({
            recId: r.recid ?? r.recId ?? r.id ?? i,
            code: safeStr(r.code),
            name: safeStr(r.name),
            zone: r.zone ?? "",
            address: r.address ?? "",
          }))
          .filter((c) => c.code)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!cancelled) setCenters(list);
      } catch (e) {
        console.error("Centers load error:", e);
        if (!cancelled) setCenters([]);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ When centers are loaded, sync clinicName for the selected clinicCode
  useEffect(() => {
    if (!clinicCode) return;
    const found = centers.find((c) => c.code === clinicCode);
    if (found?.name && clinicName !== found.name) setClinicName(found.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centers, clinicCode]);

  // ✅ Clinic dropdown change
  const onClinicChange = (code) => {
    const val = safeStr(code);
    setClinicCode(val);

    const found = centers.find((c) => c.code === val);
    setClinicName(found?.name || "");
  };

  const normalizeByType = (row, typeName, idx = 0) => {
    const id = row.recId ?? row.recID ?? row.id ?? row.recid ?? row.RecId ?? idx;
    const code =
      row.code ??
      row.categoryCode ??
      row.subCategoryCode ??
      row.subSubCategoryCode ??
      row.subSubSubCategoryCode ??
      "";
    const name =
      row.name ??
      row.categoryName ??
      row.subCategoryName ??
      row.subSubCategoryName ??
      row.subSubSubCategoryName ??
      "";
    return {
      recId: id,
      code: String(code),
      name: String(name),
      type: String(typeName),
    };
  };

  // Load options (by type)
  useEffect(() => {
    let cancelled = false;

    const fetchType = async (typeName) => {
      const url = `${API_BASE_URL}/api/Master/GetCaseCategory/${encodeURIComponent(typeName)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${typeName}: HTTP ${res.status}`);
      const data = await res.json();
      const list = coerceArray(data).map((r, i) => normalizeByType(r, typeName, i));
      list.sort((a, b) => a.code.localeCompare(b.code));
      return list;
    };

    (async () => {
      try {
        setLoading(true);
        const [cat, sub, subsub, subsubsub] = await Promise.all([
          fetchType("Category"),
          fetchType("SubCategory"),
          fetchType("SubSubCategory"),
          fetchType("SubSubSubCategory"),
        ]);
        if (cancelled) return;
        setCategories(cat);
        setSubCategories(sub);
        setSubSubCategories(subsub);
        setSubSubSubCategories(subsubsub);
      } catch (e) {
        console.error("Category options error:", e);
        if (!cancelled) {
          setCategories([]);
          setSubCategories([]);
          setSubSubCategories([]);
          setSubSubSubCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load employees (Default Assignment)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Employees`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Employees: HTTP ${res.status}`);
        const raw = await res.json();
        const list = coerceArray(raw).map((r, i) => ({
          recId: r.recId ?? r.recID ?? r.id ?? i,
          code: safeStr(r.employeeCode ?? r.code ?? ""),
          name: safeStr(r.employeeName ?? r.name ?? ""),
          email: r.emailID ?? r.email ?? "",
        }));
        const clean = list.filter((e) => e.code).sort((a, b) => a.code.localeCompare(b.code));
        if (!cancelled) setEmployees(clean);
      } catch (e) {
        console.error("Employees load error:", e);
        if (!cancelled) setEmployees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill for edit
  useEffect(() => {
    if (!isEdit) return;
    const src = stateMapping || {};
    setCategoryCode(src.categoryCode || "");
    setSubCategoryCode(src.subCategoryCode || "");
    setSubSubCategoryCode(src.subSubCategoryCode || "");
    setSubSubSubCategoryCode(src.subSubSubCategoryCode || "");
    setDefaultAssignment(src.defaultAssignment || "");
    setPriority(String(src.priority ?? src.Priority ?? "").trim());
    setRecId(Number(src.recId ?? src.recID ?? qpRecId ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  const validate = () => {
    const errors = [];
    if (!categoryCode && !subCategoryCode && !subSubCategoryCode && !subSubSubCategoryCode) {
      errors.push("Select at least one of Category / Sub / Sub Sub / Sub Sub Sub.");
    }
    return errors;
  };

  const postMapping = async (isDraft) => {
    const payload = {
      categoryCode: categoryCode || "",
      subCategoryCode: subCategoryCode || "",
      subSubCategoryCode: subSubCategoryCode || "",
      subSubSubCategoryCode: subSubSubCategoryCode || "",
      defaultAssignment: defaultAssignment || "",
      priority: priority || "",
      isDraft: isDraft ? 1 : 0,
      recId: recId || 0, // 0=create, >0=edit/upsert

      // ✅ If backend needs clinic code, uncomment:
      // clinicCode: clinicCode || "",
    };

    const res = await fetch(`${API_BASE_URL}/api/Master/CreateCaseCategoryMapping`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Operation failed");
    }
  };

  const onSave = async () => {
    const errs = validate();
    if (errs.length) return alert(errs.join("\n"));
    setBusy(true);
    try {
      await postMapping(true);
      alert(isEdit ? "Changes saved as draft." : "Saved as draft.");
    } catch (e) {
      console.error(e);
      alert(`Save failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async () => {
    const errs = validate();
    if (errs.length) return alert(errs.join("\n"));
    setBusy(true);
    try {
      await postMapping(false);
      alert(isEdit ? "Mapping updated." : "Mapping created.");
      try {
        sessionStorage.removeItem("editMapping");
      } catch {}
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert(`Submit failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const isDisabled = loading || busy;

  // Ensure edit codes appear even if options not yet loaded
  const ensureOption = (arr, code, nameFallback = "") => {
    if (!code) return arr;
    if (arr.some((o) => o.code === code)) return arr;
    return [{ code, name: nameFallback || code, recId: `temp-${code}` }, ...arr];
  };

  const categoriesSafe = useMemo(() => ensureOption(categories, categoryCode), [categories, categoryCode]);
  const subCategoriesSafe = useMemo(
    () => ensureOption(subCategories, subCategoryCode),
    [subCategories, subCategoryCode]
  );
  const subSubCategoriesSafe = useMemo(
    () => ensureOption(subSubCategories, subSubCategoryCode),
    [subSubCategories, subSubCategoryCode]
  );
  const subSubSubCategoriesSafe = useMemo(
    () => ensureOption(subSubSubCategories, subSubSubCategoryCode),
    [subSubSubCategories, subSubSubCategoryCode]
  );

  return (
    <>
      <style jsx>{`
        .wrap {
          max-width: 980px;
          margin: 0 auto;
          padding: 20px 16px 64px;
        }
        .crumb {
          color: #334b71;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .title {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 16px;
        }
        .pill {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
          margin-left: 8px;
          background: #eef2ff;
          color: #3730a3;
        }
        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }
        .row {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 12px;
          align-items: center;
          margin-bottom: 14px;
        }
        .label {
          color: #374151;
          font-weight: 600;
        }
        .fld,
        .select {
          height: 40px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 14px;
          width: 100%;
          background: #fff;
        }
        .actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 22px;
        }
        .btn {
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-weight: 700;
          cursor: pointer;
          min-width: 120px;
        }
        .btn.save {
          background: #1f2937;
          color: #fff;
        }
        .btn.submit {
          background: #334b71;
          color: #fff;
        }
        .btn.close {
          background: #6b7280;
          color: #fff;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .inline {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .muted {
          color: #6b7280;
        }
      `}</style>

      <div className="wrap">
        <div className="crumb">
          <a
            style={{ cursor: "pointer" }}
            onClick={() => {
              try {
                sessionStorage.removeItem("editMapping");
              } catch {}
              navigate("/case-category-mapping");
            }}
          >
            Case Management
          </a>{" "}
          &gt; {isEdit ? "Edit Category Mapping" : "Creation of Category Mapping"}
          {isEdit && <span className="pill">Edit Mode</span>}
        </div>

        <div className="title">{isEdit ? "Edit Category Mapping" : "Creation of Category Mapping"}</div>

        <div className="card">
          {/* ✅ Clinic */}
          <div className="row">
            <div className="label">Clinic :</div>

            <div className="inline">
              <select
                className="select"
                value={clinicCode}
                onChange={(e) => onClinicChange(e.target.value)}
                disabled={isDisabled}
              >
                <option value="">Select clinic</option>
                {centers.map((c) => (
                  <option key={`cen-${c.code}-${c.recId}`} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input className="fld" value={clinicCode} readOnly placeholder="Code" />
            </div>
          </div>

          {/* Category */}
          <div className="row">
            <div className="label">Category:</div>
            <select
              className="select"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              disabled={isDisabled}
            >
              <option value="">Select one</option>
              {categoriesSafe.map((o) => (
                <option key={`cat-${o.code}-${o.recId}`} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Category */}
          <div className="row">
            <div className="label">Sub Category:</div>
            <select
              className="select"
              value={subCategoryCode}
              onChange={(e) => setSubCategoryCode(e.target.value)}
              disabled={isDisabled}
            >
              <option value="">Select one</option>
              {subCategoriesSafe.map((o) => (
                <option key={`sub-${o.code}-${o.recId}`} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Sub Category */}
          <div className="row">
            <div className="label">Sub Sub Category:</div>
            <select
              className="select"
              value={subSubCategoryCode}
              onChange={(e) => setSubSubCategoryCode(e.target.value)}
              disabled={isDisabled}
            >
              <option value="">Select one</option>
              {subSubCategoriesSafe.map((o) => (
                <option key={`sub2-${o.code}-${o.recId}`} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Sub Sub Category */}
          <div className="row">
            <div className="label">Sub Sub Sub Category:</div>
            <select
              className="select"
              value={subSubSubCategoryCode}
              onChange={(e) => setSubSubSubCategoryCode(e.target.value)}
              disabled={isDisabled}
            >
              <option value="">Select one</option>
              {subSubSubCategoriesSafe.map((o) => (
                <option key={`sub3-${o.code}-${o.recId}`} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="row">
            <div className="label">Priority:</div>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} disabled={busy}>
              <option value="">Select one</option>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* Default Assignment */}
          <div className="row">
            <div className="label">Default Assignment:</div>
            <select
              className="select"
              value={defaultAssignment}
              onChange={(e) => setDefaultAssignment(e.target.value)}
              disabled={loading}
            >
              <option value="">Select one</option>
              {employees.map((e) => (
                <option key={`emp-${e.code}-${e.recId}`} value={e.code}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="actions">
            <button className="btn save" onClick={onSave} disabled={busy || loading}>
              {busy ? "Saving..." : isEdit ? "Save Changes" : "Save (Draft)"}
            </button>
            <button className="btn submit" onClick={onSubmit} disabled={busy || loading}>
              {busy ? "Submitting..." : isEdit ? "Update" : "Submit"}
            </button>
            <button
              className="btn close"
              onClick={() => {
                try {
                  sessionStorage.removeItem("editMapping");
                } catch {}
                navigate(-1);
              }}
              disabled={busy}
            >
              Close
            </button>
          </div>

          {isEdit && (
            <p className="muted" style={{ marginTop: 12 }}>
              Editing mapping #{stateMapping?.recId ?? stateMapping?.recID ?? qpRecId ?? "?"}. Submit to update.
            </p>
          )}

          {clinicName ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Selected Clinic: <b>{clinicName}</b>
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default CreateCaseCategoryMapping;
