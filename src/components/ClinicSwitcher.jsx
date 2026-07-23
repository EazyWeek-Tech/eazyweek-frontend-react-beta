import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config";

/*  Shared clinic (centre) switcher.
    Extracted from Header.jsx so any screen with its own chrome — the Appointment
    scheduler, for one — can offer the same Change Centre control without
    duplicating the switch/session logic.

    variant="light" → white pill, for the app header
    variant="dark"  → translucent pill, for the navy Appointment header          */

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"); }
  catch { return {}; }
};

const readSessionCentre = () => {
  try {
    const raw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession");
    if (!raw) return getUser().centerCode || "";
    const s = JSON.parse(raw);
    return s?.data?.loginCode || s?.data?.LoginCode || s?.loginCode || s?.LoginCode || "";
  } catch { return ""; }
};

/*  Records belong to the centre that created them, so after a switch we must not
    land back on a record-scoped URL — that record does not exist in the new
    centre and the screen comes back empty. Cut back to the module root instead:
      /opportunity/Bright-00842/details  →  /opportunity
      /customer?custid=BRI365&recid=10307 →  /customer
      /appointment                        →  /appointment  (unchanged)
    A path segment containing a digit is treated as a record id; segments like
    "roles" or "payment" have none and survive. Add exceptions here if a real
    route ever carries a digit in its name.                                     */
const ID_LIKE = /\d/;
const SCOPED_PARAMS = [
  "custid", "recid", "appointmentid", "invoiceno", "invoicenum",
  "leadid", "opportunityid", "caseid", "packageid", "membershipid",
];

