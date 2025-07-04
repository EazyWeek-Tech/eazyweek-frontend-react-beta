import React from "react";

const InvoicesTab = () => {
  const invoiceData = [
    {
      invoiceNo: "641",
      receiptNo: "R285",
      transactionType: "Sale",
      transactionStatus: "Completed",
      reason: "-",
      invoiceDate: "03/14/2025",
      transactionDate: "03/14/2025",
      amount: "1,300.00",
      tips: "0.00",
      ssg: "0.00",
      paymentMode: "Cash",
    },
    {
      invoiceNo: "636",
      receiptNo: "R282",
      transactionType: "Sale",
      transactionStatus: "Completed",
      reason: "-",
      invoiceDate: "03/13/2025",
      transactionDate: "03/13/2025",
      amount: "5,000.00",
      tips: "0.00",
      ssg: "0.00",
      paymentMode: "Visa",
    },
    // Add more sample rows as needed...
  ];

  return (
    <div className="invoices-tab">
      {/* Filter Section */}
      <h4 className="sectttl">Search Invoices</h4>
      <div className="filters">
        <input
          type="text"
          placeholder="Invoice number, amount, card last 4"
          className="filter-input"
        />
        <input type="text" placeholder="Select time period" className="filter-input" />
        <select className="filter-select">
          <option>All Selected</option>
        </select>
        <select className="filter-select">
          <option>All Selected</option>
        </select>
        <button className="refresh-btn">Refresh</button>
      </div>

      {/* Invoice Table */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Receipt No</th>
            <th>Transaction Type</th>
            <th>Transaction Status</th>
            <th>Reason</th>
            <th>Invoice Date</th>
            <th>Transaction Date</th>
            <th>Amount</th>
            <th>Tips</th>
            <th>SSG</th>
            <th>Payment Mode</th>
          </tr>
        </thead>
        <tbody>
          {invoiceData.map((item, idx) => (
            <tr key={idx}>
              <td>
                <a href="#" style={{ color: "#334B71", fontWeight: "700" }}>{item.invoiceNo}</a>
              </td>
              <td>{item.receiptNo}</td>
              <td>{item.transactionType}</td>
              <td>{item.transactionStatus}</td>
              <td>{item.reason}</td>
              <td>{item.invoiceDate}</td>
              <td>{item.transactionDate}</td>
              <td>{item.amount}</td>
              <td>{item.tips}</td>
              <td>{item.ssg}</td>
              <td>{item.paymentMode}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <span>Page 1 of 4</span>
      </div>

      <style>{`
        .invoices-tab {
          font-family: Arial, sans-serif;
          font-size: 14px;
          padding: 10px;
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
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ccc;
        }
        .invoice-table td {
          padding:10px 8px;
          border-bottom: 1px solid #e0e0e0;
        }
        .pagination {
          margin-top: 10px;
          text-align: right;
          font-size: 12px;
          color: #555;
        }
      `}</style>
    </div>
  );
};

export default InvoicesTab;
