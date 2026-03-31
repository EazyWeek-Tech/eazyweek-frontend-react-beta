import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Mock service — replace with your actual API call
const fetchLoyaltyPrograms = () =>
  Promise.resolve(
    // Simulates an existing program; set to [] to see empty state
    [
      {
        id: "LYL-001",
        name: "Eazyweek Rewards",
        status: "Active",
        assignMode: "onrequest",
        currency: "INR (₹)",
        earnAmount: 100,
        earnPoints: 10,
        redeemPoints: 10,
        redeemAmount: 1,
        createdAt: "2024-11-15",
        updatedAt: "2025-03-20",
      },
    ]
  );

const COLORS = {
  primary: "#334b71",
  teal: "#A7D1CD",
  coral: "#cc6b5c",
  grid: "#eef2f7",
  axis: "#6e7b8f",
  success: "#2e7d5e",
  successBg: "#e6f4ef",
};

const StatusBadge = ({ status }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: status === "Active" ? COLORS.successBg : "#fdf3f3",
      color: status === "Active" ? COLORS.success : COLORS.coral,
      border: `1px solid ${status === "Active" ? "#b3d9cc" : "#f0c4c0"}`,
    }}
  >
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: status === "Active" ? COLORS.success : COLORS.coral,
        display: "inline-block",
      }}
    />
    {status}
  </span>
);

const InfoPill = ({ label, value }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 3,
      padding: "10px 14px",
      background: COLORS.grid,
      borderRadius: 10,
      border: "1px solid #e5ebf3",
      minWidth: 110,
    }}
  >
    <span style={{ fontSize: 11, color: COLORS.axis, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {label}
    </span>
    <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.primary }}>{value}</span>
  </div>
);

