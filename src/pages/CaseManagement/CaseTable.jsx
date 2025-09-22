import React, { useEffect, useRef, useState } from "react";
import $ from "jquery";
import "datatables.net-fixedcolumns";
import "datatables.net";
import { useNavigate } from "react-router-dom";

const CaseTable = ({ records = [] }) => {
  const tableRef = useRef();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const $table = $(tableRef.current);

    if ($.fn.dataTable.isDataTable($table)) {
      $table.DataTable().destroy();
      $table.empty();
    }

    // Manual sorting of records before DataTable is initialized
    const sortedRecords = [...records].sort((a, b) => {
      const dateA = new Date(a.createddate || "1970-01-01");
      const dateB = new Date(b.createddate || "1970-01-01");
      return dateB - dateA;
    });

    setTimeout(() => {
      $table.DataTable({
        data: sortedRecords,
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
          {
            data: "priority",
            title: "Priority",
            render: (data) => data ?? "-",
          },
          { data: "category", title: "Category" },
          { data: "subCategory", title: "Subcategory" },
          { data: "subSubCategory", title: "Sub Subcategory" },
          { data: "subSubSubCategory", title: "Sub Sub Subcategory" },
          { data: "assignedto", title: "Assigned To" },
          { data: "createdby", title: "Owner" },
          {
            data: "createddate",
            title: "Created Date",
          },
        ],
        fixedColumns: true,
        paging: true,
        scrollCollapse: true,
        scrollX: true,
        scrollY: 600,
        bFilter: true,
        // Remove this ↓ to prevent it overriding JS sort
        order: [],
        createdRow: (row, data) => {
          $(row)
            .find(".case-link")
            .on("click", function (e) {
              e.preventDefault();
              const caseId = $(this).data("id");

              // NEW: include owner and assignedTo as query params
              const owner = encodeURIComponent(data?.createdby ?? "");
              const assignedTo = encodeURIComponent(data?.assignedto ?? "");

              navigate(`/cases/${caseId}?owner=${owner}&assignedTo=${assignedTo}`);
            });
        },
      });
      setLoading(false);
    }, 200);
  }, [records, navigate]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  return (
    <div className="pgcases">
      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
        </div>
      )}
      <table
        ref={tableRef}
        id="case-table"
        className="stripe row-border order-column case-table"
        style={{ width: "100%", display: loading ? "none" : "table" }}
      ></table>

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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CaseTable;
