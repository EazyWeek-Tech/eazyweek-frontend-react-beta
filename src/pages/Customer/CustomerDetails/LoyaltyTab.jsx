import React from "react";

const LoyaltyTab = ({ custId }) => {
  // ----- Static demo data (you can wire to API later) -----
  const balanceAmount = 125.0;
  const balancePoints = 12500;
  const tierName = "Tier 1";
  const pointsMultiplier = "4x Points";
  const progressLabel = "$97";
  const progressPct = 0.52; // 52% filled, tweak for your sample

  const pointsExpiring = [
    { id: 1, points: 200, expiresOn: "2025-12-30", note: "Use your points before they expire" },
  ];

  const pointHistory = [
    { id: 1, date: "2025-09-01 10:24", type: "Earn",    points: +250, amount: 62.5,  note: "Invoice INV-1024 purchase" },
    { id: 2, date: "2025-09-08 14:05", type: "Redeem",  points: -100, amount: -10.0, note: "Applied at Checkout ORD-554" },
    { id: 3, date: "2025-09-17 18:41", type: "Earn",    points: +75,  amount: 18.9,  note: "Add-on service" },
  ];

  const fmtMoney = (n) =>
    (n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2));

  return (
    <div className="loyalty-screen">
      {/* Balance card */}
      <div className="balance-card">
        <div className="amount">${balanceAmount.toFixed(2)}</div>
        <div className="points">{balancePoints.toLocaleString()} Points</div>

        <div className="badges">
          <span className="badge">
            <span className="icon">☆</span> {tierName}
          </span>
          <span className="badge">
            <span className="icon">✦</span> {pointsMultiplier}
          </span>
        </div>

        <div className="progress">
          <div className="bar">
            <div className="fill" style={{ width: `${Math.round(progressPct * 100)}%` }} />
          </div>
          <div className="progress-label">{progressLabel}</div>
        </div>
      </div>

      {/* Active Challenges intentionally removed */}

      {/* Transaction History */}
      <h3 className="section-title">Transaction History</h3>

      {/* Points Expiring */}
      <div className="card">
        <div className="card-title">Points Expiring</div>
        <table className="grid">
          <thead>
            <tr>
              <th className="left">Points</th>
              <th className="left">Expires On</th>
              <th className="left">Note</th>
            </tr>
          </thead>
          <tbody>
            {pointsExpiring.map((r) => (
              <tr key={r.id}>
                <td className="left">{r.points}</td>
                <td className="left">{r.expiresOn}</td>
                <td className="left">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Point History */}
      <div className="card">
        <div className="card-title">Point History</div>
        <table className="grid">
          <thead>
            <tr>
              <th className="left">Date</th>
              <th className="left">Type</th>
              <th className="right">Points</th>
              <th className="right">Amount</th>
              <th className="left">Note</th>
            </tr>
          </thead>
          <tbody>
            {pointHistory.map((r) => (
              <tr key={r.id}>
                <td className="left">{r.date}</td>
                <td className="left">{r.type}</td>
                <td className={`right ${r.points < 0 ? "neg" : "pos"}`}>{r.points}</td>
                <td className={`right ${r.amount < 0 ? "neg" : "pos"}`}>{fmtMoney(r.amount)}</td>
                <td className="left">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx="true">{`
        .loyalty-screen {  max-width: 700px; margin: 30px ;  }

        .balance-card {
          background: linear-gradient(160deg, #102e55, #817e7e);
          color: #fff; padding: 18px; border-radius: 16px;
          box-shadow: 0 8px 24px rgba(59, 43, 143, 0.25);
          margin: 0 0 30px;
        }
        .amount { font-size: 28px; font-weight: 800; line-height: 1; }
        .points { opacity: 0.9; margin-top: 4px; font-weight: 600; }

        .badges { display: none; gap: 10px; margin-top: 12px; }
        .badge {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 6px 10px; border-radius: 999px;
          font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;
        }
        .badge .icon { font-size: 13px; }

        .progress { margin-top: 14px; }
        .bar {
          height: 8px; background: rgba(255,255,255,0.25); border-radius: 999px; overflow: hidden;
        }
        .fill {
          height: 100%; background: #ffffff; opacity: 0.9; border-radius: 999px;
        }
        .progress-label { margin-top: 8px; font-size: 12px; opacity: 0.95; font-weight: 700; }

        .section-title { margin: 6px 0 2px; color: #fff;padding: 20px 10px;  }

        .card {
          background: #fff; border-radius: 12px; padding: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,.06);margin: 0 0 30px;
        }
        .card-title { font-weight: 800; color: #111827; margin-bottom: 10px; }

        table.grid { width: 100%; border-collapse: separate; border-spacing: 0; }
        thead th {
          background: #f3f4f6; color: #111827; font-weight: 700; font-size: 13px;
          padding: 10px; border-bottom: 1px solid #e5e7eb;
        }
        tbody td { font-size: 13px; color: #111827; padding: 10px; border-bottom: 1px solid #f3f4f6; }
        .left { text-align: left; }
        .right { text-align: right; }
        .pos { color: #065f46; }
        .neg { color: #b91c1c; }

        @media (max-width: 560px) {
          .amount { font-size: 24px; }
          .badge { font-size: 11px; }
        }
      `}</style>
    </div>
  );
};

export default LoyaltyTab;
