"use client"

import { useEffect, useRef, useState } from "react";

/**
 * EazyWeek — shared dashboard loading indicators.
 *
 * Drop-in replacement for hardcoded "sample" figures: render these while the
 * live fetch is in flight, then render the real widget once data lands.
 *
 * Exports
 *   <DashboardLoadingBar />  brand progress bar (ramps, or pass value 0-100)
 *   <ChartLoading />         card-body sized wrapper around the bar
 *   <TileSkeleton />         KPI tile placeholder (shimmer)
 *   <AwaitingFeed />         honest empty state for widgets with no endpoint yet
 *
 * Brand palette (EazyWeek):
 *   Midnight Navy #05224C · Royal Blue #18396E · Warm Coral #DD7766
 *   Seafoam Teal #A7D1CD · Blue Grey #85A2AA
 * The bar ramps Midnight Navy -> Royal Blue -> Warm Coral.
 */

const BRAND = {
  navy: "#05224C",
  royal: "#18396E",
  teal: "#A7D1CD",
  blueGrey: "#85A2AA",
  coral: "#DD7766",
  track: "#EAEFF6",
  label: "#64748B",
};

const STYLE_ID = "ew-dashboard-loading-styles";
const CSS = `
.ew-load-wrap { width: 100%; }
.ew-load-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 8px; font-family: 'Lato', "Segoe UI", "Roboto", sans-serif;
}
.ew-load-label { font-size: 12.5px; color: ${BRAND.label}; letter-spacing: .01em; }
.ew-load-pct   { font-size: 12.5px; font-weight: 700; color: ${BRAND.royal}; font-variant-numeric: tabular-nums; }
.ew-load-track {
  position: relative; width: 100%; border-radius: 999px;
  background: ${BRAND.track}; overflow: hidden;
}
.ew-load-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, ${BRAND.navy} 0%, ${BRAND.royal} 42%, ${BRAND.coral} 100%);
  transition: width .35s cubic-bezier(.4,0,.2,1);
}
.ew-load-fill::after {
  content: ""; position: absolute; inset: 0; border-radius: 999px;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.45) 50%, rgba(255,255,255,0) 100%);
  animation: ew-sheen 1.25s ease-in-out infinite;
}
@keyframes ew-sheen { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

.ew-chart-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 0 28px; box-sizing: border-box;
}
.ew-chart-loading .ew-load-wrap { max-width: 340px; }

.ew-tile-skel {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}
.ew-skel-line {
  border-radius: 6px;
  background: linear-gradient(90deg, #EEF2F7 0%, #F7FAFC 40%, #EEF2F7 80%);
  background-size: 300% 100%;
  animation: ew-shimmer 1.4s ease-in-out infinite;
}
@keyframes ew-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

.ew-awaiting {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; border: 1px dashed #d6dfeb; border-radius: 8px; background: #F8FAFC;
  text-align: center; padding: 16px; box-sizing: border-box;
  font-family: 'Lato', "Segoe UI", "Roboto", sans-serif;
}
.ew-awaiting-title { font-size: 13px; font-weight: 600; color: ${BRAND.royal}; }
.ew-awaiting-msg   { font-size: 12px; color: ${BRAND.label}; max-width: 320px; line-height: 1.45; }

.ew-error {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  border: 1px solid #F3D6D0; border-radius: 8px; background: #FDF6F4;
  text-align: center; padding: 16px; box-sizing: border-box;
  font-family: 'Lato', "Segoe UI", "Roboto", sans-serif;
}
.ew-error-msg { font-size: 12.5px; color: ${BRAND.coral}; font-weight: 600; }
.ew-retry {
  border: 1px solid ${BRAND.royal}; background: #fff; color: ${BRAND.royal};
  border-radius: 6px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.ew-retry:hover { background: ${BRAND.royal}; color: #fff; }
`;

const useInjectedStyles = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement("style");
    tag.id = STYLE_ID;
    tag.appendChild(document.createTextNode(CSS));
    document.head.appendChild(tag);
  }, []);
};

/**
 * Ramps 0 -> ceiling while `active`, then snaps to 100 when it flips false.
 * Pass a real `value` (0-100) instead if you are counting completed fetches.
 */
export const useRampProgress = (active, { ceiling = 92, tickMs = 180 } = {}) => {
  const [pct, setPct] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (active) {
      setPct(8);
      timer.current = setInterval(() => {
        setPct((p) => (p >= ceiling ? p : p + Math.max(1, (ceiling - p) * 0.14)));
      }, tickMs);
    } else {
      setPct(100);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [active, ceiling, tickMs]);

  return Math.round(pct);
};

export const DashboardLoadingBar = ({
  active = true,
  value = null,
  label = "Fetching live data…",
  height = 6,
  showPercent = true,
}) => {
  useInjectedStyles();
  const ramp = useRampProgress(active && value === null);
  const pct = value === null ? ramp : Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="ew-load-wrap" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      {(label || showPercent) && (
        <div className="ew-load-head">
          {label ? <span className="ew-load-label">{label}</span> : <span />}
          {showPercent ? <span className="ew-load-pct">{pct}%</span> : null}
        </div>
      )}
      <div className="ew-load-track" style={{ height }}>
        <div className="ew-load-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const ChartLoading = ({ height = 250, label = "Fetching live data…", value = null }) => {
  useInjectedStyles();
  return (
    <div className="ew-chart-loading" style={{ height }}>
      <DashboardLoadingBar label={label} value={value} />
    </div>
  );
};

export const TileSkeleton = () => {
  useInjectedStyles();
  return (
    <div className="ew-tile-skel">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div className="ew-skel-line" style={{ width: 20, height: 20, borderRadius: 5 }} />
        <div className="ew-skel-line" style={{ width: 96, height: 11 }} />
      </div>
      <div className="ew-skel-line" style={{ width: 72, height: 28 }} />
    </div>
  );
};

export const AwaitingFeed = ({ height = 250, title = "Awaiting live feed", message }) => {
  useInjectedStyles();
  return (
    <div className="ew-awaiting" style={{ height }}>
      <div className="ew-awaiting-title">{title}</div>
      {message ? <div className="ew-awaiting-msg">{message}</div> : null}
    </div>
  );
};

export const LoadError = ({ height = 250, message = "Could not load live data.", retryLabel = "Retry", onRetry }) => {
  useInjectedStyles();
  return (
    <div className="ew-error" style={{ height }}>
      <div className="ew-error-msg">{message}</div>
      {onRetry ? <button type="button" className="ew-retry" onClick={onRetry}>{retryLabel}</button> : null}
    </div>
  );
};

export default DashboardLoadingBar;