"use client"

import { useState } from "react"

const ClinicMaster = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClinics, setSelectedClinics] = useState([])

  // Sample clinic data based on your screenshot
  const clinicData = [
    {
      id: 1,
      zone: "No Zone",
      code: "Bright",
      name: "Bright Clinics",
      address: "7010 Saeed Bin Zayd street- Qurtuba Dist,Exit-8,Riyadh 13244,Saudi Arabia",
    },
    {
      id: 2,
      zone: "No Zone",
      code: "LNS",
      name: "Lines Clinics",
      address: "4506 Imam Saud Bin Faisal Road, Al Sahafa District, Unit No 4512,Riyadh, Saudi Arabia 13321",
    },
    {
      id: 3,
      zone: "No Zone",
      code: "MXM",
      name: "Maxime Clinics",
      address: "Al Urubah Branch Rd,Riya dh,Saudi Arabia 12333",
    },
    {
      id: 4,
      zone: "No Zone",
      code: "INFENI",
      name: "Infeni Clinic",
      address: "Al Urubah Branch Rd,Riya dh,Saudi Arabia 12333",
    },
    {
      id: 5,
      zone: "No Zone",
      code: "Silk",
      name: "Silk Clinic",
      address: "Al Urubah Branch Rd,Riya dh,Saudi Arabia 12333",
    },
  ]

  // Filter clinics based on search term
  const filteredClinics = clinicData.filter(
    (clinic) =>
      clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleCheckboxChange = (clinicId) => {
    setSelectedClinics((prev) => {
      if (prev.includes(clinicId)) {
        return prev.filter((id) => id !== clinicId)
      } else {
        return [...prev, clinicId]
      }
    })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedClinics(filteredClinics.map((clinic) => clinic.id))
    } else {
      setSelectedClinics([])
    }
  }

  const isAllSelected = filteredClinics.length > 0 && selectedClinics.length === filteredClinics.length

  return (
    <div className="clinic-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
         <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Clinic</span>
      </div>
  {/* Page Title */}
      <h1 className="page-title">Manage Clinic</h1>
      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search clinics..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Clinic Table */}
      <div className="table-container">
        <table className="msttable">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="table-checkbox" />
              </th>
              <th>ZONE</th>
              <th>CODE</th>
              <th>NAME</th>
              <th>ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {filteredClinics.map((clinic) => (
              <tr key={clinic.id}>
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedClinics.includes(clinic.id)}
                    onChange={() => handleCheckboxChange(clinic.id)}
                    className="table-checkbox"
                  />
                </td>
                <td>{clinic.zone}</td>
                <td>{clinic.code}</td>
                <td>{clinic.name}</td>
                <td>{clinic.address}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredClinics.length === 0 && (
          <div className="no-results">
            <p>No clinics found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Selected Count */}
      {selectedClinics.length > 0 && (
        <div className="selected-info">
          <p>{selectedClinics.length} clinic(s) selected</p>
        </div>
      )}
    </div>
  )
}

export default ClinicMaster
