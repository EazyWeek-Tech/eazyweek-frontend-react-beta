import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* Color palette (same as loyalty) */
const COLORS = {
  primary: "#334b71",   // deep navy
  coral:   "#cc6b5c",   // warm coral
  sand:    "#F3DCB0",   // soft sand
  slate:   "#8da0b8",   // slate
  teal:    "#A7D1CD",   // teal
  grid:    "#eef2f7",   // light grid
  axis:    "#6e7b8f",   // secondary text
};

/* Click-outside hook */
function useClickOutside(cb) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cb?.();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

/* Tag multi-select (chips + dropdown) */
function MmbTagPicker({
  label,
  options,           // array of strings
  value,             // array of strings
  onChange,          // (newArray) => void
  placeholder = "Select…",
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useClickOutside(() => setOpen(false));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? options : options.filter(o => o.toLowerCase().includes(s));
  }, [q, options]);

  const toggle = (opt) => {
    const exists = value.includes(opt);
    onChange(exists ? value.filter(v => v !== opt) : [...value, opt]);
  };
  const remove = (opt) => onChange(value.filter(v => v !== opt));

  return (
    <div className="mmb-pick" ref={rootRef}>
      {label && <label className="mmb-pick-label">{label}</label>}

      <div
        className={`mmb-pick-box ${open ? "open" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        aria-expanded={open}
      >
        {value.length === 0 && <span className="mmb-pick-placeholder">{placeholder}</span>}
        {value.map((tag) => (
          <span key={tag} className="mmb-chip">
            {tag}
            <button
              type="button"
              className="mmb-chip-x"
              onClick={(e) => { e.stopPropagation(); remove(tag); }}
              aria-label={`Remove ${tag}`}
              title="Remove"
            >
              ✕
            </button>
          </span>
        ))}
        <span className="mmb-caret">▾</span>
      </div>

      {open && (
        <div className="mmb-pick-pop">
          <div className="mmb-pick-search">
            <input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="button" className="mmb-clear" onClick={() => setQ("")}>✕</button>
          </div>
          <div className="mmb-pick-list">
            {filtered.map((opt) => (
              <label key={opt} className="mmb-pick-row">
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={() => toggle(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="mmb-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------- Page --------- */
export default function MembershipConfig() {
  const navigate = useNavigate();

  // Section 1: Membership Number Creation
  const [numberMode, setNumberMode] = useState("auto"); // 'auto' | 'optin'

  // Section 2: Benefits Application
  const [applyMode, setApplyMode] = useState("all");    // 'all' | 'selective'

  // Selective: broad benefit categories
  const BENEFIT_CATEGORIES = ["Services", "Packages", "Products", "Category"];
  const [benefitCats, setBenefitCats] = useState(["Products", "Category"]);

  // Selective: specific categories (tags/examples)
  const SPECIFIC_CATEGORIES = [
    "Hair reduction", "Hydra Facial", "Laser", "Dental Cleaning",
    "Skin Whitening", "Body Contouring", "Acne Therapy",
  ];
  const [specificCats, setSpecificCats] = useState(["Hair reduction", "Hydra Facial"]);

  const summaryBenefitCats = benefitCats.map(s => s.toLowerCase()).join(", ") || "—";
  const summarySpecificCats = specificCats.map(s => s.toLowerCase().replace(/\s+/g, "-")).join(", ") || "—";

  const onSave = () => {
    const payload = {
      numberMode,          // 'auto' | 'optin'
      applyMode,           // 'all' | 'selective'
      benefitCategories: benefitCats,
      specificCategories: specificCats,
    };
    console.log("Membership Config →", payload);
    alert("Membership configuration saved (check console for payload).");
  };

  return (
    <div className="mmb-wrap">
      <header className="mmb-header">
        <div className="mmb-headcopy">
          <h1 className="mmb-h1">Configure Membership Settings</h1>
          <p className="mmb-sub">
            Set up how membership numbers are created and where benefits apply
          </p>
        </div>

        <button
          type="button"
          className="mmb-back"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to Dashboard"
          title="Back to Dashboard"
        >
          ← Back to Dashboard
        </button>
      </header>

      {/* Membership Number Creation */}
      <section className="mmb-card">
        <div className="mmb-card-title">
          <span className="mmb-ic">👤</span>
          <h2>Membership Number Creation</h2>
          <p>Choose when membership numbers should be generated for customers</p>
        </div>

        <div className="mmb-radio-cards">
          <label className={`mmb-radio-card ${numberMode === "auto" ? "active" : ""}`}>
            <input
              type="radio"
              name="numberMode"
              value="auto"
              checked={numberMode === "auto"}
              onChange={() => setNumberMode("auto")}
            />
            <div className="mmb-rc-head">
              <span className="mmb-dot" />
              <div className="mmb-rc-title">All Customers (Automatic)</div>
            </div>
            <div className="mmb-rc-desc">
              Generate membership numbers automatically for all customers during registration
            </div>
          </label>

          <label className={`mmb-radio-card ${numberMode === "optin" ? "active" : ""}`}>
            <input
              type="radio"
              name="numberMode"
              value="optin"
              checked={numberMode === "optin"}
              onChange={() => setNumberMode("optin")}
            />
            <div className="mmb-rc-head">
              <span className="mmb-dot" />
              <div className="mmb-rc-title">Customer Opt-in</div>
            </div>
            <div className="mmb-rc-desc">
              Only create membership numbers when customers specifically request it
            </div>
          </label>
        </div>
      </section>

      {/* Membership Benefits Application */}
      <section className="mmb-card">
        <div className="mmb-card-title">
          <span className="mmb-ic">🎁</span>
          <h2>Membership Benefits Application</h2>
          <p>Define where membership benefits should be applied</p>
        </div>

        <div className="mmb-radio-cards">
          <label className={`mmb-radio-card ${applyMode === "all" ? "active" : ""}`}>
            <input
              type="radio"
              name="applyMode"
              value="all"
              checked={applyMode === "all"}
              onChange={() => setApplyMode("all")}
            />
            <div className="mmb-rc-head">
              <span className="mmb-dot" />
              <div className="mmb-rc-title">All Services, Packages & Products</div>
            </div>
            <div className="mmb-rc-desc">
              Apply membership benefits across all offerings
            </div>
          </label>

          <label className={`mmb-radio-card ${applyMode === "selective" ? "active" : ""}`}>
            <input
              type="radio"
              name="applyMode"
              value="selective"
              checked={applyMode === "selective"}
              onChange={() => setApplyMode("selective")}
            />
            <div className="mmb-rc-head">
              <span className="mmb-dot" />
              <div className="mmb-rc-title">Selective Application</div>
            </div>
            <div className="mmb-rc-desc">
              Choose specific categories where benefits apply
            </div>
          </label>
        </div>

        {applyMode === "selective" && (
          <>
            <div className="mmb-sel-block">
              <MmbTagPicker
                label="Select benefit categories:"
                options={BENEFIT_CATEGORIES}
                value={benefitCats}
                onChange={setBenefitCats}
                placeholder="Choose categories"
              />
              <div className="mmb-hint">
                Benefits will apply to: <b>{summaryBenefitCats}</b>
              </div>
            </div>

            <div className="mmb-sel-block">
              <MmbTagPicker
                label="Select specific categories:"
                options={SPECIFIC_CATEGORIES}
                value={specificCats}
                onChange={setSpecificCats}
                placeholder="Choose specific categories"
              />
              <div className="mmb-hint">
                Category benefits will apply to: <b>{summarySpecificCats}</b>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="mmb-actions">
        <button className="mmb-save" onClick={onSave}>Save Configuration</button>
      </div>

      {/* Styles */}
      <style jsx>{`
        .mmb-wrap {
          --mmb-primary: ${COLORS.primary};
          --mmb-coral:   ${COLORS.coral};
          --mmb-sand:    ${COLORS.sand};
          --mmb-slate:   ${COLORS.slate};
          --mmb-teal:    ${COLORS.teal};
          --mmb-grid:    ${COLORS.grid};
          --mmb-axis:    ${COLORS.axis};

          background: var(--mmb-grid);
          padding: 24px;
          display: grid;
          gap: 18px;
          max-width: 900px;
          margin: 28px auto;
          color: var(--mmb-primary);
          font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans",
            "Apple Color Emoji", "Segoe UI Emoji";
        }

        .mmb-header {
          background: #fff;
          border: 1px solid #e5ebf3;
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          display: grid;
          grid-template-columns: 1fr auto; /* space for back button */
          align-items: center;
          gap: 12px;
        }
        .mmb-h1 {
          margin: 2px 0 6px;
          font-size: 24px;
          line-height: 1.1;
          font-weight: 900;
          color: var(--mmb-primary);
          text-align: center;
        }
        .mmb-sub {
          margin: 0;
          color: var(--mmb-axis);
          text-align: center;
        }
        .mmb-back {
          height: 38px;
          padding: 0 12px;
          border-radius: 10px;
          background: #fff;
          color: var(--mmb-primary);
          border: 1px solid #d8dee8;
          font-weight: 700;
          cursor: pointer;
          transition: box-shadow .15s, transform .05s, border-color .15s;
          white-space: nowrap;
        }
        .mmb-back:hover { box-shadow: 0 3px 10px rgba(0,0,0,.06); border-color: var(--mmb-primary); }
        .mmb-back:active { transform: translateY(1px); }

        .mmb-card {
          background: #fff;
          border: 1px solid #e5ebf3;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .mmb-card-title {
          display: grid;
          grid-template-columns: 28px 1fr;
          column-gap: 10px;
          align-items: center;
          margin-bottom: 10px;
        }
        .mmb-card-title .mmb-ic {
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--mmb-teal); color: var(--mmb-primary);
          display: grid; place-items: center; font-size: 14px; font-weight: 800;
        }
        .mmb-card-title h2 {
          margin: 0; font-size: 18px; font-weight: 900; color: var(--mmb-primary);
        }
        .mmb-card-title p { grid-column: 2; margin: 2px 0 0; color: var(--mmb-axis); }

        .mmb-radio-cards { display: grid; gap: 12px; margin-top: 8px; }
        .mmb-radio-card {
          border: 1px solid #e5ebf3;
          border-radius: 12px;
          padding: 12px 14px;
          background: #fff;
          cursor: pointer;
          transition: box-shadow .2s, border-color .2s;
        }
        .mmb-radio-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.06); }
        .mmb-radio-card.active {
          border-color: var(--mmb-teal);
          box-shadow: 0 0 0 3px rgba(167, 209, 205, 0.35);
        }
        .mmb-radio-card input { display: none; }
        .mmb-rc-head { display: flex; align-items: center; gap: 10px; }
        .mmb-dot {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid var(--mmb-primary); position: relative; flex: 0 0 auto;
        }
        .mmb-radio-card.active .mmb-dot::after {
          content: ""; position: absolute; inset: 2px; background: var(--mmb-primary); border-radius: 50%;
        }
        .mmb-rc-title { font-weight: 800; color: var(--mmb-primary); font-size: 14px; margin: 0 0 6px; }
        .mmb-rc-desc { color: var(--mmb-axis); }

        .mmb-sel-block { margin-top: 14px; }

        /* Tag picker */
        .mmb-pick { position: relative; }
        .mmb-pick-label { display: block; color: var(--mmb-axis); margin: 0 0 6px; }
        .mmb-pick-box {
          min-height: 42px; padding: 6px 36px 6px 10px;
          display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
          background: #fff; border: 1px solid #d8dee8; border-radius: 10px;
          cursor: text; position: relative;
          transition: border-color .15s, box-shadow .15s;
        }
        .mmb-pick-box.open {
          border-color: var(--mmb-primary);
          box-shadow: 0 0 0 3px rgba(51, 75, 113, 0.15);
        }
        .mmb-pick-placeholder { color: var(--mmb-axis); }
        .mmb-caret { position: absolute; right: 10px; top: 8px; color: var(--mmb-axis); }

        .mmb-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--mmb-grid); color: var(--mmb-primary);
          border: 1px solid #e5ebf3; border-radius: 999px; padding: 6px 10px;
          font-weight: 700; font-size: 12px;
        }
        .mmb-chip-x {
          border: none; background: none; cursor: pointer; color: var(--mmb-axis);
          line-height: 1; font-size: 12px;
        }

        .mmb-pick-pop {
          position: absolute; z-index: 25; top: calc(100% + 6px); left: 0; right: 0;
          background: #fff; border: 1px solid #d8dee8; border-radius: 10px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
        }
        .mmb-pick-search {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-bottom: 1px solid #eef1f6;
        }
        .mmb-pick-search input {
          flex: 1; height: 32px; border: 1px solid #e3e8f1; border-radius: 8px; padding: 0 8px;
        }
        .mmb-clear { border: none; background: none; color: var(--mmb-axis); cursor: pointer; }

        .mmb-pick-list { max-height: 240px; overflow: auto; padding: 6px 0; }
        .mmb-pick-row {
          display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer;
        }
        .mmb-pick-row:hover { background: #f5f8fd; }
        .mmb-empty { padding: 10px; color: var(--mmb-axis); }

        .mmb-hint { margin-top: 8px; color: var(--mmb-axis); }

        /* Actions */
        .mmb-actions { display: flex; justify-content: center; }
        .mmb-save {
          min-width: 240px; height: 46px; border-radius: 12px; border: 1px solid #233244;
          background: var(--mmb-primary); color: #fff; font-weight: 800; cursor: pointer;
          box-shadow: 0 6px 16px rgba(51, 75, 113, 0.25);
          transition: transform .05s ease, filter .15s ease, box-shadow .15s;
        }
        .mmb-save:hover  { filter: brightness(0.96); box-shadow: 0 8px 18px rgba(51,75,113,.3); }
        .mmb-save:active { transform: translateY(1px); }
        .mmb-save:focus  { outline: none; box-shadow: 0 0 0 3px rgba(51, 75, 113, 0.25); }
      `}</style>
    </div>
  );
}
