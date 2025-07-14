"use client";

import { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import ServiceForm from "./ServiceForm";
import { API_BASE_URL } from "../../config";

const ServiceMaster = () => {
  const [serviceData, setServiceData] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState(null);
  const [formMode, setFormMode] = useState("create");

  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/Master/LoadService`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch services");

        const data = await response.json();
        setServiceData(data);
        setFilteredServices(data);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, []);

  useEffect(() => {
    const filtered = serviceData.filter((service) => {
      const name = service.serviceName?.toLowerCase() || "";
      const code = service.serviceCode?.toLowerCase() || "";
      const category = service.categoryName?.toLowerCase() || "";
      const subCategory = service.subCategoryName?.toLowerCase() || "";
      const status = service.status?.toLowerCase() || "";

      return (
        name.includes(searchTerm.toLowerCase()) ||
        code.includes(searchTerm.toLowerCase()) ||
        category.includes(searchTerm.toLowerCase()) ||
        subCategory.includes(searchTerm.toLowerCase()) ||
        (status === serviceStatus.toLowerCase() || serviceStatus === "")
      );
    });

    setFilteredServices(filtered);
  }, [searchTerm, serviceStatus, serviceData]);

  const handleCreateNew = () => {
    setSelectedServiceForEdit(null);
    setFormMode("create");
    setShowForm(true);
  };

  const handleEdit = (row) => {
    setSelectedServiceForEdit(row);
    setFormMode("edit");
    setShowForm(true);
  };

  const handleBackFromForm = () => {
    setShowForm(false);
    setSelectedServiceForEdit(null);
    setSelectedServices([]);
  };

  const handleSelectedRowsChange = ({ selectedRows }) => {
    setSelectedServices(selectedRows.map((r) => r.recID));
  };

  const columns = [
    {
      name: "Code",
      selector: (row) => row.serviceCode,
      sortable: true,
    },
    {
      name: "Name",
      selector: (row) => row.serviceName,
      sortable: true,
      wrap: true,
    },
    {
      name: "Category",
      selector: (row) => row.categoryName,
      sortable: true,
    },
    {
      name: "Subcategory",
      selector: (row) => row.subCategoryName,
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      cell: (row) => (
        <span className={`status-badge ${row.status?.toLowerCase()}`}>
          {row.status}
        </span>
      ),
      sortable: true,
    },
    {
      name: "Action",
      cell: (row) => (
        <button
          className="act-btn edit"
          onClick={() => handleEdit(row)}
          title="Edit"
        >
          ✏️ Edit
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  if (showForm) {
    return <ServiceForm service={selectedServiceForEdit} onBack={handleBackFromForm} mode={formMode} />;
  }

  return (
    <div className="service-master-container">
      <div className="header-section">
        <h1 className="page-title">Manage Services</h1>
        <div className="action-buttons">
          <button className="create-btn" onClick={handleCreateNew}>Create New Service</button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredServices}
        selectableRows
        onSelectedRowsChange={handleSelectedRowsChange}
        progressPending={loading}
        progressComponent={
          <div className="loader-wrapper">
            <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
          </div>
        }
        pagination
        paginationPerPage={entriesPerPage}
        paginationRowsPerPageOptions={[10, 25, 50, 100]}
        onChangeRowsPerPage={(newPerPage) => setEntriesPerPage(newPerPage)}
        onChangePage={(page) => setCurrentPage(page)}
        subHeader
        highlightOnHover
        subHeaderComponent={
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                minWidth: "200px",
              }}
            />
            <select
              value={serviceStatus}
              onChange={(e) => setServiceStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        }
      />

      <style>{`
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
        }

        .create-btn {
          padding: 10px 20px;
          background-color: #334B71;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
        }

        .create-btn:hover {
          background-color: #22314f;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          background-color: #d4edda;
          color: #155724;
          text-transform: capitalize;
        }

        .status-badge.inactive {
          background-color: #f8d7da;
          color: #721c24;
        }

        .act-btn.edit {
          font-size: 13px;
          padding: 6px 10px;
          border-radius: 4px;
          border: none;
          background-color: #fff3cd;
          color: #856404;
          font-weight: 500;
          cursor: pointer;
        }

        .act-btn.edit:hover {
          background-color: #ffe8a1;
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

        .lds-ring div:nth-child(1) {
          animation-delay: -0.45s;
        }
        .lds-ring div:nth-child(2) {
          animation-delay: -0.3s;
        }
        .lds-ring div:nth-child(3) {
          animation-delay: -0.15s;
        }

        @keyframes lds-ring {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ServiceMaster;
