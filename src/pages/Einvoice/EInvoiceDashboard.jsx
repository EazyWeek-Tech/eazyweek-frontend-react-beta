import React, { useState, useMemo, useEffect } from 'react';
import './EInvoiceDashboard.css';
import { API_BASE_URL } from '../../config';

const EInvoiceDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [invoiceData, setInvoiceData] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true); // Start loader
      try {
        const response = await fetch(`${API_BASE_URL}/api/EInvoice/LoadEInvoice`, {
          credentials: 'include'
        });
        const data = await response.json();
        setInvoiceData(Array.isArray(data) ? data : [data]);
      } catch (error) {
        console.error('Failed to fetch E-Invoices:', error);
      } finally {
        setLoading(false); // Stop loader
      }
    };

    fetchInvoices();
  }, []);

  const filteredData = useMemo(() => {
    return invoiceData.filter(item => {
      const matchesSearch = Object.values(item).some(value =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = statusFilter ? item.einvoiceStatus === statusFilter : true;
      const matchesDateRange = (!fromDate || new Date(item.invoiceDate.split('/').reverse().join('-')) >= new Date(fromDate)) &&
                               (!toDate || new Date(item.invoiceDate.split('/').reverse().join('-')) <= new Date(toDate));
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [searchTerm, invoiceData, fromDate, toDate, statusFilter]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

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

  const renderPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4, 5, '...', totalPages);
      else if (currentPage >= totalPages - 2) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages.map((page, index) => (
      <button
        key={index}
        className={`pagination-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
        onClick={() => typeof page === 'number' && setCurrentPage(page)}
        disabled={page === '...'}>{page}</button>
    ));
  };

  const handlePrint = (invoice) => {
  // Ensure the print area exists
  let printArea = document.getElementById('print-area');
  
  // If print area doesn't exist, create it
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }

  const printHTML = `
    <div class="print-invoice">
      <h2>Invoice</h2>
      <table>
        <tr><th>Clinic</th><td>${invoice.clinicName}</td></tr>
        <tr><th>Created By</th><td>${invoice.createdBy}</td></tr>
        <tr><th>Invoice Date</th><td>${invoice.invoiceDate}</td></tr>
        <tr><th>POS Invoice No</th><td>${invoice.posInvoiceNo}</td></tr>
        <tr><th>Zakat Invoice No</th><td>${invoice.zakatInvoiceNo}</td></tr>
        <tr><th>Resolved Invoice No</th><td>${invoice.resolvedInvoiceNo}</td></tr>
        <tr><th>Status</th><td>${invoice.einvoiceStatus}</td></tr>
        <tr><th>Remarks</th><td>${invoice.remarks}</td></tr>
      </table>
    </div>
  `;

  // Set the print content and trigger print
  printArea.innerHTML = printHTML;
  printArea.style.display = 'block';
  window.print();
  printArea.style.display = 'none';
};


  const handleRefresh = async () => {
  try {
    // Prepare the payload
    const payload = {
      status: statusFilter || '', // If statusFilter is set, use it; else send an empty string
      invoiceNumber: '', // If no specific invoice number, send an empty string or valid invoice number
      custID: '', // If no customer ID, send an empty string or valid customer ID
      refreshUrl: '' // If no refresh URL, send an empty string or valid refresh URL
    };

    // Make the API request to refresh the invoices
    const response = await fetch(`${API_BASE_URL}/api/EInvoice/EInvoiceRefreshUrl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include credentials (cookies) if needed
      body: JSON.stringify(payload) // Send the payload as a JSON string
    });

    if (!response.ok) throw new Error('Refresh failed');
    
    const result = await response.json();
    alert(`Refresh successful: ${result.message || 'Done'}`);
  } catch (error) {
    console.error('Invoice refresh failed:', error);
    alert('Failed to refresh invoices. Please try again.');
  }
};


  return (
    <>
      <div className="einvoice-dashboard">
        <div className="breadcrumb">
          <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
          <span className="breadcrumb-separator"> &gt; </span>
          <span className="breadcrumb-current">E-Invoice</span>
        </div>

        <div className="dashboard-header">
          <h1>E-Invoice Report</h1>
          {/* Refresh Button at the Top */}
          <button className="refresh-btn tooltip" data-tooltip="Refresh Invoice" data-tooltip-pos="left" onClick={handleRefresh}>
            <img src="/images/refresh.png" alt="Refresh Invoices" />
          </button>
        </div>

        <div className="filter-controls">
          <div className="fltdiv">
            <label>From Date:</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="fltdiv">
            <label>To Date:</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="fltdiv">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="Success">Success</option>
              <option value="Failure">Failure</option>
            </select>
          </div>
          <button className="view-btn" onClick={() => setCurrentPage(1)}>View</button>
          <button className="export-btn" onClick={() => alert("Exporting...")}>Export</button>
        </div>

        <div className="dashboard-controls">
          <div className="entries-control">
            <select value={entriesPerPage} onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}>
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

        {loading ? (
          <div className="loader-wrapper">
            <div className="loader"></div>
          </div>
        ) : (
          <div className="table-container">
            <table className="einvoice-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('clinicName')}>Clinic</th>
                  <th onClick={() => handleSort('createdBy')}>Created By</th>
                  <th onClick={() => handleSort('invoiceDate')}>Invoice Date</th>
                  <th onClick={() => handleSort('posInvoiceNo')}>POS Invoice No</th>
                  <th onClick={() => handleSort('zakatInvoiceNo')}>Zakat Invoice No</th>
                  <th onClick={() => handleSort('resolvedInvoiceNo')}>Resolved Invoice No</th>
                  <th onClick={() => handleSort('einvoiceStatus')}>Status</th>
                  <th onClick={() => handleSort('remarks')}>Remarks</th>
                  <th>Print</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((invoice, idx) => (
                  <tr key={idx}>
                    <td>{invoice.clinicName}</td>
                    <td>{invoice.createdBy}</td>
                    <td>{invoice.invoiceDate}</td>
                    <td>{invoice.posInvoiceNo}</td>
                    <td>{invoice.zakatInvoiceNo}</td>
                    <td>{invoice.resolvedInvoiceNo}</td>
                    <td>
                  <span className={`status ${invoice.einvoiceStatus?.toLowerCase()}`}>
                    {invoice.einvoiceStatus}
                  </span>
                </td>
                    <td>{invoice.remarks}</td>
                    <td>
                      <button className="print-btn tooltip" data-tooltip="Print Invoice" data-tooltip-pos="left" onClick={() => handlePrint(invoice)}>
                        <img src="/images/rpint.png" alt="Print" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

       <div className="pagination-container">
        <div className="pagination-info">
          Showing {((currentPage - 1) * entriesPerPage) + 1} to {Math.min(currentPage * entriesPerPage, sortedData.length)} of {sortedData.length} entries
        </div>
        <div className="pagination-controls">
          <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>&lt;</button>
          <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>&lt;&lt;</button>
          {renderPaginationNumbers()}
          <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>&gt;&gt;</button>
          <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>&gt;</button>
        </div>
      </div>
      </div>
      

          <style>{`
      .filter-bar {
  text-align: center;
  margin-bottom: 1rem;
}
  .refresh-btn {
  background: #334B71;
  color: white;
  border: none;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 30px;
}
  .refresh-btn img, .print-btn img{width: 20px;}
.refresh-btn:hover {
  opacity: 0.9;
}

.filter-title {
  margin-bottom: 0.5rem;
}
.filter-controls {
  display: none;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  align-items: flex-end;
}
  .fltdiv{font-size: 14px; font-family: 'Lato',sans-serif;min-width: 180px;}
  .fltdiv label{display: block; margin: 0 0 10px;}
  .fltdiv select, .fltdiv input{ padding: 5px 10px; }
.filter-controls > div {
  display: flex;
  flex-direction: column;
}
.view-btn, .export-btn {
  background-color: #334B71;
  color: white;
  padding: 6px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.view-btn:hover, .export-btn:hover {
  opacity: 0.9;
}
  .print-btn{background: #334B71;padding: 3px 8px;}
  .pagination-container{justify-content: flex-end;}
 @media print {
  body * {
    visibility: hidden;
  }
  #print-area, #print-area * {
    visibility: visible;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 20px;
    font-family: Arial, sans-serif;
  }
  .print-invoice table {
    width: 100%;
    border-collapse: collapse;
  }
  .print-invoice th, .print-invoice td {
    border: 1px solid #ccc;
    padding: 8px;
    text-align: left;
  }
  .print-invoice th {
    background: #f4f4f4;
  }
}



`}</style>
    </>
  );
};

export default EInvoiceDashboard;
