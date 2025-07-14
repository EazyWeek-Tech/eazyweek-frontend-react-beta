"use client"

import { useState } from "react"

const PurchaseCategoryMaster = () => {
  const [currentPage, setCurrentPage] = useState(1)

  // Sample data for Case Categories
  const caseCategories = [
    { code: "C7", name: "Peeling" },
    { code: "C6", name: "Retail" },
    { code: "C5", name: "Consumable" },
    { code: "C1", name: "Computers" },
  ]

  // Sample data for Case Sub Categories
  const caseSubCategories = [
    { code: "CS4", name: "Home Care" },
    { code: "CS3", name: "Peel" },
    { code: "CS1", name: "Laptops" },
  ]

  // Sample data for Case Sub Sub Categories
  const caseSubSubCategories = [
    { code: "CS52", name: "NA" },
    { code: "CS51", name: "Touch Screen" },
  ]

  // Sample data for Case Sub Sub Sub Categories
  const caseSubSubSubCategories = [{ code: "CSS51", name: "NA" }]

  const handleCreateNew = () => {
    alert("Create New Purchase Category functionality would be implemented here")
  }

  const handleClose = () => {
    alert("Close functionality would be implemented here")
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  return (
    <>
      <style jsx>{`
        .purchase-category-container {
          padding: 20px;
          background-color: #f8f9fa;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .header-left {
          display: flex;
          flex-direction: column;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin: 0 0 10px 0;
        }

        .breadcrumb {
          font-size: 14px;
          color: #6c757d;
        }

        .breadcrumb-link {
          color: #334B71;
          text-decoration: none;
          cursor: pointer;
        }

        .breadcrumb-link:hover {
          text-decoration: underline;
        }

        .breadcrumb-separator {
          margin: 0 8px;
        }

        .breadcrumb-current {
          color: #6c757d;
        }

        .header-buttons {
          display: flex;
          gap: 10px;
        }

        .header-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }

        .create-btn {
          background-color: #334B71;
          color: white;
        }

        .create-btn:hover {
          background-color: #2a3f5f;
        }

        .close-btn {
          background-color: #334B71;
          color: white;
        }

        .close-btn:hover {
          background-color: #2a3f5f;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .category-section {
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .category-header {
          background-color: #C66752;
          padding: 15px 20px;
          border-bottom: 1px solid #dee2e6;
        }

        .category-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .category-table {
          width: 100%;
          border-collapse: collapse;
        }

        .category-table th {
           background: #334B71;
          padding: 12px 20px;
          text-align: left;
          font-weight: 600;
          color: #fff;
          border-bottom: 1px solid #dee2e6;
          font-size: 14px;
        }

        .category-table td {
          padding: 12px 20px;
          border-bottom: 1px solid #dee2e6;
          color: #495057;
          font-size: 14px;
        }

        .category-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .category-code {
          font-weight: 500;
          color: #334B71;
        }

        .category-name {
          color: #495057;
        }

        .pagination-container {
          display: flex;
          justify-content: center;
          gap: 5px;
          margin-top: 30px;
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

        .pagination-btn.active:hover {
          background-color: #2a3f5f;
          border-color: #2a3f5f;
        }

        @media (max-width: 768px) {
          .purchase-category-container {
            padding: 15px;
          }

          .header-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .categories-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .category-table th,
          .category-table td {
            padding: 10px 15px;
            font-size: 13px;
          }

          .header-buttons {
            width: 100%;
            justify-content: flex-end;
          }
        }

        @media (max-width: 480px) {
          .header-buttons {
            flex-direction: column;
            width: 100%;
          }

          .header-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="purchase-category-container">
        {/* Header Section */}
        <div className="header-section">
          <div className="header-left">
             <div className="breadcrumb">
              <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
              <span className="breadcrumb-separator">&gt;</span>
              <span className="breadcrumb-current">Purchase Category Masters</span>
            </div>
            <h1 className="page-title">Purchase Category Masters</h1>
           
          </div>
          <div className="header-buttons">
            <button className="header-btn create-btn" onClick={handleCreateNew}>
              Create New
            </button>
            <button className="header-btn close-btn" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>

        {/* Categories Grid - Top Row */}
        <div className="categories-grid">
          {/* Case Category */}
          <div className="category-section">
            <div className="category-header">
              <h2 className="category-title">Case Category</h2>
            </div>
            <table className="category-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category Name</th>
                </tr>
              </thead>
              <tbody>
                {caseCategories.map((category, index) => (
                  <tr key={index}>
                    <td className="category-code">{category.code}</td>
                    <td className="category-name">{category.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Case Sub Category */}
          <div className="category-section">
            <div className="category-header">
              <h2 className="category-title">Case Sub Category</h2>
            </div>
            <table className="category-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category Name</th>
                </tr>
              </thead>
              <tbody>
                {caseSubCategories.map((category, index) => (
                  <tr key={index}>
                    <td className="category-code">{category.code}</td>
                    <td className="category-name">{category.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Categories Grid - Bottom Row */}
        <div className="categories-grid">
          {/* Case Sub Sub Category */}
          <div className="category-section">
            <div className="category-header">
              <h2 className="category-title">Case Sub Sub Category</h2>
            </div>
            <table className="category-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category Name</th>
                </tr>
              </thead>
              <tbody>
                {caseSubSubCategories.map((category, index) => (
                  <tr key={index}>
                    <td className="category-code">{category.code}</td>
                    <td className="category-name">{category.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Case Sub Sub Sub Category */}
          <div className="category-section">
            <div className="category-header">
              <h2 className="category-title">Case Sub Sub Sub Category</h2>
            </div>
            <table className="category-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category Name</th>
                </tr>
              </thead>
              <tbody>
                {caseSubSubSubCategories.map((category, index) => (
                  <tr key={index}>
                    <td className="category-code">{category.code}</td>
                    <td className="category-name">{category.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="pagination-container">
          <button className={`pagination-btn ${currentPage === 1 ? "active" : ""}`} onClick={() => handlePageChange(1)}>
            1
          </button>
          <button className={`pagination-btn ${currentPage === 2 ? "active" : ""}`} onClick={() => handlePageChange(2)}>
            2
          </button>
        </div>
      </div>
    </>
  )
}

export default PurchaseCategoryMaster
