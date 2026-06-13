import React from "react";
import {
  NavLink,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import SimpleDiscount from "./SimpleDiscount.jsx";
import MixMatch from "./MixMatch.jsx";
import Threshold from "./Threshold.jsx";

const theme = {
  navy: "#334b71",
  darkBlue: "#071D49",
  coral: "#CC6B5C",
  aqua: "#A8D0CF",
  mist: "#E9EDF5",
  slate: "#8DA0B8",
  sand: "#F3DCB0",
  apricot: "#EDAF90",
  border: "#e7ecf4",
  text: "#10223f",
};

function Styles() {
  return (
    <style>{`
      .cfg-wrap { font-family:"Lato", sans-serif; background:#f7f9fc; min-height:100vh; color:${theme.text}; }
      .cfg-container { max-width:1100px; margin:0 auto; padding:28px 20px 60px; }
      .cfg-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
      .cfg-title { font-size:24px; line-height: 32px; font-weight:800; color:${theme.darkBlue}; }
      .view-all { background:#fff; border:1px solid ${theme.border}; padding:8px 12px; border-radius:8px; font-weight:600; color:${theme.navy}; }
      .cards-row { display:grid; grid-template-columns: repeat(3, 1fr); gap:18px; margin:16px 0 20px; }
      .opt-card { background:#fff; border:1.5px solid ${theme.border}; border-radius:12px; padding:16px; display:flex; gap:14px; align-items:flex-start; box-shadow:0 2px 10px rgba(13,27,62,.04); cursor:pointer; }
      .opt-card .ic { min-width:45px; min-height:45px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:${theme.navy}; color:#fff; font-weight:800; }
      .opt-card.active { outline:4px solid ${theme.slate}; box-shadow:0 12px 12px rgba(168,208,207,.25); }
      .cfg-panel { background:#fff; border:1px solid ${theme.border}; border-radius:12px; }
      .cfg-tabs { display:none; grid-template-columns:1fr 1fr 1fr; border-bottom:1px solid ${theme.border}; }
      .cfg-tab { padding:20px 14px; font-size: 16px; text-align:center; font-weight:700; color:${theme.navy}; text-decoration:none; position:relative; }
      .cfg-tab.active { color:${theme.darkBlue}; }
      .cfg-tab.active::after { content:""; position:absolute; left:8px; right:8px; bottom:-1px; height:3px; background:${theme.navy}; border-radius:3px 3px 0 0; }
      .cfg-body { padding:18px; }
      .section { border:1px solid ${theme.border}; border-radius:10px; padding:16px; margin-bottom:14px; background:#fff; }
      .section h4 { margin:0 0 12px; font-size:15px; font-weight:800; color:${theme.darkBlue}; }
      .grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
      .grid-3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
      .field { display:flex; flex-direction:column; gap:6px; }
      label { font-size:12px; font-weight:700; color:#2a3b57; }
      input[type="text"], input[type="number"], input[type="date"], select, textarea {
        border:1px solid ${theme.border}; border-radius:8px; padding:10px 12px; background:#fff; outline:none; font-size:13px;
      }
      textarea { min-height:92px; }
      .help { background:${theme.mist}; border:1px solid ${theme.border}; color:${theme.navy}; font-size:12px; padding:10px 12px; border-radius:8px; }
      .warn { background:#fff6f6; border:1px solid #f3cdcd; color:#a34a4a; padding:10px 12px; border-radius:8px; font-size:12px; }
      .toggle { display:flex; align-items:center; gap:8px; }
      .switch { width:42px; height:24px; border-radius:24px; background:#d3dbe8; position:relative; cursor:pointer; }
      .knob { width:18px; height:18px; background:#fff; border-radius:50%; position:absolute; top:3px; left:3px; transition:all .2s; box-shadow:0 1px 3px rgba(0,0,0,.25); }
      .switch.on { background:${theme.navy}; }
      .switch.on .knob { left:21px; }
      .row-between { display:flex; justify-content:space-between; gap:12px; align-items:center; }
      .btns { display:flex; justify-content:space-between; gap:12px; margin-top:16px; }
      .btn { border:0; padding:12px 18px; border-radius:10px; font-weight:800; cursor:pointer; }
      .btn-secondary { background:#fff; border:1px solid ${theme.border}; color:${theme.navy}; }
      .btn-primary { background:${theme.navy}; color:#fff; }
      .btn-link { background:#fff; border:1px solid ${theme.border}; padding:8px 10px; border-radius:8px; font-weight:700; }
      .tag { display:inline-block; background:${theme.mist}; color:${theme.navy}; border:1px solid ${theme.border}; padding:6px 10px; border-radius:20px; font-size:12px; margin-right:6px; margin-top:6px; }
      .inline { display:flex; gap:10px; align-items:center; }
      .muted { color:#5b6a85; font-size:14px; margin: 10px 0; }
      .topcards{ font-size: 16px; font-weight: 600; margin: 0 0 10px;  }
      .mutedd{ font-size: 12px; line-height: 18px; }
      
      @media (max-width: 840px){
        .cards-row{ grid-template-columns:1fr; }
        .grid-2, .grid-3{ grid-template-columns:1fr; }
      }
    `}</style>
  );
}

export default function DiscountConfig() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const active = {
    simple: pathname.startsWith("/discounts/configure/simple"),
    mix: pathname.startsWith("/discounts/configure/mix"),
    threshold: pathname.startsWith("/discounts/configure/threshold"),
  };

  return (
    <div className="cfg-wrap">
      <Styles />
      <div className="cfg-container">
        <div className="cfg-header">
          <div>
            <div className="cfg-title">Discount Configuration</div>
            <div className="muted">Set up and manage your discount strategies</div>
          </div>
          <button className="view-all" onClick={() => navigate("/discounts/manage")}>
  View All Discounts
</button>
        </div>

        {/* Option cards */}
        <div className="cards-row">
          <div
            className={`opt-card ${active.simple ? "active" : ""}`}
            onClick={() => navigate("/discounts/configure/simple")}
          >
            <div className="ic">%</div>
            <div>
              <div className="topcards">Simple Discount</div>
              <div className="mutedd">Apply percentage or fixed amount discounts</div>
            </div>
          </div>

          <div
            className={`opt-card ${active.mix ? "active" : ""}`}
            onClick={() => navigate("/discounts/configure/mix")}
          >
            <div className="ic">⇅</div>
            <div>
              <div className="topcards">Mix & Match</div>
              <div className="mutedd">Offer discounts when customers purchase combinations</div>
            </div>
          </div>

          <div
            className={`opt-card ${active.threshold ? "active" : ""}`}
            onClick={() => navigate("/discounts/configure/threshold")}
          >
            <div className="ic">◎</div>
            <div>
              <div className="topcards">Threshold Discount</div>
              <div className="mutedd">Apply discounts when minimum value/quantity is met</div>
            </div>
          </div>
        </div>

        {/* Tabs + Forms */}
        <div className="cfg-panel">
          <div className="cfg-tabs">
            <NavLink
              to="/discounts/configure/simple"
              className={({ isActive }) => `cfg-tab ${isActive ? "active" : ""}`}
              end
            >
              Simple Discount
            </NavLink>

            <NavLink
              to="/discounts/configure/mix"
              className={({ isActive }) => `cfg-tab ${isActive ? "active" : ""}`}
              end
            >
              Mix & Match
            </NavLink>

            <NavLink
              to="/discounts/configure/threshold"
              className={({ isActive }) => `cfg-tab ${isActive ? "active" : ""}`}
              end
            >
              Threshold
            </NavLink>
          </div>

          <div className="cfg-body">
            <Routes>
              {/* these remain RELATIVE because DiscountConfig is mounted at /discounts/configure/* */}
              <Route path="simple" element={<SimpleDiscount />} />
              <Route path="mix" element={<MixMatch />} />
              <Route path="threshold" element={<Threshold />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
