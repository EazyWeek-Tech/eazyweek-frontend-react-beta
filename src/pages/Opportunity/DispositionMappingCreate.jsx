// src/pages/Opportunity/DispositionMapping/DispositionMappingCreate.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dispositionMapping.css";

const DISPOSITIONS = ["Pending", "WIP", "Converted", "Not Converted"];
const trim = (v) => (v ?? "").toString().trim();

export default function DispositionMappingCreate() {
  const navigate = useNavigate();

  const [disposition, setDisposition] = useState("");
  const [subDisposition, setSubDisposition] = useState("");

  // Table data: [{ disposition: "Pending", subDisposition: "..." }, ...]
  const [items, setItems] = useState([]);

  const canAdd = useMemo(() => {
    return !!trim(disposition) && !!trim(subDisposition);
  }, [disposition, subDisposition]);

  const canSave = useMemo(() => items.length > 0, [items]);

  const handleAdd = () => {
    const d = trim(disposition);
    const sd = trim(subDisposition);

    if (!d) {
      alert("Please select a disposition.");
      return;
    }
    if (!sd) {
      alert("Please enter subdisposition.");
      return;
    }

    setItems((prev) => {
      const idx = prev.findIndex((x) => x.disposition === d);

      // If disposition already exists, update it (avoid duplicates)
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { disposition: d, subDisposition: sd };
        return copy;
      }

      return [...prev, { disposition: d, subDisposition: sd }];
    });

    // Clear input after add
    setSubDisposition("");
  };

  const handleDelete = (disp) => {
    setItems((prev) => prev.filter((x) => x.disposition !== disp));
  };

  const handleSave = (e) => {
    e.preventDefault();

    if (items.length === 0) {
      alert("Please add at least one mapping before saving.");
      return;
    }

    // TODO: hook your API here later
    // Example payload:
    const payload = {
      mappings: items, // [{ disposition, subDisposition }]
    };

    console.log("SUBMIT PAYLOAD:", payload);
    alert(`Submitted ${items.length} mapping(s).`);

    // Navigate back after submit
    navigate("/opportunity/disposition-mapping");
  };

  return (
    <div className="dmWrap">
      <div className="dmTopBar">
        <div>
          <div className="dmTitle">Create Disposition Mapping</div>
          <div className="dmBreadcrumb">
            Opportunity <span className="dmCrumbSep">›</span>{" "}
            <span
              className="dmCrumbLink"
              onClick={() => navigate("/opportunity/disposition-mapping")}
              role="button"
              tabIndex={0}
            >
              Disposition Mapping
            </span>{" "}
            <span className="dmCrumbSep">›</span>{" "}
            <span className="dmCrumbActive">Create</span>
          </div>
        </div>

        <button className="dmBtnGhost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div className="dmFormCard">
        <form onSubmit={handleSave}>
          <div className="dmFormGrid2">
            <div className="dmField">
              <label className="dmLabel">Disposition</label>
              <select
                className="dmInput"
                value={disposition}
                onChange={(e) => setDisposition(e.target.value)}
              >
                <option value="">Select</option>
                {DISPOSITIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="dmField">
              <label className="dmLabel">Subdisposition</label>
              <input
                className="dmInput"
                type="text"
                value={subDisposition}
                onChange={(e) => setSubDisposition(e.target.value)}
                placeholder="Enter subdisposition"
              />
            </div>

            <div className="dmField dmAddBtnWrap">
              <label className="dmLabel dmLabelHidden">Add</label>
              <button
                type="button"
                className="dmBtnPrimary dmBtnAdd"
                onClick={handleAdd}
                disabled={!canAdd}
                title="Add to table"
              >
                Add
              </button>
            </div>
          </div>

          {/* Added items table */}
          <div className="dmSubTableCard">
            <div className="dmSubTableTitle">Added Mappings</div>

            <table className="dmTable">
              <thead>
                <tr>
                  <th>Disposition</th>
                  <th>Subdisposition</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="dmEmpty" colSpan={3}>
                      No mappings added yet
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.disposition}>
                      <td>{it.disposition}</td>
                      <td>{it.subDisposition}</td>
                      <td>
                        <div className="dmActions">
                          <button
                            type="button"
                            className="dmIconBtn dmDanger"
                            title="Delete"
                            onClick={() => handleDelete(it.disposition)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="dmFormActions">
            <button
              type="button"
              className="dmBtnGhost"
              onClick={() => navigate("/opportunity/disposition-mapping")}
            >
              Cancel
            </button>

            <button type="submit" className="dmBtnPrimary" disabled={!canSave}>
               Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
