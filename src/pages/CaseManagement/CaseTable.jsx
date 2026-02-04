import React, { useEffect, useRef, useState, useMemo } from "react";
import $ from "jquery";
import "datatables.net";
import "datatables.net-fixedcolumns";
import { useNavigate } from "react-router-dom";

const CaseTable = ({ records = [] }) => {
  const tableRef = useRef(null);
  const dtRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Sort once per records change
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const dateA = new Date(a.createddate || "1970-01-01");
      const dateB = new Date(b.createddate || "1970-01-01");
      return dateB - dateA;
    });
  }, [records]);

  // 1) INIT ONCE (mount)
  useEffect(() => {
    const $table = $(tableRef.current);

    // Init DataTable once
    dtRef.current = $table.DataTable({
      data: [],
      columns: [
        {
          data: "caseno",
          title: "Case no.",
          render: (data) =>
            `<a href="#" class="case-link" data-id="${data}">${data}</a>`,
        },
        { data: "casetitle", title: "Case Title" },
        {
          data: "status",
          title: "Status",
          render: (data) =>
            `<span class="${data?.toLowerCase() ?? ""}">${data ?? "-"}</span>`,
        },
        { data: "priority", title: "Priority", render: (d) => d ?? "-" },
        { data: "category", title: "Category" },
        { data: "subCategory", title: "Subcategory" },
        { data: "subSubCategory", title: "Sub Subcategory" },
        { data: "subSubSubCategory", title: "Sub Sub Subcategory" },
        {
          data: "assignedto",
          title: "Assigned To",
          render: (data, type, row) => {
            const isClosed =
              (row?.status ?? "").toString().trim().toLowerCase() === "closed";
            return isClosed ? "-" : (data ?? "-");
          },
        },
        { data: "customerName", title: "Customer Name", render: (d) => d ?? "-" },
        { data: "customerPhoneNo", title: "Customer Number", render: (d) => d ?? "-" },
        { data: "createdby", title: "Owner" },
        { data: "createddate", title: "Created Date" },
      ],
      fixedColumns: true,
      paging: true,
      scrollCollapse: true,
      scrollX: true,
      scrollY: 600,
      bFilter: true,
      order: [], // keep your manual sort
    });

    // ✅ Event delegation (bind once)
    $table.on("click", ".case-link", function (e) {
      e.preventDefault();
      const caseId = $(this).data("id");

      const rowData = dtRef.current?.row($(this).closest("tr")).data();
      const owner = encodeURIComponent(rowData?.createdby ?? "");
      const isClosed =
        (rowData?.status ?? "").toString().trim().toLowerCase() === "closed";
      const assignedToVal = isClosed ? "-" : (rowData?.assignedto ?? "-");
      const assignedTo = encodeURIComponent(assignedToVal);

      navigate(`/cases/${caseId}?owner=${owner}&assignedTo=${assignedTo}`);
    });

    // Cleanup on unmount
    return () => {
      $table.off("click", ".case-link");
      if (dtRef.current) {
        // IMPORTANT: don't use destroy(true) in React.
        dtRef.current.destroy(false);
        dtRef.current = null;
      }
    };
  }, [navigate]);

  // 2) UPDATE DATA (whenever records change)
  useEffect(() => {

     const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    if (!dtRef.current) return;

    setLoading(true);

    dtRef.current.clear();
    dtRef.current.rows.add(sortedRecords);
    dtRef.current.draw(false);

    setLoading(false);
  }, [sortedRecords]);

  return (
    <div className="pgcases">
      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
        </div>
      )}

      {/* ✅ Keep table always in the DOM. Avoid display:none toggling if possible. */}
      <table
        ref={tableRef}
        id="case-table"
        className="stripe row-border order-column case-table"
        style={{ width: "100%" }}
      />

      <style>{`
        .loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 5px solid rgba(0, 0, 0, 0.1);
          border-top-color: #334b71;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CaseTable;