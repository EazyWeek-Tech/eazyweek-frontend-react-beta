"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config"; // adjust path if needed

const CreateCategoryOnePage = () => {
  const navigate = useNavigate();

  // four buckets (arrays of {id, name, checked})
  const [category, setCategory] = useState([]);
  const [subCategory, setSubCategory] = useState([]);
  const [subSubCategory, setSubSubCategory] = useState([]);
  const [subSubSubCategory, setSubSubSubCategory] = useState([]);

  // inputs
  const [inputs, setInputs] = useState({
    category: "",
    subCategory: "",
    subSubCategory: "",
    subSubSubCategory: "",
  });

  // toast
  const [toast, setToast] = useState(null); // { type: 'error'|'info'|'success', message: string }
  const toastTimer = useRef(null);
  const showToast = (message, type = "error", ms = 3000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // id generator
  const nextId = useMemo(() => {
    let n = 1;
    return () => n++;
  }, []);

  // helpers per section
  const buckets = {
    category: { data: category, set: setCategory, label: "Category", type: "Category" },
    subCategory: { data: subCategory, set: setSubCategory, label: "Sub Category", type: "SubCategory" },
    subSubCategory: { data: subSubCategory, set: setSubSubCategory, label: "Sub Sub Category", type: "SubSubCategory" },
    subSubSubCategory: { data: subSubSubCategory, set: setSubSubSubCategory, label: "Sub Sub Sub Category", type: "SubSubSubCategory" },
  };

  const onInput = (key, val) => setInputs((p) => ({ ...p, [key]: val }));

  // Order guards
  const lockSubCategory = category.length === 0;
  const lockSubSubCategory = subCategory.length === 0;
  const lockSubSubSubCategory = subSubCategory.length === 0;

  const addItem = (key) => {
    // Enforce order
    if (key === "subCategory" && lockSubCategory) {
      return showToast("Please add at least one Category before adding a Sub Category.", "error");
    }
    if (key === "subSubCategory" && lockSubSubCategory) {
      return showToast("Please add at least one Sub Category before adding a Sub Sub Category.", "error");
    }
    if (key === "subSubSubCategory" && lockSubSubSubCategory) {
      return showToast("Please add at least one Sub Sub Category before adding a Sub Sub Sub Category.", "error");
    }

    const val = (inputs[key] || "").trim();
    if (!val) return showToast("Please enter a value.", "error");

    // prevent case-insensitive duplicates within the same section
    const exists = buckets[key].data.some((x) => x.name.toLowerCase() === val.toLowerCase());
    if (exists) return showToast("This value already exists in the list.", "error");

    buckets[key].set((prev) => [...prev, { id: nextId(), name: val, checked: true }]);
    setInputs((p) => ({ ...p, [key]: "" }));
    showToast("Added.", "success", 3000);
  };

  const toggleRow = (key, id) => {
    buckets[key].set((prev) => prev.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)));
  };

  const removeSelected = (key) => {
    const before = buckets[key].data.length;
    const after = buckets[key].data.filter((x) => !x.checked);
    if (before === after.length) return showToast("Select at least one row to remove.", "error");
    buckets[key].set(after);
    showToast("Removed.", "success", 1200);
  };

  // payloads
  const payloadFlat = useMemo(() => {
    const flat = [];
    category.forEach((x) => flat.push({ type: "Category", name: x.name }));
    subCategory.forEach((x) => flat.push({ type: "SubCategory", name: x.name }));
    subSubCategory.forEach((x) => flat.push({ type: "SubSubCategory", name: x.name }));
    subSubSubCategory.forEach((x) => flat.push({ type: "SubSubSubCategory", name: x.name }));
    return flat;
  }, [category, subCategory, subSubCategory, subSubSubCategory]);

  const handleSubmit = async () => {
    if (!payloadFlat.length) return showToast("Please add at least one item before submitting.", "error");

    // Also ensure order wasn’t skipped entirely (e.g., only Sub Sub Category with no Sub Category)
    if (subCategory.length && category.length === 0) {
      return showToast("You added Sub Category without Category. Please add a Category first.", "error");
    }
    if (subSubCategory.length && subCategory.length === 0) {
      return showToast("You added Sub Sub Category without Sub Category. Please add a Sub Category first.", "error");
    }
    if (subSubSubCategory.length && subSubCategory.length === 0) {
      return showToast("You added Sub Sub Sub Category without Sub Sub Category. Please add a Sub Sub Category first.", "error");
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/Master/SaveItemCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFlat),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json().catch(() => ({}));
      showToast("Submitted successfully.", "success", 1500);
      // clear all
      setCategory([]);
      setSubCategory([]);
      setSubSubCategory([]);
      setSubSubSubCategory([]);
      // go back to master listing after a short delay to show success toast
      setTimeout(() => navigate("/category-master"), 600);
    } catch (e) {
      console.error(e);
      showToast("Failed to submit. Please try again.", "error");
    }
  };

  return (
    <>
      <style jsx>{`
        .wrap {
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .toast {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.15);
          z-index: 9999;
          color: #fff;
          font-weight: 600;
          max-width: 150px;
          margin: 0 auto;
        }
        .toast.info { background: #2f6fef; }
        .toast.error { background: #d7263d; }
        .toast.success { background: #138a36; }
        .toast button {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
        }

        .hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 16px 0 0;
        }
        .title {
          font-size: 22px;
          font-weight: 700;
          color: #0b1f3a;
          margin: 0;
        }
        .back {
          border: 1px solid #d9dee7;
          background: #fff;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          cursor: pointer;
          color: #152335;
        }

        .info {
          background: #f1f5ff;
          border: 1px solid #dbe6ff;
          color: #21407a;
          border-radius: 10px;
          padding: 12px 14px;
          margin: 12px 0 18px;
          font-weight: 600;
        }
        .info small { font-weight: 500; }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .card {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.5);
          padding: 18px;
        }
        .card h3 {
          margin: 0 0 10px;
          font-size: 16px;
          color: #334b71;
        }
        .hint {
          margin: 4px 0 0;
          color: #a16a1f;
          font-size: 12px;
          font-weight: 600;
        }

        .row {
          display: grid;
          grid-template-columns: 140px 1fr auto;
          gap: 10px;
          align-items: center;
          margin: 10px 0 8px;
        }
        .lbl { color: #7a5a2f; font-weight: 600; }
        .in {
          width: 100%;
          height: 38px;
          border: 1px solid #d9dee7;
          border-radius: 6px;
          padding: 0 10px;
          font-size: 14px;
          outline: none;
        }
        .in:focus { border-color: #334b71; }
        .in:disabled { background: #f2f4f7; color: #9aa3b2; }

        .addbtn {
          border: 1px solid #e7ecf3;
          background: #334b71;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          cursor: pointer;
          color: #fff;
        }
        .addbtn:disabled {
          background: #c2cbda;
          cursor: not-allowed;
        }

        .tbl {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        .tbl th, .tbl td {
          padding: 10px 8px;
          border-bottom: 1px solid #eef1f6;
          text-align: left;
          font-size: 14px;
        }
        .tbl th {
          color: #667084;
          font-weight: 700;
        }
        .tbl td {
          color: #2a2f38;
        }
        .actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }
        .btn {
          background: #152335;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 9px 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn.ghost {
          background: rgb(193, 25, 25);
          color: #fff;
          border: 1px solid #d9dee7;
        }

        .submitBox {
          margin-top: 18px;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          padding: 18px;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }
        .pill {
          background: #f5f7fb;
          border: 1px solid #e7ecf3;
          border-radius: 10px;
          padding: 12px;
        }
        .pill h4 {
          margin: 0 0 4px;
          font-size: 12px;
          color: #667084;
          font-weight: 700;
          letter-spacing: 0.2px;
        }
        .pill p {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0b1f3a;
        }
        .submitRow {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        @media (max-width: 980px) {
          .grid { grid-template-columns: 1fr; }
          .row { grid-template-columns: 130px 1fr auto; }
          .summary { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .row { grid-template-columns: 1fr; }
          .summary { grid-template-columns: 1fr; }
          .submitRow { justify-content: center; }
        }
      `}</style>

      <div className="wrap">
        {/* Toast */}
        {toast && (
          <div className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} aria-label="Close">×</button>
          </div>
        )}

        <div className="hdr">
          <h1 className="title">Create Categories</h1>
          <button className="back" onClick={() => navigate("/category-master")}>Back to Master</button>
        </div>

        {/* Order guidance */}
        <div className="info" style={{"display":"none"}}>
          Please follow this order when adding items:&nbsp;
          <strong>1) Category → 2) Sub Category → 3) Sub Sub Category → 4) Sub Sub Sub Category</strong>.
          <br />
          <small>If the order is missed, you’ll see an error message.</small>
        </div>

        {/* Two-column grid with all four sections visible */}
        <div className="grid">
          {/* Category */}
          <div className="card">
            <h3>Category</h3>
            <div className="row">
              <div className="lbl">Category :</div>
              <input
                className="in"
                placeholder="Type a category"
                value={inputs.category}
                onChange={(e) => onInput("category", e.target.value)}
              />
              <button className="addbtn" onClick={() => addItem("category")}>+ Add</button>
            </div>

            {!!category.length && (
              <>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Select</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.map((r) => (
                      <tr key={r.id}>
                        <td><input type="checkbox" checked={!!r.checked} onChange={() => toggleRow("category", r.id)} /></td>
                        <td>{r.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="actions">
                  <button className="btn ghost" onClick={() => removeSelected("category")}>Remove</button>
                </div>
              </>
            )}
          </div>

          {/* Sub Category */}
          <div className="card">
            <h3>Sub Category</h3>
            {lockSubCategory && <div className="hint">Add at least one <strong>Category</strong> first.</div>}
            <div className="row">
              <div className="lbl">Sub Category :</div>
              <input
                className="in"
                placeholder="Type a sub category"
                value={inputs.subCategory}
                onChange={(e) => onInput("subCategory", e.target.value)}
                disabled={lockSubCategory}
              />
              <button className="addbtn" onClick={() => addItem("subCategory")} disabled={lockSubCategory}>+ Add</button>
            </div>

            {!!subCategory.length && (
              <>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Select</th>
                      <th>Sub Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subCategory.map((r) => (
                      <tr key={r.id}>
                        <td><input type="checkbox" checked={!!r.checked} onChange={() => toggleRow("subCategory", r.id)} /></td>
                        <td>{r.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="actions">
                  <button className="btn ghost" onClick={() => removeSelected("subCategory")}>Remove</button>
                </div>
              </>
            )}
          </div>

          {/* Sub Sub Category */}
          <div className="card">
            <h3>Sub Sub Category</h3>
            {lockSubSubCategory && <div className="hint">Add at least one <strong>Sub Category</strong> first.</div>}
            <div className="row">
              <div className="lbl">Sub Sub Category :</div>
              <input
                className="in"
                placeholder="Type a sub sub category"
                value={inputs.subSubCategory}
                onChange={(e) => onInput("subSubCategory", e.target.value)}
                disabled={lockSubSubCategory}
              />
              <button className="addbtn" onClick={() => addItem("subSubCategory")} disabled={lockSubSubCategory}>+ Add</button>
            </div>

            {!!subSubCategory.length && (
              <>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Select</th>
                      <th>Sub Sub Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subSubCategory.map((r) => (
                      <tr key={r.id}>
                        <td><input type="checkbox" checked={!!r.checked} onChange={() => toggleRow("subSubCategory", r.id)} /></td>
                        <td>{r.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="actions">
                  <button className="btn ghost" onClick={() => removeSelected("subSubCategory")}>Remove</button>
                </div>
              </>
            )}
          </div>

          {/* Sub Sub Sub Category */}
          <div className="card">
            <h3>Sub Sub Sub Category</h3>
            {lockSubSubSubCategory && <div className="hint">Add at least one <strong>Sub Sub Category</strong> first.</div>}
            <div className="row">
              <div className="lbl">Sub Sub Sub Category :</div>
              <input
                className="in"
                placeholder="Type a sub sub sub category"
                value={inputs.subSubSubCategory}
                onChange={(e) => onInput("subSubSubCategory", e.target.value)}
                disabled={lockSubSubSubCategory}
              />
              <button className="addbtn" onClick={() => addItem("subSubSubCategory")} disabled={lockSubSubSubCategory}>+ Add</button>
            </div>

            {!!subSubSubCategory.length && (
              <>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Select</th>
                      <th>Sub Sub Sub Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subSubSubCategory.map((r) => (
                      <tr key={r.id}>
                        <td><input type="checkbox" checked={!!r.checked} onChange={() => toggleRow("subSubSubCategory", r.id)} /></td>
                        <td>{r.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="actions">
                  <button className="btn ghost" onClick={() => removeSelected("subSubSubCategory")}>Remove</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Submit area */}
        <div className="submitBox">
          <div className="summary">
            <div className="pill"><h4>Categories</h4><p>{category.length}</p></div>
            <div className="pill"><h4>Sub Categories</h4><p>{subCategory.length}</p></div>
            <div className="pill"><h4>Sub Sub Categories</h4><p>{subSubCategory.length}</p></div>
            <div className="pill"><h4>Sub Sub Sub Categories</h4><p>{subSubSubCategory.length}</p></div>
          </div>
          <div className="submitRow">
            <button className="btn ghost" onClick={() => navigate("/category-master")}>Cancel</button>
            <button className="btn" onClick={handleSubmit}>Submit</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateCategoryOnePage;
