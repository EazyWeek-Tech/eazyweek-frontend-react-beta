import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../../config";
import { Link } from "react-router-dom";
import SalesReturn from "../../Invoice/SalesReturn";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const InvoicesTab = ({ custId, recId }) => {
  const [invoiceData,        setInvoiceData]        = useState([]);
  const [filteredInvoices,   setFilteredInvoices]   = useState([]);
  const [searchQuery,        setSearchQuery]         = useState("");
  const [selectedPaymentMode,setSelectedPaymentMode] = useState("All Selected");
  const [selectedDateRange,  setSelectedDateRange]   = useState("");
  const [loading,            setLoading]             = useState(false);
  const [error,              setError]               = useState("");
  const [showReturn,         setShowReturn]          = useState(false);
  const [toast,              setToast]               = useState(null);
  const [currentPage,        setCurrentPage]         = useState(1);

  const paymentModes = ["All Selected", "Cash", "Card", "Bank Transfer", "Cheque", "Credit Note"];
  const [returnedInvoices, setReturnedInvoices] = useState(new Set());
  const itemsPerPage = 10;

  useEffect(() => {
    if (!custId) { setError("Customer ID is missing"); return; }
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/Customer/FetchCustomerInvoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
          body: JSON.stringify({ custID: custId }),
        });
        const json = await res.json();
        const data = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
        const allInvoices = data;
        // Show only Sales invoices in the table
        const parseInvDate = (d) => {
          if (!d) return 0;
          // Handle DD/MM/YYYY format
          if (typeof d === "string" && d.includes("/")) {
            const [day, mon, yr] = d.split("/");
            return new Date(`${yr}-${mon}-${day}`).getTime();
          }
          return new Date(d).getTime();
        };
        const salesInvoices = allInvoices
          .filter(i => !i.transType || i.transType === "Sales" || i.transType === "Return")
          .sort((a, b) => {
            // Primary: date descending
            const dateDiff = parseInvDate(b.invoiceDate) - parseInvDate(a.invoiceDate);
            if (dateDiff !== 0) return dateDiff;
            // Secondary: invoice number suffix descending (e.g. INVBright00349 > INVBright00348)
            const numA = parseInt((a.invoiceNum || "").replace(/\D/g, "")) || 0;
            const numB = parseInt((b.invoiceNum || "").replace(/\D/g, "")) || 0;
            return numB - numA;
          });
        setInvoiceData(salesInvoices);
        // Track which invoices have return transactions against them
        // We store them as a Map: invoiceNum -> 'full' | 'partial'
        // The SalesReturn modal handles the actual line-level partial detection
        // Here we just know IF there's any return — modal shows remaining returnable lines
        const returnedSet = new Set(
          allInvoices
            .filter(i => i.transType === "Return")
            .map(i => i.appointmentId || i.appointmentID || "")
            .filter(Boolean)
        );
        // Mark as partial (not fully returned) unless no lines remain
        setReturnedInvoices(new Set()); // never fully block — let modal handle it
      } catch { setError("An error occurred while fetching invoices"); }
      finally { setLoading(false); }
    })();
  }, [custId]);

  useEffect(() => {
    let data = [...invoiceData];
    if (searchQuery)
      data = data.filter(i =>
        i.invoiceNum?.includes(searchQuery) ||
        i.amount?.toString().includes(searchQuery) ||
        i.paymentMode?.includes(searchQuery)
      );
    if (selectedPaymentMode !== "All Selected")
      data = data.filter(i => i.paymentMode === selectedPaymentMode);
    if (selectedDateRange === "Last 7 days") {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      data = data.filter(i => new Date(i.invoiceDate) >= cutoff);
    }
    setFilteredInvoices(data);
    setCurrentPage(1);
  }, [searchQuery, selectedPaymentMode, selectedDateRange, invoiceData]);

  const totalSpent    = filteredInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalTax      = filteredInvoices.reduce((s, i) => s + (Number(i.tax)    || 0), 0);
  const totalInvoices = filteredInvoices.length;
  const totalPages    = Math.ceil(totalInvoices / itemsPerPage);
  const currentInvoices = filteredInvoices.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

  const fmt = (n) => Number(n||0).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });

  return (
    <>
      <div className="inv-wrap">
        <div className="inv-header">
          <div>
            <h2 className="inv-title">Invoice History</h2>
            <p className="inv-sub">All transactions for this customer</p>
          </div>
          <button onClick={() => setShowReturn(true)}
            style={{ height:40, padding:"0 18px", background:"#334b71", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            ⟲ Recall Invoice / Return
          </button>
        </div>

        {toast && (
          <div className={`inv-toast ${toast.type}`}>
            {toast.type === "success" ? "✓" : "⚠"} {toast.msg}
          </div>
        )}

        <div className="inv-filters">
          <div className="inv-search-wrap">
            <span className="inv-search-icon">⌕</span>
            <input type="text" placeholder="Search invoice, amount or payment mode…" className="inv-search"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <select className="inv-select" value={selectedPaymentMode} onChange={e => setSelectedPaymentMode(e.target.value)}>
            {paymentModes.map((m,i) => <option key={i} value={m}>{m}</option>)}
          </select>
          <input type="text" placeholder="Time period" className="inv-select" style={{ width:140 }}
            value={selectedDateRange} onChange={e => setSelectedDateRange(e.target.value)} />
          <button className="inv-btn-refresh" onClick={() => setSelectedDateRange(selectedDateRange)}>↺ Refresh</button>
        </div>

        {loading ? (
          <div className="inv-loading"><div className="inv-spinner" /> Loading invoices…</div>
        ) : error ? (
          <div className="inv-error">⚠ {error}</div>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Invoice No</th><th>Date</th><th>Type</th>
                  <th className="num">Amount</th><th className="num">Tax</th><th className="num">Rounding</th>
                  <th>Payment</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentInvoices.length === 0 ? (
                  <tr><td colSpan={7} className="inv-empty">No invoices found.</td></tr>
                ) : currentInvoices.map((item, idx) => (
                  <tr key={idx} className="inv-row">
                    <td><Link to={`/invoice-details/${item.invoiceNum}`} className="inv-link">{item.invoiceNum}</Link></td>
                    <td className="inv-date">{item.invoiceDate}</td>
                    <td>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: item.transType === "Return" ? "#fde8e8" : "#e6f4ef",
                        color:      item.transType === "Return" ? "#b91c1c"  : "#2e7d5e",
                        border:     item.transType === "Return" ? "1px solid #f0c4c0" : "1px solid #b3d9cc",
                      }}>
                        {item.transType === "Return" ? "Return" : "Sale"}
                      </span>
                    </td>
                    <td className="num inv-amount">{fmt(item.amount)}</td>
                    <td className="num inv-muted">{fmt(item.tax)}</td>
                    <td className="num inv-muted">{fmt(item.roundingOff)}</td>
                    <td><span className="inv-mode">{item.paymentMode}</span></td>
                    <td>
                      <button onClick={() => setShowReturn(true)}
                        style={{ padding:"4px 12px", border:"1px solid #334b71", borderRadius:6, background:"#fff", color:"#334b71", fontWeight:700, cursor:"pointer", fontSize:12 }}>
                        Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="inv-pagination">
            <span className="inv-page-info">Page {currentPage} of {totalPages}</span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => setCurrentPage(p => p-1)} disabled={currentPage===1} className="inv-page-btn">← Prev</button>
              <button onClick={() => setCurrentPage(p => p+1)} disabled={currentPage>=totalPages} className="inv-page-btn">Next →</button>
            </div>
          </div>
        )}

        {!loading && filteredInvoices.length > 0 && (
          <div className="inv-summary">
            <div className="inv-summary-card primary">
              <div className="inv-summary-label">Total Spent</div>
              <div className="inv-summary-value">SAR {fmt(totalSpent)}</div>
              <div className="inv-summary-sub">{totalInvoices} invoice{totalInvoices !== 1 ? "s" : ""}</div>
            </div>
            <div className="inv-summary-card">
              <div className="inv-summary-label">Total Tax Paid</div>
              <div className="inv-summary-value secondary">SAR {fmt(totalTax)}</div>
              <div className="inv-summary-sub">VAT included</div>
            </div>
          </div>
        )}
      </div>

      {/* Sales Return Modal */}
      {showReturn && (
        <SalesReturn
          custId={custId}
          onClose={() => {
            setShowReturn(false);
            setToast({ msg: "Return processed successfully.", type: "success" });
            setTimeout(() => setToast(null), 5000);
          }}
        />
      )}

      <style>{`
        .inv-wrap { font-family:'Segoe UI',system-ui,sans-serif; padding:28px 32px; max-width:1100px; color:#0f172a; background:#f8fafc; min-height:100%; }
        .inv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px; }
        .inv-title { margin:0 0 4px; font-size:22px; font-weight:800; color:#1e293b; }
        .inv-sub { margin:0; font-size:13px; color:#64748b; }
        .inv-toast { margin-bottom:14px; padding:11px 16px; border-radius:10px; font-size:13px; font-weight:600; }
        .inv-toast.success { background:#e6f4ef; border:1px solid #b3d9cc; color:#2e7d5e; }
        .inv-toast.error { background:#fdf3f3; border:1px solid #f0c4c0; color:#b91c1c; }
        .inv-filters { display:flex; gap:10px; margin-bottom:18px; flex-wrap:wrap; align-items:center; }
        .inv-search-wrap { position:relative; flex:1; min-width:220px; }
        .inv-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:18px; pointer-events:none; }
        .inv-search { width:100%; height:40px; padding:0 12px 0 36px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:13px; background:#fff; outline:none; box-sizing:border-box; }
        .inv-select { height:40px; padding:0 12px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:13px; background:#fff; outline:none; cursor:pointer; }
        .inv-btn-refresh { height:40px; padding:0 18px; border-radius:10px; border:none; background:#334b71; color:#fff; font-size:13px; font-weight:700; cursor:pointer; }
        .inv-table-wrap { border-radius:14px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 20px rgba(15,23,42,.06); background:#fff; }
        .inv-table { width:100%; border-collapse:collapse; }
        .inv-table thead th { background:#f1f5f9; color:#475569; font-weight:700; font-size:11px; text-align:left; padding:12px 16px; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:.06em; }
        .inv-table thead th.num { text-align:right; }
        .inv-row td { padding:13px 16px; font-size:13.5px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .inv-row:last-child td { border-bottom:none; }
        .inv-row:hover td { background:#f8faff; }
        .inv-link { color:#334b71; text-decoration:none; font-weight:700; font-size:13px; }
        .inv-date { color:#64748b; font-size:12.5px; }
        .inv-amount { font-weight:700; color:#1e293b; }
        .inv-muted { color:#94a3b8; font-weight:500; }
        .num { text-align:right; }
        .inv-mode { display:inline-block; background:#eef2f7; color:#334b71; border-radius:6px; padding:3px 9px; font-size:12px; font-weight:600; }
        .inv-empty { text-align:center; padding:40px; color:#94a3b8; font-size:13px; }
        .inv-loading { display:flex; align-items:center; gap:10px; padding:40px 0; color:#64748b; font-size:13px; }
        .inv-spinner { width:18px; height:18px; border-radius:50%; border:2.5px solid #e2e8f0; border-top-color:#334b71; animation:inv-spin .8s linear infinite; }
        @keyframes inv-spin { to { transform:rotate(360deg); } }
        .inv-error { padding:14px 18px; background:#fdf3f3; border:1px solid #f0c4c0; border-radius:10px; color:#b91c1c; font-size:13px; }
        .inv-pagination { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
        .inv-page-info { font-size:13px; color:#64748b; }
        .inv-page-btn { height:34px; padding:0 14px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#334b71; font-size:13px; font-weight:700; cursor:pointer; }
        .inv-page-btn:disabled { opacity:.4; cursor:not-allowed; }
        .inv-summary { display:grid; grid-template-columns:1.5fr 1fr; gap:14px; margin-top:20px; }
        .inv-summary-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 22px; box-shadow:0 2px 10px rgba(15,23,42,.05); }
        .inv-summary-card.primary { background:linear-gradient(135deg,#1e3a5f 0%,#334b71 60%,#3d5a85 100%); border-color:transparent; }
        .inv-summary-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#94a3b8; margin-bottom:8px; }
        .inv-summary-card.primary .inv-summary-label { color:rgba(255,255,255,.65); }
        .inv-summary-value { font-size:24px; font-weight:800; color:#1e293b; letter-spacing:-.5px; line-height:1; margin-bottom:6px; }
        .inv-summary-card.primary .inv-summary-value { color:#fff; font-size:28px; }
        .inv-summary-value.secondary { color:#334b71; }
        .inv-summary-sub { font-size:12px; color:#94a3b8; font-weight:500; }
        .inv-summary-card.primary .inv-summary-sub { color:rgba(255,255,255,.55); }
        @media (max-width:768px) { .inv-wrap { padding:16px; } .inv-summary { grid-template-columns:1fr; } }
      `}</style>
    </>
  );
};

export default InvoicesTab;