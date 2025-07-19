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
          font-family: Arial, sans-serif;
          font-size: 16px;
          padding: 30px;
          width: calc(100% - 300px)
        }
        .filters {
          display: flex;
          gap: 8px;
          margin: 20px 0;
          flex-wrap: wrap;
        }
        .filter-input, .filter-select {
          padding: 6px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 13px;
        }
        .refresh-btn {
          background-color: #334B71;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .invoice-table th {
          background-color: #f0f0f0;
          padding: 10px 15px;
          color:#000;
          text-align: left;
          border-bottom: 1px solid #ccc;
        }
        .invoice-table td {
          padding:10px 15px;
          border-bottom: 1px solid #e0e0e0;
        }
        .pagination {
          margin-top: 10px;
          text-align: right;
          font-size: 12px;
          color: #555;
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-end;
        }
      `}</style>
    </>
  );
};

export default InvoicesTab;
