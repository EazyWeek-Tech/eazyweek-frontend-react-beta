"use client";

import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import EmployeeEditForm from "./EmployeeEditForm";
import { API_BASE_URL } from "../../config";

const EmployeeMaster = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Employees`, {
          credentials: "include",
        });
        const data = await res.json();
        const employeeList = (Array.isArray(data) ? data : [data]).map((emp) => {
          const nameParts = emp.employeeName?.split(" ") || [];
          return {
            ...emp,
            firstName: nameParts.slice(0, -1).join(" "),
            lastName: nameParts.slice(-1).join(" "),
          };
        });
        setEmployees(employeeList);
        setFilteredEmployees(employeeList);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter((emp) =>
      [emp.firstName, emp.lastName, emp.employeeCode, emp.mobileNo, emp.clinicName]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const handleSearch = (e) => setSearchTerm(e.target.value);
  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp);
    setShowEditForm(true);
  };
  const handleBackToList = () => {
    setSelectedEmployee(null);
    setShowEditForm(false);
  };

  const columns = [
    {
      name: "Employee Code",
      selector: (row) => row.employeeCode,
      cell: (row) => (
        <a href="#" onClick={(e) => { e.preventDefault(); handleEmployeeClick(row); }}>
          {row.employeeCode}
        </a>
      ),
      sortable: true,
    },
    { name: "First Name", selector: (row) => row.firstName, sortable: true },
    { name: "Last Name", selector: (row) => row.lastName, sortable: true },
    { name: "Mobile No", selector: (row) => row.mobileNo, sortable: true },
    { name: "Primary Clinic", selector: (row) => row.clinicName, sortable: true },
  ];

  if (showEditForm && selectedEmployee) {
    return <EmployeeEditForm employee={selectedEmployee} onBack={handleBackToList} />;
  }

  return (
    <div className="employee-master-container">
      <style>{`
        .breadcrumb {
          margin-bottom: 10px;
          font-size: 14px;
        }
        .breadcrumb-link {
          color: #334B71;
          text-decoration: none;
        }
        .breadcrumb-separator {
          margin: 0 5px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
        }
        .add-btn {
          background-color: #334B71;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        .search-container {
          margin-bottom: 20px;
        }
        .search-input {
          width: 100%;
          max-width: 400px;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .loader {
          text-align: center;
          font-size: 16px;
          margin-top: 40px;
        }
          .cstmtable div a{color: #334B71; font-weight: 600; text-decoration: underline;}
      `}</style>

      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Employee</span>
      </div>

      <div className="page-header">
        <h1 className="page-title">Manage Employees</h1>
        <button className="add-btn">Add Employee</button>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {loading ? (
        <div className="loader">Loading employees...</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredEmployees}
          className="cstmtable"
          pagination
          highlightOnHover
          responsive
          dense
        />
      )}
    </div>
  );
};

export default EmployeeMaster;
