import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";
import { Link } from "react-router-dom";

const InvoicesTab = ({ custId, recId }) => {
  const [invoiceData, setInvoiceData] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [pointsMap, setPointsMap] = useState({}); // invoiceNum → points record
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("All Selected");
  const [selectedDateRange, setSelectedDateRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [returningInvoice, setReturningInvoice] = useState(null);
  const [returnToast, setReturnToast] = useState(null); // { msg, type }

  const paymentModes = ["All Selected", "Cash", "Visa", "MasterCard"];

  // ── Fetch invoices ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!custId) { setError("Customer ID is missing"); return; }
    const fetchInvoices = async () => {
      setLoading(true); setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerInvoice`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custID: custId }),
        });
        const result = await res.json();
        if (res.ok) setInvoiceData(result);
        else setError("Failed to fetch invoices");
      } catch (err) {
        setError("An error occurred while fetching invoices");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [custId]);

  // ── Fetch points history and build invoiceNum → points map ────────────────
  useEffect(() => {
    if (!recId) return;
    const fetchPoints = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/points/history/${recId}?page=1&pageSize=100`,
          { credentials: "include", headers: { "Cache-Control": "no-cache" } }
        );
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data ?? [];
        // Build map: invoiceNum string → points record (only EARN type)
        const map = {};
        data.forEach(p => {
          if (p.transactionType !== "EARN") return;
          // Extract invoice number from description e.g. "INV INVBright00146" → "INVBright00146"
          const descParts = (p.description || "").trim().split(/\s+/);
          const invoiceNum = descParts[descParts.length - 1]; // last word
          if (invoiceNum) map[invoiceNum] = p;
        });
        setPointsMap(map);
      } catch (e) {
        console.warn("Failed to load points history:", e);
      }
    };
    fetchPoints();
  }, [recId]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const handleFilterChange = () => {
    let data = [...invoiceData];
    if (searchQuery) {
      data = data.filter(item =>
        item.invoiceNum?.includes(searchQuery) ||
        item.amount?.toString().includes(searchQuery) ||
        item.paymentMode?.includes(searchQuery)
      );
    }
    if (selectedPaymentMode !== "All Selected") {
      data = data.filter(item => item.paymentMode === selectedPaymentMode);
    }
    if (selectedDateRange === "Last 7 days") {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      data = data.filter(item => new Date(item.invoiceDate) >= cutoff);
    }
    setFilteredInvoices(data);
  };

  useEffect(() => { handleFilterChange(); }, [searchQuery, selectedPaymentMode, selectedDateRange, invoiceData]);

  // ── Return invoice + reverse points ──────────────────────────────────────
  const handleReturn = async (invoiceNum) => {
    const pointsRecord = pointsMap[invoiceNum];
    const referenceId = pointsRecord?.referenceId;

    if (!referenceId) {
      setReturnToast({ msg: `No points reference found for ${invoiceNum} — cannot reverse points.`, type: "error" });
      setTimeout(() => setReturnToast(null), 5000);
      return;
    }

    if (!window.confirm(`Return invoice ${invoiceNum}?\nThis will reverse ${pointsRecord.points} loyalty points earned.`)) return;

    setReturningInvoice(invoiceNum);
    setReturnToast(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/points/update-expired/${referenceId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || body?.error || `Failed (${res.status})`);
      }
      setReturnToast({ msg: `Invoice ${invoiceNum} returned. ${pointsRecord.points} points reversed.`, type: "success" });
      // Remove from points map so Return button disappears
      setPointsMap(prev => { const next = { ...prev }; delete next[invoiceNum]; return next; });
    } catch (e) {
      setReturnToast({ msg: e.message, type: "error" });
    } finally {
      setReturningInvoice(null);
      setTimeout(() => setReturnToast(null), 6000);
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLast = currentPage * itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfLast - itemsPerPage, indexOfLast);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  return (
    <>
      <div className="invoices-tab">
        <h4 className="sectttl">Search Invoices</h4>

        {/* Toast */}
        {returnToast && (
          <div style={{ marginBottom: 12, padding: "10px 16px", background: returnToast.type === "success" ? "#e6f4ef" : "#fdf3f3", border: `1px solid ${returnToast.type === "success" ? "#b3d9cc" : "#f0c4c0"}`, borderRadius: 8, color: returnToast.type === "success" ? "#2e7d5e" : "#b91c1c", fontSize: 13, fontWeight: 600 }}>
            {returnToast.type === "success" ? "✓" : "⚠"} {returnToast.msg}
          </div>
        )}

        <div className="filters">
          <input type="text" placeholder="Invoice number, amount, payment mode" className="filter-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <input type="text" placeholder="Select time period" className="filter-input" value={selectedDateRange} onChange={e => setSelectedDateRange(e.target.value)} />
          <select className="filter-select" value={selectedPaymentMode} onChange={e => setSelectedPaymentMode(e.target.value)}>
            {paymentModes.map((mode, idx) => <option key={idx} value={mode}>{mode}</option>)}
          </select>
          <button className="refresh-btn" onClick={handleFilterChange}>Refresh</button>
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
                <th>Points</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentInvoices.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>No invoices found.</td></tr>
              ) : currentInvoices.map((item, idx) => {
                const pts = pointsMap[item.invoiceNum];
                const isReturning = returningInvoice === item.invoiceNum;
                return (
                  <tr key={idx}>
                    <td>
                      <Link to={`/invoice-details/${item.invoiceNum}`} className="invoice-link">{item.invoiceNum}</Link>
                    </td>
                    <td>{item.invoiceDate}</td>
                    <td>{item.amount}</td>
                    <td>{item.tax}</td>
                    <td>{item.roundingOff}</td>
                    <td>{item.paymentMode}</td>
                    <td>
                      {pts ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e6f4ef", color: "#2e7d5e", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, border: "1px solid #b3d9cc" }}>
                          ★ {pts.points.toLocaleString()} pts
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      {pts?.referenceId ? (
                        <button
                          onClick={() => handleReturn(item.invoiceNum)}
                          disabled={isReturning}
                          className="return-btn"
                        >
                          {isReturning ? "Returning…" : "Return"}
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="pagination">
          <span>Page {currentPage} of {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="refresh-btn">Prev</button>
          <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages} className="refresh-btn">Next</button>
        </div>
      </div>

      <style>{`
        .invoices-tab { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 16px; padding: 30px; width: calc(100% - 300px); color: #0f172a; }
        .filters { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
        .filter-input, .filter-select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; background: #fff; transition: border-color .2s, box-shadow .2s; }
        .filter-input:focus, .filter-select:focus { outline: none; border-color: #334B71; box-shadow: 0 0 0 3px rgba(51,75,113,.12); }
        .refresh-btn { background-color: #334B71; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: transform .08s ease, box-shadow .2s ease, background-color .2s ease; box-shadow: 0 2px 6px rgba(51,75,113,.18); }
        .refresh-btn:hover { background-color: #2b3f60; box-shadow: 0 4px 10px rgba(51,75,113,.22); transform: translateY(-1px); }
        .refresh-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
        .return-btn { background-color: #7f1d1d; color: #fff; border: none; padding: 5px 12px; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 700; transition: background-color .2s, transform .08s; box-shadow: 0 2px 5px rgba(127,29,29,.25); }
        .return-btn:hover { background-color: #991b1b; transform: translateY(-1px); }
        .return-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
        .invoice-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 6px 16px rgba(15,23,42,0.06); overflow: hidden; }
        .invoice-table thead th { background: #f8fafc; color: #0f172a; font-weight: 700; font-size: 14px; text-align: left; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; letter-spacing: .2px; }
        .invoice-table tbody td { padding: 12px 18px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .invoice-table tbody tr:last-child td { border-bottom: none; }
        .invoice-link { color: #1d4ed8; text-decoration: none; font-weight: 600; }
        .invoice-link:hover { text-decoration: underline; }
        .invoice-table tbody td:nth-child(3), .invoice-table tbody td:nth-child(4), .invoice-table tbody td:nth-child(5) { text-align: right; font-variant-numeric: tabular-nums; }
        .invoice-table tbody td:nth-child(6) { font-weight: 600; color: #334B71; }
        .invoice-table tbody td:first-child a { font-weight: 600; color: #334B71; }
        .pagination { margin-top: 12px; display: flex; gap: 10px; align-items: center; justify-content: flex-end; font-size: 13px; color: #475569; }
        .pagination .refresh-btn { padding: 6px 12px; border-radius: 8px; }
        @media (max-width: 1024px) { .invoices-tab { padding: 20px; width: 100%; } .invoice-table thead th, .invoice-table tbody td { padding: 12px 14px; } }
        @media (max-width: 640px) { .invoice-table thead th:nth-child(5), .invoice-table tbody td:nth-child(5) { display: none; } }
      `}</style>
    </>
  );
};

export default InvoicesTab;