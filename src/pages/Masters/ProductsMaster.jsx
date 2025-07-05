"use client"

import { useState } from "react"
import ProductForm from "./ProductForm"

const ProductsMaster = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedProductForEdit, setSelectedProductForEdit] = useState(null)
  const [formMode, setFormMode] = useState("create")

  // Sample product data based on your screenshot
  const productData = [
    {
      id: 1,
      code: "PROL-0026",
      name: "Zo Retinol cream",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 2,
      code: "PROL-0024",
      name: "Zo renewal cream",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 3,
      code: "PROL-0025",
      name: "Zo oil control pads",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 4,
      code: "PROL-0023",
      name: "Zo growth factor",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 5,
      code: "PROL-0030",
      name: "ZO Bright alive 50 ml زو كريم تفتيح وتوحيد 50 مللي",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 6,
      code: "PROL-0029",
      name: "ZO Acne Control 60 ml زو كريم التحكم بالحبوب 60 مللي",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 7,
      code: "PROL-0028",
      name: "Thalion Dewy Glow Liquid Care",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 8,
      code: "PROL-0032",
      name: "Spot peel home care cream",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 9,
      code: "PROL-0010",
      name: "Sorabee whitening cream سورابي كريم تفتيح",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
    {
      id: 10,
      code: "PROL-0011",
      name: "Sorabee shine cleanser سورابي منظف للبشرة",
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    },
  ]

  // Add more sample data to reach 217 total entries
  const allProductData = [
    ...productData,
    ...Array.from({ length: 207 }, (_, index) => ({
      id: index + 11,
      code: `PROL-${String(index + 100).padStart(4, "0")}`,
      name: `Product ${index + 11}`,
      category: "",
      subcategory: "",
      mrp: "0.00",
      unit: "",
      size: "",
      color: "",
      status: "Active",
    })),
  ]

  const totalEntries = allProductData.length
  const totalPages = Math.ceil(totalEntries / entriesPerPage)

  // Filter products based on search term
  const filteredProducts = allProductData.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Get current page data
  const startIndex = (currentPage - 1) * entriesPerPage
  const currentProducts = filteredProducts.slice(startIndex, startIndex + entriesPerPage)

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

  const handleCheckboxChange = (productId) => {
    setSelectedProducts((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId)
      } else {
        return [...prev, productId]
      }
    })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(currentProducts.map((product) => product.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleCreateNew = () => {
    setSelectedProductForEdit(null)
    setFormMode("create")
    setShowForm(true)
  }

  const handleEdit = () => {
    if (selectedProducts.length === 0) {
      alert("Please select at least one product to edit")
      return
    }
    if (selectedProducts.length > 1) {
      alert("Please select only one product to edit")
      return
    }

    const productToEdit = allProductData.find((p) => p.id === selectedProducts[0])
    setSelectedProductForEdit(productToEdit)
    setFormMode("edit")
    setShowForm(true)
  }

  const handleBackFromForm = () => {
    setShowForm(false)
    setSelectedProductForEdit(null)
    setSelectedProducts([])
  }

  const isAllSelected = currentProducts.length > 0 && selectedProducts.length === currentProducts.length

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

    // Always show last page if there are multiple pages
    if (totalPages > 1) {
      pages.push(
        <button
          key={totalPages}
          className={`pagination-btn ${currentPage === totalPages ? "active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>,
      )
    }

    return pages
  }

  // If showing form, render the ProductForm component
  if (showForm) {
    return <ProductForm product={selectedProductForEdit} onBack={handleBackFromForm} mode={formMode} />
  }

  return (
    <div className="products-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Products</span>
      </div>
      {/* Header */}
      <div className="header-section">
        <h1 className="page-title">Manage products</h1>
        <div className="action-buttons">
          <button className="action-btn create-btn" onClick={handleCreateNew}>
            Create New
          </button>
          <button className="action-btn edit-btn" onClick={handleEdit}>
            Edit
          </button>
        </div>
      </div>

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
            placeholder="Search products..."
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="msttable">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="table-checkbox" />
              </th>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>MRP</th>
              <th>Unit</th>
              <th>SIZE</th>
              <th>COLOR</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((product) => (
              <tr key={product.id}>
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleCheckboxChange(product.id)}
                    className="table-checkbox"
                  />
                </td>
                <td>{product.code}</td>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>{product.subcategory}</td>
                <td>{product.mrp}</td>
                <td>{product.unit}</td>
                <td>{product.size}</td>
                <td>{product.color}</td>
                <td>
                  <span className={`status-badge ${product.status.toLowerCase()}`}>{product.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="no-results">
            <p>No products found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="footer-section">
        <div className="entries-info">
          Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredProducts.length)} of{" "}
          {filteredProducts.length} entries
        </div>
        <div className="pagination-container">{renderPagination()}</div>
      </div>

      <style jsx>{`
        .products-master-container {
          min-height: 100vh;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #dee2e6;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin: 0;
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

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background-color: #d4edda;
          color: #155724;
        }

        .no-results {
          padding: 40px;
          text-align: center;
          color: #6c757d;
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

        @media (max-width: 768px) {
          .products-master-container {
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
        }
      `}</style>
    </div>
  )
}

export default ProductsMaster
