import React from "react";

const CreditMemoTab = () => {
  const creditMemoData = [
    {
      invoiceNo: "586",
      receiptNo: "R249",
      code: "162",
      refundIcon: "📄",  // Placeholder icon
      saleRefundDate: "02/02/2025",
      expirationDate: "12/31/2200",
      price: "1,000.00",
      cardValue: "1,000.00",
      balance: "1,000.00",
      saleCenter: "Bright Clinics",
      status: "CLOSED",
    },
    {
      invoiceNo: "609",
      receiptNo: "R259",
      code: "235",
      refundIcon: "📄",
      saleRefundDate: "03/01/2025",
      expirationDate: "12/31/2200",
      price: "1,000.00",
      cardValue: "1,000.00",
      balance: "1,000.00",
      saleCenter: "Bright Clinics",
      status: "CLOSED",
    },
    // Add more rows as needed...
  ];

  return (
    <div className="creditmemo-tab">
      <table className="creditmemo-table">
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Receipt No</th>
            <th>Code</th>
            <th>Refund</th>
            <th>Sale/Refund Date</th>
            <th>Expiration Date</th>
            <th>Price</th>
            <th>Card Value</th>
            <th>Balance</th>
            <th>Sale Center</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {creditMemoData.map((item, idx) => (
            <tr key={idx}>
              <td>
                <a href="#" style={{ color: "#334B71" }}>{item.invoiceNo}</a>
              </td>
              <td>{item.receiptNo}</td>
              <td>
                <a href="#" style={{ color: "#334B71" }}>{item.code}</a>
              </td>
              <td>{item.refundIcon}</td>
              <td>{item.saleRefundDate}</td>
              <td>
                <a href="#" style={{ color: "#334B71" }}>{item.expirationDate}</a>
              </td>
              <td>{item.price}</td>
              <td>{item.cardValue}</td>
              <td>{item.balance}</td>
              <td>{item.saleCenter}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <span>Page 1 of 1</span>
      </div>

      <style>{`
        .creditmemo-tab {
          font-family: Arial, sans-serif;
          font-size: 14px;
          padding: 10px;
        }
        .creditmemo-table {
          width: 100%;
          border-collapse: collapse;
        }
        .creditmemo-table th {
          background-color: #f0f0f0;
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ccc;
        }
        .creditmemo-table td {
          padding: 10px 8px;
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

export default CreditMemoTab;