export default function LoyaltyListing() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyPrograms()
      .then((data) => setPrograms(data))
      .finally(() => setLoading(false));
  }, []);

  const hasProgram = programs.length > 0;
  const program = programs[0] ?? null;

  return (
    <div className="lyl-list-wrap">
      {/* ── Page Header ── */}
      <div className="lyl-list-header">
        <div className="lyl-list-header-left">
          <div className="lyl-list-icon">★</div>
          <div>
            <h1 className="lyl-list-h1">Loyalty Program</h1>
            <p className="lyl-list-sub">
              {hasProgram
                ? "Manage your active loyalty program configuration"
                : "Configure your loyalty program to start rewarding customers"}
            </p>
          </div>
        </div>

        <button
          className={`lyl-list-cta ${hasProgram ? "update" : "create"}`}
          onClick={() => navigate("/loyalty/config")}
        >
          {hasProgram ? "✎ Update Program" : "+ Create Program"}
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="lyl-list-loading">
          <div className="lyl-spinner" />
          <span>Loading program…</span>
        </div>
      ) : hasProgram ? (
        /* ── Program Card ── */
        <div className="lyl-prog-card">
          <div className="lyl-prog-top">
            <div className="lyl-prog-title-row">
              <div>
                <h2 className="lyl-prog-name">{program.name}</h2>
                <span className="lyl-prog-id">{program.id}</span>
              </div>
              <StatusBadge status={program.status} />
            </div>

            <div className="lyl-prog-pills">
              <InfoPill
                label="Earn Rate"
                value={`${program.currency.split(" ")[0]} ${program.earnAmount} → ${program.earnPoints} pts`}
              />
              <InfoPill
                label="Redeem Rate"
                value={`${program.redeemPoints} pts → ${program.currency.split(" ")[0]} ${program.redeemAmount}`}
              />
              <InfoPill
                label="Enrollment"
                value={program.assignMode === "auto" ? "Auto" : "On Request"}
              />
              <InfoPill label="Currency" value={program.currency} />
            </div>
          </div>

          <div className="lyl-prog-footer">
            <span className="lyl-prog-meta">
              Created: <b>{program.createdAt}</b>
            </span>
            <span className="lyl-prog-meta">
              Last updated: <b>{program.updatedAt}</b>
            </span>
            <button
              className="lyl-prog-edit-btn"
              onClick={() => navigate("/loyalty/config")}
            >
              Edit Configuration →
            </button>
          </div>
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="lyl-empty">
          <div className="lyl-empty-icon">★</div>
          <h2 className="lyl-empty-h2">No loyalty program configured</h2>
          <p className="lyl-empty-p">
            Create your first loyalty program to define earning and redemption rules for your customers.
          </p>
          <button
            className="lyl-list-cta create"
            onClick={() => navigate("/loyalty/config")}
          >
            + Create Program
          </button>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        .lyl-list-wrap {
          --lp: #334b71;
          --lt: #A7D1CD;
          --la: #6e7b8f;
          --lg: #eef2f7;
          padding: 28px 24px;
          max-width: 960px;
          margin: 0 auto;
          display: grid;
          gap: 20px;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif;
          color: var(--lp);
        }

        /* Header */
        .lyl-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: #fff;
          border: 1px solid #e5ebf3;
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          flex-wrap: wrap;
        }
        .lyl-list-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .lyl-list-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: var(--lt);
          display: grid; place-items: center;
          font-size: 22px; font-weight: 900;
          color: var(--lp); flex-shrink: 0;
        }
        .lyl-list-h1 {
          margin: 0 0 5px; font-size: 20px; font-weight: 800; color: var(--lp);
        }
        .lyl-list-sub { margin: 0; color: var(--la); font-size: 13px; }

        /* CTA button */
        .lyl-list-cta {
          height: 42px; padding: 0 20px;
          border-radius: 12px; font-weight: 800; cursor: pointer;
          font-size: 14px; border: none; white-space: nowrap;
          transition: filter .15s, box-shadow .15s, transform .05s;
        }
        .lyl-list-cta.create {
          background: var(--lp); color: #fff;
          box-shadow: 0 4px 12px rgba(51,75,113,0.22);
        }
        .lyl-list-cta.update {
          background: #fff; color: var(--lp);
          border: 1.5px solid var(--lp);
        }
        .lyl-list-cta:hover { filter: brightness(0.94); transform: translateY(-1px); }
        .lyl-list-cta:active { transform: translateY(0); }

        /* Program card */
        .lyl-prog-card {
          background: #fff;
          border: 1px solid #e5ebf3;
          border-radius: 14px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .lyl-prog-top { padding: 20px; }
        .lyl-prog-title-row {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px; margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .lyl-prog-name { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
        .lyl-prog-id { font-size: 12px; color: var(--la); font-weight: 600; }

        .lyl-prog-pills {
          display: flex; flex-wrap: wrap; gap: 10px;
        }

        .lyl-prog-footer {
          background: var(--lg);
          border-top: 1px solid #e5ebf3;
          padding: 12px 20px;
          display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
        }
        .lyl-prog-meta { font-size: 12px; color: var(--la); }
        .lyl-prog-meta b { color: var(--lp); }
        .lyl-prog-edit-btn {
          margin-left: auto;
          background: none; border: none;
          color: var(--lp); font-weight: 800; font-size: 13px;
          cursor: pointer; padding: 0;
          text-decoration: underline; text-decoration-color: transparent;
          transition: text-decoration-color .15s;
        }
        .lyl-prog-edit-btn:hover { text-decoration-color: var(--lp); }

        /* Loading */
        .lyl-list-loading {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; padding: 60px 20px;
          color: var(--la); font-size: 14px;
        }
        .lyl-spinner {
          width: 22px; height: 22px; border-radius: 50%;
          border: 3px solid #e5ebf3; border-top-color: var(--lp);
          animation: lyl-spin 0.8s linear infinite;
        }
        @keyframes lyl-spin { to { transform: rotate(360deg); } }

        /* Empty state */
        .lyl-empty {
          background: #fff;
          border: 1px dashed #d0d9e8;
          border-radius: 14px;
          padding: 60px 24px;
          display: flex; flex-direction: column;
          align-items: center; gap: 12px; text-align: center;
        }
        .lyl-empty-icon {
          width: 64px; height: 64px;
          border-radius: 16px; background: var(--lt);
          display: grid; place-items: center;
          font-size: 28px; font-weight: 900; color: var(--lp);
          margin-bottom: 4px;
        }
        .lyl-empty-h2 { margin: 0; font-size: 18px; font-weight: 800; color: var(--lp); }
        .lyl-empty-p { margin: 0; color: var(--la); font-size: 14px; max-width: 380px; }
      `}</style>
    </div>
  );
}