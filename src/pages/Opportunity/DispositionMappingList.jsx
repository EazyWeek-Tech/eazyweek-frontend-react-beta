// src/pages/Opportunity/DispositionMapping/DispositionMappingList.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dispositionMapping.css";

const COLUMNS = [
  { key: "disposition", label: "Disposition" },
  { key: "subDisposition", label: "Subdisposition" },
  { key: "actions", label: "Actions" },
];

export default function DispositionMappingList() {
  const navigate = useNavigate();

  // Empty for now (later you can replace with API data)
  const [rows] = useState([]);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) =>
      [ "disposition", "subDisposition"].some((k) =>
        String(r?.[k] ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [rows, search]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

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

  const onEdit = (row) => {
    // for later: navigate with id/code
    // navigate(`/opportunity/disposition-mapping/edit/${row.id}`);
    navigate("/opportunity/disposition-mapping/create"); // placeholder
  };

  const onDelete = (row) => {
    // for later: show confirm + call delete API
    // eslint-disable-next-line no-alert
    alert("Delete action (API hookup later).");
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
          <select
            className="dmSelect"
            value={pageSize}
            onChange={onChangePageSize}
          >
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
              pageRows.map((r, idx) => (
                <tr key={r?.id ?? idx}>
                  <td>{r.disposition}</td>
                  <td>{r.subDisposition}</td>
                  <td>
                    <div className="dmActions">
                      <button
                        className="dmIconBtn"
                        title="Edit"
                        onClick={() => onEdit(r)}
                      >
                        ✎
                      </button>
                      <button
                        className="dmIconBtn dmDanger"
                        title="Delete"
                        onClick={() => onDelete(r)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
