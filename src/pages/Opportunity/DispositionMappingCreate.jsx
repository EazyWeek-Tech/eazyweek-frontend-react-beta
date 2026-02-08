// src/pages/Opportunity/DispositionMapping/DispositionMappingCreate.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config"; // ✅ adjust path if needed
import "./dispositionMapping.css";

const trim = (v) => (v ?? "").toString().trim();

export default function DispositionMappingCreate() {
  const navigate = useNavigate();

  // ---------------------------
  // API state (Disposition dropdown)
  // ---------------------------
  const [dispLoading, setDispLoading] = useState(false);
  const [dispErr, setDispErr] = useState("");
  const [dispOptions, setDispOptions] = useState([]); // [{ value: "1", label: "Pending" }]

  // ---------------------------
  // Form state
  // ---------------------------
  const [disposition, setDisposition] = useState(""); // value = dispositionID (string)
  const [subDisposition, setSubDisposition] = useState("");

  const [existingSubs, setExistingSubs] = useState([]); 


  // ✅ Grouped items: [{ dispositionID, dispositionName, subDispositions: [] }]
  const [items, setItems] = useState([]);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // ---------------------------
  // Helpers
  // ---------------------------
  const fetchJson = async (url) => {
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    const ct = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    if (!/application\/json/i.test(ct)) {
      throw new Error("Expected JSON but got non-JSON response (session expired?)");
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Failed to parse JSON response.");
    }
  };

  const postJson = async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

    // try json, otherwise return text
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const existsInBackend = (dispId, subDisp) => {
  const dId = String(trim(dispId));
  const sd = trim(subDisp).toLowerCase();

  return existingSubs.some(
    (x) =>
      x.dispositionID === dId &&
      x.subDispositionName === sd
  );
};


  // ---------------------------
  // Load Dispositions (active only)
  // API: /api/Disposition/List
  // ---------------------------
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setDispLoading(true);
      setDispErr("");
      try {
        const data = await fetchJson(`${API_BASE_URL}/api/Disposition/List`);
        const arr = Array.isArray(data) ? data : [];

        // ✅ active only
        const active = arr.filter((d) => d?.isActive === true);

        const mapped = active
          .map((d) => ({
            value: String(d?.dispositionID ?? ""),
            label: trim(d?.dispositionName) || String(d?.dispositionID ?? ""),
          }))
          .filter((x) => x.value);

        // Optional: sort by name
        mapped.sort((a, b) => a.label.localeCompare(b.label));

        if (!alive) return;
        setDispOptions(mapped);

        // If currently selected disposition is no longer in list, clear it
        if (disposition && !mapped.some((m) => m.value === disposition)) {
          setDisposition("");
        }
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setDispErr(e?.message || "Failed to load dispositions.");
        setDispOptions([]);
      } finally {
        if (alive) setDispLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
  let alive = true;

  const loadSubDispositions = async () => {
    try {
      const data = await fetchJson(
        `${API_BASE_URL}/api/Disposition/SubDispositionList`
      );

      const arr = Array.isArray(data) ? data : [];

      // ✅ keep only active ones
      const active = arr
        .filter((x) => x?.isActive === true)
        .map((x) => ({
          dispositionID: String(x.dispositionID),
          subDispositionName: trim(x.subDispositionName).toLowerCase(),
        }));

      if (alive) setExistingSubs(active);
    } catch (e) {
      console.error("Failed to load subdispositions", e);
      if (alive) setExistingSubs([]);
    }
  };

  loadSubDispositions();
  return () => {
    alive = false;
  };
}, []);


  const dispositionNameById = useMemo(() => {
    const m = new Map();
    (dispOptions || []).forEach((o) => m.set(String(o.value), o.label));
    return m;
  }, [dispOptions]);

  const canAdd = useMemo(() => {
    return !!trim(disposition) && !!trim(subDisposition);
  }, [disposition, subDisposition]);

  const canSave = useMemo(() => items.length > 0 && !saving, [items, saving]);

  // ---------------------------
  // Add subdisposition (multi per dispositionID)
  // ---------------------------
 const handleAdd = () => {
  const dId = trim(disposition);
  const sd = trim(subDisposition);

  setSaveErr("");

  if (!dId) {
    alert("Please select a disposition.");
    return;
  }

  if (!sd) {
    alert("Please enter subdisposition.");
    return;
  }

  // ✅ 1) Block duplicates already saved in DB
  if (existsInBackend(dId, sd)) {
    alert(
      "This subdisposition already exists for the selected disposition."
    );
    return;
  }

  // ✅ 2) Block duplicates already added in UI
  const existsInUi = items.some(
    (grp) =>
      String(grp.dispositionID) === String(dId) &&
      grp.subDispositions.some(
        (x) => trim(x).toLowerCase() === sd.toLowerCase()
      )
  );

  if (existsInUi) {
    alert("This subdisposition is already added.");
    return;
  }

  const dispName = dispositionNameById.get(String(dId)) || dId;

  setItems((prev) => {
    const idx = prev.findIndex(
      (x) => String(x.dispositionID) === String(dId)
    );

    if (idx >= 0) {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        subDispositions: [...copy[idx].subDispositions, sd],
      };
      return copy;
    }

    return [
      ...prev,
      {
        dispositionID: dId,
        dispositionName: dispName,
        subDispositions: [sd],
      },
    ];
  });

  setSubDisposition("");
};


  // ✅ Delete only one subdisposition under a dispositionID
  const handleDeleteSub = (dispId, subDisp) => {
    setItems((prev) =>
      prev
        .map((x) => {
          if (String(x.dispositionID) !== String(dispId)) return x;
          const nextSubs = x.subDispositions.filter((s) => s !== subDisp);
          return { ...x, subDispositions: nextSubs };
        })
        .filter((x) => x.subDispositions.length > 0) // remove empty disposition groups
    );
  };

  // ✅ Flatten for table rows (one row per subdisp)
  const tableRows = useMemo(() => {
    const rows = [];
    for (const it of items) {
      for (const sd of it.subDispositions) {
        rows.push({
          dispositionID: it.dispositionID,
          dispositionName: it.dispositionName,
          subDisposition: sd,
        });
      }
    }
    return rows;
  }, [items]);

  // ---------------------------
  // Save: POST /api/Disposition/SaveSubDisposition
  // Example:
  // { dispositionID: 1, subDispositionName: "NTestingValue", isActive: true }
  // ---------------------------
  const handleSave = async (e) => {
    e.preventDefault();
    setSaveErr("");

    if (items.length === 0) {
      alert("Please add at least one mapping before saving.");
      return;
    }

    try {
      setSaving(true);

      // Build all POST calls: one per subDisposition
      const requests = [];
      for (const grp of items) {
        for (const sd of grp.subDispositions) {
          requests.push(
            postJson(`${API_BASE_URL}/api/Disposition/SaveSubDisposition`, {
              dispositionID: Number(grp.dispositionID), // API expects number
              subDispositionName: sd,
              isActive: true,
            })
          );
        }
      }

      // Run all
      await Promise.all(requests);

      alert(
        `Submitted ${items.reduce((a, x) => a + x.subDispositions.length, 0)} subdisposition(s).`
      );

      navigate("/masters/disposition");
    } catch (err) {
      console.error(err);
      setSaveErr(err?.message || "Failed to save subdispositions.");
    } finally {
      setSaving(false);
    }
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
              onClick={() => navigate("/masters/disposition")}
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
                disabled={dispLoading}
              >
                <option value="">
                  {dispLoading ? "Loading..." : "Select"}
                </option>
                {dispOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              {dispErr ? (
                <div className="dmMuted" style={{ color: "#b91c1c", marginTop: 6 }}>
                  {dispErr}
                </div>
              ) : null}
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
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td className="dmEmpty" colSpan={3}>
                      No mappings added yet
                    </td>
                  </tr>
                ) : (
                  tableRows.map((it) => (
                    <tr key={`${it.dispositionID}__${it.subDisposition}`}>
                      <td>{it.dispositionName}</td>
                      <td>{it.subDisposition}</td>
                      <td>
                        <div className="dmActions">
                          <button
                            type="button"
                            className="dmIconBtn dmDanger"
                            title="Delete subdisposition"
                            onClick={() => handleDeleteSub(it.dispositionID, it.subDisposition)}
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

          {saveErr ? (
            <div className="dmMuted" style={{ color: "#b91c1c", marginTop: 10 }}>
              {saveErr}
            </div>
          ) : null}

          <div className="dmFormActions">
            <button
              type="button"
              className="dmBtnGhost"
              onClick={() => navigate("/opportunity/disposition-mapping")}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="dmBtnPrimary" disabled={!canSave}>
              {saving ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
