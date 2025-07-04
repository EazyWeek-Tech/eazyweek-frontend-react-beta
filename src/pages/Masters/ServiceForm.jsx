"use client"

import { useState } from "react"

const ServiceForm = ({ service = null, onBack, mode = "create" }) => {
  const [activeTab, setActiveTab] = useState("General")
  const [formData, setFormData] = useState({
    serviceCode: service?.code || "",
    serviceName: service?.name || "",
    arabicServiceName: service?.arabicName || "",
    serviceDescription: service?.description || "",
    serviceCategory: service?.category || "",
    serviceSubCategory: service?.subcategory || "",
    serviceSubSubCategory: service?.subSubcategory || "",
    serviceTime: service?.time || "",
    allowIdealBOMConsumption: service?.allowIdealBOM || "No",
    allowBOMConsumptionWithIntervention: service?.allowBOMIntervention || "No",
    allowLoyaltyAccrual: service?.allowLoyaltyAccrual || "No",
    allowLoyaltyRedemption: service?.allowLoyaltyRedemption || "No",
    additionalField1: service?.additionalField1 || "",
    additionalField2: service?.additionalField2 || "",
    additionalField3: service?.additionalField3 || "",
    additionalField4: service?.additionalField4 || "",
    additionalField5: service?.additionalField5 || "",
    serviceStatus: service?.status || "Active",
    pricingData: service?.pricingData || [
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
        storeRelease: false,
        taxPercent: "0",
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
  })

  const [doctorMappings, setDoctorMappings] = useState(
    service?.doctorMappings || [
      {
        id: 1,
        doctorName: "Dr. Anastasia Goriacheva",
        clinicName: "Lines Clinics",
        selected: false,
      },
    ],
  )

  const [nurseMappings, setNurseMappings] = useState(
    service?.nurseMappings || [
      {
        id: 1,
        nurseName: "Dr. Mona Mohamed Ahmed Mohamed Aly",
        clinicName: "Bright Clinics",
        selected: false,
      },
    ],
  )

  const [practitionerMapping, setPractitionerMapping] = useState({
    leftClinic: "",
    doctor: "",
    rightClinic: "",
    nurses: "",
  })

  const [formsData, setFormsData] = useState({
    stageForFormCompletion: service?.formsData?.stageForFormCompletion || "form-not-required",
    blockFromProceeding: service?.formsData?.blockFromProceeding || "Yes",
    form: service?.formsData?.form || "",
  })

  const [miscellaneousData, setMiscellaneousData] = useState({
    optionalField1: service?.miscellaneousData?.optionalField1 || "",
    optionalField2: service?.miscellaneousData?.optionalField2 || "",
    optionalField3: service?.miscellaneousData?.optionalField3 || "",
    optionalField4: service?.miscellaneousData?.optionalField4 || "",
    optionalField5: service?.miscellaneousData?.optionalField5 || "",
  })

  const [searchConsumables, setSearchConsumables] = useState("ar")
  const [selectedConsumable, setSelectedConsumable] = useState("")
  const [bomItems, setBomItems] = useState(
    service?.bomItems || [
      {
        id: 1,
        code: "MEP-HVAC-SFTL-003",
        name: "Sanitary Fittings",
        qty: "1.00",
        uom: "",
        selected: false,
      },
    ],
  )

  const tabs = ["General", "Pricing", "BOM", "Practitioner Mapping", "Forms", "Miscellaneous"]

  const categoryOptions = [
    { value: "", label: "Select Category" },
    { value: "hydra-facial", label: "Hydra facial" },
    { value: "antiageing-services", label: "Antiageing Services" },
    { value: "laser-hair-reduction", label: "Laser Hair reduction" },
    { value: "skin-concern-treatment", label: "Skin Concern Treatment" },
    { value: "hair-solution", label: "Hair Solution" },
    { value: "consultation", label: "Consultation" },
    { value: "cosmetic-gyneacology", label: "Cosmetic Gyneacology" },
  ]

  const subCategoryOptions = [
    { value: "", label: "< - Select one - >" },
    { value: "hydra-facial", label: "Hydra facial" },
    { value: "volume-filling", label: "Volume filling" },
    { value: "hair-reduction", label: "Hair Reduction" },
    { value: "rejuvenation", label: "Rejuvenation" },
    { value: "hair-loss-treatment", label: "Hair Loss Treatment" },
    { value: "hair-thickening", label: "Hair Thickening" },
    { value: "acne-scar-reduction", label: "Acne Scar Reduction" },
    { value: "consultation-specialist", label: "Consultation - Specialist" },
    { value: "peel", label: "Peel" },
  ]

  const timeOptions = [
    { value: "", label: "< - Select one - >" },
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "60 minutes" },
    { value: "90", label: "90 minutes" },
    { value: "120", label: "120 minutes" },
  ]

  const handleDoctorMappingSelection = (index) => {
    setDoctorMappings((prev) =>
      prev.map((mapping, i) => (i === index ? { ...mapping, selected: !mapping.selected } : mapping)),
    )
  }

  const handleNurseMappingSelection = (index) => {
    setNurseMappings((prev) =>
      prev.map((mapping, i) => (i === index ? { ...mapping, selected: !mapping.selected } : mapping)),
    )
  }

  const handleSearchConsumables = () => {
    console.log("Searching for:", searchConsumables)
    // Implement search functionality
  }

  const handleAddConsumable = () => {
    if (!selectedConsumable) {
      alert("Please select a consumable to add")
      return
    }

    // Add new consumable to BOM
    const newItem = {
      id: bomItems.length + 1,
      code: `CODE-${Date.now()}`,
      name: selectedConsumable.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      qty: "1.00",
      uom: "",
      selected: false,
    }

    setBomItems((prev) => [...prev, newItem])
    setSelectedConsumable("")
  }

  const handleBOMItemSelection = (index) => {
    setBomItems((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleRadioChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

  const handlePractitionerMappingChange = (field, value) => {
    setPractitionerMapping((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddDoctor = () => {
    if (!practitionerMapping.leftClinic || !practitionerMapping.doctor) {
      alert("Please select both clinic and doctor")
      return
    }

    const clinicNames = {
      "bright-clinics": "Bright Clinics",
      "lines-clinics": "Lines Clinics",
      "maxime-clinics": "Maxime Clinics",
      "infeni-clinic": "Infeni Clinic",
      "silk-clinic": "Silk Clinic",
    }

    const doctorNames = {
      "dr-anastasia-goriacheva": "Dr. Anastasia Goriacheva",
      "dr-hassnaa": "Dr. Hassnaa Abosena",
      "dr-reham": "Dr. Reham Eisa",
      "dr-mona": "Dr. Mona Elshelk",
      "dr-sally": "Dr. Sally Gamal",
      "dr-sahar": "Dr. Sahar Osman",
    }

    const newMapping = {
      id: doctorMappings.length + 1,
      doctorName: doctorNames[practitionerMapping.doctor],
      clinicName: clinicNames[practitionerMapping.leftClinic],
      selected: false,
    }

    setDoctorMappings((prev) => [...prev, newMapping])

    // Reset selections after adding
    setPractitionerMapping((prev) => ({
      ...prev,
      leftClinic: "",
      doctor: "",
    }))
  }

  const handleAddNurse = () => {
    if (!practitionerMapping.rightClinic || !practitionerMapping.nurses) {
      alert("Please select both clinic and nurse")
      return
    }

    const clinicNames = {
      "bright-clinics": "Bright Clinics",
      "lines-clinics": "Lines Clinics",
      "maxime-clinics": "Maxime Clinics",
      "infeni-clinic": "Infeni Clinic",
      "silk-clinic": "Silk Clinic",
    }

    const nurseNames = {
      "dr-mona-elshelk": "Dr. Mona Elshelk",
      "kris-tolentino": "Kris Tolentino",
      "merian-sorio": "Merian Sorio",
      "quenaver-acabo": "Quenaver Acabo",
      "danah-alqarni": "Danah Mohammed Alqarni",
      "reema-alqaseem": "Reema Ibrahim Alqaseem",
      "ahlam-alqarni": "Ahlam Ahmed Alqarni",
    }

    const newMapping = {
      id: nurseMappings.length + 1,
      nurseName: nurseNames[practitionerMapping.nurses],
      clinicName: clinicNames[practitionerMapping.rightClinic],
      selected: false,
    }

    setNurseMappings((prev) => [...prev, newMapping])

    // Reset selections after adding
    setPractitionerMapping((prev) => ({
      ...prev,
      rightClinic: "",
      nurses: "",
    }))
  }

  const handleFormsDataChange = (field, value) => {
    setFormsData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleMiscellaneousDataChange = (field, value) => {
    setMiscellaneousData((prev) => ({
      ...prev,
      [field]: value,
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
    console.log("Saving service data:", formData)
    console.log("Doctor mappings:", doctorMappings)
    console.log("Nurse mappings:", nurseMappings)
    console.log("Forms data:", formsData)
    console.log("Miscellaneous data:", miscellaneousData)

    if (mode === "create") {
      alert("Service created successfully!")
    } else {
      alert(`Service ${formData.serviceCode} updated successfully!`)
    }

    if (onBack) onBack()
  }

  const handleBackToSearch = () => {
    if (onBack) onBack()
  }

  return (
    <>
      <style jsx>{`
        .service-form-container {
          padding: 20px;
          background-color: #f8f9fa;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
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
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .status-container {
          padding: 15px 20px;
        }

        .status-label {
          font-weight: 500;
          color: #495057;
          font-size: 14px;
          margin-right: 10px;
        }

        .status-input {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background-color: white;
          min-width: 120px;
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
          cursor: pointer;
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

        @media (max-width: 768px) {
          .service-form-container {
            padding: 15px;
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

          .tabs {
            flex-wrap: wrap;
          }

          .tab {
            flex: 1;
            min-width: 120px;
          }

          .tabs-container {
            flex-direction: column;
            align-items: stretch;
          }

          .status-container {
            text-align: center;
            border-top: 1px solid #dee2e6;
          }

          .radio-group {
            flex-direction: column;
            gap: 10px;
          }
        }

        .pricing-section {
          margin-top: 0;
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

        .search-btn {
          padding: 10px 15px;
          background-color: #f8f9fa;
          border: 1px solid #ced4da;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.3s ease;
        }

        .search-btn:hover {
          background-color: #e9ecef;
        }

        .add-btn {
          padding: 10px 20px;
          background-color: #343a40;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }

        .add-btn:hover {
          background-color: #23272b;
        }

        .bom-section {
          margin-top: 40px;
        }

        .bom-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
          text-decoration: underline;
        }

        .bom-table-container {
          border: 1px solid #dee2e6;
          border-radius: 4px;
          overflow: hidden;
        }

        .bom-table {
          width: 100%;
          border-collapse: collapse;
          background-color: white;
        }

        .bom-table th {
          background-color: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          border-bottom: 1px solid #dee2e6;
          font-size: 14px;
        }

        .bom-table td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
          vertical-align: middle;
          font-size: 14px;
        }

        .bom-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .bom-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #334B71;
          cursor: pointer;
        }

        .consumable-code {
          color: #495057;
          font-family: monospace;
        }

        .consumable-name {
          color: #334B71;
          font-weight: 500;
        }

        .consumable-qty {
          color: #495057;
          text-align: center;
        }

        .consumable-uom {
          color: #495057;
          text-align: center;
        }

        .no-bom-items {
          padding: 40px;
          text-align: center;
          color: #6c757d;
          font-style: italic;
        }
      `}</style>

      <div className="service-form-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">{mode === "edit" ? "Edit Service" : "Create Service"}</h1>
          <button className="back-to-search-btn" onClick={handleBackToSearch}>
            Back To Search
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link">Service</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-link">Manage Service</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-current">
            {mode === "edit" ? `Edit Service - ${formData.serviceCode}` : "Create New Service"}
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
            <div className="status-container">
              <label className="status-label">Service Status :</label>
              <input
                type="text"
                name="serviceStatus"
                value={formData.serviceStatus}
                onChange={handleInputChange}
                className="status-input"
                readOnly={mode === "create"}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className="form-content">
            {activeTab === "General" && (
              <>
                <div className="form-row">
                  <label className="form-label">Service Code</label>
                  <div className="form-input-container">
                    <input
                      type="text"
                      name="serviceCode"
                      value={formData.serviceCode}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter service code"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Service Name</label>
                  <div className="form-input-container">
                    <input
                      type="text"
                      name="serviceName"
                      value={formData.serviceName}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter service name"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Arabic Service Name</label>
                  <div className="form-input-container">
                    <input
                      type="text"
                      name="arabicServiceName"
                      value={formData.arabicServiceName}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter Arabic service name"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Service Description</label>
                  <div className="form-input-container">
                    <textarea
                      name="serviceDescription"
                      value={formData.serviceDescription}
                      onChange={handleInputChange}
                      className="form-textarea"
                      placeholder="Enter service description"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Service Category</label>
                  <div className="form-input-container">
                    <select
                      name="serviceCategory"
                      value={formData.serviceCategory}
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
                  <label className="form-label">Service Sub Category</label>
                  <div className="form-input-container">
                    <select
                      name="serviceSubCategory"
                      value={formData.serviceSubCategory}
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
                  <label className="form-label">Service Sub Sub Category</label>
                  <div className="form-input-container">
                    <select
                      name="serviceSubSubCategory"
                      value={formData.serviceSubSubCategory}
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
                  <label className="form-label">Service Time(Mins)</label>
                  <div className="form-input-container">
                    <select
                      name="serviceTime"
                      value={formData.serviceTime}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      {timeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Allow Ideal BOM Consumption</label>
                  <div className="form-input-container">
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="idealBOMYes"
                          name="allowIdealBOMConsumption"
                          value="Yes"
                          checked={formData.allowIdealBOMConsumption === "Yes"}
                          onChange={(e) => handleRadioChange("allowIdealBOMConsumption", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="idealBOMYes" className="radio-label">
                          Yes
                        </label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="idealBOMNo"
                          name="allowIdealBOMConsumption"
                          value="No"
                          checked={formData.allowIdealBOMConsumption === "No"}
                          onChange={(e) => handleRadioChange("allowIdealBOMConsumption", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="idealBOMNo" className="radio-label">
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Allow BOM Consumption with intervention</label>
                  <div className="form-input-container">
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="bomInterventionYes"
                          name="allowBOMConsumptionWithIntervention"
                          value="Yes"
                          checked={formData.allowBOMConsumptionWithIntervention === "Yes"}
                          onChange={(e) => handleRadioChange("allowBOMConsumptionWithIntervention", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="bomInterventionYes" className="radio-label">
                          Yes
                        </label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="bomInterventionNo"
                          name="allowBOMConsumptionWithIntervention"
                          value="No"
                          checked={formData.allowBOMConsumptionWithIntervention === "No"}
                          onChange={(e) => handleRadioChange("allowBOMConsumptionWithIntervention", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="bomInterventionNo" className="radio-label">
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Allow Loyalty Accrual</label>
                  <div className="form-input-container">
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="loyaltyAccrualYes"
                          name="allowLoyaltyAccrual"
                          value="Yes"
                          checked={formData.allowLoyaltyAccrual === "Yes"}
                          onChange={(e) => handleRadioChange("allowLoyaltyAccrual", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="loyaltyAccrualYes" className="radio-label">
                          Yes
                        </label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="loyaltyAccrualNo"
                          name="allowLoyaltyAccrual"
                          value="No"
                          checked={formData.allowLoyaltyAccrual === "No"}
                          onChange={(e) => handleRadioChange("allowLoyaltyAccrual", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="loyaltyAccrualNo" className="radio-label">
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Allow Loyalty Redemption</label>
                  <div className="form-input-container">
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="loyaltyRedemptionYes"
                          name="allowLoyaltyRedemption"
                          value="Yes"
                          checked={formData.allowLoyaltyRedemption === "Yes"}
                          onChange={(e) => handleRadioChange("allowLoyaltyRedemption", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="loyaltyRedemptionYes" className="radio-label">
                          Yes
                        </label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="loyaltyRedemptionNo"
                          name="allowLoyaltyRedemption"
                          value="No"
                          checked={formData.allowLoyaltyRedemption === "No"}
                          onChange={(e) => handleRadioChange("allowLoyaltyRedemption", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="loyaltyRedemptionNo" className="radio-label">
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Additional Field 1</label>
                  <div className="form-input-container">
                    <input
                      type="text"
                      name="additionalField1"
                      value={formData.additionalField1}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter additional field 1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Additional Field 2</label>
                  <div className="form-input-container">
                    <input
                      type="text"
                      name="additionalField2"
                      value={formData.additionalField2}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter additional field 2"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Additional Field 3</label>
                  <div className="form-input-container">
                    <input
                      type="text"
                      name="additionalField3"
                      value={formData.additionalField3}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter additional field 3"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Additional Field 4</label>
                  <div className="form-input-container">
                    <input
                      type="text"
                      name="additionalField4"
                      value={formData.additionalField4}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter additional field 4"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Additional Field 5</label>
                  <div className="form-input-container">
                    <input
                      type="text"
                      name="additionalField5"
                      value={formData.additionalField5}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter additional field 5"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "Pricing" && (
              <>
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

            {activeTab === "BOM" && (
              <>
                {/* Search Consumables Section */}
                <div className="form-row">
                  <label className="form-label">Search Consumables:</label>
                  <div className="form-input-container">
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <input
                        type="text"
                        value={searchConsumables}
                        onChange={(e) => setSearchConsumables(e.target.value)}
                        className="form-input"
                        placeholder="Search consumables..."
                        style={{ flex: 1 }}
                      />
                      <button type="button" className="search-btn" onClick={handleSearchConsumables}>
                        🔍
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add Consumables Section */}
                <div className="form-row">
                  <label className="form-label">Consumables :</label>
                  <div className="form-input-container">
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <select
                        value={selectedConsumable}
                        onChange={(e) => setSelectedConsumable(e.target.value)}
                        className="form-select"
                        style={{ flex: 1 }}
                      >
                        <option value="">Select Consumable</option>
                        <option value="sanitary-fittings">Sanitary Fittings</option>
                        <option value="medical-supplies">Medical Supplies</option>
                        <option value="cleaning-materials">Cleaning Materials</option>
                      </select>
                      <button type="button" className="add-btn" onClick={handleAddConsumable}>
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* BOM Table Section */}
                <div className="bom-section">
                  <h3 className="bom-title">Ideal of BOM</h3>
                  <div className="bom-table-container">
                    <table className="bom-table">
                      <thead>
                        <tr>
                          <th style={{ width: "50px" }}></th>
                          <th>Consumable Code</th>
                          <th>Consumable Name</th>
                          <th>Qty</th>
                          <th>UOM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomItems.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleBOMItemSelection(index)}
                                className="bom-checkbox"
                              />
                            </td>
                            <td className="consumable-code">{item.code}</td>
                            <td className="consumable-name">{item.name}</td>
                            <td className="consumable-qty">{item.qty}</td>
                            <td className="consumable-uom">{item.uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {bomItems.length === 0 && (
                      <div className="no-bom-items">
                        <p>No consumables added to BOM yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "Practitioner Mapping" && (
              <>
                <div style={{ display: "flex", gap: "60px", justifyContent: "space-between" }}>
                  {/* Left Side - Doctor */}
                  <div style={{ flex: 1 }}>
                    <div className="form-row">
                      <label className="form-label">Clinic :</label>
                      <div className="form-input-container">
                        <select
                          value={practitionerMapping.leftClinic}
                          onChange={(e) => handlePractitionerMappingChange("leftClinic", e.target.value)}
                          className="form-select"
                        >
                          <option value="">Select one</option>
                          <option value="bright-clinics">Bright Clinics</option>
                          <option value="lines-clinics">Lines Clinics</option>
                          <option value="maxime-clinics">Maxime Clinics</option>
                          <option value="infeni-clinic">Infeni Clinic</option>
                          <option value="silk-clinic">Silk Clinic</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Doctor:</label>
                      <div className="form-input-container">
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <select
                            value={practitionerMapping.doctor}
                            onChange={(e) => handlePractitionerMappingChange("doctor", e.target.value)}
                            className="form-select"
                            style={{ flex: 1 }}
                          >
                            <option value="">{"< - Select one - >"}</option>
                            <option value="dr-anastasia-goriacheva">Dr. Anastasia Goriacheva</option>
                            <option value="dr-hassnaa">Dr. Hassnaa Abosena</option>
                            <option value="dr-reham">Dr. Reham Eisa</option>
                            <option value="dr-mona">Dr. Mona Elshelk</option>
                            <option value="dr-sally">Dr. Sally Gamal</option>
                            <option value="dr-sahar">Dr. Sahar Osman</option>
                          </select>
                          <button type="button" className="add-btn" onClick={handleAddDoctor}>
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Doctor Mappings Table */}
                    <div style={{ marginTop: "30px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #dee2e6" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8f9fa" }}>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                borderBottom: "1px solid #dee2e6",
                                width: "50px",
                              }}
                            ></th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                borderBottom: "1px solid #dee2e6",
                                fontWeight: "600",
                                color: "#495057",
                              }}
                            >
                              Doctor Name
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                borderBottom: "1px solid #dee2e6",
                                fontWeight: "600",
                                color: "#495057",
                              }}
                            >
                              Clinic Name
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {doctorMappings.map((mapping, index) => (
                            <tr key={index} style={{ borderBottom: "1px solid #dee2e6" }}>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={mapping.selected}
                                  onChange={() => handleDoctorMappingSelection(index)}
                                  style={{ width: "16px", height: "16px", accentColor: "#334B71", cursor: "pointer" }}
                                />
                              </td>
                              <td style={{ padding: "12px", color: "#495057" }}>{mapping.doctorName}</td>
                              <td style={{ padding: "12px", color: "#495057" }}>{mapping.clinicName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Side - Nurses */}
                  <div style={{ flex: 1 }}>
                    <div className="form-row">
                      <label className="form-label">Clinic :</label>
                      <div className="form-input-container">
                        <select
                          value={practitionerMapping.rightClinic}
                          onChange={(e) => handlePractitionerMappingChange("rightClinic", e.target.value)}
                          className="form-select"
                        >
                          <option value="">Select one</option>
                          <option value="bright-clinics">Bright Clinics</option>
                          <option value="lines-clinics">Lines Clinics</option>
                          <option value="maxime-clinics">Maxime Clinics</option>
                          <option value="infeni-clinic">Infeni Clinic</option>
                          <option value="silk-clinic">Silk Clinic</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Nurses:</label>
                      <div className="form-input-container">
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <select
                            value={practitionerMapping.nurses}
                            onChange={(e) => handlePractitionerMappingChange("nurses", e.target.value)}
                            className="form-select"
                            style={{ flex: 1 }}
                          >
                            <option value="">{"< - Select one - >"}</option>
                            <option value="dr-mona-elshelk">Dr. Mona Elshelk</option>
                            <option value="kris-tolentino">Kris Tolentino</option>
                            <option value="merian-sorio">Merian Sorio</option>
                            <option value="quenaver-acabo">Quenaver Acabo</option>
                            <option value="danah-alqarni">Danah Mohammed Alqarni</option>
                            <option value="reema-alqaseem">Reema Ibrahim Alqaseem</option>
                            <option value="ahlam-alqarni">Ahlam Ahmed Alqarni</option>
                          </select>
                          <button type="button" className="add-btn" onClick={handleAddNurse}>
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Nurse Mappings Table */}
                    <div style={{ marginTop: "30px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #dee2e6" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8f9fa" }}>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                borderBottom: "1px solid #dee2e6",
                                width: "50px",
                              }}
                            ></th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                borderBottom: "1px solid #dee2e6",
                                fontWeight: "600",
                                color: "#495057",
                              }}
                            >
                              Nurse Name
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                borderBottom: "1px solid #dee2e6",
                                fontWeight: "600",
                                color: "#495057",
                              }}
                            >
                              Clinic Name
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {nurseMappings.map((mapping, index) => (
                            <tr key={index} style={{ borderBottom: "1px solid #dee2e6" }}>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={mapping.selected}
                                  onChange={() => handleNurseMappingSelection(index)}
                                  style={{ width: "16px", height: "16px", accentColor: "#334B71", cursor: "pointer" }}
                                />
                              </td>
                              <td style={{ padding: "12px", color: "#495057" }}>{mapping.nurseName}</td>
                              <td style={{ padding: "12px", color: "#495057" }}>{mapping.clinicName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "Forms" && (
              <>
                <div className="form-row">
                  <label className="form-label">Stage for form completion :</label>
                  <div className="form-input-container">
                    <select
                      value={formsData.stageForFormCompletion}
                      onChange={(e) => handleFormsDataChange("stageForFormCompletion", e.target.value)}
                      className="form-select"
                    >
                      <option value="form-not-required">Form not required</option>
                      <option value="before-service">Before Service</option>
                      <option value="during-service">During Service</option>
                      <option value="after-service">After Service</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Block from proceeding list if form not filled :</label>
                  <div className="form-input-container">
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="blockYes"
                          name="blockFromProceeding"
                          value="Yes"
                          checked={formsData.blockFromProceeding === "Yes"}
                          onChange={(e) => handleFormsDataChange("blockFromProceeding", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="blockYes" className="radio-label">
                          Yes
                        </label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="blockNo"
                          name="blockFromProceeding"
                          value="No"
                          checked={formsData.blockFromProceeding === "No"}
                          onChange={(e) => handleFormsDataChange("blockFromProceeding", e.target.value)}
                          className="radio-input"
                        />
                        <label htmlFor="blockNo" className="radio-label">
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Form :</label>
                  <div className="form-input-container">
                    <select
                      value={formsData.form}
                      onChange={(e) => handleFormsDataChange("form", e.target.value)}
                      className="form-select"
                    >
                      <option value="">Select Form</option>
                      <option value="consent-form">Consent Form</option>
                      <option value="medical-history">Medical History Form</option>
                      <option value="treatment-plan">Treatment Plan Form</option>
                      <option value="post-treatment">Post Treatment Form</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {activeTab === "Miscellaneous" && (
              <>
                <div style={{ display: "flex", gap: "60px" }}>
                  {/* Left Column */}
                  <div style={{ flex: 1 }}>
                    <div className="form-row">
                      <label className="form-label">Optional Field 1 :</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          value={miscellaneousData.optionalField1}
                          onChange={(e) => handleMiscellaneousDataChange("optionalField1", e.target.value)}
                          className="form-input"
                          placeholder="Enter optional field 1"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Optional Field 2 :</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          value={miscellaneousData.optionalField2}
                          onChange={(e) => handleMiscellaneousDataChange("optionalField2", e.target.value)}
                          className="form-input"
                          placeholder="Enter optional field 2"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Optional Field 3 :</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          value={miscellaneousData.optionalField3}
                          onChange={(e) => handleMiscellaneousDataChange("optionalField3", e.target.value)}
                          className="form-input"
                          placeholder="Enter optional field 3"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={{ flex: 1 }}>
                    <div className="form-row">
                      <label className="form-label">Optional Field 4 :</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          value={miscellaneousData.optionalField4}
                          onChange={(e) => handleMiscellaneousDataChange("optionalField4", e.target.value)}
                          className="form-input"
                          placeholder="Enter optional field 4"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="form-label">Optional Field 5 :</label>
                      <div className="form-input-container">
                        <input
                          type="text"
                          value={miscellaneousData.optionalField5}
                          onChange={(e) => handleMiscellaneousDataChange("optionalField5", e.target.value)}
                          className="form-input"
                          placeholder="Enter optional field 5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab !== "General" &&
              activeTab !== "Pricing" &&
              activeTab !== "BOM" &&
              activeTab !== "Practitioner Mapping" &&
              activeTab !== "Forms" &&
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
    </>
  )
}

export default ServiceForm
