import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";
import { Link } from "react-router-dom";


const InvoicesTab = ({ custId }) => {
  const [invoiceData, setInvoiceData] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("All Selected");
  const [selectedDateRange, setSelectedDateRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const paymentModes = ["All Selected", "Cash", "Visa", "MasterCard"];
  // const dateRanges = ["", "Last 7 days", "Last 30 days", "This month", "This year"];

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!custId) {
        setError("Customer ID is missing");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerInvoice`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ custID: custId }),
        });
        
        const result = await response.json();

        if (response.ok) {
          // Ensure the response contains the expected data
          console.log("Fetched invoice data:", result);
          setInvoiceData(result); // Set the fetched data
        } else {
          setError("Failed to fetch invoices");
        }
      } catch (err) {
        setError("An error occurred while fetching invoices");
        console.error("Error fetching invoices:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [custId]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = () => {
    let filteredData = [...invoiceData];

    if (searchQuery) {
      filteredData = filteredData.filter((item) =>
        item.invoiceNum.includes(searchQuery) ||
        item.amount.toString().includes(searchQuery) ||
        item.paymentMode.includes(searchQuery)
      );
    }

    if (selectedPaymentMode !== "All Selected") {
      filteredData = filteredData.filter((item) => item.paymentMode === selectedPaymentMode);
    }

    if (selectedDateRange === "Last 7 days") {
      const today = new Date();
      const last7Days = new Date(today.setDate(today.getDate() - 7));
      filteredData = filteredData.filter((item) => new Date(item.invoiceDate) >= last7Days);
    }

    setFilteredInvoices(filteredData);
  };

  useEffect(() => {
    handleFilterChange();
  }, [searchQuery, selectedPaymentMode, selectedDateRange, invoiceData]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const indexOfLastInvoice = currentPage * itemsPerPage;
  const indexOfFirstInvoice = indexOfLastInvoice - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <>
    <div className="invoices-tab">
      <h4 className="sectttl">Search Invoices</h4>
      <div className="filters">
        <input
          type="text"
          placeholder="Invoice number, amount, payment mode"
          className="filter-input"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <input
          type="text"
          placeholder="Select time period"
          className="filter-input"
          value={selectedDateRange}
          onChange={(e) => setSelectedDateRange(e.target.value)}
        />
        <select
          className="filter-select"
          value={selectedPaymentMode}
          onChange={(e) => setSelectedPaymentMode(e.target.value)}
        >
          {paymentModes.map((mode, idx) => (
            <option key={idx} value={mode}>
              {mode}
            </option>
          ))}
        </select>
        <button className="refresh-btn" onClick={handleFilterChange}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading invoices...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Invoice Date</th>
              <th>Amount</th>
              <th>Tax</th>
              <th>Rounding Off</th>
              <th>Payment Mode</th>
            </tr>
          </thead>
          <tbody>
            {currentInvoices.map((item, idx) => (
              <tr key={idx}>
                <td>
  <Link
    to={`/invoice-details/${item.invoiceNum}`}
    className="invoice-link"
  >
    {item.invoiceNum}
  </Link>
</td>

                <td>{item.invoiceDate}</td>
                <td>{item.amount}</td>
                <td>{item.tax}</td>
                <td>{item.roundingOff}</td>
                <td>{item.paymentMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="refresh-btn">
          Prev
        </button>
        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="refresh-btn"  >
          Next
        </button>
      </div>
    </div>

     <style>{`
       .invoices-tab {
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-size: 16px;
  padding: 30px;
  width: calc(100% - 300px);
  color: #0f172a;
}

/* Filters */
.filters {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
}
.filter-input, .filter-select {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  transition: border-color .2s, box-shadow .2s;
}
.filter-input:focus, .filter-select:focus {
  outline: none;
  border-color: #334B71;
  box-shadow: 0 0 0 3px rgba(51,75,113,.12);
}
.refresh-btn {
  background-color: #334B71;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: transform .08s ease, box-shadow .2s ease, background-color .2s ease;
  box-shadow: 0 2px 6px rgba(51,75,113,.18);
}
.refresh-btn:hover { background-color: #2b3f60; box-shadow: 0 4px 10px rgba(51,75,113,.22); transform: translateY(-1px); }
.refresh-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

/* Table wrapper look */
.invoice-table {
  width: 100%;
  border-collapse: separate;          /* for rounded corners + shadow */
  border-spacing: 0;
  margin-top: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

/* Head */
.invoice-table thead th {
  background: #f8fafc;
  color: #0f172a;
  font-weight: 700;
  font-size: 14px;
  text-align: left;
  padding: 14px 18px;
  border-bottom: 1px solid #e2e8f0;
  letter-spacing: .2px;
}

/* Body */
.invoice-table tbody td {
  padding: 12px 18px;
  font-size: 14px;
  color: #0f172a;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}


/* Last row border cleanup */
.invoice-table tbody tr:last-child td {
  border-bottom: none;
}

/* Link style (Invoice No) */
.invoice-link {
  color: #1d4ed8;
  text-decoration: none;
  font-weight: 600;
}
.invoice-link:hover { text-decoration: underline; }
.invoice-link:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(29,78,216,.18);
  border-radius: 6px;
}

/* Align numbers (Amount, Tax, Rounding Off) */
.invoice-table tbody td:nth-child(3),
.invoice-table tbody td:nth-child(4),
.invoice-table tbody td:nth-child(5) {
  text-align: right;
  font-variant-numeric: tabular-nums; /* clean column alignment */
}

/* Payment mode emphasis (last column) */
.invoice-table tbody td:last-child {
  font-weight: 600;
  color: #334B71;
}

.invoice-table tbody td:first-child a {
  font-weight: 600;
  color: #334B71;
}

/* Pagination */
.pagination {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  font-size: 13px;
  color: #475569;
}
.pagination .refresh-btn {
  padding: 6px 12px;
  border-radius: 8px;
}

/* Responsive tweaks */
@media (max-width: 1024px) {
  .invoices-tab { padding: 20px; width: 100%; }
  .invoice-table thead th, .invoice-table tbody td { padding: 12px 14px; }
}
@media (max-width: 640px) {
  /* Optionally hide less-crucial column on very small screens */
  .invoice-table thead th:nth-child(5),
  .invoice-table tbody td:nth-child(5) { display: none; } /* Rounding Off */
}

      `}</style>
    </>
  );
};

export default InvoicesTab;
