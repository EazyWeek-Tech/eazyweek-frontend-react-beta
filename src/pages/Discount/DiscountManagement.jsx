import React from "react";
import { useNavigate } from "react-router-dom";

const DiscountManagement = () => {
  const navigate = useNavigate();

  return (
    <div className="dms-container">
      {/* Top bar */}
      <div className="dms-topbar">
        <button
          className="back-btn"
          onClick={() => navigate("/dashboard")} // <-- change if your dashboard route is different
          aria-label="Back to Dashboard"
        >
          ← Back to Dashboard
        </button>
      </div>

      <h1 className="dms-title">Discount Management System</h1>
      <p className="dms-subtitle">
        Create and manage sophisticated discount strategies for your business
        with our comprehensive configuration tool.
      </p>

      <div className="dms-card-grid">
        <div className="dms-card">
          <div className="icon">%</div>
          <h3>Simple Discounts</h3>
          <p>
            Create percentage or fixed amount discounts for items, categories, or entire invoices
          </p>
        </div>

        <div className="dms-card">
          <div className="icon">⇅</div>
          <h3>Mix & Match</h3>
          <p>
            Offer combination discounts when customers purchase specific item pairs with minimum quantities
          </p>
        </div>

        <div className="dms-card">
          <div className="icon">⚙</div>
          <h3>Threshold Discounts</h3>
          <p>
            Apply discounts when customers meet minimum value or quantity requirements
          </p>
        </div>
      </div>

      <div className="dms-cta">
        <h2>Ready to Get Started?</h2>
        <p>Configure your discount strategies and boost your sales with targeted offers</p>
        <button className="dms-btn" onClick={() => navigate("/discounts/configure/simple")}>
          Setup Discounts
        </button>
      </div>

      <div className="dms-features">
        <div className="dms-box">
          <h3>Key Features</h3>
          <ul>
            <li>Multi-level discount application (Item/Category/Invoice)</li>
            <li>Percentage and fixed amount discounts</li>
            <li>Date-based discount scheduling</li>
            <li>Complex combination and threshold rules</li>
          </ul>
        </div>
        <div className="dms-box">
          <h3>Use Cases</h3>
          <ul>
            <li>Seasonal sales and promotions</li>
            <li>Bulk purchase incentives</li>
            <li>Cross-selling opportunities</li>
            <li>Customer loyalty rewards</li>
          </ul>
        </div>
      </div>

      <style>{`
        .dms-container {
          font-family: "Lato", sans-serif;
          padding: 20px;
          background: #f9fafa;
          color: #334b71;
          text-align: center;
          max-width: 850px;
          margin: 0 auto;
          font-size: 12px;
          line-height: 20px;
        }
        .dms-topbar{
          display:flex;
          justify-content:flex-end;
          margin-bottom:30px;
        }
        .back-btn{
          background:#fff;
          border:1px solid #e7ecf4;
          color:#334b71;
          padding:10px 14px;
          border-radius:10px;
          font-weight:600;
          cursor:pointer;
        }
        .back-btn:hover{ filter: brightness(0.97); }

        .dms-card h3, .dms-cta h2{font-size: 16px; line-height: 22px; font-weight: 700;}
        .dms-title {
          font-size: 2.2rem;
          font-weight: bold;
          margin-bottom: 10px;
          color: #071D49;
        }
        .dms-subtitle {
          color: #333;
          margin-bottom: 30px;
        }
        .dms-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        .dms-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.06);
          transition: transform 0.2s ease;
        }
        .dms-card:hover { transform: translateY(-4px); }
        .icon {
          font-size: 24px;
          width: 45px; height: 45px;
          border-radius: 50%;
          display:flex; align-items:center; justify-content:center;
          margin: 0 auto 20px;
          background: #334b71; color:#fff;
        }
        .dms-cta {
          background: #E9EDF5;
          padding: 30px;
          border-radius: 12px;
          margin: 40px auto;
          max-width: 700px;
        }
        .dms-btn {
          background: #334b71;
          border: none;
          color: white;
          font-weight: bold;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 15px;
          transition: background 0.2s ease;
        }
        .dms-btn:hover { background: #2b3f61; }
        .dms-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-top: 30px;
          text-align: left;
        }
        .dms-box {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.06);
        }
        .dms-box h3 {
          margin-bottom: 12px;
          font-size: 16px;
          font-weight: 700;
          color: #071D49;
        }
        ul { list-style: none; padding: 0; }
        ul li { margin: 8px 0; position: relative; padding-left: 20px; }
        ul li::before {
          content: "•";
          position: absolute; left: 0; color: #334b71;
        }
      `}</style>
    </div>
  );
};

export default DiscountManagement;
