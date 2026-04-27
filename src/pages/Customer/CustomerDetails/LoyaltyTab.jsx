import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../config";
const HEADERS = { "Cache-Control": "no-cache", Pragma: "no-cache" };

const fmt = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const TYPE_STYLE = {
  EARN:    { bg: "#e6f4ef", color: "#2e7d5e", border: "#b3d9cc", label: "Earn" },
  REDEEMED:{ bg: "#fff0ee", color: "#cc6b5c", border: "#f5c4b0", label: "Redeem" },
  EXPIRED: { bg: "#fdf3f3", color: "#b94a3a", border: "#f0c4c0", label: "Expired" },
};

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "32px 0", color: "#6e7b8f", fontSize: 13 }}>
    <div style={{ width: 20, height: 20, borderRadius: "50%", border: "3px solid #e5ebf3", borderTopColor: "#334b71", animation: "lt-spin 0.8s linear infinite" }} />
    Loading…
    <style>{`@keyframes lt-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const LoyaltyTab = ({ custId, recId }) => {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const pageSize = 10;

  // Fetch balance
  useEffect(() => {
    if (!recId) return;
    setBalanceLoading(true);
    fetch(`${API_BASE_URL}/api/v1/points/balance/${recId}`, { headers: HEADERS })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setBalance(d))
      .catch(() => setError("Failed to load loyalty balance."))
      .finally(() => setBalanceLoading(false));
  }, [recId]);

  // Fetch history
  const loadHistory = (p = 1) => {
    if (!recId) return;
    setHistoryLoading(true);
    fetch(`${API_BASE_URL}/api/v1/points/history/${recId}?page=${p}&pageSize=${pageSize}`, { headers: HEADERS })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setHistory(d.data ?? []);
        setTotalPages(Math.ceil((d.total ?? 0) / pageSize) || 1);
        setPage(p);
      })
      .catch(() => setError("Failed to load point history."))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => { loadHistory(1); }, [recId]);

  if (!recId) return (
    <div style={{ padding: "24px 0", color: "#6e7b8f", fontSize: 13 }}>
      No customer record ID available to load loyalty data.
    </div>
  );

  const availPts    = balance?.availablePoints ?? 0;
  const redeemedPts = balance?.redeemedPoints  ?? 0;
  const expiredPts  = balance?.expiredPoints   ?? 0;
  const totalEarned = availPts + redeemedPts + expiredPts;
  const progressPct = totalEarned > 0 ? Math.min(availPts / Math.max(totalEarned, 1), 1) : 0;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#334b71", maxWidth: 920, margin: "0 auto", padding: "20px 0" }}>

      {error && (
        <div style={{ background: "#fdf3f3", border: "1px solid #f0c4c0", borderRadius: 10, padding: "12px 16px", color: "#cc6b5c", fontSize: 13, marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Balance hero card ── */}
      <div style={{ background: "#334b71", borderRadius: 16, padding: "22px 24px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(167,209,205,0.12)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 60, bottom: -50, width: 120, height: 120, borderRadius: "50%", background: "rgba(243,220,176,0.08)", pointerEvents: "none" }} />

        {balanceLoading ? (
          <Spinner />
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Available Points</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{availPts.toLocaleString()}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 5 }}>pts available to use</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <span style={{ background: "rgba(167,209,205,0.2)", border: "1px solid rgba(167,209,205,0.35)", color: "#A7D1CD", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                  {redeemedPts.toLocaleString()} redeemed
                </span>
                <span style={{ background: "rgba(204,107,92,0.2)", border: "1px solid rgba(204,107,92,0.35)", color: "#f5b0a0", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                  {expiredPts.toLocaleString()} expired
                </span>
              </div>
            </div>

            <div style={{ marginTop: 20, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Available vs total earned</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>{availPts.toLocaleString()} / {totalEarned.toLocaleString()} pts</span>
              </div>
              <div style={{ height: 7, background: "rgba(255,255,255,0.15)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round(progressPct * 100)}%`, background: "#A7D1CD", borderRadius: 999 }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Summary stats ── */}
      {!balanceLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Available",  value: availPts.toLocaleString(),    color: "#334b71" },
            { label: "Redeemed",   value: redeemedPts.toLocaleString(), color: "#2e7d5e" },
            { label: "Expired",    value: expiredPts.toLocaleString(),  color: "#cc6b5c" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5ebf3", boxShadow: "0 1px 4px rgba(51,75,113,0.06)" }}>
              <div style={{ fontSize: 11, color: "#6e7b8f", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#8da0b8", marginTop: 4 }}>points</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Point history ── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5ebf3", overflow: "hidden", boxShadow: "0 1px 4px rgba(51,75,113,0.06)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f4fa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#334b71" }}>Point History</div>
          {!historyLoading && (
            <span style={{ fontSize: 11, color: "#6e7b8f", fontWeight: 600, background: "#eef2f7", padding: "3px 10px", borderRadius: 999, border: "1px solid #e5ebf3" }}>
              {history.length} records
            </span>
          )}
        </div>

        {historyLoading ? (
          <div style={{ padding: "0 18px" }}><Spinner /></div>
        ) : history.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "#6e7b8f", fontSize: 13 }}>No transaction history found.</div>
        ) : (
          <>
            {/* ── Table header — sequence: Date | Type | Invoice No | Points Earned on Invoice | Total Balance ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.6fr 1.1fr 1.4fr 1fr", padding: "9px 18px", background: "#f4f7fb", borderBottom: "1px solid #e5ebf3", fontSize: 12, fontWeight: 700, color: "#6e7b8f", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>Date</span>
              <span>Type</span>
              <span>Invoice No</span>
              <span style={{ textAlign: "right" }}>Points Earned on Invoice</span>
              <span style={{ textAlign: "right" }}>Total Balance</span>
            </div>

            {history.map((r, i) => {
              const ts = TYPE_STYLE[r.transactionType] ?? TYPE_STYLE.EARN;
              const isNeg = r.transactionType === "REDEEMED" || r.transactionType === "EXPIRED";
              // Extract invoice number from description e.g. "INV INVBright00146" → "INVBright00146"
              const descParts = (r.description || "").trim().split(/\s+/);
              const invoiceNo = descParts.length > 1 ? descParts[descParts.length - 1] : (r.description || "—");
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 1.4fr 1.2fr 1fr", padding: "12px 18px", alignItems: "center", background: i % 2 === 0 ? "#fff" : "#fafbfe", borderBottom: i < history.length - 1 ? "1px solid #f0f4fa" : "none", fontSize: 13 }}>
                  <span style={{ color: "#6e7b8f", fontSize: 14 }}>{fmtTime(r.transactionDate)}</span>
                  <span>
                    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                      {ts.label}
                    </span>
                  </span>
                  <span style={{ color: "#334b71", fontWeight: 600, fontSize: 14 }}>{invoiceNo}</span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: isNeg ? "#cc6b5c" : "#2e7d5e" }}>
                    {isNeg ? "-" : "+"}{r.points.toLocaleString()}
                  </span>
                  <span style={{ textAlign: "right", fontWeight: 600, color: "#334b71" }}>
                    {r.pointsBalanceAfter.toLocaleString()}
                  </span>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: "12px 18px", borderTop: "1px solid #f0f4fa", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafbfe" }}>
                <span style={{ fontSize: 12, color: "#6e7b8f" }}>Page {page} of {totalPages}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={page <= 1} onClick={() => loadHistory(page - 1)} style={{ height: 28, padding: "0 12px", borderRadius: 7, border: "1px solid #e5ebf3", background: "#fff", color: "#334b71", fontSize: 12, fontWeight: 700, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1, fontFamily: "inherit" }}>← Prev</button>
                  <button disabled={page >= totalPages} onClick={() => loadHistory(page + 1)} style={{ height: 28, padding: "0 12px", borderRadius: 7, border: "1px solid #e5ebf3", background: "#fff", color: "#334b71", fontSize: 12, fontWeight: 700, cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1, fontFamily: "inherit" }}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoyaltyTab;