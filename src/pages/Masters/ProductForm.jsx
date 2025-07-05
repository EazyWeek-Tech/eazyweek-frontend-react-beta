"use client"

import { useState } from "react"

const ProductForm = ({ product = null, onBack, mode = "create" }) => {
  const [activeTab, setActiveTab] = useState("General")
  const [formData, setFormData] = useState({
    productCode: product?.code || "",
    productName: product?.name || "",
    arabicProductName: product?.arabicName || "",
    productDescription: product?.description || "",
    isProductAsset: product?.isAsset || false,
    productCategory: product?.category || "",
    productSubCategory: product?.subcategory || "",
    productSubSubCategory: product?.subSubcategory || "",
    retailProduct: product?.isRetail || "No",
    consumableProduct: product?.isConsumable || "No",
    retailMRP: product?.mrp || "",
    retailUOM: product?.uom || "",
    productStatus: product?.status || "Active",
    // Price and UOM tab data
    retailUOMPricing: product?.retailUOMPricing || "",
    pricingData: product?.pricingData || [
      {
        centerCode: "Bright",
        centerName: "Bright Clinics",
        price: "0",
        taxIncluded: "",
        taxPercent: "0",
        storeRelease: false,
      },
      {
        centerCode: "LNS",
        centerName: "Lines Clinics",
        price: "0",
        taxIncluded: "",
        taxPercent: "0",
        storeRelease: false,
      },
      {
        centerCode: "MXM",
        centerName: "Maxime Clinics",
        price: "0",
        taxIncluded: "",
        taxPercent: "0",
        storeRelease: false,
      },
      {
        centerCode: "INFENI",
        centerName: "Infeni Clinic",
        price: "0",
        taxIncluded: "",
        taxPercent: "0",
        storeRelease: false,
      },
      {
        centerCode: "Silk",
        centerName: "Silk Clinic",
        price: "0",
        taxIncluded: "",
        taxPercent: "0",
        storeRelease: false,
      },
    ],
    procurementData: product?.procurementData || {
      inventoryUOM: "",
      purchaseUOM: "",
      conversionOfUOM: "",
      purchaseUnitToPurchaseUOM: "",
      inventoryUnitToPurchaseUOM: "",
      inventoryUnitToRetailUOM: "",
      retailUnitToRetailUOM: "",
      purchaseCategory: "",
      purchaseSubCategory: "",
      purchaseSubSubCategory: "",
      primaryVendor: "",
      vendorItemCode: "",
    },
    variantsData: product?.variantsData || {
      size: "",
      color: "",
      configuration: "",
      additionalVariant: "",
    },
    miscellaneousData: product?.miscellaneousData || {
      field1: "",
      field2: "",
      field3: "",
      field4: "",
      field5: "",
      field6: "",
    },
  })

  const tabs = ["General", "Price and UOM", "Procurement", "Variants", "Miscellaneous"]

  const categoryOptions = [
    { value: "", label: "Select Category" },
    { value: "skincare", label: "Skincare" },
    { value: "cosmetics", label: "Cosmetics" },
    { value: "treatments", label: "Treatments" },
    { value: "equipment", label: "Equipment" },
  ]

  const subCategoryOptions = [
    { value: "", label: "- Select one -" },
    { value: "creams", label: "Creams" },
    { value: "serums", label: "Serums" },
    { value: "cleansers", label: "Cleansers" },
    { value: "masks", label: "Masks" },
  ]

  const uomOptions = [
    { value: "", label: "- Select one -" },
    { value: "ml", label: "ML" },
    { value: "gm", label: "GM" },
    { value: "pcs", label: "PCS" },
    { value: "bottle", label: "Bottle" },
  ]

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleToggleChange = (name) => {
    setFormData((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }

  const handlePricingChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      pricingData: prev.pricingData.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const handlePricingCheckboxChange = (index, field) => {
    setFormData((prev) => ({
      ...prev,
      pricingData: prev.pricingData.map((item, i) => (i === index ? { ...item, [field]: !item[field] } : item)),
    }))
  }

  const handleProcurementChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      procurementData: {
        ...prev.procurementData,
        [field]: value,
      },
    }))
  }

  const handleVariantsChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      variantsData: {
        ...prev.variantsData,
        [field]: value,
      },
    }))
  }

  const handleMiscellaneousChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      miscellaneousData: {
        ...prev.miscellaneousData,
        [field]: value,
      },
    }))
  }

  const handleNext = () => {
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1])
    }
  }

  const handleFinish = () => {
    console.log("Saving product data:", formData)

    if (mode === "create") {
      // In a real application, you would call an API to create the product
      alert("Product created successfully!")
    } else {
      // In a real application, you would call an API to update the product
      alert(`Product ${formData.productCode} updated successfully!`)
    }

    if (onBack) onBack()
  }

  const handleBackToSearch = () => {
    if (onBack) onBack()
  }

  return (
    <>
      <style jsx>{`
        .product-form-container {
          display: flex;
          min-height: 100vh;
          background-color: #f8f9fa;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
        }

        .sidebar {
          width: 60px;
          background-color: #2c3e50;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
        }

        .logo {
          width: 30px;
          height: 30px;
          background-color: #3498db;
          border-radius: 50%;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        }

        .nav-icon {
          width: 24px;
          height: 24px;
          margin: 15px 0;
          color: #bdc3c7;
          cursor: pointer;
        }

        .nav-icon:hover {
          color: white;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .top-header {
          background-color: white;
          padding: 15px 30px;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .clinic-name {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .clinic-selector {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          background-color: white;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #334B71;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }

        .user-email {
          font-size: 12px;
          color: #6c757d;
        }

        .content-area {
          flex: 1;
          padding: 30px;
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
          color: #333;
          margin: 0;
        }

        .back-to-search-btn {
          padding: 10px 20px;
          background-color: #343a40;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .back-to-search-btn:hover {
          background-color: #23272b;
        }

        .breadcrumb {
          margin-bottom: 30px;
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

        .form-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .tabs-container {
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          padding: 0;
        }

        .tabs {
          display: flex;
          margin: 0;
          padding: 0;
        }

        .tab {
          padding: 15px 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #6c757d;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .tab:hover {
          background-color: #e9ecef;
          color: #495057;
        }

        .tab.active {
          color: #334B71;
          border-bottom-color: #334B71;
          background-color: white;
        }

        .form-content {
          padding: 40px;
        }

        .form-row {
          display: flex;
          margin-bottom: 25px;
          align-items: flex-start;
        }

        .form-label {
          font-weight: 500;
          color: #495057;
          font-size: 14px;
          min-width: 200px;
          padding-top: 10px;
          text-align: left;
        }

        .form-input-container {
          flex: 1;
          max-width: 400px;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          background-color: white;
        }

        .form-input:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          min-height: 100px;
          resize: vertical;
          font-family: inherit;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
        }

        .form-select:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toggle-switch {
          position: relative;
          width: 50px;
          height: 24px;
          background-color: #ced4da;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .toggle-switch.active {
          background-color: #334B71;
        }

        .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(26px);
        }

        .toggle-label {
          font-size: 14px;
          color: #495057;
        }

        .radio-group {
          display: flex;
          gap: 20px;
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .radio-input {
          width: 16px;
          height: 16px;
          accent-color: #334B71;
        }

        .radio-label {
          font-size: 14px;
          color: #495057;
        }

        .status-container {
          position: absolute;
          top: 80px;
          right: 40px;
        }

        .status-label {
          font-weight: 500;
          color: #495057;
          font-size: 14px;
          margin-bottom: 8px;
          display: block;
        }

        .status-input {
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          min-width: 150px;
        }

        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
        }

        .btn {
          padding: 12px 30px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 100px;
        }

        .btn-primary {
          background-color: #343a40;
          color: white;
        }

        .btn-primary:hover {
          background-color: #23272b;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background-color: #343a40;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #23272b;
          transform: translateY(-1px);
        }

        .pricing-section {
          margin-top: 30px;
        }

        .pricing-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
        }

        .pricing-table-container {
          overflow-x: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
        }

        .pricing-table {
          width: 100%;
          border-collapse: collapse;
          background-color: white;
        }

        .pricing-table th {
          background-color: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          border-bottom: 1px solid #dee2e6;
          font-size: 14px;
        }

        .pricing-table td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
          vertical-align: middle;
        }

        .pricing-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .center-code {
          font-weight: 500;
          color: #495057;
          text-align: center;
        }

        .center-name {
          color: #495057;
        }

        .pricing-input {
          width: 80px;
          padding: 6px 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          text-align: center;
        }

        .pricing-input:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
        }

        .pricing-select {
          width: 100px;
          padding: 6px 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
        }

        .pricing-select:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
        }

        .pricing-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #334B71;
          cursor: pointer;
        }

        .dual-select-container {
          display: flex;
          gap: 20px;
        }

        .dual-select-group {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .dual-select-label {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 5px;
          text-align: center;
        }

        .dual-select {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
        }

        .dual-select:focus {
          outline: none;
          border-color: #334B71;
          box-shadow: 0 0 0 2px rgba(51, 75, 113, 0.1);
        }

        .misc-fields-container {
          display: flex;
          gap: 40px;
          margin-top: 20px;
        }

        .misc-column {
          flex: 1;
        }

        .misc-column .form-row {
          margin-bottom: 30px;
        }

        .misc-column .form-label {
          min-width: 80px;
          font-size: 14px;
        }

        .misc-column .form-input-container {
          max-width: none;
        }

        @media (max-width: 768px) {
          .product-form-container {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            height: 60px;
            flex-direction: row;
            justify-content: center;
            padding: 10px 0;
          }

          .content-area {
            padding: 20px;
          }

          .form-content {
            padding: 20px;
          }

          .form-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .form-label {
            min-width: auto;
            margin-bottom: 8px;
            padding-top: 0;
          }

          .form-input-container {
            max-width: none;
          }

          .status-container {
            position: static;
            margin-top: 20px;
          }

          .tabs {
            flex-wrap: wrap;
          }

          .tab {
            flex: 1;
            min-width: 120px;
          }

          .pricing-table-container {
            font-size: 12px;
          }
          
          .pricing-input {
            width: 60px;
          }
          
          .pricing-select {
            width: 80px;
          }

          .dual-select-container {
            flex-direction: column;
            gap: 15px;
          }

          .misc-fields-container {
            flex-direction: column;
            gap: 20px;
          }

          .misc-column .form-row {
            margin-bottom: 20px;
          }
        }
      `}</style>

      <div className="product-form-container">
        {/* Main Content */}
        <div className="main-content">
          {/* Content Area */}
          <div className="content-area">
            {/* Page Header */}
            <div className="page-header">
              <h1 className="page-title">{mode === "create" ? "Create Product" : "Edit Product"}</h1>
              <button className="back-to-search-btn" onClick={handleBackToSearch}>
                Back To Search
              </button>
            </div>

            {/* Breadcrumb */}
            <div className="breadcrumb">
                <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
              <span className="breadcrumb-separator">&gt;</span>
              <span className="breadcrumb-link">Manage products</span>
              <span className="breadcrumb-separator">&gt;</span>
              <span className="breadcrumb-current">
                {mode === "create" ? "Create New Product" : `Edit Product - ${formData.productCode}`}
              </span>
            </div>

            {/* Form Container */}
            <div className="form-container">
              {/* Tabs */}
              <div className="tabs-container">
                <div className="tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      className={`tab ${activeTab === tab ? "active" : ""}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Content */}
              <div className="form-content">
                {/* Product Status - positioned absolutely */}
                <div className="status-container">
                  <label className="status-label">Product Status :</label>
                  <input
                    type="text"
                    name="productStatus"
                    value={formData.productStatus}
                    onChange={handleInputChange}
                    className="status-input"
                    readOnly
                  />
                </div>

                {activeTab === "General" && (
                  <>
                    <div className="form-row">
                      <label className="form-label">Product Code</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          name="productCode"
                          value={formData.productCode}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter product code"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Product Name</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          name="productName"
                          value={formData.productName}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter product name"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Arabic Product Name</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          name="arabicProductName"
                          value={formData.arabicProductName}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter Arabic product name"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Product Description</label>
                      <div className="form-input-container">
                        <textarea
                          name="productDescription"
                          value={formData.productDescription}
                          onChange={handleInputChange}
                          className="form-textarea"
                          placeholder="Enter product description"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Is Product an Asset</label>
                      <div className="form-input-container">
                        <div className="toggle-container">
                          <div
                            className={`toggle-switch ${formData.isProductAsset ? "active" : ""}`}
                            onClick={() => handleToggleChange("isProductAsset")}
                          >
                            <div className="toggle-slider"></div>
                          </div>
                          <span className="toggle-label">{formData.isProductAsset ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Product Category</label>
                      <div className="form-input-container">
                        <select
                          name="productCategory"
                          value={formData.productCategory}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          {categoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Product Sub Category</label>
                      <div className="form-input-container">
                        <select
                          name="productSubCategory"
                          value={formData.productSubCategory}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          {subCategoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Product Sub Sub Category</label>
                      <div className="form-input-container">
                        <select
                          name="productSubSubCategory"
                          value={formData.productSubSubCategory}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          {subCategoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Retail Product</label>
                      <div className="form-input-container">
                        <div className="radio-group">
                          <div className="radio-option">
                            <input
                              type="radio"
                              id="retailYes"
                              name="retailProduct"
                              value="Yes"
                              checked={formData.retailProduct === "Yes"}
                              onChange={handleInputChange}
                              className="radio-input"
                            />
                            <label htmlFor="retailYes" className="radio-label">
                              Yes
                            </label>
                          </div>
                          <div className="radio-option">
                            <input
                              type="radio"
                              id="retailNo"
                              name="retailProduct"
                              value="No"
                              checked={formData.retailProduct === "No"}
                              onChange={handleInputChange}
                              className="radio-input"
                            />
                            <label htmlFor="retailNo" className="radio-label">
                              No
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Consumable Product</label>
                      <div className="form-input-container">
                        <div className="radio-group">
                          <div className="radio-option">
                            <input
                              type="radio"
                              id="consumableYes"
                              name="consumableProduct"
                              value="Yes"
                              checked={formData.consumableProduct === "Yes"}
                              onChange={handleInputChange}
                              className="radio-input"
                            />
                            <label htmlFor="consumableYes" className="radio-label">
                              Yes
                            </label>
                          </div>
                          <div className="radio-option">
                            <input
                              type="radio"
                              id="consumableNo"
                              name="consumableProduct"
                              value="No"
                              checked={formData.consumableProduct === "No"}
                              onChange={handleInputChange}
                              className="radio-input"
                            />
                            <label htmlFor="consumableNo" className="radio-label">
                              No
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Retail MRP</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          name="retailMRP"
                          value={formData.retailMRP}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter retail MRP"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Retail UOM</label>
                      <div className="form-input-container">
                        <select
                          name="retailUOM"
                          value={formData.retailUOM}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          {uomOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "Price and UOM" && (
                  <>
                    <div className="form-row">
                      <label className="form-label">Retail UOM :</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          name="retailUOMPricing"
                          value={formData.retailUOMPricing}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter retail UOM"
                        />
                      </div>
                    </div>

                    <div className="pricing-section">
                      <h3 className="pricing-title">Pricing:</h3>
                      <div className="pricing-table-container">
                        <table className="pricing-table">
                          <thead>
                            <tr>
                              <th>Center Code</th>
                              <th>Center Name</th>
                              <th>Price</th>
                              <th>Tax Included</th>
                              <th>Tax Percent</th>
                              <th>Store Release</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.pricingData.map((pricing, index) => (
                              <tr key={index}>
                                <td className="center-code">{pricing.centerCode}</td>
                                <td className="center-name">{pricing.centerName}</td>
                                <td>
                                  <input
                                    type="number"
                                    value={pricing.price}
                                    onChange={(e) => handlePricingChange(index, "price", e.target.value)}
                                    className="pricing-input"
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td>
                                  <select
                                    value={pricing.taxIncluded}
                                    onChange={(e) => handlePricingChange(index, "taxIncluded", e.target.value)}
                                    className="pricing-select"
                                  >
                                    <option value="">Select</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={pricing.taxPercent}
                                    onChange={(e) => handlePricingChange(index, "taxPercent", e.target.value)}
                                    className="pricing-input"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={pricing.storeRelease}
                                    onChange={() => handlePricingCheckboxChange(index, "storeRelease")}
                                    className="pricing-checkbox"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "Procurement" && (
                  <>
                    <div className="form-row">
                      <label className="form-label">Inventory UOM :</label>
                      <div className="form-input-container">
                        <select
                          value={formData.procurementData.inventoryUOM}
                          onChange={(e) => handleProcurementChange("inventoryUOM", e.target.value)}
                          className="form-select"
                        >
                          <option value="">{"< - Select one - >"}</option>
                          <option value="ml">ML</option>
                          <option value="gm">GM</option>
                          <option value="pcs">PCS</option>
                          <option value="bottle">Bottle</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Purchase UOM :</label>
                      <div className="form-input-container">
                        <select
                          value={formData.procurementData.purchaseUOM}
                          onChange={(e) => handleProcurementChange("purchaseUOM", e.target.value)}
                          className="form-select"
                        >
                          <option value="">{"< - Select one - >"}</option>
                          <option value="ml">ML</option>
                          <option value="gm">GM</option>
                          <option value="pcs">PCS</option>
                          <option value="bottle">Bottle</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Conversion of UOM :</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          value={formData.procurementData.conversionOfUOM}
                          onChange={(e) => handleProcurementChange("conversionOfUOM", e.target.value)}
                          className="form-input"
                          placeholder="Enter conversion factor"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Purchase UOM to Inventory UOM :</label>
                      <div className="form-input-container">
                        <div className="dual-select-container">
                          <div className="dual-select-group">
                            <label className="dual-select-label">Purchase Unit</label>
                            <select
                              value={formData.procurementData.purchaseUnitToPurchaseUOM}
                              onChange={(e) => handleProcurementChange("purchaseUnitToPurchaseUOM", e.target.value)}
                              className="dual-select"
                            >
                              <option value="">{"< - Select one - >"}</option>
                              <option value="ml">ML</option>
                              <option value="gm">GM</option>
                              <option value="pcs">PCS</option>
                              <option value="bottle">Bottle</option>
                            </select>
                          </div>
                          <div className="dual-select-group">
                            <label className="dual-select-label">Inventory Unit</label>
                            <select
                              value={formData.procurementData.inventoryUnitToPurchaseUOM}
                              onChange={(e) => handleProcurementChange("inventoryUnitToPurchaseUOM", e.target.value)}
                              className="dual-select"
                            >
                              <option value="">{"< - Select one - >"}</option>
                              <option value="ml">ML</option>
                              <option value="gm">GM</option>
                              <option value="pcs">PCS</option>
                              <option value="bottle">Bottle</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Inventory UOM to Retail UOM :</label>
                      <div className="form-input-container">
                        <div className="dual-select-container">
                          <div className="dual-select-group">
                            <label className="dual-select-label">Inventory Unit</label>
                            <select
                              value={formData.procurementData.inventoryUnitToRetailUOM}
                              onChange={(e) => handleProcurementChange("inventoryUnitToRetailUOM", e.target.value)}
                              className="dual-select"
                            >
                              <option value="">{"< - Select one - >"}</option>
                              <option value="ml">ML</option>
                              <option value="gm">GM</option>
                              <option value="pcs">PCS</option>
                              <option value="bottle">Bottle</option>
                            </select>
                          </div>
                          <div className="dual-select-group">
                            <label className="dual-select-label">Retail Unit</label>
                            <select
                              value={formData.procurementData.retailUnitToRetailUOM}
                              onChange={(e) => handleProcurementChange("retailUnitToRetailUOM", e.target.value)}
                              className="dual-select"
                            >
                              <option value="">{"< - Select one - >"}</option>
                              <option value="ml">ML</option>
                              <option value="gm">GM</option>
                              <option value="pcs">PCS</option>
                              <option value="bottle">Bottle</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Purchase Category :</label>
                      <div className="form-input-container">
                        <select
                          value={formData.procurementData.purchaseCategory}
                          onChange={(e) => handleProcurementChange("purchaseCategory", e.target.value)}
                          className="form-select"
                        >
                          <option value="">Select Category</option>
                          <option value="skincare">Skincare</option>
                          <option value="cosmetics">Cosmetics</option>
                          <option value="treatments">Treatments</option>
                          <option value="equipment">Equipment</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Purchase Sub Category :</label>
                      <div className="form-input-container">
                        <select
                          value={formData.procurementData.purchaseSubCategory}
                          onChange={(e) => handleProcurementChange("purchaseSubCategory", e.target.value)}
                          className="form-select"
                        >
                          <option value="">{"< - Select one - >"}</option>
                          <option value="creams">Creams</option>
                          <option value="serums">Serums</option>
                          <option value="cleansers">Cleansers</option>
                          <option value="masks">Masks</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Purchase Sub Sub Category :</label>
                      <div className="form-input-container">
                        <select
                          value={formData.procurementData.purchaseSubSubCategory}
                          onChange={(e) => handleProcurementChange("purchaseSubSubCategory", e.target.value)}
                          className="form-select"
                        >
                          <option value="">{"< - Select one - >"}</option>
                          <option value="anti-aging">Anti-aging</option>
                          <option value="moisturizing">Moisturizing</option>
                          <option value="whitening">Whitening</option>
                          <option value="acne-control">Acne Control</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Primary Vendor :</label>
                      <div className="form-input-container">
                        <select
                          value={formData.procurementData.primaryVendor}
                          onChange={(e) => handleProcurementChange("primaryVendor", e.target.value)}
                          className="form-select"
                        >
                          <option value="">{"< - Select one - >"}</option>
                          <option value="vendor1">Vendor 1</option>
                          <option value="vendor2">Vendor 2</option>
                          <option value="vendor3">Vendor 3</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Vendor Item Code :</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          value={formData.procurementData.vendorItemCode}
                          onChange={(e) => handleProcurementChange("vendorItemCode", e.target.value)}
                          className="form-input"
                          placeholder="Enter vendor item code"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "Variants" && (
                  <>
                    <div className="form-row">
                      <label className="form-label">Size :</label>
                      <div className="form-input-container">
                        <select
                          value={formData.variantsData.size}
                          onChange={(e) => handleVariantsChange("size", e.target.value)}
                          className="form-select"
                        >
                          <option value="">{"< - Select one - >"}</option>
                          <option value="xs">XS</option>
                          <option value="s">S</option>
                          <option value="m">M</option>
                          <option value="l">L</option>
                          <option value="xl">XL</option>
                          <option value="xxl">XXL</option>
                          <option value="10ml">10ml</option>
                          <option value="30ml">30ml</option>
                          <option value="50ml">50ml</option>
                          <option value="100ml">100ml</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Color :</label>
                      <div className="form-input-container">
                        <select
                          value={formData.variantsData.color}
                          onChange={(e) => handleVariantsChange("color", e.target.value)}
                          className="form-select"
                        >
                          <option value="">{"< - Select one - >"}</option>
                          <option value="white">White</option>
                          <option value="black">Black</option>
                          <option value="red">Red</option>
                          <option value="blue">Blue</option>
                          <option value="green">Green</option>
                          <option value="yellow">Yellow</option>
                          <option value="pink">Pink</option>
                          <option value="purple">Purple</option>
                          <option value="clear">Clear</option>
                          <option value="natural">Natural</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Configuration :</label>
                      <div className="form-input-container">
                        <textarea
                          value={formData.variantsData.configuration}
                          onChange={(e) => handleVariantsChange("configuration", e.target.value)}
                          className="form-textarea"
                          placeholder="Enter product configuration details"
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Additional Variant :</label>
                      <div className="form-input-container">
                        <textarea
                          value={formData.variantsData.additionalVariant}
                          onChange={(e) => handleVariantsChange("additionalVariant", e.target.value)}
                          className="form-textarea"
                          placeholder="Enter additional variant information"
                          rows={4}
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "Miscellaneous" && (
                  <>
                    <div className="misc-fields-container">
                      <div className="misc-column">
                        <div className="form-row">
                          <label className="form-label">Field 1 :</label>
                          <div className="form-input-container">
                            <input
                              type="text"
                              value={formData.miscellaneousData.field1}
                              onChange={(e) => handleMiscellaneousChange("field1", e.target.value)}
                              className="form-input"
                              placeholder="Enter field 1 value"
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <label className="form-label">Field 2 :</label>
                          <div className="form-input-container">
                            <input
                              type="text"
                              value={formData.miscellaneousData.field2}
                              onChange={(e) => handleMiscellaneousChange("field2", e.target.value)}
                              className="form-input"
                              placeholder="Enter field 2 value"
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <label className="form-label">Field 3 :</label>
                          <div className="form-input-container">
                            <input
                              type="text"
                              value={formData.miscellaneousData.field3}
                              onChange={(e) => handleMiscellaneousChange("field3", e.target.value)}
                              className="form-input"
                              placeholder="Enter field 3 value"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="misc-column">
                        <div className="form-row">
                          <label className="form-label">Field 4 :</label>
                          <div className="form-input-container">
                            <input
                              type="text"
                              value={formData.miscellaneousData.field4}
                              onChange={(e) => handleMiscellaneousChange("field4", e.target.value)}
                              className="form-input"
                              placeholder="Enter field 4 value"
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <label className="form-label">Field 5 :</label>
                          <div className="form-input-container">
                            <input
                              type="text"
                              value={formData.miscellaneousData.field5}
                              onChange={(e) => handleMiscellaneousChange("field5", e.target.value)}
                              className="form-input"
                              placeholder="Enter field 5 value"
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <label className="form-label">Field 6 :</label>
                          <div className="form-input-container">
                            <input
                              type="text"
                              value={formData.miscellaneousData.field6}
                              onChange={(e) => handleMiscellaneousChange("field6", e.target.value)}
                              className="form-input"
                              placeholder="Enter field 6 value"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab !== "General" &&
                  activeTab !== "Price and UOM" &&
                  activeTab !== "Procurement" &&
                  activeTab !== "Variants" &&
                  activeTab !== "Miscellaneous" && (
                    <div style={{ padding: "40px", textAlign: "center", color: "#6c757d" }}>
                      <h3>{activeTab} tab content will be implemented here</h3>
                      <p>This section contains fields specific to {activeTab.toLowerCase()}.</p>
                    </div>
                  )}

                {/* Action Buttons */}
                <div className="action-buttons">
                  {activeTab !== "General" && (
                    <button className="btn btn-secondary" onClick={handleBack}>
                      Back
                    </button>
                  )}
                  {activeTab !== "Miscellaneous" && (
                    <button className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={handleFinish}>
                    Finish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ProductForm
