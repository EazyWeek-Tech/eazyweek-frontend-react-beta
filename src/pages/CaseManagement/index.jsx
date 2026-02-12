import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";


import FilterBar from "./FilterBar";
import CaseTable from "./CaseTable";
import DashboardOverview from "./DashboardOverview";
import CaseDetails from "./CaseDetails";
import CreateCaseModel from "./CreateCaseModel";
import { API_BASE_URL } from "../../config";

const CaseManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caseRecords, setCaseRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    owner: "",
    priority: "",
    assignTo: "",
    status: "",
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [highlightCaseNo, setHighlightCaseNo] = useState(null);
  const [user, setUser] = useState(
    JSON.parse(
      sessionStorage.getItem("user") || localStorage.getItem("user")
    )
  );

  useEffect(() => {
  if (user) {
    fetchCases(buildCaseFilterPayload(filters)); // ✅ load with current filters
    fetchEmployees();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]);

// ✅ whenever filters change -> fetch again
useEffect(() => {
  if (!user) return;
  fetchCases(buildCaseFilterPayload(filters));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filters]);


 const norm = (v) => (v ?? "").toString().trim().toLowerCase();

const buildCaseFilterPayload = (f) => ({
  owner: f?.owner || "",
  priority: f?.priority || "",
  assignTo: f?.assignTo || "",
  status: f?.status || "",
});


const stripHtml = (html) =>
  (html ?? "")
    .toString()
    .replace(/<[^>]*>/g, " ")   // remove tags
    .replace(/\s+/g, " ")       // collapse spaces
    .trim();


  const fetchCases = async (filters) => {
    try {
      const token = sessionStorage.getItem("ssoToken"); // 🔹 NEW
      const res = await fetch(`${API_BASE_URL}/api/CaseOperation/CaseDB`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}), // 🔹 NEW
        },
        body: JSON.stringify(filters),
      });
      const data = await res.json();
      console.log("case data");
      console.log(data);
       
      const mapped = data.map((item) => {
  const priorityText = stripHtml(item.priority); // ✅ DEFINE IT HERE

  return {
    caseno: item.caseNO,
    casetitle: item.caseTitle ?? "-",
    status: item.status,
    priority: item.priority ?? "-",        // HTML (for display)
    priorityText: priorityText || "-",     // ✅ plain text (for filtering)
    category: item.category,
    subCategory: item.subCategory,
    subSubCategory: item.subSubCategory,
    subSubSubCategory: item.subSubSubCategory,
    assignedto: item.assignTo?.trim() || "-",
    createdby: item.owner || "-",
    customerName: item.customerName,
    customerPhoneNo: item.customerPhoneNo,
    createddateRaw:
      item.createdDate && item.createdDate !== "0001-01-01T00:00:00"
        ? item.createdDate
        : null,
    createddate:
      item.createdDate && item.createdDate !== "0001-01-01T00:00:00"
        ? new Date(item.createdDate).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "-",
  };
});

      mapped.sort(
  (a, b) => new Date(b.createddateRaw || 0) - new Date(a.createddateRaw || 0)
);

      setCaseRecords(mapped);
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = sessionStorage.getItem("ssoToken"); // 🔹 NEW
      const res = await fetch(`${API_BASE_URL}/api/Employees`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}), // 🔹 NEW
        },
      });
      const data = await res.json();
      const filtered = data.filter(
        (emp) => emp.employeeCode && emp.employeeName !== "Assign To"
      );
      setEmployees(filtered);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const handleCreateCase = async (newCase) => {
    setToastMessage(`Case ${newCase.caseno} created successfully`);
    setHighlightCaseNo(newCase.caseno);
    setIsModalOpen(false);
    await fetchCases(filters);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setToastMessage(null);
      setHighlightCaseNo(null);
    }, 4000);
  };

  return (
    <>
      <div className="">
        <div className="pg-head">
          <h2 className="pg-ttl">Cases</h2>
        </div>
        <DashboardOverview />
        <FilterBar
  onCreateCase={() => setIsModalOpen(true)}
  onFilter={setFilters}
  employeeList={employees}
/>

<CaseTable
  records={caseRecords}
  highlightCaseNo={highlightCaseNo}
/>

      </div>

      {isModalOpen && (
        <CreateCaseModel
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateCase}
        />
      )}
    </>
  );
};

export default CaseManagement;
