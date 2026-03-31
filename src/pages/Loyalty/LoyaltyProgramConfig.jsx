import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const COLORS = {
  primary: "#334b71",   // deep navy
  coral: "#cc6b5c",     // warm coral
  sand: "#F3DCB0",      // soft sand
  slate: "#8da0b8",     // slate
  teal: "#A7D1CD",      // teal
  grid: "#eef2f7",      // light grid
  axis: "#6e7b8f",      // secondary text
};

export default function LoyaltyProgramConfig() {
  const navigate = useNavigate();

  const [assignMode, setAssignMode] = useState("onrequest");
  const [currency, setCurrency] = useState("USD ($)");
  const [earnAmount, setEarnAmount] = useState("10");
  const [earnPoints, setEarnPoints] = useState("1");
  const [redeemPoints, setRedeemPoints] = useState("1");
  const [redeemAmount, setRedeemAmount] = useState("1");

  const earnPreview = useMemo(() => {
    const a = Number(earnAmount) || 0;
    const p = Number(earnPoints) || 0;
    return a > 0 && p > 0 ? `${currency.split(" ")[0]} ${a} = ${p} points` : "—";
  }, [earnAmount, earnPoints, currency]);

  const redeemPreview = useMemo(() => {
    const a = Number(redeemAmount) || 0;
    const p = Number(redeemPoints) || 0;
    return p > 0 && a > 0 ? `${p} points = ${currency.split(" ")[0]} ${a}` : "—";
  }, [redeemAmount, redeemPoints, currency]);

  const onSave = () => {
    const payload = {
      assignMode,
      currency,
      earning: { amount: Number(earnAmount), points: Number(earnPoints) },
      redemption: { points: Number(redeemPoints), amount: Number(redeemAmount) },
    };
    console.log("Save Configuration →", payload);
    alert("Configuration saved (check console for payload).");
  };

  return (
    <div className="lyl-wrap">
      <header className="lyl-header">
        <div className="lyl-icon">★</div>
        <div className="lyl-headcopy">
          <h1 className="lyl-h1">Loyalty Program Configuration</h1>
          <p className="lyl-sub">
            Set up your earning and redemption rules to create a rewarding experience for your customers
          </p>
        </div>
        <button
          type="button"
          className="lyl-back"
          onClick={() => navigate("/loyalty")}
          aria-label="Back to Loyalty Listing"
          title="Back to Loyalty Listing"
        >
          ← Back to Loyalty Listing
        </button>
      </header>

      {/* Loyalty Number Creation */}
      <section className="lyl-card">
        <h2 className="lyl-card-title">Loyalty Number Creation</h2>

        <div className="lyl-radio-cards">
          <label className={`lyl-radio-card ${assignMode === "auto" ? "active" : ""}`}>
            <input
              type="radio"
              name="assignMode"
              value="auto"
              checked={assignMode === "auto"}
              onChange={() => setAssignMode("auto")}
            />
            <div className="lyl-rc-head">
              <span className="lyl-dot" />
              <div className="lyl-rc-title">Auto-create for all customers</div>
            </div>
            <div className="lyl-rc-desc">
              Loyalty numbers will be automatically generated and assigned to every customer when they
              are created in the system.
            </div>
          </label>

          <label className={`lyl-radio-card ${assignMode === "onrequest" ? "active" : ""}`}>
            <input
              type="radio"
              name="assignMode"
              value="onrequest"
              checked={assignMode === "onrequest"}
              onChange={() => setAssignMode("onrequest")}
            />
            <div className="lyl-rc-head">
              <span className="lyl-dot" />
              <div className="lyl-rc-title">Issue based on customer request</div>
            </div>
            <div className="lyl-rc-desc">
              Loyalty numbers will only be created when customers specifically request to join the loyalty program.
            </div>
          </label>
        </div>
      </section>

      {/* Earning + Redemption */}
      <section className="lyl-twocol">
        <div className="lyl-card">
          <h2 className="lyl-card-title">Earning Rules</h2>
          <p className="lyl-muted">Configure how customers earn loyalty points</p>

          <div className="lyl-field">
            <label>Currency</label>
            <div className="lyl-select">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>SAR (﷼)</option>
                <option>AED (د.إ)</option>
              </select>
            </div>
          </div>

          <div className="lyl-grid2">
            <div className="lyl-field">
              <label>Amount ({currency.split(" ")[0]})</label>
              <input
                inputMode="decimal"
                value={earnAmount}
                onChange={(e) => setEarnAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="10"
              />
            </div>
            <div className="lyl-field">
              <label>Loyalty Points</label>
              <input
                inputMode="numeric"
                value={earnPoints}
                onChange={(e) => setEarnPoints(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="1"
              />
            </div>
          </div>

          <div className="lyl-pill">{earnPreview}</div>
        </div>

        <div className="lyl-card">
          <h2 className="lyl-card-title">Redemption Rules</h2>
          <p className="lyl-muted">Configure how customers redeem loyalty points</p>

          <div className="lyl-grid2">
            <div className="lyl-field">
              <label>Loyalty Points</label>
              <input
                inputMode="numeric"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="1"
              />
            </div>
            <div className="lyl-field">
              <label>Amount ({currency.split(" ")[0]})</label>
              <input
                inputMode="decimal"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="1"
              />
            </div>
          </div>

          <button className="lyl-formula" type="button" aria-label="Redemption Formula">
            {redeemPreview}
          </button>
        </div>
      </section>

      {/* Divider banner like the PDF strip */}
      <div className="lyl-banner">
        <span>{earnPreview}</span>
      </div>

      {/* Summary */}
      <section className="lyl-card">
        <h2 className="lyl-card-title">Configuration Summary</h2>
        <p className="lyl-muted">Review your loyalty program settings before saving</p>

        <ul className="lyl-summary">
          <li>
            <span className="lyl-badge">Loyalty Number Creation</span>
            <div className="lyl-desc">
              {assignMode === "auto"
                ? "Loyalty numbers will be automatically created for all customers during registration"
                : "Loyalty numbers will be created only when customers opt in to the program"}
            </div>
          </li>
          <li>
            <span className="lyl-badge">Earning Rate</span>
            <div className="lyl-desc">
              Customers earn <b>{earnPoints} points</b> for every{" "}
              <b>{currency.split(" ")[0]} {earnAmount}</b> spent
            </div>
          </li>
          <li>
            <span className="lyl-badge">Redemption Rate</span>
            <div className="lyl-desc">
              <b>{redeemPoints} points</b> can be redeemed for{" "}
              <b>{currency.split(" ")[0]} {redeemAmount}</b>
            </div>
          </li>
        </ul>
      </section>

      <div className="lyl-actions">
        <button className="lyl-save" onClick={onSave}>Save Configuration</button>
      </div>

      {/* ===== Styles ===== */}
      <style jsx>{`
        /* Theme tokens (scoped) */
        .lyl-wrap {
          --lyl-primary: ${COLORS.primary};
          --lyl-coral: ${COLORS.coral};
          --lyl-sand: ${COLORS.sand};
          --lyl-slate: ${COLORS.slate};
          --lyl-teal: ${COLORS.teal};
          --lyl-grid: ${COLORS.grid};
          --lyl-axis: ${COLORS.axis};
        }

        /* Page */
        .lyl-wrap {
          background: var(--lyl-grid);
          padding: 24px;
          display: grid;
          max-width: 900px;
          margin: 30px auto;
          gap: 18px;
          color: var(--lyl-primary);
          font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans",
            "Apple Color Emoji", "Segoe UI Emoji";
        }

        /* Header */
        .lyl-header {
          display: grid;
          grid-template-columns: 56px 1fr auto; /* space for back button */
          gap: 14px;
          align-items: center;
          background: #fff;
          border: 1px solid #e5ebf3;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .lyl-icon {
          width: 56px; height: 56px;
          border-radius: 14px;
          display: grid; place-items: center;
          background: var(--lyl-teal);
          color: var(--lyl-primary);
          font-weight: 900;
          font-size: 20px;
        }
        .lyl-h1 {
          margin: 0 0 6px;
          font-size: 22px;
          line-height: 1.15;
          font-weight: 800;
          color: var(--lyl-primary);
        }
        .lyl-sub {
          margin: 0;
          color: var(--lyl-axis);
          font-size: 14px;
        }
        .lyl-back {
          height: 38px;
          padding: 0 12px;
          border-radius: 10px;
          background: #334b71;
          color: #fff;
          border: 1px solid #334b71;
          font-weight: 700;
          cursor: pointer;
          transition: box-shadow .15s, transform .05s, border-color .15s;
          white-space: nowrap;
        }
        .lyl-back:hover { box-shadow: 0 3px 10px rgba(0,0,0,.06); border-color: var(--lyl-primary); }
        .lyl-back:active { transform: translateY(1px); }

        /* Card */
        .lyl-card {
          background: #fff;
          border: 1px solid #e5ebf3;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .lyl-card-title {
          margin: 0 0 10px;
          font-size: 16px;
          font-weight: 800;
          color: var(--lyl-primary);
        }
        .lyl-muted { color: var(--lyl-axis); margin: 4px 0 12px; }

        /* Radio cards */
        .lyl-radio-cards { display: grid; gap: 12px; }
        .lyl-radio-card {
          border: 1px solid #e5ebf3;
          border-radius: 12px;
          padding: 12px 14px;
          background: #fff;
          cursor: pointer;
          transition: box-shadow .2s, border-color .2s, transform .02s;
        }
        .lyl-radio-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.06); }
        .lyl-radio-card.active {
          border-color: var(--lyl-teal);
          box-shadow: 0 0 0 3px rgba(167, 209, 205, 0.35);
        }
        .lyl-radio-card input { display: none; }
        .lyl-rc-head { display: flex; align-items: center; gap: 10px; }
        .lyl-dot {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid var(--lyl-primary); position: relative; flex: 0 0 auto;
        }
        .lyl-radio-card.active .lyl-dot::after {
          content: ""; position: absolute; inset: 2px; background: var(--lyl-primary); border-radius: 50%;
        }
        .lyl-rc-title { font-weight: 800; color: var(--lyl-primary); font-size: 14px; margin: 0 0 8px; }
        .lyl-rc-desc { color: var(--lyl-axis); margin-top: 2px; }

        /* Two column region */
        .lyl-twocol {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 1024px) {
          .lyl-twocol { grid-template-columns: 1fr; }
        }

        /* Fields */
        .lyl-field { display: grid; gap: 6px; margin: 0 0 10px; }
        .lyl-field label { font-size: 13px; color: var(--lyl-axis); }
        .lyl-field input, .lyl-select select {
          height: 40px; border-radius: 10px; padding: 0 12px;
          border: 1px solid #d8dee8; outline: none;
          color: var(--lyl-primary); background: #fff; font-weight: 600;
          transition: border-color .15s, box-shadow .15s;
        }
        .lyl-field input:focus, .lyl-select select:focus {
          border-color: var(--lyl-primary);
          box-shadow: 0 0 0 3px rgba(51, 75, 113, 0.15);
        }
        .lyl-select { position: relative; }
        .lyl-select::after { content: "▾"; position: absolute; right: 12px; top: 8px; color: var(--lyl-axis); pointer-events: none; }

        .lyl-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (max-width: 560px) { .lyl-grid2 { grid-template-columns: 1fr; } }

        /* Preview pills & formula button */
        .lyl-pill {
          margin-top: 12px; display: inline-block;
          background: var(--lyl-grid);
          border: 1px solid #e5ebf3;
          color: var(--lyl-primary);
          border-radius: 999px; padding: 8px 12px; font-weight: 700;
        }
        .lyl-formula {
          margin-top: 12px; width: 100%; height: 42px;
          border-radius: 12px; border: 1px solid var(--lyl-primary);
          background: rgba(167, 209, 205, 0.45);
          color: var(--lyl-primary); font-weight: 800; cursor: default;
        }

        /* Divider Banner */
        .lyl-banner {
          background: #fff; border: 1px solid #e5ebf3;
          border-left: 6px solid var(--lyl-primary);
          border-radius: 12px; padding: 12px; font-weight: 800;
          color: var(--lyl-primary); box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }

        /* Summary */
        .lyl-summary { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
        .lyl-summary li {
          display: grid; grid-template-columns: 240px 1fr;
          gap: 0; align-items: start;
          padding: 0; border: 1px dashed #e5ebf3; border-radius: 12px;
          background: #fff;
        }
        @media (max-width: 820px) { .lyl-summary li { grid-template-columns: 1fr; } }
        .lyl-badge {
          display: inline-block; border-radius: 999px; padding: 10px;
          background: var(--lyl-grid); color: var(--lyl-primary);
          font-weight: 800; border: 1px solid #e5ebf3;
        }
        .lyl-desc { color: var(--lyl-axis); padding: 10px; }
        .lyl-desc b { color: var(--lyl-primary); }

        /* Actions */
        .lyl-actions { display: flex; justify-content: center; }
        .lyl-save {
          min-width: 240px; height: 46px; border-radius: 12px; border: 1px solid #233244;
          background: var(--lyl-primary); color: #fff; font-weight: 800; cursor: pointer;
          box-shadow: 0 6px 16px rgba(51, 75, 113, 0.25);
          transition: transform .05s ease, filter .15s ease, box-shadow .15s;
        }
        .lyl-save:hover { filter: brightness(0.96); box-shadow: 0 8px 18px rgba(51,75,113,.3); }
        .lyl-save:active { transform: translateY(1px); }
        .lyl-save:focus { outline: none; box-shadow: 0 0 0 3px rgba(51, 75, 113, 0.25); }
      `}</style>
    </div>
  );
}
