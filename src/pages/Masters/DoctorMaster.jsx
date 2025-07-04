"use client"

import { useState } from "react"
import "./mastr.css"

const DoctorMaster = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDoctors, setSelectedDoctors] = useState([])

  // Sample doctor data based on your screenshot
  const doctorData = [
    {
      id: 1,
      employeeCode: "CENT00006",
      firstName: "Dr.Hassnaa",
      lastName: "Abosena",
      associatedClinic: "Bright Clinics",
    },
    {
      id: 2,
      employeeCode: "CENT00022",
      firstName: "Dr.Reham",
      lastName: "Eisa",
      associatedClinic: "Bright Clinics",
    },
    {
      id: 3,
      employeeCode: "CENT00044",
      firstName: "Dr. Mona",
      lastName: "Elshelk",
      associatedClinic: "Bright Clinics",
    },
    {
      id: 4,
      employeeCode: "EMP01",
      firstName: "Dr.Sally",
      lastName: "Gamal",
      associatedClinic: "Bright Clinics",
    },
    {
      id: 5,
      employeeCode: "CENT-00063",
      firstName: "Fanella",
      lastName: "Sta Maria",
      associatedClinic: "Bright Clinics",
    },
    {
      id: 6,
      employeeCode: "CENT00135",
      firstName: "Merelyn Mae",
      lastName: "Selibio",
      associatedClinic: "Bright Clinics",
    },
    {
      id: 7,
      employeeCode: "CENT-00111",
      firstName: "Shirley Ann",
      lastName: "Bautista",
      associatedClinic: "Bright Clinics",
    },
    {
      id: 8,
      employeeCode: "CENT-00168",
      firstName: "Dr.Sahar",
      lastName: "Osman",
      associatedClinic: "Bright Clinics",
    },
  ]

  // Filter doctors based on search term
  const filteredDoctors = doctorData.filter(
    (doctor) =>
      doctor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.associatedClinic.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleCheckboxChange = (doctorId) => {
    setSelectedDoctors((prev) => {
      if (prev.includes(doctorId)) {
        return prev.filter((id) => id !== doctorId)
      } else {
        return [...prev, doctorId]
      }
    })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDoctors(filteredDoctors.map((doctor) => doctor.id))
    } else {
      setSelectedDoctors([])
    }
  }

  const isAllSelected = filteredDoctors.length > 0 && selectedDoctors.length === filteredDoctors.length

  return (
    <div className="doctor-master-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/" className="breadcrumb-link">
         Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Manage Doctor/Therapist</span>
      </div>

      {/* Page Title */}
     <h1 className="page-title">Manage Doctor/Therapist</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search doctors/therapists..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Doctor Table */}
      <div className="table-container">
        <table className="doctor-table msttable">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="table-checkbox" />
              </th>
              <th>Employee Code</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Associated Clinic</th>
            </tr>
          </thead>
          <tbody>
            {filteredDoctors.map((doctor) => (
              <tr key={doctor.id} className="table-row">
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedDoctors.includes(doctor.id)}
                    onChange={() => handleCheckboxChange(doctor.id)}
                    className="table-checkbox"
                  />
                </td>
                <td className="employee-code">{doctor.employeeCode}</td>
                <td>{doctor.firstName}</td>
                <td>{doctor.lastName}</td>
                <td>{doctor.associatedClinic}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDoctors.length === 0 && (
          <div className="no-results">
            <p>No doctors/therapists found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Selected Count */}
      {selectedDoctors.length > 0 && (
        <div className="selected-info">
          <p>{selectedDoctors.length} doctor(s)/therapist(s) selected</p>
        </div>
      )}
    </div>
  )
}

export default DoctorMaster
