import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import Toast from "../../components/Toast";
import { usePermissions } from "./usePermissions";
import { clearFormConfigCache } from "./useFormConfig";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN()}`,
});

/* ==== styles ==== */

const CSS = `
  .fcfg-card { background:#fff; border:1px solid #e7ecf4; border-radius:12px;
    padding:20px 24px; margin-bottom:16px; }
  .fcfg-sec-title { font-size:11px; font-weight:800; color:#334B71; text-transform:uppercase;
    letter-spacing:.06em; padding-bottom:10px; margin-bottom:16px; border-bottom:2px solid #334B71; }
  .fcfg-inp { width:100%; padding:8px 11px; border:1px solid #e7ecf4; border-radius:8px;
    font-size:13px; color:#334B71; font-family:Lato,sans-serif; background:#fff;
    outline:none; box-sizing:border-box; }
  .fcfg-inp:focus { border-color:#334B71; box-shadow:0 0 0 3px rgba(51,75,113,.1); }
  .fcfg-inp:disabled { background:#f8fafc; color:#94a3b8; cursor:not-allowed; }
  .fcfg-tbl { width:100%; border-collapse:collapse; font-size:13px; }
  .fcfg-tbl th { padding:9px 12px; text-align:left; font-weight:700; color:#334B71;
    font-size:11px; text-transform:uppercase; letter-spacing:.04em;
    background:#f8fafc; border-bottom:1px solid #e7ecf4; white-space:nowrap; }
  .fcfg-tbl td { padding:9px 12px; border-bottom:1px solid #f1f5f9; color:#334B71;
    vertical-align:middle; }
  .fcfg-tbl tr:last-child td { border-bottom:none; }
  .fcfg-grp td { background:#f8fafc; font-size:11px; font-weight:800; color:#64748b;
    text-transform:uppercase; letter-spacing:.05em; }
  .fcfg-key { font-size:11px; color:#94a3b8; margin-top:2px; }
  .fcfg-lock { font-size:11px; color:#94a3b8; font-style:italic; }
  .fcfg-btn { border:none; border-radius:8px; padding:10px 24px; font-size:13px; font-weight:700;
    cursor:pointer; font-family:Lato,sans-serif; }
  .fcfg-btn:disabled { opacity:.55; cursor:not-allowed; }
  .fcfg-btn-pri { background:#334B71; color:#fff; }
  .fcfg-btn-sec { background:#DD7766; color:#fff; border:1px solid #DD7766; }
  .fcfg-chk { width:16px; height:16px; accent-color:#334B71; cursor:pointer; }
  .fcfg-chk:disabled { cursor:not-allowed; }
  .fcfg-locked { display:inline-flex; align-items:center; justify-content:center;
    cursor:help; border-bottom:1px dotted #94a3b8; padding-bottom:1px; outline:none; }
  .fcfg-locked:focus-visible { box-shadow:0 0 0 3px rgba(51,75,113,.15); border-radius:4px; }
  .fcfg-why { font-size:11px; color:#94a3b8; margin-top:3px; line-height:1.4; }
`;

/* ==== component ==== */

/* A disabled input gets no pointer events, so a title on it never appears.
   The wrapper carries the tooltip and the dotted underline makes it findable. */
const Locked = ({ reason, children }) => {
  if (!reason) return children;
  return (
    <span
      className="fcfg-locked"
      title={reason}
      tabIndex={0}
      role="note"
      aria-label={reason}
    >
      {children}
    </span>
  );
};

const FormConfiguration = () => {
  const { guard, notifyDenied } = usePermissions();

  const [forms, setForms] = useState([]);
  const [formCode, setFormCode] = useState("");
  const [config, setConfig] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/FormConfig/Forms`, { headers: authHeaders() });
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json?.data) ? json.data : [];
        setForms(list);
        if (list.length && !formCode) setFormCode(list[0].formCode);
      } catch (err) {
        console.error("[formConfig] form list failed:", err?.message || err);
        setToast({ type: "error", message: "Could not load the form list." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = useCallback(async (code) => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/FormConfig/Config/${encodeURIComponent(code)}`,
        { headers: authHeaders() }
      );
      const json = await res.json().catch(() => ({}));
      const data = json?.data ?? null;
      setConfig(data);
      setRows(
        (data?.fields || []).map((f) => ({
          fieldKey: f.key,
          label: f.label,
          catalogLabel: f.catalogLabel,
          mandatory: !!f.mandatory,
          visible: !!f.visible,
          section: f.section,
          readOnly: !!f.readOnly,
          lockMandatory: !!f.lockMandatory,
          allowLabel: !!f.allowLabel,
          allowHide: !!f.allowHide,
          lockReason: f.lockReason || "",
          hideReason: f.hideReason || "",
        }))
      );
    } catch (err) {
      console.error("[formConfig] config load failed:", err?.message || err);
      setConfig(null);
      setRows([]);
      setToast({ type: "error", message: "Could not load this form's configuration." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig(formCode);
  }, [formCode, loadConfig]);

  const setRow = (key, patch) =>
    setRows((prev) => prev.map((r) => (r.fieldKey === key ? { ...r, ...patch } : r)));

  const grouped = useMemo(() => {
    const sections = config?.sections || [];
    if (!sections.length) return [{ key: "", name: "", rows }];
    const out = sections.map((s) => ({
      key: s.key,
      name: s.name,
      rows: rows.filter((r) => r.section === s.key),
    }));
    const loose = rows.filter((r) => !sections.some((s) => s.key === r.section));
    if (loose.length) out.push({ key: "", name: "Other", rows: loose });
    return out.filter((g) => g.rows.length);
  }, [config, rows]);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/FormConfig/Config/${encodeURIComponent(formCode)}`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            fields: rows.map((r) => ({
              fieldKey: r.fieldKey,
              label: r.label,
              mandatory: r.mandatory,
              visible: r.visible,
            })),
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        notifyDenied(json?.message || "Access denied. You do not have permission for this action.");
        return;
      }
      if (json?.success) {
        clearFormConfigCache(formCode);
        setToast({ type: "success", message: json.message || "Configuration saved." });
        await loadConfig(formCode);
      } else {
        setToast({ type: "error", message: json?.message || "Could not save the configuration." });
      }
    } catch (err) {
      console.error("[formConfig] save failed:", err?.message || err);
      setToast({ type: "error", message: "Could not save the configuration." });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/FormConfig/Reset/${encodeURIComponent(formCode)}`,
        { method: "POST", headers: authHeaders(), body: JSON.stringify({}) }
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        notifyDenied(json?.message || "Access denied. You do not have permission for this action.");
        return;
      }
      if (json?.success) {
        clearFormConfigCache(formCode);
        setToast({ type: "success", message: json.message || "Configuration reset to defaults." });
        await loadConfig(formCode);
      } else {
        setToast({ type: "error", message: json?.message || "Could not reset the configuration." });
      }
    } catch (err) {
      console.error("[formConfig] reset failed:", err?.message || err);
      setToast({ type: "error", message: "Could not reset the configuration." });
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;

  return (
    <div style={{ fontFamily: "Lato,sans-serif" }}>
      <style>{CSS}</style>

      {/* ==== header ==== */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#2b3f73", margin: 0 }}>Form Configuration</h1>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
            Rename fields and choose which ones staff must complete
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="fcfg-btn fcfg-btn-sec" disabled={busy} onClick={() => guard("SET.EDIT", reset)}>
            Reset to defaults
          </button>
          <button className="fcfg-btn fcfg-btn-pri" disabled={busy} onClick={() => guard("SET.EDIT", submit)}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* ==== form picker ==== */}
      <div className="fcfg-card">
        <div className="fcfg-sec-title">Form</div>
        <select
          className="fcfg-inp"
          style={{ maxWidth: 320 }}
          value={formCode}
          disabled={busy}
          onChange={(e) => setFormCode(e.target.value)}
        >
          {forms.length === 0 && <option value="">Loading…</option>}
          {forms.map((f) => (
            <option key={f.formCode} value={f.formCode}>
              {f.formName}
            </option>
          ))}
        </select>
      </div>

      {/* ==== field table ==== */}
      <div className="fcfg-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading && (
          <div style={{ padding: "28px 24px", color: "#64748b", fontSize: 13 }}>Loading fields…</div>
        )}

        {!loading && rows.length === 0 && (
          <div style={{ padding: "28px 24px", color: "#64748b", fontSize: 13 }}>
            Pick a form above to set up its fields.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <table className="fcfg-tbl">
            <thead>
              <tr>
                <th style={{ width: "38%" }}>Field</th>
                <th>Label shown to staff</th>
                <th style={{ width: 110, textAlign: "center" }}>Mandatory</th>
                <th style={{ width: 100, textAlign: "center" }}>Visible</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <React.Fragment key={g.key || g.name}>
                  {g.name && (
                    <tr className="fcfg-grp">
                      <td colSpan={4}>{g.name}</td>
                    </tr>
                  )}
                  {g.rows.map((r) => (
                    <tr key={r.fieldKey}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.catalogLabel}</div>
                        <div className="fcfg-key">{r.fieldKey}</div>
                      </td>
                      <td>
                        {r.allowLabel ? (
                          <input
                            className="fcfg-inp"
                            value={r.label}
                            disabled={busy}
                            maxLength={100}
                            onChange={(e) => setRow(r.fieldKey, { label: e.target.value })}
                          />
                        ) : (
                          <span className="fcfg-lock">{r.label} — label fixed for this form</span>
                        )}
                        {r.lockMandatory && r.lockReason && (
                          <div className="fcfg-why">{r.lockReason}</div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Locked reason={r.lockMandatory ? r.lockReason : ""}>
                          <input
                            type="checkbox"
                            className="fcfg-chk"
                            checked={r.mandatory}
                            disabled={busy || r.lockMandatory}
                            onChange={(e) => setRow(r.fieldKey, { mandatory: e.target.checked })}
                          />
                        </Locked>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Locked reason={!r.allowHide ? r.hideReason || r.lockReason : ""}>
                          <input
                            type="checkbox"
                            className="fcfg-chk"
                            checked={r.visible}
                            disabled={busy || !r.allowHide}
                            onChange={(e) => setRow(r.fieldKey, { visible: e.target.checked })}
                          />
                        </Locked>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
};

export default FormConfiguration;