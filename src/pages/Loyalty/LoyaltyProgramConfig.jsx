import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL as API_BASE } from "../../config";

const C = {
  primary: "#334b71", teal: "#A7D1CD", grid: "#eef2f7", axis: "#6e7b8f", coral: "#cc6b5c",
};

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const HEADERS = () => ({
  "Content-Type": "application/json",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const safeJson = async (res, label) => {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) throw new Error(`Proxy not configured — "${label}" returned HTML.`);
  return res.json();
};

const fetchCurrencies = async () => {
  const res = await fetch(`${API_BASE}/api/LoyaltyProgram/currency/search`, { headers: HEADERS() });
  if (!res.ok) throw new Error(`Failed to load currencies (${res.status})`);
  const json = await safeJson(res, "GET currency/search");
  return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
};

const fetchTierById = async (tierId) => {
  const res = await fetch(`${API_BASE}/api/v1/loyalty/tier/get-tier/${tierId}`, { headers: HEADERS() });
  if (!res.ok) throw new Error(`Failed to load tier (${res.status})`);
  const json = await res.json();
  return json?.data ?? json;
};

const fetchTiers = async () => {
  const res = await fetch(`${API_BASE}/api/v1/loyalty/tier/get-tier-list`, { headers: HEADERS() });
  if (!res.ok) throw new Error(`Failed to load tiers (${res.status})`);
  const json = await safeJson(res, "GET get-tier-list");
  return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
};

const saveProgram = async (payload) => {
  const res = await fetch(`${API_BASE}/api/LoyaltyProgram/CreateOrUpdate`, {
    method: "POST", headers: HEADERS(), body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = `Save failed (${res.status})`;
    try { const b = await safeJson(res, "POST CreateOrUpdate"); if (b?.message || b?.error) msg = b.message ?? b.error; } catch (e) { msg = e.message; }
    throw new Error(msg);
  }
  return safeJson(res, "POST CreateOrUpdate").catch(() => null);
};

// ── Tier save — split create vs update ───────────────────────────────────────
const buildTierPayload = (form, programId) => ({
  TierId: form.tierId ?? 0,
  ProgramId_fk: programId,
  TierName: form.tierName.trim(),
  TierLevel: Number(form.tierLevel),
  FromAmount: Number(form.fromAmount),
  ToAmount: Number(form.toAmount),
  CurrencyId: Number(form.currencyId),
  ExpiryDays: Number(form.expiryDays),
  EarningAmountSegment: Number(form.earningAmountSegment),
  EarnPoints: Number(form.earnPoints),
  RedeemPoints: Number(form.redeemPoints),
  RedeemAmount: Math.round(Number(form.redeemAmount)),
  EarningCategoryIds: form.earningCategoryIds.map(Number),
  RedeemCategoryIds: form.redeemCategoryIds.map(Number),
});

const createTier = async (payload) => {
  const res = await fetch(`${API_BASE}/api/v1/loyalty/tier/create-tier`, {
    method: "POST", headers: HEADERS(), body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = `Tier create failed (${res.status})`;
    try { const b = await safeJson(res, "POST create-tier"); if (b?.message || b?.error) msg = b.message ?? b.error; } catch (e) { msg = e.message; }
    throw new Error(msg);
  }
  return safeJson(res, "POST create-tier").catch(() => null);
};

const updateTier = async (payload) => {
  const res = await fetch(`${API_BASE}/api/v1/loyalty/tier/update-tier`, {
    method: "PUT", headers: HEADERS(), body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = `Tier update failed (${res.status})`;
    try { const b = await safeJson(res, "POST update-tier"); if (b?.message || b?.error) msg = b.message ?? b.error; } catch (e) { msg = e.message; }
    throw new Error(msg);
  }
  return safeJson(res, "POST update-tier").catch(() => null);
};

const saveTier = (form, programId, isEdit) => {
  const payload = buildTierPayload(form, programId);
  return isEdit ? updateTier(payload) : createTier(payload);
};

const fetchServices = async () => {
  const res = await fetch(`${API_BASE}/api/Master/LoadService`, { headers: HEADERS() });
  if (!res.ok) return [];
  try { const d = await res.json(); return Array.isArray(d) ? d : []; } catch { return []; }
};

// ── UI helpers ────────────────────────────────────────────────────────────────
const inputStyle = (hasError) => ({
  height: 40, borderRadius: 10, padding: "0 12px",
  border: `1px solid ${hasError ? C.coral : "#d8dee8"}`, outline: "none",
  color: C.primary, background: "#fff", fontWeight: 600,
  fontSize: 14, width: "100%", boxSizing: "border-box", fontFamily: "inherit",
});

const Field = ({ label, error, children }) => (
  <div style={{ display: "grid", gap: 5, marginBottom: 12 }}>
    <label style={{ fontSize: 12, color: C.axis, fontWeight: 600 }}>{label}</label>
    {children}
    {error && <span style={{ fontSize: 11, color: C.coral }}>{error}</span>}
  </div>
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { if (!msg) return; const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [msg]);
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: isErr ? "#fdf3f3" : "#e6f4ef", border: `1px solid ${isErr ? "#f0c4c0" : "#b3d9cc"}`, color: isErr ? C.coral : "#2e7d5e", borderRadius: 12, padding: "12px 18px", fontWeight: 700, fontSize: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
      <span>{isErr ? "⚠" : "✓"}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit", padding: 0 }}>×</button>
    </div>
  );
};

// ── Tier Modal ────────────────────────────────────────────────────────────────
const EMPTY_TIER = {
  tierId: 0, tierName: "", tierLevel: "", fromAmount: "", toAmount: "",
  currencyId: "", expiryDays: "",
  earningAmountSegment: "", earnPoints: "", redeemPoints: "", redeemAmount: "",
  earningCategoryIds: [], redeemCategoryIds: [],
};

const TierModal = ({ programId, tier, currencies, programCurrencyId, existingTiers, onClose, onSaved }) => {
  const isEdit = !!(tier && tier.tierId);
  const defaultCurrencyId = tier ? String(tier.currencyId) : String(programCurrencyId ?? "");
  const [services, setServices] = useState([]);

  const [form, setForm] = useState(tier ? {
    tierId: tier.tierId,
    tierName: tier.tierName ?? "",
    tierLevel: String(tier.tierLevel ?? ""),
    fromAmount: String(tier.fromAmount ?? ""),
    toAmount: String(tier.toAmount ?? ""),
    currencyId: String(tier.currencyId ?? ""),
    expiryDays: String(tier.expiryDays ?? ""),
    earningAmountSegment: String(tier.earningAmountSegment ?? ""),
    earnPoints: String(tier.earnPoints ?? ""),
    redeemPoints: String(tier.redeemPoints ?? ""),
    redeemAmount: String(tier.redeemAmount ?? ""),
    earningCategoryIds: tier.earningCategoryIds ?? [],
    redeemCategoryIds: tier.redeemCategoryIds ?? [],
  } : { ...EMPTY_TIER, currencyId: defaultCurrencyId });

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { fetchServices().then(setServices); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleCat = useCallback((field, id) => {
    setForm(f => {
      const ids = f[field] ?? [];
      return { ...f, [field]: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] };
    });
  }, []);

  const toggleEarn = useCallback((id) => toggleCat("earningCategoryIds", id), [toggleCat]);
  const toggleRedeem = useCallback((id) => toggleCat("redeemCategoryIds", id), [toggleCat]);

  const checkOverlap = (from, to) => {
    const newFrom = Number(from), newTo = Number(to);
    if (isNaN(newFrom) || isNaN(newTo)) return null;
    for (const t of (existingTiers ?? [])) {
      if (tier && t.tierId === tier.tierId) continue;
      const eFrom = Number(t.fromAmount), eTo = Number(t.toAmount);
      if (newFrom <= eTo && newTo > eFrom)
        return `Range ${newFrom}–${newTo} overlaps with "${t.tierName}" (${eFrom}–${eTo}). Start from ${eTo + 1}`;
    }
    return null;
  };

  const errs = useMemo(() => {
    const e = {};
    if (!form.tierName.trim()) e.tierName = "Required";
    else {
      const nameNorm = form.tierName.trim().toLowerCase();
      const dupName = (existingTiers ?? []).some(t =>
        String(t.tierName ?? "").trim().toLowerCase() === nameNorm &&
        !(tier && t.tierId === tier.tierId));
      if (dupName) e.tierName = "A tier with this name already exists";
    }
    if (!form.tierLevel || isNaN(Number(form.tierLevel))) { e.tierLevel = "Required"; }
    else {
      const levelNum = Number(form.tierLevel);
      const dup = (existingTiers ?? []).some(t => Number(t.tierLevel) === levelNum && !(tier && t.tierId === tier.tierId));
      if (dup) e.tierLevel = `Tier Level ${levelNum} already exists`;
    }
    if (form.fromAmount === "" || isNaN(Number(form.fromAmount))) e.fromAmount = "Required";
    else if (Number(form.fromAmount) < 0) e.fromAmount = "Must be ≥ 0";
    else {
      const fromNum = Number(form.fromAmount);
      const boundary = (existingTiers ?? []).some(t => !(tier && t.tierId === tier.tierId) && Number(t.toAmount) === fromNum);
      if (boundary) e.fromAmount = `${fromNum} is already used. Use ${fromNum + 1} as start.`;
    }
    if (form.toAmount === "" || isNaN(Number(form.toAmount))) e.toAmount = "Required";
    else if (Number(form.toAmount) <= Number(form.fromAmount)) e.toAmount = "Must be > From Amount";
    if (!form.currencyId) e.currencyId = "Required";
    if (!form.expiryDays || isNaN(Number(form.expiryDays))) e.expiryDays = "Required";
    else if (Number(form.expiryDays) <= 0) e.expiryDays = "Must be > 0";
    if (!e.fromAmount && !e.toAmount) { const ov = checkOverlap(form.fromAmount, form.toAmount); if (ov) e.fromAmount = ov; }
    if (!form.earningAmountSegment || isNaN(Number(form.earningAmountSegment))) e.earningAmountSegment = "Required";
    else if (Number(form.earningAmountSegment) <= 0) e.earningAmountSegment = "Must be > 0";
    if (!form.earnPoints || isNaN(Number(form.earnPoints))) e.earnPoints = "Required";
    else if (Number(form.earnPoints) <= 0) e.earnPoints = "Must be > 0";
    if (!form.earningCategoryIds?.length) e.earningCategoryIds = "Select at least one service";
    if (!form.redeemPoints || isNaN(Number(form.redeemPoints))) e.redeemPoints = "Required";
    else if (Number(form.redeemPoints) <= 0) e.redeemPoints = "Must be > 0";
    if (!form.redeemAmount || isNaN(Number(form.redeemAmount))) e.redeemAmount = "Required";
    else if (Number(form.redeemAmount) <= 0) e.redeemAmount = "Must be > 0";
    if (!form.redeemCategoryIds?.length) e.redeemCategoryIds = "Select at least one service";
    return e;
  }, [form, existingTiers, tier]);

  const selectedCurrency = currencies.find(c => String(c.currencyId) === String(form.currencyId));

  const onSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(errs).length) return;
    setSaving(true); setErr("");
    try {
      await saveTier(form, programId, isEdit);
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const showErr = (k) => submitted ? errs[k] : undefined;

  const ServiceSelect = React.memo(({ field, label, selectedIds, onToggle, error }) => {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const filtered = useMemo(() =>
      search.trim() ? services.filter(s => s.serviceName?.toLowerCase().includes(search.toLowerCase()) || s.categoryName?.toLowerCase().includes(search.toLowerCase())) : services,
      [search]
    );
    const selectedServices = useMemo(() => services.filter(s => selectedIds.includes(Number(s.recID))), [selectedIds]);

    return (
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ fontSize: 12, color: C.axis, fontWeight: 600, marginBottom: 6, display: "block" }}>{label} *</label>
        <div onClick={() => setOpen(v => !v)}
          style={{ height: 38, borderRadius: 8, padding: "0 12px", border: `1px solid ${error ? C.coral : "#d8dee8"}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 13, color: selectedIds.length ? C.primary : C.axis, fontWeight: selectedIds.length ? 600 : 400, userSelect: "none" }}>
          <span>{selectedIds.length > 0 ? `${selectedIds.length} service${selectedIds.length > 1 ? "s" : ""} selected` : "Select services…"}</span>
          <span style={{ fontSize: 11, color: C.axis }}>{open ? "▲" : "▼"}</span>
        </div>
        {selectedServices.length > 0 && !open && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            {selectedServices.map(s => (
              <span key={s.recID} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: C.primary, color: "#fff", fontSize: 11, fontWeight: 600 }}>
                {s.serviceName}
                <button type="button" onClick={e => { e.stopPropagation(); onToggle(Number(s.recID)); }}
                  style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0, opacity: 0.8 }}>×</button>
              </span>
            ))}
          </div>
        )}
        {open && (
          <div style={{ border: "1px solid #e5ebf3", borderRadius: 8, background: "#fff", marginTop: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f4fa" }}>
              <input type="text" placeholder="Search services…" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                style={{ height: 32, borderRadius: 7, padding: "0 10px", border: "1px solid #d8dee8", outline: "none", width: "100%", boxSizing: "border-box", fontSize: 13, color: C.primary, fontFamily: "inherit" }} />
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {filtered.length === 0 && <div style={{ padding: "10px 12px", color: C.axis, fontSize: 12 }}>No services found</div>}
              {filtered.map(s => {
                const id = Number(s.recID);
                const isSelected = selectedIds.includes(id);
                return (
                  <div key={s.recID} onClick={() => onToggle(id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", background: isSelected ? "#f0f5ff" : "#fff", borderBottom: "1px solid #f4f7fb" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? C.primary : "#d8dee8"}`, background: isSelected ? C.primary : "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {isSelected && <span style={{ color: "#fff", fontSize: 10, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.serviceName}</div>
                      <div style={{ fontSize: 11, color: C.axis }}>{s.categoryName}{s.subCategoryName ? ` · ${s.subCategoryName}` : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "8px 10px", borderTop: "1px solid #f0f4fa", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setOpen(false); setSearch(""); }}
                style={{ height: 30, padding: "0 18px", borderRadius: 7, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
            </div>
          </div>
        )}
        {error && <span style={{ fontSize: 11, color: C.coral, marginTop: 4, display: "block" }}>{error}</span>}
      </div>
    );
  });

  const divider = (label) => (
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#e5ebf3" }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: C.axis, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#e5ebf3" }} />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 620, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", overflow: "hidden", margin: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5ebf3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.primary }}>{isEdit ? "Edit Tier" : "Add Tier"}</div>
            <div style={{ fontSize: 12, color: C.axis, marginTop: 2 }}>{isEdit ? `Editing: ${tier.tierName}` : "Configure tier details, accrual & redemption rules"}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e5ebf3", background: "#f4f7fb", cursor: "pointer", fontSize: 16, color: C.axis, display: "grid", placeItems: "center" }}>×</button>
        </div>

        <div style={{ padding: 20, maxHeight: "75vh", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {divider("Tier Details")}
            <Field label="Tier Name *" error={showErr("tierName")}><input style={inputStyle(submitted && errs.tierName)} value={form.tierName} onChange={set("tierName")} placeholder="Tier name" /></Field>
            <Field label="Tier Level *" error={showErr("tierLevel")}><input style={inputStyle(submitted && errs.tierLevel)} value={form.tierLevel} onChange={set("tierLevel")} placeholder="Level number" inputMode="numeric" /></Field>
            <Field label="From Amount *" error={showErr("fromAmount")}><input style={inputStyle(submitted && errs.fromAmount)} value={form.fromAmount} onChange={set("fromAmount")} placeholder="Min amount" inputMode="decimal" /></Field>
            <Field label="To Amount *" error={showErr("toAmount")}><input style={inputStyle(submitted && errs.toAmount)} value={form.toAmount} onChange={set("toAmount")} placeholder="Max amount" inputMode="decimal" /></Field>
            <Field label="Expiry Days *" error={showErr("expiryDays")}><input style={inputStyle(submitted && errs.expiryDays)} value={form.expiryDays} onChange={set("expiryDays")} placeholder="Days until expiry" inputMode="numeric" /></Field>
            <Field label="Currency">
              <div style={{ height: 40, borderRadius: 10, padding: "0 12px", border: "1px solid #e5ebf3", background: "#f4f7fb", display: "flex", alignItems: "center", gap: 8, color: C.primary, fontWeight: 600, fontSize: 14 }}>
                <span style={{ fontSize: 13, color: C.axis }}>{selectedCurrency ? `${selectedCurrency.currencyShortName} (${selectedCurrency.symbol})` : "—"}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: C.axis, background: "#e5ebf3", padding: "2px 8px", borderRadius: 6 }}>from program</span>
              </div>
            </Field>

            {divider("Accrual Rule")}
            <Field label="Earning Amount Segment *" error={showErr("earningAmountSegment")}><input style={inputStyle(submitted && errs.earningAmountSegment)} value={form.earningAmountSegment} onChange={set("earningAmountSegment")} placeholder="e.g. 10 (per 10 spent)" inputMode="decimal" /></Field>
            <Field label="Points Earned *" error={showErr("earnPoints")}><input style={inputStyle(submitted && errs.earnPoints)} value={form.earnPoints} onChange={set("earnPoints")} placeholder="e.g. 1 point earned" inputMode="decimal" /></Field>
            {form.earningAmountSegment && form.earnPoints && (
              <div style={{ gridColumn: "1 / -1", padding: "6px 10px", background: "#f0f5ff", borderRadius: 8, fontSize: 12, color: C.primary }}>
                💡 For every <b>{form.earningAmountSegment}</b> spent, earn <b>{form.earnPoints}</b> point(s)
              </div>
            )}
            <ServiceSelect field="earningCategoryIds" label="Earning Services" selectedIds={form.earningCategoryIds ?? []} onToggle={toggleEarn} error={showErr("earningCategoryIds")} />

            {divider("Redemption Rule")}
            <Field label="Points to Redeem *" error={showErr("redeemPoints")}><input style={inputStyle(submitted && errs.redeemPoints)} value={form.redeemPoints} onChange={set("redeemPoints")} placeholder="e.g. 2 points" inputMode="decimal" /></Field>
            <Field label="Redemption Amount (whole no.) *" error={showErr("redeemAmount")}><input style={inputStyle(submitted && errs.redeemAmount)} value={form.redeemAmount} onChange={set("redeemAmount")} placeholder="e.g. 1 (SAR value)" inputMode="numeric" /></Field>
            {form.redeemPoints && form.redeemAmount && (
              <div style={{ gridColumn: "1 / -1", padding: "6px 10px", background: "#f0f5ff", borderRadius: 8, fontSize: 12, color: C.primary }}>
                💡 <b>{form.redeemPoints}</b> point(s) = <b>{form.redeemAmount}</b> in value
              </div>
            )}
            <ServiceSelect field="redeemCategoryIds" label="Redemption Services" selectedIds={form.redeemCategoryIds ?? []} onToggle={toggleRedeem} error={showErr("redeemCategoryIds")} />
          </div>
          {err && <div style={{ marginTop: 12, padding: "8px 12px", background: "#fdf3f3", border: "1px solid #f0c4c0", borderRadius: 8, color: C.coral, fontSize: 13 }}>⚠ {err}</div>}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5ebf3", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ height: 38, padding: "0 20px", borderRadius: 10, border: "1.5px solid #d0d9e8", background: "#fff", color: C.axis, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={onSubmit} disabled={saving} style={{ height: 38, padding: "0 24px", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : isEdit ? "Update Tier" : "Add Tier"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Tiers section ─────────────────────────────────────────────────────────────
const TiersSection = ({ programId, currencies, programCurrencyId }) => {
  const [tiers, setTiers] = useState([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [tiersError, setTiersError] = useState(null);
  const [modalTier, setModalTier] = useState(undefined);
  const [loadingTierId, setLoadingTierId] = useState(null);

  const loadTiers = useCallback(() => {
    setTiersLoading(true);
    fetchTiers()
      .then(data => setTiers(Array.isArray(data) ? data : []))
      .catch(e => setTiersError(e.message))
      .finally(() => setTiersLoading(false));
  }, []);

  useEffect(() => { loadTiers(); }, [loadTiers]);

  const handleEditTier = async (tierId) => {
    setLoadingTierId(tierId);
    try {
      const full = await fetchTierById(tierId);
      setModalTier(full);
    } catch (e) {
      console.error("Failed to fetch tier details:", e);
      const fallback = tiers.find(t => t.tierId === tierId);
      if (fallback) setModalTier(fallback);
    } finally {
      setLoadingTierId(null);
    }
  };

  const currencyLabel = (id) => {
    const c = currencies.find(c => String(c.currencyId) === String(id));
    return c ? `${c.currencyShortName} (${c.symbol})` : id;
  };

  return (
    <section className="lyl-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 className="lyl-card-title" style={{ margin: 0 }}>Tiers {tiers.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: C.axis, marginLeft: 6 }}>({tiers.length}/4)</span>}</h2>
        {tiers.length < 4 ? (
          <button style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setModalTier(null)}>
            + Add Tier
          </button>
        ) : (
          <span style={{ fontSize: 12, color: C.axis, background: "#eef2f7", padding: "4px 10px", borderRadius: 8, border: "1px solid #e5ebf3" }}>Maximum 4 tiers reached</span>
        )}
      </div>
      <p className="lyl-muted">Manage earning tiers for this program</p>

      {tiersLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "20px 0", color: C.axis, fontSize: 13 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid #e5ebf3`, borderTopColor: C.primary, animation: "lyl-spin 0.8s linear infinite" }} />
          Loading tiers…
        </div>
      )}
      {tiersError && <div style={{ padding: "10px 14px", background: "#fdf3f3", border: "1px solid #f0c4c0", borderRadius: 8, color: C.coral, fontSize: 13 }}>⚠ {tiersError}</div>}
      {!tiersLoading && !tiersError && tiers.length === 0 && (
        <div style={{ padding: "24px 0", textAlign: "center", color: C.axis, fontSize: 13 }}>No tiers yet. Click <b>+ Add Tier</b> to create one.</div>
      )}

      {!tiersLoading && tiers.length > 0 && (
        <div style={{ marginTop: 4, borderRadius: 10, overflow: "hidden", border: "1px solid #e5ebf3" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr 1fr 1fr 0.8fr 1fr 0.6fr", padding: "9px 14px", background: "#f4f7fb", borderBottom: "1px solid #e5ebf3", fontSize: 11, fontWeight: 700, color: C.axis, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>Name</span><span>Level</span><span>From</span><span>To</span>
            {/* <span>Expiry</span> */}
            <span>Currency</span><span></span>
          </div>
          {tiers.map((t, i) => (
            <div key={t.tierId} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr 1fr 1fr 0.8fr 1fr 0.6fr", padding: "11px 14px", alignItems: "center", background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: i < tiers.length - 1 ? "1px solid #f0f4fa" : "none", fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: C.primary }}>{t.tierName}</span>
              <span style={{  padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, color: C.primary, display: "inline-block" }}>{t.tierLevel}</span>
              <span style={{ color: C.axis }}>{t.fromAmount?.toLocaleString() ?? "—"}</span>
              <span style={{ color: C.axis }}>{t.toAmount?.toLocaleString() ?? "—"}</span>
            {/*   <span style={{ color: C.axis }}>{t.expiryDays != null ? `${t.expiryDays}d` : "—"}</span> */}
              <span style={{ color: C.axis }}>{currencyLabel(t.currencyId)}</span>
              <span>
                <button
                  onClick={() => handleEditTier(t.tierId)}
                  disabled={loadingTierId === t.tierId}
                  style={{ height: 28, padding: "0 10px", borderRadius: 7, border: "1px solid #e5ebf3", background: "#fff", color: C.axis, fontSize: 12, fontWeight: 600, cursor: loadingTierId === t.tierId ? "not-allowed" : "pointer", opacity: loadingTierId === t.tierId ? 0.6 : 1, display: "flex", alignItems: "center", gap: 5 }}>
                  {loadingTierId === t.tierId
                    ? <><div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #e5ebf3", borderTopColor: C.primary, animation: "lyl-spin 0.8s linear infinite" }} />Loading</>
                    : "Edit"}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {modalTier !== undefined && (
        <TierModal
          programId={programId}
          tier={modalTier}
          currencies={currencies}
          programCurrencyId={programCurrencyId}
          existingTiers={tiers}
          onClose={() => setModalTier(undefined)}
          onSaved={() => { setModalTier(undefined); loadTiers(); }}
        />
      )}
    </section>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function LoyaltyProgramConfig() {
  const navigate = useNavigate();
  const location = useLocation();
  const [existingProgram, setExistingProgram] = useState(location.state?.program ?? null);
  const isUpdateMode = !!existingProgram;

  const [currencies, setCurrencies] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [programCode, setProgramCode] = useState(existingProgram?.programCode ?? "");
  const [programName, setProgramName] = useState(existingProgram?.programName ?? "");
  const [enrollmentType, setEnrollmentType] = useState(existingProgram?.enrollmentType ?? "ONREQUEST");
  const [status, setStatus] = useState(existingProgram ? (existingProgram.isActive ? "ACTIVE" : "INACTIVE") : "ACTIVE");
  const [startDate, setStartDate] = useState(existingProgram?.startDate ? existingProgram.startDate.slice(0, 10) : "");
  const [endDate, setEndDate] = useState(existingProgram?.endDate ? existingProgram.endDate.slice(0, 10) : "");
  const [currencyId, setCurrencyId] = useState(String(existingProgram?.currencyId_fk ?? existingProgram?.currencyId ?? ""));
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" });

  useEffect(() => {
    fetchCurrencies()
      .then((currs) => {
        setCurrencies(currs ?? []);
        if (!existingProgram && currs?.length) {
          const sar = currs.find(c => c.currencyShortName === "SAR" || c.currencyCode === "SAR");
          setCurrencyId(String(sar?.currencyId ?? currs[0].currencyId));
        }
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedCurrency = currencies.find((c) => String(c.currencyId) === String(currencyId));
  const sym = selectedCurrency?.symbol && selectedCurrency.symbol !== "?" ? ` (${selectedCurrency.symbol})` : "";
  const currencyLabel = selectedCurrency ? `${selectedCurrency.currencyShortName}${sym}` : "—";

  const errors = useMemo(() => {
    const e = {};
    if (!programName.trim()) e.programName = "Program name is required";
    if (!currencyId) e.currencyId = "Currency is required";
    if (!startDate) e.startDate = "Start date is required";
    if (endDate && startDate && endDate < startDate) e.endDate = "End date must be after start date";
    return e;
  }, [programCode, programName, currencyId, startDate, endDate]);

  const onSave = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length || saving) return;
    setSaving(true);
    const payload = {
      programId: existingProgram?.programId ?? 0,
      programCode: isUpdateMode ? programCode : `TEMP-${Date.now()}`,
      programName: programName.trim(),
      enrollmentType, status,
      startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : new Date("2060-12-31T23:59:59.000Z").toISOString(),
      currencyId: Number(currencyId),
    };
    try {
      const result = await saveProgram(payload);
      if (isUpdateMode) {
        setToast({ msg: "Program updated successfully!", type: "success" });
        setTimeout(() => navigate("/loyalty"), 1500);
      } else {
        let newProgramId = result?.programId ?? result?.data?.programId ?? 0;
        if (!newProgramId) {
          const listRes = await fetch(`${API_BASE}/api/LoyaltyProgram/program/list?pageNumber=1&pageSize=50`, { headers: HEADERS() });
          if (listRes.ok) {
            const listJson = await listRes.json();
            const matched = (listJson.data ?? []).filter(p => p.programName === payload.programName).sort((a, b) => b.programId - a.programId)[0];
            newProgramId = matched?.programId ?? 0;
          }
        }
        const autoCode = newProgramId ? `LYTY-${newProgramId}` : "";
        setProgramCode(autoCode);
        if (newProgramId && autoCode) {
          fetch(`${API_BASE}/api/LoyaltyProgram/CreateOrUpdate`, {
            method: "POST", headers: HEADERS(),
            body: JSON.stringify({ ...payload, programId: newProgramId, programCode: autoCode }),
          }).catch(() => {});
        }
        setExistingProgram({ ...payload, programId: newProgramId, programCode: autoCode, isActive: payload.status === "ACTIVE" });
        setToast({ msg: "Program created! You can now add tiers below.", type: "success" });
      }
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const showErr = (k) => submitted ? errors[k] : undefined;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 24px", color: C.axis, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `3px solid #e5ebf3`, borderTopColor: C.primary, animation: "lyl-spin 0.8s linear infinite" }} />
      Loading…
      <style>{`@keyframes lyl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (loadError) return (
    <div style={{ margin: 32, padding: "16px 20px", background: "#fdf3f3", border: "1px solid #f0c4c0", borderRadius: 12, color: C.coral, fontFamily: "system-ui, sans-serif" }}>⚠ {loadError}</div>
  );

  return (
    <div className="lyl-wrap">
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "success" })} />

      <header className="lyl-header">
        <div className="lyl-icon">★</div>
        <div>
          <h1 className="lyl-h1">{isUpdateMode ? "Update Loyalty Program" : "Create Loyalty Program"}</h1>
          <p className="lyl-sub">{isUpdateMode ? `Editing: ${existingProgram.programName} · ${existingProgram.programCode}` : "Fill in the details below to set up your loyalty program"}</p>
        </div>
        <button className="lyl-back" onClick={() => navigate("/loyalty")}>← Back to Loyalty</button>
      </header>

      <section className="lyl-card">
        <h2 className="lyl-card-title">Program Details</h2>
        <p className="lyl-muted">Basic information about your loyalty program</p>
        <div className="lyl-grid2">
          <Field label="Program Name *" error={showErr("programName")}>
            <input style={inputStyle(submitted && errors.programName)} value={programName} onChange={(e) => setProgramName(e.target.value)} placeholder="Program name" />
          </Field>
          {isUpdateMode && (
            <Field label="Program Code">
              <input style={{ ...inputStyle(false), background: "#f4f7fb", color: "#6e7b8f", cursor: "not-allowed" }} value={programCode || existingProgram?.programCode || "—"} readOnly title="Auto-generated — cannot be changed" />
            </Field>
          )}
        </div>
        <div className="lyl-grid2">
          <Field label="Start Date *" error={showErr("startDate")}>
            <input type="date" style={inputStyle(submitted && errors.startDate)} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End Date" error={showErr("endDate")}>
            <input type="date" style={inputStyle(submitted && errors.endDate)} value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
          </Field>
        </div>
      </section>

      <section className="lyl-card">
        <h2 className="lyl-card-title">Enrollment Type</h2>
        <p className="lyl-muted">How customers join the loyalty program</p>
        <div className="lyl-radio-cards">
          {[
            { value: "AUTO", title: "Auto-enroll all customers", desc: "Loyalty numbers are automatically generated and assigned to every customer when they are created." },
            { value: "ONREQUEST", title: "Issue on customer request", desc: "Loyalty numbers are only created when customers specifically request to join the loyalty program." },
          ].map((opt) => (
            <label key={opt.value} className={`lyl-radio-card ${enrollmentType === opt.value ? "active" : ""}`} onClick={() => setEnrollmentType(opt.value)}>
              <div className="lyl-rc-head">
                <span className={`lyl-dot ${enrollmentType === opt.value ? "filled" : ""}`} />
                <div className="lyl-rc-title">{opt.title}</div>
              </div>
              <div className="lyl-rc-desc">{opt.desc}</div>
            </label>
          ))}
        </div>
      </section>

      <section className="lyl-card">
        <h2 className="lyl-card-title">Currency & Status</h2>
        <p className="lyl-muted">Select the operating currency and program status</p>
        <div className="lyl-grid2">
          <Field label="Currency *" error={showErr("currencyId")}>
            <div className="lyl-select-wrap">
              <select style={{ ...inputStyle(submitted && errors.currencyId), appearance: "none", paddingRight: 36 }}
                value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
                <option value="">Select currency…</option>
                {currencies.map((c) => (
                  <option key={c.currencyId} value={c.currencyId}>{c.currencyShortName} – {c.currencyFullName}{c.symbol && c.symbol !== "?" ? ` (${c.symbol})` : ""}</option>
                ))}
              </select>
              <span className="lyl-chevron">▾</span>
            </div>
          </Field>
          <Field label="Status">
            <div className="lyl-status-toggle">
              {["ACTIVE", "INACTIVE"].map((s) => (
                <button key={s} type="button" className={`lyl-status-btn ${status === s ? "selected" : ""} ${s.toLowerCase()}`} onClick={() => setStatus(s)}>
                  {s === "ACTIVE" ? "● Active" : "○ Inactive"}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </section>

      {isUpdateMode && <TiersSection programId={existingProgram.programId} currencies={currencies} programCurrencyId={currencyId} />}

      <div className="lyl-banner">
        <div className="lyl-banner-row">
          <span className="lyl-banner-item"><b>Program</b> {programName || "—"}</span>
          <span className="lyl-divider">·</span>
          <span className="lyl-banner-item"><b>Code</b> {programCode || "—"}</span>
          <span className="lyl-divider">·</span>
          <span className="lyl-banner-item"><b>Enrollment</b> {enrollmentType === "AUTO" ? "Auto" : "On Request"}</span>
          <span className="lyl-divider">·</span>
          <span className="lyl-banner-item"><b>Currency</b> {currencyLabel}</span>
          <span className="lyl-divider">·</span>
          <span className="lyl-banner-item" style={{ color: status === "ACTIVE" ? "#2e7d5e" : C.coral }}><b>Status</b> {status}</span>
        </div>
      </div>

      <div className="lyl-actions">
        <button className="lyl-cancel" type="button" onClick={() => navigate("/loyalty")}>Cancel</button>
        <button className={`lyl-save ${saving ? "disabled" : ""}`} type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : isUpdateMode ? "Update Program" : "Create Program"}
        </button>
      </div>

      <style>{`
        .lyl-wrap { --lp: #334b71; --lt: #A7D1CD; --lg: #eef2f7; --la: #6e7b8f; background: var(--lg); padding: 24px; display: grid; max-width: 900px; margin: 24px auto; gap: 18px; color: var(--lp); font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif; }
        .lyl-header { display: grid; grid-template-columns: 56px 1fr auto; gap: 14px; align-items: center; background: #fff; border: 1px solid #e5ebf3; border-radius: 14px; padding: 18px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
        .lyl-icon { width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center; background: var(--lt); color: var(--lp); font-weight: 900; font-size: 20px; }
        .lyl-h1 { margin: 0 0 5px; font-size: 20px; font-weight: 800; }
        .lyl-sub { margin: 0; color: var(--la); font-size: 13px; }
        .lyl-back { height: 38px; padding: 0 14px; border-radius: 10px; background: var(--lp); color: #fff; border: none; font-weight: 700; cursor: pointer; white-space: nowrap; font-size: 13px; transition: filter .15s, transform .05s; }
        .lyl-back:hover { filter: brightness(0.9); } .lyl-back:active { transform: translateY(1px); }
        .lyl-card { background: #fff; border: 1px solid #e5ebf3; border-radius: 14px; padding: 18px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
        .lyl-card-title { margin: 0 0 4px; font-size: 16px; font-weight: 800; }
        .lyl-muted { color: var(--la); margin: 0 0 14px; font-size: 13px; }
        .lyl-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 600px) { .lyl-grid2 { grid-template-columns: 1fr; } }
        .lyl-select-wrap { position: relative; }
        .lyl-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--la); pointer-events: none; font-size: 12px; }
        .lyl-status-toggle { display: flex; border-radius: 10px; overflow: hidden; border: 1px solid #d8dee8; }
        .lyl-status-btn { flex: 1; height: 40px; border: none; cursor: pointer; font-weight: 700; font-size: 13px; background: #f8fafc; color: var(--la); transition: background .15s, color .15s; font-family: inherit; }
        .lyl-status-btn.selected.active { background: #e6f4ef; color: #2e7d5e; }
        .lyl-status-btn.selected.inactive { background: #fdf3f3; color: #cc6b5c; }
        .lyl-status-btn:first-child { border-right: 1px solid #d8dee8; }
        .lyl-radio-cards { display: grid; gap: 10px; }
        .lyl-radio-card { border: 1px solid #e5ebf3; border-radius: 12px; padding: 12px 14px; background: #fff; cursor: pointer; transition: box-shadow .2s, border-color .2s; }
        .lyl-radio-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.06); }
        .lyl-radio-card.active { border-color: var(--lt); box-shadow: 0 0 0 3px rgba(167,209,205,0.35); }
        .lyl-rc-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .lyl-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--lp); position: relative; flex-shrink: 0; }
        .lyl-dot.filled::after { content: ""; position: absolute; inset: 2px; background: var(--lp); border-radius: 50%; }
        .lyl-rc-title { font-weight: 700; color: var(--lp); font-size: 14px; }
        .lyl-rc-desc { color: var(--la); font-size: 13px; margin-left: 26px; }
        .lyl-banner { background: #fff; border: 1px solid #e5ebf3; border-left: 5px solid var(--lp); border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
        .lyl-banner-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 13px; color: var(--la); }
        .lyl-banner-item b { color: var(--lp); margin-right: 4px; }
        .lyl-divider { color: #d0d9e8; font-size: 16px; }
        .lyl-actions { display: flex; justify-content: center; gap: 12px; }
        .lyl-cancel { height: 46px; padding: 0 28px; border-radius: 12px; border: 1.5px solid #d0d9e8; background: #fff; color: var(--la); font-weight: 700; cursor: pointer; font-size: 14px; font-family: inherit; transition: border-color .15s; }
        .lyl-cancel:hover { border-color: var(--lp); color: var(--lp); }
        .lyl-save { min-width: 200px; height: 46px; padding: 0 28px; border-radius: 12px; border: 1px solid #233244; background: var(--lp); color: #fff; font-weight: 800; cursor: pointer; font-size: 14px; font-family: inherit; box-shadow: 0 6px 16px rgba(51,75,113,0.22); transition: filter .15s, transform .05s, box-shadow .15s; }
        .lyl-save:hover:not(.disabled) { filter: brightness(0.92); box-shadow: 0 8px 18px rgba(51,75,113,.3); }
        .lyl-save:active:not(.disabled) { transform: translateY(1px); }
        .lyl-save.disabled { opacity: 0.55; cursor: not-allowed; }
        input::placeholder { font-weight: normal; font-size: 11px; opacity: 0.4; color: #666; }
        @keyframes lyl-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .lyl-header { grid-template-columns: 48px 1fr; } .lyl-back { grid-column: 1 / -1; width: 100%; } }
      `}</style>
    </div>
  );
}