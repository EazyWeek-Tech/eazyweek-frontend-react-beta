"use client";

import { useState, useEffect } from "react";
import ServiceForm from "./ServiceForm";
import { API_BASE_URL } from "../../config";

const ServiceMaster = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceStatus, setServiceStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState(null);
  const [formMode, setFormMode] = useState("create");
  const [serviceData, setServiceData] = useState([]);

  // Fetch service data from the API
  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/Master/LoadService`,
          {
            method: "GET",
            credentials:"include",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        setServiceData(data); // Set the fetched data
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    fetchServiceData();
  }, [currentPage, entriesPerPage]);

  // Filter services based on search term and status
  const filteredServices = serviceData.filter((service) => {
    const serviceName = service.serviceName ? service.serviceName.toLowerCase() : '';
    const serviceCode = service.serviceCode ? service.serviceCode.toLowerCase() : '';
    const categoryName = service.categoryName ? service.categoryName.toLowerCase() : '';
    const subCategoryName = service.subCategoryName ? service.subCategoryName.toLowerCase() : '';
    const status = service.status ? service.status.toLowerCase() : '';

    return (
      serviceName.includes(searchTerm.toLowerCase()) ||
      serviceCode.includes(searchTerm.toLowerCase()) ||
      categoryName.includes(searchTerm.toLowerCase()) ||
      subCategoryName.includes(searchTerm.toLowerCase()) ||
      (status === serviceStatus || serviceStatus === "")
    );
  });

   const totalEntries = filteredServices.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage; // Define startIndex here
  const currentServices = filteredServices.slice(startIndex, startIndex + entriesPerPage);


  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleEntriesPerPageChange = (e) => {
    setEntriesPerPage(Number.parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page when changing entries per page
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleCheckboxChange = (serviceId) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedServices(filteredServices.map((service) => service.recID));
    } else {
      setSelectedServices([]);
    }
  };

  const handleCreateNew = () => {
    setSelectedServiceForEdit(null);
    setFormMode("create");
    setShowForm(true);
  };

  const handleEdit = () => {
    if (selectedServices.length === 0) {
      alert("Please select at least one service to edit");
      return;
    }
    if (selectedServices.length > 1) {
      alert("Please select only one service to edit");
      return;
    }

    const serviceToEdit = serviceData.find((s) => s.recID === selectedServices[0]);
    setSelectedServiceForEdit(serviceToEdit);
    setFormMode("edit");
    setShowForm(true);
  };

  const handleBackFromForm = () => {
    setShowForm(false);
    setSelectedServiceForEdit(null);
    setSelectedServices([]);
  };

  const isAllSelected = filteredServices.length > 0 && selectedServices.length === filteredServices.length;

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;

    // Always show first page
    pages.push(
      <button
        key={1}
        className={`pagination-btn ${currentPage === 1 ? "active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>
    );

    // Show pages around current page
    for (let i = 2; i <= Math.min(totalPages - 1, maxVisiblePages); i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    // Show ellipsis if there are more pages
    if (totalPages > maxVisiblePages + 1) {
      pages.push(
        <span key="ellipsis" className="pagination-ellipsis">
          ...
        </span>
      );
    }

    // Always show last page if there are multiple pages
    if (totalPages > 1) {
      pages.push(
        <button
          key={totalPages}
          className={`pagination-btn ${currentPage === totalPages ? "active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  if (showForm) {
    return <ServiceForm service={selectedServiceForEdit} onBack={handleBackFromForm} mode={formMode} />;
  }

  return (
    <>
      <style jsx>{
       ` .service-master-container {
          min-height: 100vh;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 30px;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
        }

        .action-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }

        .create-btn {
          background-color: #343a40;
          color: white;
        }

        .create-btn:hover {
          background-color: #23272b;
        }

        .edit-btn {
          background-color: #343a40;
          color: white;
        }

        .edit-btn:hover {
          background-color: #23272b;
        }

        .service-status-select {
          padding: 10px 15px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          min-width: 150px;
        }

        .controls-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .entries-control {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .entries-select {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
        }

        .entries-label {
          font-size: 14px;
          color: #495057;
        }

        .search-control {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-label {
          font-size: 14px;
          color: #495057;
          font-weight: 500;
        }

        .search-input {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          min-width: 200px;
        }

        .search-input:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .service-table {
          width: 100%;
          border-collapse: collapse;
        }

        .service-table th {
          background-color: #f8f9fa;
          padding: 15px 12px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          border-bottom: 1px solid #dee2e6;
          font-size: 14px;
        }

        .service-table td {
          padding: 15px 12px;
          border-bottom: 1px solid #dee2e6;
          color: #495057;
          font-size: 14px;
          vertical-align: top;
        }

        .service-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .checkbox-column {
          width: 50px;
          text-align: center;
        }

        .table-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #334B71;
        }

        .service-code {
          font-weight: 500;
          color: #495057;
          font-family: monospace;
        }

        .service-name {
          max-width: 400px;
          word-wrap: break-word;
          line-height: 1.4;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          background-color: #d4edda;
          color: #155724;
        }

        .footer-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
        }

        .entries-info {
          font-size: 14px;
          color: #6c757d;
        }

        .pagination-container {
          display: flex;
          gap: 5px;
          align-items: center;
        }

        .pagination-btn {
          padding: 8px 12px;
          border: 1px solid #dee2e6;
          background-color: white;
          color: #495057;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .pagination-btn:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
        }

        .pagination-btn.active {
          background-color: #334B71;
          border-color: #334B71;
          color: white;
        }

        .pagination-ellipsis {
          padding: 8px 4px;
          color: #6c757d;
        }

        .no-results {
          padding: 40px;
          text-align: center;
          color: #6c757d;
        }

        @media (max-width: 768px) {
          .service-master-container {
            padding: 15px;
          }

          .header-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .controls-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .footer-section {
            flex-direction: column;
            gap: 15px;
            align-items: center;
          }

          .pagination-container {
            flex-wrap: wrap;
            justify-content: center;
          }

          .service-table {
            font-size: 12px;
          }

          .service-table th,
          .service-table td {
            padding: 10px 8px;
          }

          .service-name {
            max-width: 250px;
          }
        }`
      }</style>
    <div className="service-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Services</span>
      </div>
      {/* Page Title */}
      <h1 className="page-title">Manage Services</h1>
      {/* Controls */}
      <div className="controls-section">
        <div className="entries-control">
          <select value={entriesPerPage} onChange={handleEntriesPerPageChange} className="entries-select">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="entries-label">entries per page</span>
        </div>
        <div className="search-control">
          <label className="search-label">Search:</label>
          <input
            type="text"
            className="search-input"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search services..."
          />
        </div>
      </div>

      {/* Services Table */}
      <div className="table-container">
        <table className="msttable">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="table-checkbox"
                />
              </th>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((service) => (
              <tr key={service.recID}>
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.recID)}
                    onChange={() => handleCheckboxChange(service.recID)}
                    className="table-checkbox"
                  />
                </td>
                <td>{service.serviceCode}</td>
                <td>{service.serviceName}</td>
                <td>{service.categoryName}</td>
                <td>{service.subCategoryName}</td>
                <td>
                  <span className={`status-badge ${service.status.toLowerCase()}`}>{service.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredServices.length === 0 && (
          <div className="no-results">
            <p>No services found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="footer-section">
        <div className="entries-info">
          Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredServices.length)} of{" "}
          {filteredServices.length} entries
        </div>
        <div className="pagination-container">{renderPagination()}</div>
      </div>
    </div>
    </>
  );
};

export default ServiceMaster;
