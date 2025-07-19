import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

const InvoiceDetails = () => {
  const { invoiceNum } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/api/Invoice/GetInvoiceDetails/${invoiceNum}`, {
          method: "GET",
          credentials: "include",
        });

        const result = await response.json();

        if (response.ok) {
          setInvoice(result);
        } else {
          setError("Failed to load invoice details.");
        }
      } catch (err) {
        console.error("Error fetching invoice details:", err);
        setError("An error occurred while fetching invoice details.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [invoiceNum]);

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    alert("Invoice details emailed successfully.");
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) return <p className="status-msg">Loading invoice details...</p>;
  if (error) return <p className="status-msg error">{error}</p>;
  if (!invoice) return null;

  const header = invoice.headerJson?.[0] || {};
  const items = invoice.linesJson || [];
  const payments = invoice.paymentJson || [];

  return (
    <div className="invoice-details-page">
      <div className="header-actions">
        <h2>Invoice Details: {header.invoiceNumber}</h2>
        <div>
          <button className="action-btn" onClick={handleBack}>Back</button>
          <button className="action-btn" onClick={handlePrint}>Print</button>
          <button className="action-btn" onClick={handleEmail}>Email</button>
        </div>
      </div>

      <div className="smmary-card">
        <div><strong>Date:</strong> {formatDate(invoice.invoiceDate)}</div>
        <div><strong>Total Amount:</strong> {header.sumTotal}</div>
      </div>

      <h3>Items / Services</h3>
      <table className="styled-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Item Name</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Tax</th>
            <th>Final Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{item.itemName}</td>
              <td>{item.quantity}</td>
              <td>{item.salesAmount.toFixed(2)}</td>
              <td>{item.taxamount.toFixed(2)}</td>
              <td>{item.finalAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Payments</h3>
      <table className="styled-table">
        <thead>
          <tr>
            <th>Mode</th>
            <th>Amount Paid</th>
            <th>Payment Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p, idx) => (
            <tr key={idx}>
              <td>{p.paymentName}</td>
              <td>{p.paidAmount.toFixed(2)}</td>
              <td>{formatDate(p.paymentDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .invoice-details-page {
          max-width: 1000px;
          margin: 30px auto;
          font-family: Arial, sans-serif;
          padding: 30px;
          background: #fff;
          box-shadow: 0 0 15px rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .smmary-card{
          font-size: 18px;
          line-height: 27px;
        }
        .header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .action-btn {
          background: #324e78;
          color: #fff;
          border: none;
          padding: 8px 16px;
          margin-left: 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .action-btn:hover {
          background: #223b5c;
        }
        h2 {
          font-size: 24px;
          border-bottom: 2px solid #ddd;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h3 {
          margin-top: 30px;
          font-size: 20px;
        }
        .styled-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 15px;
        }
        .styled-table th, .styled-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        .styled-table th {
          background: #f0f0f0;
        }
        .styled-table tbody tr:nth-child(even) {
          background: #f9f9f9;
        }
        .status-msg {
          text-align: center;
          font-size: 16px;
          padding: 20px;
        }
        .status-msg.error {
          color: red;
        }
      `}</style>
    </div>
  );
};

export default InvoiceDetails;
