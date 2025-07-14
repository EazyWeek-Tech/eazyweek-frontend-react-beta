import React, { useState, useMemo } from 'react';
import './EInvoiceDashboard.css';

const EInvoiceDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sample data - in real app this would come from API
  const invoiceData = [
    {
      id: 1,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1214',
      zakatInvoiceNo: 'BRI-INV-1000253',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 2,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1213',
      zakatInvoiceNo: 'BRI-INV-1000252',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 3,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1211',
      zakatInvoiceNo: 'BRI-INV-1000251',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 4,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1210',
      zakatInvoiceNo: 'BRI-INV-1000250',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 5,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1209',
      zakatInvoiceNo: 'BRI-INV-1000249',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 6,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1208',
      zakatInvoiceNo: 'BRI-INV-1000248',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 7,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1207',
      zakatInvoiceNo: 'BRI-INV-1000247',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 8,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1206',
      zakatInvoiceNo: 'BRI-INV-1000246',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 9,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1205',
      zakatInvoiceNo: 'BRI-INV-1000245',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    },
    {
      id: 10,
      clinic: 'Bright Clinics',
      createdBy: '',
      invoiceDate: '05/07/2025',
      posInvoiceNo: '1204',
      zakatInvoiceNo: 'BRI-INV-1000244',
      resolvedInvoiceNo: '',
      status: 'Success',
      remarks: 'Give Invoice Print to Customer.'
    }
  ];

  // Generate more sample data to reach 400 entries
  const generateMoreData = () => {
    const moreData = [];
    for (let i = 11; i <= 400; i++) {
      moreData.push({
        id: i,
        clinic: 'Bright Clinics',
        createdBy: '',
        invoiceDate: '05/07/2025',
        posInvoiceNo: (1215 - i + 10).toString(),
        zakatInvoiceNo: `BRI-INV-${1000254 - i + 10}`,
        resolvedInvoiceNo: '',
        status: 'Success',
        remarks: 'Give Invoice Print to Customer.'
      });
    }
    return [...invoiceData, ...moreData];
  };

  const allData = generateMoreData();

  // Filter data based on search term
  const filteredData = useMemo(() => {
    return allData.filter(item =>
      Object.values(item).some(value =>
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, allData]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return sortedData.slice(startIndex, startIndex + entriesPerPage);
  }, [sortedData, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(sortedData.length / entriesPerPage);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePrint = (invoice) => {
    alert(`Printing invoice: ${invoice.zakatInvoiceNo}`);
  };

  const renderPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((page, index) => (
      <button
        key={index}
        className={`pagination-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
        onClick={() => typeof page === 'number' && setCurrentPage(page)}
        disabled={page === '...'}
      >
        {page}
      </button>
    ));
  };

  return (
    <div className="einvoice-dashboard">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link">E-Invoice</span>
        <span className="breadcrumb-separator"> &gt; </span>
        <span className="breadcrumb-current">E-Invoice</span>
      </div>

      {/* Header */}
      <div className="dashboard-header">
        <h1>E-Invoice Dashboard</h1>
      </div>

      {/* Controls */}
      <div className="dashboard-controls">
        <div className="entries-control">
          <select 
            value={entriesPerPage} 
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries per page</span>
        </div>

        <div className="search-control">
          <label>Search:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="einvoice-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('clinic')}>
                Clinic
                <span className="sort-indicator">
                  {sortConfig.key === 'clinic' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲'}
                </span>
              </th>
              <th onClick={() => handleSort('createdBy')}>
                Created By
                <span className="sort-indicator">
                  {sortConfig.key === 'createdBy' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲'}
                </span>
              </th>
              <th onClick={() => handleSort('invoiceDate')}>
                Invoice Date
                <span className="sort-indicator">
                  {sortConfig.key === 'invoiceDate' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲'}
                </span>
              </th>
              <th onClick={() => handleSort('posInvoiceNo')}>
                POS Invoice No
                <span className="sort-indicator">
                  {sortConfig.key === 'posInvoiceNo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲'}
                </span>
              </th>
              <th onClick={() => handleSort('zakatInvoiceNo')}>
                Zakat Invoice No
                <span className="sort-indicator">
                  {sortConfig.key === 'zakatInvoiceNo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲'}
                </span>
              </th>
              <th onClick={() => handleSort('resolvedInvoiceNo')}>
                Resolved Invoice No
                <span className="sort-indicator">
                  {sortConfig.key === 'resolvedInvoiceNo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲'}
                </span>
              </th>
              <th onClick={() => handleSort('status')}>
                Status
                <span className="sort-indicator">
                  {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲'}
                </span>
              </th>
              <th onClick={() => handleSort('remarks')}>
                Remarks
                <span className="sort-indicator">
                  {sortConfig.key === 'remarks' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲'}
                </span>
              </th>
              <th>Print</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.clinic}</td>
                <td>{invoice.createdBy}</td>
                <td>{invoice.invoiceDate}</td>
                <td>{invoice.posInvoiceNo}</td>
                <td>{invoice.zakatInvoiceNo}</td>
                <td>{invoice.resolvedInvoiceNo}</td>
                <td>
                  <span className={`status ${invoice.status.toLowerCase()}`}>
                    {invoice.status}
                  </span>
                </td>
                <td>{invoice.remarks}</td>
                <td>
                  <button 
                    className="print-btn"
                    onClick={() => handlePrint(invoice)}
                    title="Print Invoice"
                  >
                    🖨️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Info and Controls */}
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {((currentPage - 1) * entriesPerPage) + 1} to {Math.min(currentPage * entriesPerPage, sortedData.length)} of {sortedData.length} entries
        </div>
        
        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            &lt;&lt;
          </button>

          {renderPaginationNumbers()}

          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            &gt;&gt;
          </button>
          
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default EInvoiceDashboard;
