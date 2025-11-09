import React from "react";

const PackagesTab = () => {
  const packageData = [
    {
      invoiceNo: "640",
      receiptNo: "0",
      packageName: "Volume filling (Belotero Balance) 1S_B X 1",
      refundIcon: "📄",
      price: "1,300.00",
      saleRefundDate: "03/14/2025",
      startDate: "03/14/2025",
      expirationDate: "03/14/2026",
      expirationWithGrace: "03/14/2026",
      completedSchedules: "",
    },
    {
      invoiceNo: "641",
      receiptNo: "R285",
      packageName: "Volume filling (Belotero Volume) 1S_B X 1",
      refundIcon: "📄",
      price: "1,300.00",
      saleRefundDate: "03/14/2025",
      startDate: "03/14/2025",
      expirationDate: "03/14/2026",
      expirationWithGrace: "03/14/2026",
      completedSchedules: "",
    },
    // Add more rows as needed...
  ];

  return (
    <div className="packages-tab">
      {/* Filter Dropdown */}
      <div className="filter-section">
        <label>View Package with status: </label>
        <select className="filter-select">
          <option>All</option>
        </select>
      </div>

      {/* Packages Table */}
      <table className="packages-table">
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Receipt No</th>
            <th>Package Name</th>
            <th>Refund</th>
            <th>Price</th>
            <th>Sale/Refund Date</th>
            <th>Start Date</th>
            <th>Expiration Date</th>
            <th>Expiration With Grace</th>
            <th>Completed Schedules</th>
          </tr>
        </thead>
        <tbody>
          {packageData.map((item, idx) => (
            <tr key={idx}>
              <td>
                <a href="#" style={{ color: "#334B71" }}>{item.invoiceNo}</a>
              </td>
              <td>{item.receiptNo}</td>
              <td>
                <a href="#" style={{ color: "#334B71" }}>{item.packageName}</a>
              </td>
              <td>{item.refundIcon}</td>
              <td>{item.price}</td>
              <td>{item.saleRefundDate}</td>
              <td>
                <a href="#" style={{ color: "#334B71" }}>{item.startDate}</a>
              </td>
              <td>
                <a href="#" style={{ color: "#334B71" }}>{item.expirationDate}</a>
              </td>
              <td>
                <a href="#" style={{ color: "#334B71" }}>{item.expirationWithGrace}</a>
              </td>
              <td>{item.completedSchedules}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <span>Page 1 of 3</span>
      </div>

      <style>{`
        .packages-tab {
          font-family: Arial, sans-serif;
          font-size: 14px;
          padding: 10px;
        }
        .filter-section {
          margin-bottom: 10px;
        }
        .filter-select {
          padding: 6px;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin-left: 5px;
          font-size: 13px;
        }
        .packages-table a{color: #334B71;font-weight: 700;}
         .packages-table { width: 100%; border-collapse: collapse; margin: 20px 0;background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
    overflow: hidden; }
        .packages-table td {padding: 12px 18px;
    font-size: 14px;
    line-height: 20px;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
 }
        .packages-table th { background: #f8fafc;
    color: #0f172a;
    font-weight: 700;
    font-size: 14px;
    text-align: left;
    padding: 14px 18px;
    border-bottom: 1px solid #e2e8f0;
    letter-spacing: .2px; }
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

export default PackagesTab;
