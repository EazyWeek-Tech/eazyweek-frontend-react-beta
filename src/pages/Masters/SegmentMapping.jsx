import { useState, useEffect } from "react";
import EmployeeDetails from "./EmployeeDetails";
import { API_BASE_URL } from "../../config";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";


const SegmentMapping = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [employeeData, setEmployeeData] = useState([]);
  const [loading, setLoading] = useState(true);
    const navigate = useNavigate();


  const itemsPerPage = 10;

  // Fetch employee data from the API
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/Employees/AuditSegmentMapping`, {
          method: "GET",
          credentials: "include", // Ensure cookies are sent with the request
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText); // Log the error response
          throw new Error(`Error fetching employees: ${response.status}`);
        }

        const data = await response.json(); // Expecting JSON data here
        setEmployeeData(data);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const totalPages = Math.ceil(employeeData.length / itemsPerPage);

  // Filter employees based on search term
  const filteredEmployees = employeeData.filter(
    (employee) =>
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.mobileNo.includes(searchTerm) ||
      employee.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.clinicName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get current page data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setShowDetails(true);
  };

  const handleBackToList = () => {
    setShowDetails(false);
    setSelectedEmployee(null);
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 10;

    for (let i = 1; i <= Math.min(totalPages, maxVisiblePages); i++) {
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

    if (totalPages > maxVisiblePages) {
      pages.push(
        <button key="more" className="pagination-btn">
          ...
        </button>
      );
    }

    return pages;
  };

  // Columns for the DataTable
  const columns = [
    {
      name: "Employee Code",
      selector: (row) => row.employeeCode,
      sortable: true,
      cell: (row) => (
        <span
          className="link-btn"
          onClick={() => navigate(`/segmentaddform/${row.employeeCode}`)}
        >
          {row.employeeCode}
        </span>
      ),
    },
    {
      name: "First Name",
      selector: (row) => row.firstName,
      sortable: true,
    },
    {
      name: "Last Name",
      selector: (row) => row.lastName,
      sortable: true,
    },
    {
      name: "Mobile No",
      selector: (row) => row.mobileNo,
    },
    {
      name: "Role",
      selector: (row) => row.roleName,
    },
    {
      name: "Clinic",
      selector: (row) => row.clinicName,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          className="add-btn"
          onClick={() => handleEmployeeClick(row)}
        >
          View Details
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  // If showing details, render the EmployeeDetails component
  if (showDetails && selectedEmployee) {
    return <EmployeeDetails employee={selectedEmployee} onBack={handleBackToList} />;
  }

  return (
    <div className="segment-mapping-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard" className="breadcrumb-link">
          Dashboard
        </a>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">Segment Mapping</span>
      </div>

      {/* Page Title */}
      <h1 className="page-title">Map Employee To Audit Segment's</h1>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button className="search-btn">Search</button>
      </div>

      {/* Employee DataTable */}
      <div className="">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <DataTable
            columns={columns}
            data={currentEmployees}
            pagination
            paginationPerPage={itemsPerPage}
            progressPending={loading}
            className="cstmtable" // Applying the cstmtable class here
            highlightOnHover
            paginationComponentOptions={{ rowsPerPageText: 'Rows per page:' }}
          />
        )}

        {filteredEmployees.length === 0 && !loading && (
          <div className="no-results">
            <p>No employees found matching your search criteria.</p>
          </div>
        )}
      </div>

      
    </div>
  );
};

export default SegmentMapping;
