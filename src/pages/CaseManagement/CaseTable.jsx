import React, { useEffect, useRef } from "react";
import $ from "jquery";
import "datatables.net-fixedcolumns";
import "datatables.net";
import { useNavigate } from "react-router-dom";

const CaseTable = ({ records = [] }) => {
  const tableRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const $table = $(tableRef.current);

    // Destroy and clear existing DataTable if it exists
    if ($.fn.dataTable.isDataTable($table)) {
      $table.DataTable().destroy();
      $table.empty(); // remove old header/body
    }

    $table.DataTable({
      data: records,
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
            `<span class="${data?.toLowerCase() ?? ''}">${data ?? '-'}</span>`,
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
      order: [[10, "desc"]],
      createdRow: (row, data) => {
        console.log(data)
        $(row)
          .find(".case-link")
          .on("click", function (e) {
            e.preventDefault();
            const caseId = $(this).data("id");
            navigate(`/cases/${caseId}`);
          });
      },
    });
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
      <table
        ref={tableRef}
        id="case-table"
        className="stripe row-border order-column case-table"
        style={{ width: "100%" }}
      ></table>
    </div>
  );
};

export default CaseTable;
