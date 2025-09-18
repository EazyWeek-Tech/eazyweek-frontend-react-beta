"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const CreateCaseCategory = () => {
  const navigate = useNavigate();

  const [active, setActive] = useState("Category");

  // inputs for current row in each tab
  // Category has only name + customerCentric (no code)
  const [categoryInput, setCategoryInput] = useState({ name: "", customerCentric: true });
  const [subCategoryInput, setSubCategoryInput] = useState({ name: "" });
  const [subSubCategoryInput, setSubSubCategoryInput] = useState({ name: "" });
  const [subSubSubCategoryInput, setSubSubSubCategoryInput] = useState({ name: "" });

  // added rows (shown in table)
  const [categories, setCategories] = useState([]);               // [{ name, customerCentric }]
  const [subCategories, setSubCategories] = useState([]);         // [{ name }]
  const [subSubCategories, setSubSubCategories] = useState([]);   // [{ name }]
  const [subSubSubCategories, setSubSubSubCategories] = useState([]); // [{ name }]

  const [busy, setBusy] = useState(false);

  const trim = (s) => (s ?? "").toString().trim();

  const addRow = (level) => {
    if (level === "Category") {
      const name = trim(categoryInput.name);
      if (!name) return alert("Please enter Category Name.");
      setCategories((prev) => {
        if (prev.some((r) => r.name.toLowerCase() === name.toLowerCase())) return prev;
        return [...prev, { name, customerCentric: !!categoryInput.customerCentric }];
      });
      setCategoryInput({ name: "", customerCentric: true });
      return;
    }

    if (level === "SubCategory") {
      const name = trim(subCategoryInput.name);
      if (!name) return alert("Please enter Sub Category Name.");
      setSubCategories((prev) => {
        if (prev.some((r) => r.name.toLowerCase() === name.toLowerCase())) return prev;
        return [...prev, { name }];
      });
      setSubCategoryInput({ name: "" });
      return;
    }

    if (level === "SubSubCategory") {
      const name = trim(subSubCategoryInput.name);
      if (!name) return alert("Please enter Sub Sub Category Name.");
      setSubSubCategories((prev) => {
        if (prev.some((r) => r.name.toLowerCase() === name.toLowerCase())) return prev;
        return [...prev, { name }];
      });
      setSubSubCategoryInput({ name: "" });
      return;
    }

    if (level === "SubSubSubCategory") {
      const name = trim(subSubSubCategoryInput.name);
      if (!name) return alert("Please enter Sub Sub Sub Category Name.");
      setSubSubSubCategories((prev) => {
        if (prev.some((r) => r.name.toLowerCase() === name.toLowerCase())) return prev;
        return [...prev, { name }];
      });
      setSubSubSubCategoryInput({ name: "" });
    }
  };

  const removeRow = (level, keyName) => {
    if (level === "Category") {
      setCategories((p) => p.filter((r) => r.name !== keyName));
      return;
    }
    const byName = (arr) => arr.filter((r) => r.name !== keyName);
    if (level === "SubCategory") setSubCategories((p) => byName(p));
    if (level === "SubSubCategory") setSubSubCategories((p) => byName(p));
    if (level === "SubSubSubCategory") setSubSubSubCategories((p) => byName(p));
  };

  // ---- Build payload for new API (names only) ----
  const buildPayload = (isDraftVal) => {
    const categoryJson = categories.map((c) => ({
      categoryName: c.name,
      // If your backend expects "1"/"0" or "Yes"/"No", change mapping here:
      customerCentricCategory: c.customerCentric ? "Yes" : "No",
    }));

    const subCategoryJson = subCategories.map((s) => ({
      subCategoryName: s.name,
    }));

    const subSubCategoryCreationJson = subSubCategories.map((s2) => ({
      subSubCategoryName: s2.name,
    }));

    // NOTE: Per your schema, this array also uses "subSubCategoryName" as the key.
    const subSubSubCategoryCreationJson = subSubSubCategories.map((s3) => ({
      subSubCategoryName: s3.name,
    }));

    return {
      isDraft: isDraftVal ? 1 : 0,
      categoryJson,
      subCategoryJson,
      subSubCategoryCreationJson,
      subSubSubCategoryCreationJson,
    };
  };

  const postCreation = async (payload) => {
    const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseCategoryCreation`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Create failed");
    }
  };

  const nothingAdded =
    categories.length === 0 &&
    subCategories.length === 0 &&
    subSubCategories.length === 0 &&
    subSubSubCategories.length === 0;

  const onSave = async () => {
    if (nothingAdded) return alert("Please add at least one value before saving.");
    setBusy(true);
    try {
      const payload = buildPayload(true);
      await postCreation(payload);
      alert("Saved as draft (isDraft=1).");
    } catch (e) {
      console.error(e);
      alert(`Save failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async () => {
    if (nothingAdded) return alert("Please add at least one value before submitting.");
    setBusy(true);
    try {
      const payload = buildPayload(false);
      await postCreation(payload);
      alert("Submitted successfully.");
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert(`Submit failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  // matches App.jsx routes
  const gotoList = () => navigate("/case-categories");
  const gotoMapping = () => navigate("/categories-mapping");

  // quick summary metrics
  const summary = useMemo(
    () => ({
      categories: categories.length,
      sub: subCategories.length,
      sub2: subSubCategories.length,
      sub3: subSubSubCategories.length,
      totalItems:
        categories.length +
        subCategories.length +
        subSubCategories.length +
        subSubSubCategories.length,
    }),
    [categories, subCategories, subSubCategories, subSubSubCategories]
  );

  return (
    <>
      <style jsx>{`
        .wrap { max-width: 1160px; margin: 0 auto; padding: 16px 16px 64px; }
        .crumb { color:#334B71; margin-bottom:8px; font-size:14px; }
        .headerbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
        .title { font-size:22px; font-weight:700; color:#111827; margin:0; }
        .header-actions { display:flex; gap:10px; }
        .btn { border:none; cursor:pointer; font-weight:700; border-radius:8px; padding:10px 16px; }
        .btn.primary { background:#334B71; color:#fff; }
        .btn.dark { background:#0f1f3b; color:#fff; }
        .btn.light { background:#fff; border:1px solid #d1d5db; }
        .btn.warn { background:#c66752; color:#fff; }
        .btn:disabled { opacity:.6; cursor:not-allowed; }

        .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
        .tabs { display:flex; gap:10px; border-bottom:1px solid #e5e7eb; padding:10px; flex-wrap:wrap; }
        .tab { padding:8px 14px; border-radius:999px; border:none; cursor:pointer; font-weight:700; font-size:14px; }
        .tab.active { background:#05224C; color:#fff; }

        .content { padding:18px; display:grid; grid-template-columns: 1fr 320px; gap:20px; align-items:flex-start; }
        .left { max-width:760px; }
        .row { display:grid; grid-template-columns:180px 1fr; align-items:center; gap:12px; margin-bottom:12px; }
        .label { color:#374151; font-weight:600; }
        .inp { height:38px; padding:8px 10px; border-radius:8px; border:1px solid #d1d5db; width:100%; }
        .switch { display:flex; align-items:center; gap:10px; }
        .btns { display:flex; gap:10px; }

        .table { width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; }
        .table th { background:#334B71; color:#fff; text-align:left; font-size:12px; padding:10px; }
        .table td { padding:10px; border-top:1px solid #f1f5f9; font-size:14px; color:#111827; }
        .actions { text-align:right; }

        .right { position:sticky; top:80px; display:flex; flex-direction:column; gap:12px; }
        .summary { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; }
        .summary h4 { margin:0 0 8px 0; font-size:16px; color:#0f1f3b; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:14px; color:#374151; }
        .total { margin-top:8px; font-weight:700; }

        @media (max-width: 1000px) {
          .content { grid-template-columns:1fr; }
          .right { position:static; }
        }
      `}</style>

      <div className="page">
        <div className="wrap">
          <div className="crumb">
            <a onClick={() => navigate("/cases")} style={{ cursor: "pointer" }}>
              Case Management
            </a>{" "}
            &nbsp;>&nbsp; Creation of Category Masters
          </div>

          {/* Header with primary actions (Submit & Save) */}
          <div className="headerbar">
            <h1 className="title">Creation of Category Masters</h1>
            <div className="header-actions">
              <button className="btn light" onClick={() => navigate(-1)} disabled={busy}>
                Close
              </button>
              <button className="btn warn" onClick={onSave} disabled={busy || nothingAdded}>
                {busy ? "Saving..." : "Save Draft"}
              </button>
              <button className="btn primary" onClick={onSubmit} disabled={busy || nothingAdded}>
                {busy ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          <div className="card">
            {/* tabs */}
            <div className="tabs">
              {["Category", "SubCategory", "SubSubCategory", "SubSubSubCategory"].map((key) => (
                <div
                  key={key}
                  className={`tab ${active === key ? "active" : ""}`}
                  onClick={() => setActive(key)}
                >
                  {key
                    .replace("SubCategory", "Sub Category")
                    .replace("SubSubCategory", "Sub Sub Category")
                    .replace("SubSubSubCategory", "Sub Sub Sub Category")}
                </div>
              ))}
            </div>

            {/* content */}
            <div className="content">
              {/* LEFT SIDE */}
              <div className="left">
                {/* CATEGORY (no code) */}
                {active === "Category" && (
                  <>
                    <div className="row">
                      <div className="label">Category :</div>
                      <input
                        className="inp"
                        value={categoryInput.name}
                        onChange={(e) => setCategoryInput((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., Complaint"
                      />
                    </div>
                    <div className="row">
                      <div className="label">Customer Centric Category :</div>
                      <div className="switch">
                        <input
                          type="checkbox"
                          checked={categoryInput.customerCentric}
                          onChange={(e) =>
                            setCategoryInput((p) => ({ ...p, customerCentric: e.target.checked }))
                          }
                        />
                        <span>{categoryInput.customerCentric ? "Yes" : "No"}</span>
                      </div>
                    </div>

                    <div className="btns">
                      <button className="btn primary" onClick={() => addRow("Category")}>
                        + Add
                      </button>
                      <button
                        className="btn light"
                        onClick={() => setCategoryInput({ name: "", customerCentric: true })}
                      >
                        Clear
                      </button>
                    </div>

                    <table className="table" style={{ marginTop: 12 }}>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th style={{ width: 160 }}>Customer Centric</th>
                          <th style={{ width: 110 }} className="actions">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ color: "#6b7280" }}>
                              Nothing added yet.
                            </td>
                          </tr>
                        ) : (
                          categories.map((r) => (
                            <tr key={r.name}>
                              <td>{r.name}</td>
                              <td>{r.customerCentric ? "Yes" : "No"}</td>
                              <td className="actions">
                                <button
                                  className="btn light"
                                  onClick={() => removeRow("Category", r.name)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                )}

                {/* SUB CATEGORY (name only) */}
                {active === "SubCategory" && (
                  <>
                    <div className="row">
                      <div className="label">Sub Category Name :</div>
                      <input
                        className="inp"
                        value={subCategoryInput.name}
                        onChange={(e) => setSubCategoryInput((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., Service Related"
                      />
                    </div>

                    <div className="btns">
                      <button className="btn primary" onClick={() => addRow("SubCategory")}>
                        + Add
                      </button>
                      <button
                        className="btn light"
                        onClick={() => setSubCategoryInput({ name: "" })}
                      >
                        Clear
                      </button>
                    </div>

                    <table className="table" style={{ marginTop: 12 }}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th style={{ width: 110 }} className="actions">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subCategories.length === 0 ? (
                          <tr>
                            <td colSpan={2} style={{ color: "#6b7280" }}>
                              Nothing added yet.
                            </td>
                          </tr>
                        ) : (
                          subCategories.map((r) => (
                            <tr key={r.name}>
                              <td>{r.name}</td>
                              <td className="actions">
                                <button
                                  className="btn light"
                                  onClick={() => removeRow("SubCategory", r.name)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                )}

                {/* SUB SUB CATEGORY (name only) */}
                {active === "SubSubCategory" && (
                  <>
                    <div className="row">
                      <div className="label">Sub Sub Category Name :</div>
                      <input
                        className="inp"
                        value={subSubCategoryInput.name}
                        onChange={(e) =>
                          setSubSubCategoryInput((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g., Appointment Management"
                      />
                    </div>

                    <div className="btns">
                      <button className="btn primary" onClick={() => addRow("SubSubCategory")}>
                        + Add
                      </button>
                      <button
                        className="btn light"
                        onClick={() => setSubSubCategoryInput({ name: "" })}
                      >
                        Clear
                      </button>
                    </div>

                    <table className="table" style={{ marginTop: 12 }}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th style={{ width: 110 }} className="actions">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subSubCategories.length === 0 ? (
                          <tr>
                            <td colSpan={2} style={{ color: "#6b7280" }}>
                              Nothing added yet.
                            </td>
                          </tr>
                        ) : (
                          subSubCategories.map((r) => (
                            <tr key={r.name}>
                              <td>{r.name || "-"}</td>
                              <td className="actions">
                                <button
                                  className="btn light"
                                  onClick={() => removeRow("SubSubCategory", r.name)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                )}

                {/* SUB SUB SUB CATEGORY (name only) */}
                {active === "SubSubSubCategory" && (
                  <>
                    <div className="row">
                      <div className="label">Sub Sub Sub Category Name :</div>
                      <input
                        className="inp"
                        value={subSubSubCategoryInput.name}
                        onChange={(e) =>
                          setSubSubSubCategoryInput((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g., NA"
                      />
                    </div>

                    <div className="btns">
                      <button className="btn primary" onClick={() => addRow("SubSubSubCategory")}>
                        + Add
                      </button>
                      <button
                        className="btn light"
                        onClick={() => setSubSubSubCategoryInput({ name: "" })}
                      >
                        Clear
                      </button>
                    </div>

                    <table className="table" style={{ marginTop: 12 }}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th style={{ width: 110 }} className="actions">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subSubSubCategories.length === 0 ? (
                          <tr>
                            <td colSpan={2} style={{ color: "#6b7280" }}>
                              Nothing added yet.
                            </td>
                          </tr>
                        ) : (
                          subSubSubCategories.map((r) => (
                            <tr key={r.name}>
                              <td>{r.name || "-"}</td>
                              <td className="actions">
                                <button
                                  className="btn light"
                                  onClick={() => removeRow("SubSubSubCategory", r.name)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {/* RIGHT SIDE: summary + quick links */}
              <div className="right">
                <div className="summary">
                  <h4>Summary</h4>
                  <div className="grid2">
                    <div>Categories</div>
                    <div><strong>{summary.categories}</strong></div>
                    <div>Sub Categories</div>
                    <div><strong>{summary.sub}</strong></div>
                    <div>Sub Sub Categories</div>
                    <div><strong>{summary.sub2}</strong></div>
                    <div>Sub Sub Sub Categories</div>
                    <div><strong>{summary.sub3}</strong></div>
                  </div>
                  <div className="total">Total items to create: {summary.totalItems}</div>
                </div>

                <button className="btn dark" onClick={() => gotoMapping()}>
                  View Case Category Mapping
                </button>
                <button className="btn dark" onClick={() => gotoList()}>
                  View Case Category
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateCaseCategory;