const postSwitchUrl = () => {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const full = window.location.pathname;
  const path = base && full.startsWith(base) ? full.slice(base.length) : full;
  const segs = path.split("/").filter(Boolean);

  const idAt = segs.findIndex((sg) => ID_LIKE.test(sg));
  const keys = [...new URLSearchParams(window.location.search).keys()].map((k) => k.toLowerCase());
  const scopedParam = SCOPED_PARAMS.some((k) => keys.includes(k));

  const kept   = idAt === -1 ? segs : segs.slice(0, idAt);
  const cut    = idAt !== -1 || scopedParam;
  const search = cut ? "" : window.location.search;

  return `${base}/${kept.join("/")}`.replace(/\/{2,}/g, "/") + search;
};
const ClinicSwitcher = ({ variant = "light", onError }) => {
  const ref = useRef(null);
  const [hierarchy, setHierarchy]   = useState({ entity: null, zones: [] });
  const [selected,  setSelected]    = useState(null);
  const [open,      setOpen]        = useState(false);
  const [busy,      setBusy]        = useState(false);
  const [centreCode, setCentreCode] = useState(readSessionCentre());

  /* Hierarchy + current selection */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/api/Settings/Centre/Hierarchy`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        const json = await res.json();
        const data = json.data ?? json;
        if (cancelled) return;
        setHierarchy({ entity: data.entity || null, zones: data.zones || [] });

        const all = [
          ...(data.entity ? [data.entity] : []),
          ...(data.zones || []).flatMap(z => z.clinics),
        ];
        const u = getUser();
        setSelected(
          all.find(c => c.code === centreCode) ||
          all.find(c => c.code === u?.centerCode) ||
          all[0] || null
        );
      } catch (err) {
        if (!cancelled) { console.error("Failed to load clinic hierarchy", err); onError?.("Failed to load clinics"); }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreCode]);

  /* Outside click */
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const setSessionToApi = async (code) => {
    const u = getUser();
    await fetch(`${API_BASE_URL}/api/session/set`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
      body: JSON.stringify({ LoginCode: code, TopCode: code, userID: u?.employeeCode || u?.userId || "" }),
    });
  };

  const getSessionFromApi = async () => {
    const res  = await fetch(`${API_BASE_URL}/api/session/get`, {
      method: "GET", credentials: "include",
      headers: { Authorization: `Bearer ${TOKEN()}` },
    });
    const json = await res.json();
    localStorage.setItem("userSession", JSON.stringify(json));
    sessionStorage.setItem("userSession", JSON.stringify(json));
    return json;
  };

  const handleClinicChange = async (clinic) => {
    if (!clinic?.code || clinic.code === selected?.code || busy) { setOpen(false); return; }
    setSelected(clinic); setOpen(false); setBusy(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/auth/switch-clinic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({ centerCode: clinic.code }),
      });
      const data = await res.json();

      const base = data?.success ? data.data.user : getUser();
      const nextUser = { ...base, isEntityLevel: !!clinic.isEntity, centerCode: clinic.code };
      if (data?.success) localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(nextUser));
      // Mirror only if this storage already held a user, so we never leave a
      // stale copy behind for readers that fall back to sessionStorage.
      if (sessionStorage.getItem("user")) sessionStorage.setItem("user", JSON.stringify(nextUser));
      if (data?.success && sessionStorage.getItem("token")) sessionStorage.setItem("token", data.data.token);

      await setSessionToApi(clinic.code);
      await getSessionFromApi();
      setCentreCode(clinic.code);

      // Stay on the current page (or its module root). A full load rather than a
      // router navigation is what makes every screen re-read the new centre — most
      // read user.centerCode once into a useMemo/useState, so a soft re-render
      // would keep the old one.
      const target = postSwitchUrl();
      if (target === window.location.pathname + window.location.search) window.location.reload();
      else window.location.assign(target);
    } catch (e) {
      console.error("Failed to switch clinic", e);
      setBusy(false);
      onError?.("Failed to change clinic");
    }
  };

  const dark = variant === "dark";

  return (
    <div className={`clinic-dropdown${dark ? " cs-dark" : ""}`} ref={ref}>
      <div className="clinic-selected" onClick={() => !busy && setOpen(p => !p)}>
        {busy ? "Switching…" : (selected?.name || "Select Clinic")}
        <span className="arrow">▾</span>
      </div>

      {open && (
        <div className="clinic-options">
          {hierarchy.entity && (
            <div
              className={`clinic-option entity-row ${hierarchy.entity.code === selected?.code ? "active" : ""}`}
              onClick={() => handleClinicChange(hierarchy.entity)}
            >
              {hierarchy.entity.name}
            </div>
          )}

          {hierarchy.zones.map(({ zone, clinics }) => (
            <div key={zone}>
              <div className="zone-label">{zone}</div>
              {clinics.map(clinic => (
                <div
                  key={clinic.code}
                  className={`clinic-option clinic-row ${clinic.code === selected?.code ? "active" : ""}`}
                  onClick={() => handleClinicChange(clinic)}
                >
                  {clinic.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .clinic-dropdown { position: relative; font-family: Inter, sans-serif; z-index: 999; }
        .clinic-selected { background: white; border: 1px solid #ccc; padding: 8px 12px; border-radius: 6px; cursor: pointer; min-width: 180px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
        .clinic-options { position: absolute; top: calc(100% + 4px); left: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; width: 240px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 360px; overflow-y: auto; padding: 6px 0; z-index: 1000; }

        /* Dark variant — sits on the navy Appointment header */
        .cs-dark .clinic-selected { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.3); color: #fff; box-shadow: none; min-width: 150px; padding: 5px 10px; font-size: 12.5px; }
        .cs-dark .arrow { color: rgba(255,255,255,.75); }
        .cs-dark .clinic-options { color: #334b71; }

        .entity-row { padding: 10px 14px; font-size: 13px; font-weight: 700; color: #334b71; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
        .entity-row:hover { background: #f0f4fa; }
        .entity-row.active { background: #e6eef8; }
        .zone-label { padding: 8px 14px 4px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; }
        .clinic-row { padding: 8px 14px 8px 24px; font-size: 13px; color: #374151; cursor: pointer; }
        .clinic-row:hover { background: #f4f6fa; }
        .clinic-row.active { background: #e8f0fe; font-weight: 600; color: #334b71; }
        .arrow { font-size: 11px; color: #94a3b8; }
      `}</style>
    </div>
  );
};

export default ClinicSwitcher;