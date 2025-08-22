"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config"   // adjust path if needed

const ItemCategoryMaster = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

    const navigate = useNavigate();

  const handleCreateNew = () => {
    navigate("/create-category"); // <-- redirect
  };


  const handleClose = () => {
    alert("Close functionality would be implemented here")
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE_URL}/api/Master/GetItemCategory`)
        if (!res.ok) throw new Error("Failed to fetch categories")
        const data = await res.json()
        setCategories(data || [])
      } catch (err) {
        console.error("Error fetching categories:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter data by type
  const itemCategories = categories.filter((c) => c.type === "Category")
  const itemSubCategories = categories.filter((c) => c.type === "SubCategory")
  const itemSubSubCategories = categories.filter((c) => c.type === "SubSubCategory")
  const itemSubSubSubCategories = categories.filter((c) => c.type === "SubSubSubCategory")

  return (
    <>
      <style jsx>{`
        /* same CSS as your version (omitted here for brevity) */
      `}</style>

      <div className="category-master-container">
        {/* Header Section */}
        <div className="header-section">
          <div className="header-left">
            <div className="breadcrumb">
              <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
              <span className="breadcrumb-separator">&gt;</span>
              <span className="breadcrumb-current">Category Masters</span>
            </div>
            <h1 className="page-title">Category Masters</h1>
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

        {loading ? (
          <p>Loading categories...</p>
        ) : (
          <>
            {/* Categories Grid - Top Row */}
            <div className="categories-grid">
              {/* Item Category */}
              <div className="category-section">
                <div className="category-header">
                  <h2 className="category-title">Item Category</h2>
                </div>
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Category Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemCategories.map((category, index) => (
                      <tr key={category.code || index}>
                        <td className="category-code">{category.code}</td>
                        <td className="category-name">{category.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Item Sub Category */}
              <div className="category-section">
                <div className="category-header">
                  <h2 className="category-title">Item Sub Category</h2>
                </div>
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Category Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemSubCategories.map((category, index) => (
                      <tr key={category.code || index}>
                        <td className="category-code">{category.code}</td>
                        <td className="category-name">{category.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           
              {/* Item Sub Sub Category */}
              <div className="category-section">
                <div className="category-header">
                  <h2 className="category-title">Item Sub Sub Category</h2>
                </div>
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Category Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemSubSubCategories.map((category, index) => (
                      <tr key={category.code || index}>
                        <td className="category-code">{category.code}</td>
                        <td className="category-name">{category.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Item Sub Sub Sub Category */}
              <div className="category-section">
                <div className="category-header">
                  <h2 className="category-title">Item Sub Sub Sub Category</h2>
                </div>
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Category Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemSubSubSubCategories.map((category, index) => (
                      <tr key={category.code || index}>
                        <td className="category-code">{category.code}</td>
                        <td className="category-name">{category.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

       
      </div>

      <style jsx>{`.category-master-container {
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
	background-color: #343a40;
	color: white;
}
.create-btn:hover {
	background-color: #23272b;
}
.close-btn {
	background-color: #343a40;
	color: white;
}
.close-btn:hover {
	background-color: #23272b;
}
.categories-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr 1fr;
	gap: 30px;
	margin-bottom: 30px;
}
.category-section {
	background: white;
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
  border:1px solid #dee2e6;
}
.category-table th {
	background-color: #334B71;
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
	.category-master-container {
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
	.category-table th, .category-table td {
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
}` }</style>
    </>
  )
}

export default ItemCategoryMaster
