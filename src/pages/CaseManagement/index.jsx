import React, {useEffect, useState} from "react";
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
        JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user"))
      );

    useEffect(() => {
        if (user) {
          fetchCases({ owner: "", priority: "", assignTo: "", status: "" });
          fetchEmployees();
        }
      }, [user]);
    
      const applyClientFilters = (records, filters) => {
        return records.filter((rec) => {
          return (
            (!filters.owner || rec.createdby === filters.owner) &&
            (!filters.priority || rec.priority === filters.priority) &&
            (!filters.assignTo || rec.assignedto === filters.assignTo) &&
            (!filters.status || rec.status === filters.status)
          );
        });
      };

      const fetchCases = async (filters) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/CaseOperation/CaseDB`,
        {
          method: "POST",
           credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filters),
        }
      );
      const data = await res.json();
      console.log('case data')
      console.log(data)
      const mapped = data.map((item) => ({
        caseno: item.caseNO,
        casetitle: item.caseTitle ?? "-",
        status: item.status,
        priority: item.priority ?? "-",
        category: item.category,
        subCategory: item.subCategory,
        subSubCategory: item.subSubCategory,
        subSubSubCategory: item.subSubSubCategory,
        assignedto: item.assignTo?.trim() || "-",
        createdby: item.owner || "-",
        customerName: item.customerName,
        customerPhoneNo: item.customerPhoneNo,
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
      }));
      mapped.sort(
        (a, b) => new Date(b.createddate) - new Date(a.createddate)
      );
      setCaseRecords(mapped);
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    }
  };

   const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Employees`, {
        method: "GET",
         credentials: "include",
        headers: { "Content-Type": "application/json" },
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
      <FilterBar onCreateCase={() => setIsModalOpen(true)}
                      onFilter={setFilters}
                      employeeList={employees}/>
      <CaseTable records={applyClientFilters(caseRecords, filters)}
                    highlightCaseNo={highlightCaseNo}/>
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
