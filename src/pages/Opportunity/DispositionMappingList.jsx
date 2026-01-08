// src/pages/Opportunity/DispositionMapping/DispositionMappingList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config"; // ✅ adjust path if needed
import "./dispositionMapping.css";

const COLUMNS = [
  { key: "disposition", label: "Disposition" },
  { key: "subDisposition", label: "Subdisposition" },
  { key: "actions", label: "Actions" },
];

const trim = (v) => (v ?? "").toString().trim();

export default function DispositionMappingList() {
  const navigate = useNavigate();

  // ---------------------------
  // API state
  // ---------------------------
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [dispList, setDispList] = useState([]); // /api/Disposition/List
  const [subDispList, setSubDispList] = useState([]); // /api/Disposition/SubDispositionList

  // delete state
  const [deletingId, setDeletingId] = useState("");

  // ---------------------------
  // EDIT state (INLINE)
  // ---------------------------
  const [editingId, setEditingId] = useState(""); // subDispositionID currently being edited
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState("");

  const [editDispositionID, setEditDispositionID] = useState(""); // dropdown
  const [editSubDispositionName, setEditSubDispositionName] = useState(""); // textbox

  // ---------------------------
  // UI state
  // ---------------------------
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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

  // ✅ POST helper (for FetchSubDispositionDetail)
  const postJson = async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
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

  // ✅ PUT helper (for UpdateSubDisposition) - handles empty/non-json responses safely
  const putRequest = async (url, body) => {
    const res = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });

    const ct = res.headers.get("content-type") || "";
    const text = await res.text().catch(() => "");

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

    // Many PUT APIs return 204 / empty
    if (!text) return {};

    // If JSON return parse, else ignore
    try {
      if (/application\/json/i.test(ct)) return JSON.parse(text);
      return {};
    } catch {
      return {};
    }
  };

  const deleteRequest = async (url) => {
    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    // Some APIs return empty body on DELETE
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    // If it returns JSON, great; otherwise ignore
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  };

  // ---------------------------
  // Load APIs
  // ---------------------------
  const loadAll = async (aliveRef) => {
    setLoading(true);
    setErr("");
    try {
      const [d1, d2] = await Promise.all([
        fetchJson(`${API_BASE_URL}/api/Disposition/List`),
        fetchJson(`${API_BASE_URL}/api/Disposition/SubDispositionList`),
      ]);

      if (!aliveRef.current) return;

      setDispList(Array.isArray(d1) ? d1 : []);
      setSubDispList(Array.isArray(d2) ? d2 : []);
    } catch (e) {
      console.error(e);
      if (!aliveRef.current) return;
      setErr(e?.message || "Failed to load disposition mappings.");
      setDispList([]);
      setSubDispList([]);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const aliveRef = { current: true };
    loadAll(aliveRef);
    return () => {
      aliveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // Active disposition lookup + active IDs set
  // ---------------------------
  const activeDispositionIds = useMemo(() => {
    const s = new Set();
    (dispList || []).forEach((d) => {
      // show ONLY active dispositions
      if (d?.isActive === true) {
        const id = d?.dispositionID;
        if (id !== undefined && id !== null) s.add(String(id));
      }
    });
    return s;
  }, [dispList]);

  const dispIdToName = useMemo(() => {
    const m = new Map();
    (dispList || []).forEach((d) => {
      // map ONLY active dispositions
      if (d?.isActive !== true) return;

      const id = d?.dispositionID;
      if (id === undefined || id === null) return;

      m.set(String(id), trim(d?.dispositionName) || String(id));
    });
    return m;
  }, [dispList]);

  // ✅ Active disposition dropdown options (for edit mode)
  const activeDispositionOptions = useMemo(() => {
    return (dispList || [])
      .filter((d) => d?.isActive === true)
      .map((d) => ({
        id: String(d?.dispositionID ?? ""),
        name: trim(d?.dispositionName),
      }))
      .filter((x) => x.id && x.name);
  }, [dispList]);

  // ---------------------------
  // Build table rows (flatten)
  // One row per ACTIVE subDisposition under ACTIVE disposition
  // ---------------------------
  const rows = useMemo(() => {
    const out = [];

    for (const sd of subDispList || []) {
      const dispId = sd?.dispositionID;
      const subName = trim(sd?.subDispositionName);

      if (dispId === undefined || dispId === null) continue;
      if (!subName) continue;

      // ✅ Hide inactive subdispositions
      if (sd?.isActive !== true) continue;

      // ✅ Hide subdispositions whose parent disposition is inactive
      if (!activeDispositionIds.has(String(dispId))) continue;

      const dispositionName = dispIdToName.get(String(dispId)) || String(dispId);

      out.push({
        id: String(sd?.subDispositionID ?? `${dispId}__${subName}`),
        dispositionID: String(dispId),
        subDispositionID: String(sd?.subDispositionID ?? ""),
        disposition: dispositionName,
        subDisposition: subName,
      });
    }

    // Optional: sort by disposition then subDisposition
    out.sort((a, b) => {
      const ad = (a.disposition || "").toLowerCase();
      const bd = (b.disposition || "").toLowerCase();
      if (ad < bd) return -1;
      if (ad > bd) return 1;
      const as = (a.subDisposition || "").toLowerCase();
      const bs = (b.subDisposition || "").toLowerCase();
      return as.localeCompare(bs);
    });

    return out;
  }, [subDispList, dispIdToName, activeDispositionIds]);

  // ---------------------------
  // Search + paging
  // ---------------------------
  const filteredRows = useMemo(() => {
    const q = trim(search).toLowerCase();
    if (!q) return rows;

    return rows.filter((r) =>
      ["disposition", "subDisposition"].some((k) =>
        String(r?.[k] ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    // if page becomes out of range after delete/filter, clamp it
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const onChangePageSize = (e) => {
    const next = parseInt(e.target.value, 10);
    setPageSize(next);
    setPage(1);
  };

  const onClickCreate = () => {
    navigate("/opportunity/disposition-mapping/create");
  };

  // ---------------------------
  // ✅ EDIT: Fetch detail and show inline edit row
  // API: POST /api/Disposition/FetchSubDispositionDetail { subDispositionID: "17" }
  // ---------------------------
  const onEdit = async (row) => {
    const id = String(row?.subDispositionID || "");
    if (!id) {
      alert("Missing subDispositionID. Cannot edit.");
      return;
    }

    // prevent editing while deleting something
    if (deletingId) return;

    setEditErr("");
    setEditingId(id);
    setEditLoading(true);

    try {
      const detail = await postJson(
        `${API_BASE_URL}/api/Disposition/FetchSubDispositionDetail`,
        { subDispositionID: id }
      );

      // API may return object OR array; handle both
      const obj = Array.isArray(detail) ? detail?.[0] : detail;

      const did =
        obj?.dispositionID !== undefined && obj?.dispositionID !== null
          ? String(obj.dispositionID)
          : String(row?.dispositionID ?? "");

      const name = trim(obj?.subDispositionName ?? row?.subDisposition ?? "");

      setEditDispositionID(did);
      setEditSubDispositionName(name);
    } catch (e) {
      console.error(e);
      setEditErr(e?.message || "Failed to fetch subdisposition detail.");
    } finally {
      setEditLoading(false);
    }
  };

  const onCancelEdit = () => {
    setEditingId("");
    setEditErr("");
    setEditLoading(false);
    setEditDispositionID("");
    setEditSubDispositionName("");
  };

  // ---------------------------
  // ✅ SAVE: PUT /api/Disposition/UpdateSubDisposition
  // Body:
  // {
  //   "subDispositionID": 17,
  //   "dispositionID": 2,
  //   "subDispositionName": "...",
  //   "isActive": true
  // }
  // ---------------------------
  const onSaveEdit = async () => {
    const sid = Number(editingId);
    const did = Number(editDispositionID);
    const name = trim(editSubDispositionName);

    setEditErr("");

    if (!sid) {
      setEditErr("Invalid subDispositionID.");
      return;
    }
    if (!did) {
      setEditErr("Please select disposition.");
      return;
    }
    if (!name) {
      setEditErr("Please enter subdisposition.");
      return;
    }

    setEditLoading(true);
    try {
      await putRequest(`${API_BASE_URL}/api/Disposition/UpdateSubDisposition`, {
        subDispositionID: sid,
        dispositionID: did,
        subDispositionName: name,
        isActive: true,
      });

      // ✅ Refresh table (reload sub disposition list)
      const aliveRef = { current: true };
      await loadAll(aliveRef);

      onCancelEdit();
    } catch (e) {
      console.error(e);
      setEditErr(e?.message || "Failed to update subdisposition.");
    } finally {
      setEditLoading(false);
    }
  };

  // ✅ DELETE: /api/Disposition/DeleteSubDisposition/{id} (DELETE)
  const onDelete = async (row) => {
    const id = String(row?.subDispositionID || "");
    if (!id) {
      alert("Missing subDispositionID. Cannot delete.");
      return;
    }

    // if this row is being edited, cancel edit first
    if (editingId && String(editingId) === String(id)) {
      onCancelEdit();
    }

    const ok = window.confirm(
      `Delete subdisposition "${row.subDisposition}" under "${row.disposition}"?`
    );
    if (!ok) return;

    try {
      setErr("");
      setDeletingId(id);

      await deleteRequest(
        `${API_BASE_URL}/api/Disposition/DeleteSubDisposition/${encodeURIComponent(id)}`
      );

      // Optimistic remove from state
      setSubDispList((prev) =>
        (prev || []).filter((x) => String(x?.subDispositionID) !== id)
      );
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete subdisposition.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="dmWrap">
      {/* Header */}
      <div className="dmTopBar">
        <div>
          <div className="dmTitle">Disposition Mapping</div>
        </div>

        <button className="dmBtnPrimary" onClick={onClickCreate}>
          Create New Mapping
        </button>
      </div>

      {/* Controls */}
      <div className="dmControls">
        <div className="dmLeftControls">
          <select className="dmSelect" value={pageSize} onChange={onChangePageSize}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="dmMuted">entries per page</span>
        </div>

        <div className="dmRightControls">
          <label className="dmMuted">Search:</label>
          <input
            className="dmSearch"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder=""
          />
        </div>
      </div>

      {/* Table */}
      <div className="dmTableCard">
        {loading ? (
          <div className="dmEmpty" style={{ padding: 14 }}>
            Loading…
          </div>
        ) : err ? (
          <div className="dmEmpty" style={{ padding: 14, color: "#b91c1c" }}>
            {err}
          </div>
        ) : null}

        <table className="dmTable">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key}>
                  <div className="dmTh">
                    <span>{c.label}</span>
                    <span className="dmSortIcons" aria-hidden="true">
                      <span>▲</span>
                      <span>▼</span>
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td className="dmEmpty" colSpan={COLUMNS.length}>
                  No records found
                </td>
              </tr>
            ) : (
              pageRows.map((r, idx) => {
                const isDeleting =
                  deletingId && String(r.subDispositionID) === String(deletingId);

                const isEditing =
                  editingId && String(r.subDispositionID) === String(editingId);

                return (
                  <tr key={r?.id ?? idx} style={isDeleting ? { opacity: 0.6 } : undefined}>
                    <td>
                      {isEditing ? (
                        <select
                          className="dmInput"
                          value={editDispositionID}
                          onChange={(e) => setEditDispositionID(e.target.value)}
                          disabled={editLoading}
                        >
                          <option value="">Select</option>
                          {activeDispositionOptions.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        r.disposition
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <>
                          <input
                            className="dmInput"
                            type="text"
                            value={editSubDispositionName}
                            onChange={(e) => setEditSubDispositionName(e.target.value)}
                            placeholder="Enter subdisposition"
                            disabled={editLoading}
                          />
                          {editErr ? (
                            <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
                              {editErr}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        r.subDisposition
                      )}
                    </td>

                    <td>
                      <div className="dmActions">
                        {isEditing ? (
                          <>
                            <button
                              className="dmIconBtn"
                              title="Save"
                              onClick={onSaveEdit}
                              disabled={editLoading}
                            >
                              {editLoading ? "Saving..." : "Save"}
                            </button>
                            <button
                              className="dmIconBtn"
                              title="Cancel"
                              onClick={onCancelEdit}
                              disabled={editLoading}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="dmIconBtn"
                              title="Edit"
                              onClick={() => onEdit(r)}
                              disabled={!!deletingId || !!editingId}
                            >
                              Edit
                            </button>
                            <button
                              className="dmIconBtn dmDanger"
                              title="Delete"
                              onClick={() => onDelete(r)}
                              disabled={!!deletingId || !!editingId}
                            >
                              {isDeleting ? "…" : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="dmPagination">
          <div className="dmMuted">
            {total === 0
              ? "Showing 0 to 0 of 0 entries"
              : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(
                  page * pageSize,
                  total
                )} of ${total} entries`}
          </div>

          <div className="dmPager">
            <button
              className="dmPageBtn"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            <div className="dmPagePills">
              <button className="dmPill isActive">{page}</button>
              <span className="dmMuted">/ {totalPages}</span>
            </div>

            <button
              className="dmPageBtn"
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
