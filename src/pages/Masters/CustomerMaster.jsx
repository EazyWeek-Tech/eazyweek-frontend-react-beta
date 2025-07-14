"use client";

import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { API_BASE_URL } from "../../config";

const CustomerMaster = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers`, {
          credentials: "include",
        });
        const data = await res.json();
        const customerList = Array.isArray(data) ? data : [data];
        setCustomers(customerList);
        setFilteredCustomers(customerList);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter((cust) =>
      [
        cust.firstName,
        cust.lastName,
        cust.custId,
        cust.mobile,
        cust.centerName,
        cust.membership
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const columns = [
    { name: "Code", selector: (row) => row.custId, sortable: true },
    { name: "First Name", selector: (row) => row.firstName, sortable: true },
    { name: "Last Name", selector: (row) => row.lastName, sortable: true },
    { name: "Phone No.", selector: (row) => row.mobile, sortable: true },
    { name: "Last Visit", selector: (row) => row.lastVisit, sortable: true },
    { name: "Membership", selector: (row) => row.membership, sortable: true },
    { name: "Center", selector: (row) => row.centerName, sortable: true },
  ];

  return (
    <div className="customer-master-container">
      <style>{`
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
        .loader-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
        }
        .lds-ring {
          display: inline-block;
          position: relative;
          width: 64px;
          height: 64px;
        }
        .lds-ring div {
          box-sizing: border-box;
          display: block;
          position: absolute;
          width: 48px;
          height: 48px;
          margin: 8px;
          border: 4px solid #334B71;
          border-radius: 50%;
          animation: lds-ring 1.2s linear infinite;
          border-color: #334B71 transparent transparent transparent;
        }
        .lds-ring div:nth-child(1) { animation-delay: -0.45s; }
        .lds-ring div:nth-child(2) { animation-delay: -0.3s; }
        .lds-ring div:nth-child(3) { animation-delay: -0.15s; }
        @keyframes lds-ring {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Manage Customers</h1>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {loading ? (
        <div className="loader-wrapper">
          <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCustomers}
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

export default CustomerMaster;
