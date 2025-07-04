"use client"

import { useState } from "react"
import ServiceForm from "./ServiceForm"

const ServiceMaster = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [selectedServices, setSelectedServices] = useState([])
  const [serviceStatus, setServiceStatus] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState(null)
  const [formMode, setFormMode] = useState("create")

  // Sample service data based on your screenshot
  const serviceData = [
    {
      id: 1,
      code: "SER-00001",
      name: "Pore Hydra Facial",
      category: "Hydra facial",
      subcategory: "Hydra facial",
      status: "ACTIVE",
    },
    {
      id: 2,
      code: "SERB-AA-0006",
      name: "Volume filling (Juvederm Voluma) 1S فيلر فوليوما جوفيديرم_B",
      category: "Antiageing Services",
      subcategory: "Volume filling",
      status: "ACTIVE",
    },
    {
      id: 3,
      code: "SERB-LHR-0003",
      name: "Hair Reduction (Large - Gentle Lase ) 1S فيلر منطقة كبيرة_B",
      category: "Laser Hair reduction",
      subcategory: "Hair Reduction",
      status: "ACTIVE",
    },
    {
      id: 4,
      code: "SERB-SC-0000-Expat",
      name: "Skin rejuvenation (meso Botox) 1S جلسة ميزو بوتوكس للنضارة_B - Expat",
      category: "Skin Concern Treatment",
      subcategory: "Rejuvenation",
      status: "ACTIVE",
    },
    {
      id: 5,
      code: "SERB-HS-0001",
      name: "Hair Loss Treatment (Regenera ) 1S ريجينيرا_B",
      category: "Hair Solution",
      subcategory: "Hair Loss Treatment",
      status: "ACTIVE",
    },
    {
      id: 6,
      code: "SERB-HS-0005-EX",
      name: "Hair Thickening (Fillers - Hair Thickening ) 1S فيلر الشعر - Expat_B",
      category: "Hair Solution",
      subcategory: "Hair Thickening",
      status: "ACTIVE",
    },
    {
      id: 7,
      code: "SERB-SC-0029",
      name: "Acne Scar Reduction (Scarlet) 1S سكارليت_B",
      category: "Skin Concern Treatment",
      subcategory: "Acne Scar Reduction",
      status: "ACTIVE",
    },
    {
      id: 8,
      code: "SERB-AA-0003",
      name: "Wrinkle reduction one area (Botox) منطقة واحدة بوتوكس_B",
      category: "Antiageing Services",
      subcategory: "Volume filling",
      status: "ACTIVE",
    },
    {
      id: 9,
      code: "SERB-CON-0002",
      name: "Consultation - Specialist (Consultation - Specialist) 1S استشارة - كشفية_B",
      category: "Consultation",
      subcategory: "Consultation - Specialist",
      status: "ACTIVE",
    },
    {
      id: 10,
      code: "SERB-CGY-0007",
      name: "Cosmetic Gyneacology (Pink Intimate peel ) 1S تقشير منطقة حميمية_B",
      category: "Cosmetic Gyneacology",
      subcategory: "Peel",
      status: "ACTIVE",
    },
  ]

  const totalEntries = 1906 // Based on screenshot showing 1,906 entries
  const totalPages = Math.ceil(totalEntries / entriesPerPage)

  // Filter services based on search term
  const filteredServices = serviceData.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.subcategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Get current page data
  const startIndex = (currentPage - 1) * entriesPerPage
  const currentServices = filteredServices.slice(startIndex, startIndex + entriesPerPage)

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleEntriesPerPageChange = (e) => {
    setEntriesPerPage(Number.parseInt(e.target.value))
    setCurrentPage(1) // Reset to first page when changing entries per page
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleCheckboxChange = (serviceId) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId)
      } else {
        return [...prev, serviceId]
      }
    })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedServices(currentServices.map((service) => service.id))
    } else {
      setSelectedServices([])
    }
  }

  const handleCreateNew = () => {
    setSelectedServiceForEdit(null)
    setFormMode("create")
    setShowForm(true)
  }

  const handleEdit = () => {
    if (selectedServices.length === 0) {
      alert("Please select at least one service to edit")
      return
    }
    if (selectedServices.length > 1) {
      alert("Please select only one service to edit")
      return
    }

    const serviceToEdit = serviceData.find((s) => s.id === selectedServices[0])
    setSelectedServiceForEdit(serviceToEdit)
    setFormMode("edit")
    setShowForm(true)
  }

  const isAllSelected = currentServices.length > 0 && selectedServices.length === currentServices.length

  const renderPagination = () => {
    const pages = []
    const maxVisiblePages = 5

    // Always show first page
    pages.push(
      <button
        key={1}
        className={`pagination-btn ${currentPage === 1 ? "active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>,
    )

    // Show pages around current page
    for (let i = 2; i <= Math.min(totalPages - 1, maxVisiblePages); i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>,
      )
    }

    // Show ellipsis if there are more pages
    if (totalPages > maxVisiblePages + 1) {
      pages.push(
        <span key="ellipsis" className="pagination-ellipsis">
          ...
        </span>,
      )
    }

    // Show last page (191 based on screenshot)
    if (totalPages > 1) {
      pages.push(
        <button
          key={191}
          className={`pagination-btn ${currentPage === 191 ? "active" : ""}`}
          onClick={() => handlePageChange(191)}
        >
          191
        </button>,
      )
    }

    return pages
  }

  const handleBackFromForm = () => {
    setShowForm(false)
    setSelectedServiceForEdit(null)
    setSelectedServices([])
  }

  // If showing form, render the ServiceForm component
  if (showForm) {
    return <ServiceForm service={selectedServiceForEdit} onBack={handleBackFromForm} mode={formMode} />
  }

  return (
    <>
      <style jsx>{`
        .service-master-container {
          padding: 20px;
          background-color: #f8f9fa;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
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
          border-color: #007bff;
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
          accent-color: #007bff;
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
          background-color: #007bff;
          border-color: #007bff;
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
        }
      `}</style>

      <div className="service-master-container">
        {/* Page Title */}
        <h1 className="page-title">Manage services</h1>

        {/* Header Section */}
        <div className="header-section">
          <div className="header-left"></div>
          <div className="header-right">
            <div className="action-buttons">
              <button className="action-btn create-btn" onClick={handleCreateNew}>
                Create New
              </button>
              <button className="action-btn edit-btn" onClick={handleEdit}>
                Edit
              </button>
            </div>
            <select
              value={serviceStatus}
              onChange={(e) => setServiceStatus(e.target.value)}
              className="service-status-select"
            >
              <option value="">Service Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Controls Section */}
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
          <table className="service-table">
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
              {currentServices.map((service) => (
                <tr key={service.id}>
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleCheckboxChange(service.id)}
                      className="table-checkbox"
                    />
                  </td>
                  <td className="service-code">{service.code}</td>
                  <td className="service-name">{service.name}</td>
                  <td>{service.category}</td>
                  <td>{service.subcategory}</td>
                  <td>
                    <span className="status-badge">{service.status}</span>
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

        {/* Footer Section */}
        <div className="footer-section">
          <div className="entries-info">
            Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredServices.length)} of{" "}
            {totalEntries} entries
          </div>
          <div className="pagination-container">{renderPagination()}</div>
        </div>
      </div>
    </>
  )
}

export default ServiceMaster
