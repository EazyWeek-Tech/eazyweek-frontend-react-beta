import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";
import { Link } from "react-router-dom";

const InvoicesTab = ({ custId, recId }) => {
  const [invoiceData, setInvoiceData] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [pointsMap, setPointsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("All Selected");
  const [selectedDateRange, setSelectedDateRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [returningInvoice, setReturningInvoice] = useState(null);
  const [returnToast, setReturnToast] = useState(null);

  const paymentModes = ["All Selected", "Cash", "Visa", "MasterCard"];

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
      } catch { setError("An error occurred while fetching invoices"); }
      finally { setLoading(false); }
    };
    fetchInvoices();
  }, [custId]);

  useEffect(() => {
    if (!recId) return;
    const fetchPoints = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/points/history/${recId}?page=1&pageSize=100`,
          { credentials: "include", headers: { "Cache-Control": "no-cache" } });
        if (!res.ok) return;
        const json = await res.json();
        const map = {};
        (json.data ?? []).forEach(p => {
          if (p.transactionType !== "EARN") return;
          const parts = (p.description || "").trim().split(/\s+/);
          const invoiceNum = parts[parts.length - 1];
          if (invoiceNum) map[invoiceNum] = p;
        });
        setPointsMap(map);
      } catch (e) { console.warn("Failed to load points history:", e); }
    };
    fetchPoints();
  }, [recId]);

  const handleFilterChange = () => {
    let data = [...invoiceData];
    if (searchQuery) {
      data = data.filter(item =>
        item.invoiceNum?.includes(searchQuery) ||
        item.amount?.toString().includes(searchQuery) ||
        item.paymentMode?.includes(searchQuery)
      );
    }
    if (selectedPaymentMode !== "All Selected") data = data.filter(item => item.paymentMode === selectedPaymentMode);
    if (selectedDateRange === "Last 7 days") {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      data = data.filter(item => new Date(item.invoiceDate) >= cutoff);
    }
    setFilteredInvoices(data);
  };

  useEffect(() => { handleFilterChange(); }, [searchQuery, selectedPaymentMode, selectedDateRange, invoiceData]);

  const handleReturn = async (invoiceNum) => {
    const pointsRecord = pointsMap[invoiceNum];
    const referenceId = pointsRecord?.referenceId;
    if (!referenceId) {
      setReturnToast({ msg: `No points reference found for ${invoiceNum} — cannot reverse points.`, type: "error" });
      setTimeout(() => setReturnToast(null), 5000);
      return;
    }
    if (!window.confirm(`Return invoice ${invoiceNum}?\nThis will reverse ${pointsRecord.points} loyalty points earned.`)) return;
    setReturningInvoice(invoiceNum); setReturnToast(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/points/update-expired/${referenceId}`,
        { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.message || `Failed (${res.status})`); }
      setReturnToast({ msg: `Invoice ${invoiceNum} returned. ${pointsRecord.points} points reversed.`, type: "success" });
      setPointsMap(prev => { const next = { ...prev }; delete next[invoiceNum]; return next; });
    } catch (e) { setReturnToast({ msg: e.message, type: "error" }); }
    finally { setReturningInvoice(null); setTimeout(() => setReturnToast(null), 6000); }
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalSpent    = filteredInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalTax      = filteredInvoices.reduce((sum, i) => sum + (Number(i.tax) || 0), 0);
  const totalInvoices = filteredInvoices.length;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLast = currentPage * itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfLast - itemsPerPage, indexOfLast);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  return (
    <>
      <div className="inv-wrap">

        {/* ── Page header ── */}
        <div className="inv-header">
          <div>
            <h2 className="inv-title">Invoice History</h2>
            <p className="inv-sub">All transactions for this customer</p>
          </div>
        </div>

        {/* ── Toast ── */}
        {returnToast && (
          <div className={`inv-toast ${returnToast.type}`}>
            {returnToast.type === "success" ? "✓" : "⚠"} {returnToast.msg}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="inv-filters">
          <div className="inv-search-wrap">
            <span className="inv-search-icon">⌕</span>
            <input type="text" placeholder="Search invoice, amount or payment mode…" className="inv-search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <select className="inv-select" value={selectedPaymentMode} onChange={e => setSelectedPaymentMode(e.target.value)}>
            {paymentModes.map((mode, idx) => <option key={idx} value={mode}>{mode}</option>)}
          </select>
          <input type="text" placeholder="Time period" className="inv-select" style={{ width: 140 }} value={selectedDateRange} onChange={e => setSelectedDateRange(e.target.value)} />
          <button className="inv-btn-refresh" onClick={handleFilterChange}>↺ Refresh</button>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="inv-loading">
            <div className="inv-spinner" />
            Loading invoices…
          </div>
        ) : error ? (
          <div className="inv-error">⚠ {error}</div>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th className="num">Amount</th>
                  <th className="num">Tax</th>
                  <th className="num">Rounding</th>
                  <th>Payment</th>
                  <th>Points</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentInvoices.length === 0 ? (
                  <tr><td colSpan={8} className="inv-empty">No invoices found.</td></tr>
                ) : currentInvoices.map((item, idx) => {
                  const pts = pointsMap[item.invoiceNum];
                  const isReturning = returningInvoice === item.invoiceNum;
                  return (
                    <tr key={idx} className="inv-row">
                      <td>
                        <Link to={`/invoice-details/${item.invoiceNum}`} className="inv-link">{item.invoiceNum}</Link>
                      </td>
                      <td className="inv-date">{item.invoiceDate}</td>
                      <td className="num inv-amount">{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="num inv-muted">{Number(item.tax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="num inv-muted">{Number(item.roundingOff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td><span className="inv-mode">{item.paymentMode}</span></td>
                      <td>
                        {pts ? (
                          <span className="inv-pts">★ {pts.points.toLocaleString()} pts</span>
                        ) : (
                          <span className="inv-dash">—</span>
                        )}
                      </td>
                      <td>
                        {pts?.referenceId ? (
                          <button onClick={() => handleReturn(item.invoiceNum)} disabled={isReturning} className="inv-return-btn">
                            {isReturning ? "…" : "Return"}
                          </button>
                        ) : <span className="inv-dash">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="inv-pagination">
            <span className="inv-page-info">Page {currentPage} of {totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="inv-page-btn">← Prev</button>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages} className="inv-page-btn">Next →</button>
            </div>
          </div>
        )}

        {/* ── Summary banner ── */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="inv-summary">
            <div className="inv-summary-card primary">
              <div className="inv-summary-label">Total Spent</div>
              <div className="inv-summary-value">
                SAR {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="inv-summary-sub">{totalInvoices} invoice{totalInvoices !== 1 ? "s" : ""}</div>
            </div>
            <div className="inv-summary-card">
              <div className="inv-summary-label">Total Tax Paid</div>
              <div className="inv-summary-value secondary">
                SAR {totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="inv-summary-sub">VAT included</div>
            </div>
            <div className="inv-summary-card">
              <div className="inv-summary-label">Invoices with Points</div>
              <div className="inv-summary-value accent">
                ★ {Object.keys(pointsMap).length}
              </div>
              <div className="inv-summary-sub">earned loyalty points</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ── Layout ── */
        .inv-wrap {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          padding: 28px 32px;
          max-width: 1100px;
          color: #0f172a;
          background: #f8fafc;
          min-height: 100%;
        }

        /* ── Header ── */
        .inv-header { margin-bottom: 22px; }
        .inv-title { margin: 0 0 4px; font-size: 22px; font-weight: 800; color: #1e293b; letter-spacing: -0.3px; }
        .inv-sub { margin: 0; font-size: 13px; color: #64748b; }

        /* ── Toast ── */
        .inv-toast { margin-bottom: 14px; padding: 11px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; }
        .inv-toast.success { background: #e6f4ef; border: 1px solid #b3d9cc; color: #2e7d5e; }
        .inv-toast.error   { background: #fdf3f3; border: 1px solid #f0c4c0; color: #b91c1c; }

        /* ── Filters ── */
        .inv-filters { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; align-items: center; }
        .inv-search-wrap { position: relative; flex: 1; min-width: 220px; }
        .inv-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 18px; pointer-events: none; }
        .inv-search { width: 100%; height: 40px; padding: 0 12px 0 36px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #fff; color: #1e293b; outline: none; box-sizing: border-box; transition: border-color .18s, box-shadow .18s; }
        .inv-search:focus { border-color: #334b71; box-shadow: 0 0 0 3px rgba(51,75,113,.1); }
        .inv-select { height: 40px; padding: 0 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #fff; color: #1e293b; outline: none; cursor: pointer; transition: border-color .18s; }
        .inv-select:focus { border-color: #334b71; }
        .inv-btn-refresh { height: 40px; padding: 0 18px; border-radius: 10px; border: none; background: #334b71; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s, transform .08s; white-space: nowrap; }
        .inv-btn-refresh:hover { background: #2b3f60; transform: translateY(-1px); }

        /* ── Table ── */
        .inv-table-wrap { border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(15,23,42,0.06); background: #fff; }
        .inv-table { width: 100%; border-collapse: collapse; }
        .inv-table thead th { background: #f1f5f9; color: #475569; font-weight: 700; font-size: 11px; text-align: left; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.06em; }
        .inv-table thead th.num { text-align: right; }
        .inv-row td { padding: 13px 16px; font-size: 13.5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; transition: background .1s; }
        .inv-row:last-child td { border-bottom: none; }
        .inv-row:hover td { background: #f8faff; }
        .inv-link { color: #334b71; text-decoration: none; font-weight: 700; font-size: 13px; }
        .inv-link:hover { text-decoration: underline; color: #1d4ed8; }
        .inv-date { color: #64748b; font-size: 12.5px; }
        .inv-amount { font-weight: 700; color: #1e293b; }
        .inv-muted { color: #94a3b8; font-weight: 500; }
        .num { text-align: right; }
        .inv-mode { display: inline-block; background: #eef2f7; color: #334b71; border-radius: 6px; padding: 3px 9px; font-size: 12px; font-weight: 600; }
        .inv-pts { display: inline-flex; align-items: center; gap: 4px; background: #e6f4ef; color: #2e7d5e; border: 1px solid #b3d9cc; border-radius: 999px; padding: 3px 10px; font-size: 11.5px; font-weight: 700; }
        .inv-dash { color: #cbd5e1; font-size: 13px; }
        .inv-empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 13px; }

        /* Return button */
        .inv-return-btn { background: #7f1d1d; color: #fff; border: none; padding: 5px 12px; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 700; transition: background .15s, transform .08s; box-shadow: 0 2px 5px rgba(127,29,29,.2); }
        .inv-return-btn:hover { background: #991b1b; transform: translateY(-1px); }
        .inv-return-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        /* Loading / error */
        .inv-loading { display: flex; align-items: center; gap: 10px; padding: 40px 0; color: #64748b; font-size: 13px; }
        .inv-spinner { width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid #e2e8f0; border-top-color: #334b71; animation: inv-spin .8s linear infinite; }
        @keyframes inv-spin { to { transform: rotate(360deg); } }
        .inv-error { padding: 14px 18px; background: #fdf3f3; border: 1px solid #f0c4c0; border-radius: 10px; color: #b91c1c; font-size: 13px; }

        /* ── Pagination ── */
        .inv-pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }
        .inv-page-info { font-size: 13px; color: #64748b; }
        .inv-page-btn { height: 34px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #334b71; font-size: 13px; font-weight: 700; cursor: pointer; transition: border-color .15s, background .15s; }
        .inv-page-btn:hover:not(:disabled) { border-color: #334b71; background: #f0f4fa; }
        .inv-page-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Summary banner ── */
        .inv-summary {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          gap: 14px;
          margin-top: 20px;
        }
        .inv-summary-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px 22px;
          box-shadow: 0 2px 10px rgba(15,23,42,0.05);
          position: relative;
          overflow: hidden;
        }
        .inv-summary-card.primary {
          background: linear-gradient(135deg, #1e3a5f 0%, #334b71 60%, #3d5a85 100%);
          border-color: transparent;
          box-shadow: 0 6px 24px rgba(51,75,113,0.28);
        }
        .inv-summary-card.primary::after {
          content: '';
          position: absolute;
          right: -20px; top: -20px;
          width: 100px; height: 100px;
          border-radius: 50%;
          background: rgba(167,209,205,0.15);
        }
        .inv-summary-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        .inv-summary-card.primary .inv-summary-label { color: rgba(255,255,255,0.65); }
        .inv-summary-value {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.5px;
          line-height: 1;
          margin-bottom: 6px;
        }
        .inv-summary-card.primary .inv-summary-value { color: #fff; font-size: 28px; }
        .inv-summary-value.secondary { color: #334b71; }
        .inv-summary-value.accent { color: #2e7d5e; }
        .inv-summary-sub {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
        .inv-summary-card.primary .inv-summary-sub { color: rgba(255,255,255,0.55); }

        @media (max-width: 768px) {
          .inv-wrap { padding: 16px; }
          .inv-summary { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default InvoicesTab;