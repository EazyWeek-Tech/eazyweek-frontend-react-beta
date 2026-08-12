import React, { useState, useEffect, useCallback, useMemo } from "react";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import { makeRequireAccess } from "../Settings/masterAccess";

const TOKEN = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const authGet = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  const j = await r.json();
  return j.data ?? j;
};

const authSend = async (url, body, method = "POST") => {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(body),
  });
  return r.json();
};

const parseWeight = (w) => {
  const n = parseFloat(String(w ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/* ---- small presentational pieces ---- */

const Field = ({ label, required, hint, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334b71", marginBottom: 5 }}>
      {label}{required && <span style={{ color: "#b91c1c", marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {hint && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{hint}</div>}
  </div>
);

const inputStyle = {
  width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8,
  fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const WeightBar = ({ total }) => {
  const over  = total > 100;
  const exact = Math.abs(total - 100) < 0.001;
  const color = over ? "#b91c1c" : exact ? "#2e7d5e" : "#854F0B";
  const bg    = over ? "#fdf3f3" : exact ? "#e6f4ef" : "#fef9e7";
  const brd   = over ? "#f0c4c0" : exact ? "#b3d9cc" : "#f5d78b";
  return (
    <div style={{ padding: "10px 16px", borderRadius: 10, background: bg,
      border: `1px solid ${brd}`, color, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
      Segment weightage total: {Math.round(total * 100) / 100}%
      {exact ? "" : over
        ? " — over 100%. Audit scores for this segment will not add up."
        : ` — ${Math.round((100 - total) * 100) / 100}% unallocated.`}
      <div style={{ height: 6, borderRadius: 3, background: "#fff", marginTop: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(total, 100)}%`, background: color }} />
      </div>
    </div>
  );
};

/* ---- editor modal ---- */

const CriteriaModal = ({ open, initial, segment, subSegments, saving, onCancel, onSave }) => {
  const [form, setForm] = useState({ criteria: "", subSegment: "", weightage: "", displayOrder: "" });

  useEffect(() => {
    if (!open) return;
    setForm({
      criteria:     initial?.criteria     || "",
      subSegment:   initial?.subSegment   || "",
      weightage:    initial?.weightage    ? String(parseWeight(initial.weightage)) : "",
      displayOrder: initial?.displayOrder ? String(initial.displayOrder) : "",
    });
  }, [open, initial]);

  if (!open) return null;
  const isEdit = !!initial?.recId;
  const used   = initial?.usageCount || 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 620, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1e293b", marginBottom: 4 }}>
          {isEdit ? `Edit Criteria — ${initial.criteriaCode}` : `Add Criteria — ${segment}`}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
          {isEdit
            ? "The code cannot be changed."
            : "The criteria code is generated automatically from the segment."}
        </div>

        {isEdit && used > 0 && (
          <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 12,
            background: "#f0f4fa", border: "1px solid #c8d5e8", color: "#334b71" }}>
            Used in {used} audit{used === 1 ? "" : "s"}. Those audits keep the wording and weightage
            they were scored under — this edit applies to new audits only.
          </div>
        )}

        <Field label="Criteria" required>
          <textarea value={form.criteria} rows={4}
            onChange={(e) => setForm((p) => ({ ...p, criteria: e.target.value }))}
            placeholder="The question as it appears on the audit form"
            style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
          <Field label="Sub-segment" hint="Groups criteria on the audit form">
            <input list="subsegment-options" value={form.subSegment}
              onChange={(e) => setForm((p) => ({ ...p, subSegment: e.target.value }))}
              placeholder="e.g. visit" style={inputStyle} />
            <datalist id="subsegment-options">
              {subSegments.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>

          <Field label="Weightage %" required>
            <input type="number" min="0" max="100" step="0.5" value={form.weightage}
              onChange={(e) => setForm((p) => ({ ...p, weightage: e.target.value }))}
              placeholder="5" style={inputStyle} />
          </Field>

          <Field label="Display order" hint="Blank = last">
            <input type="number" min="1" step="1" value={form.displayOrder}
              onChange={(e) => setForm((p) => ({ ...p, displayOrder: e.target.value }))}
              style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onCancel} disabled={saving}
            style={{ padding: "9px 18px", border: "1px solid #e2e8f0", borderRadius: 8,
              background: "#fff", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={saving}
            style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: "#334b71",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Criteria"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---- main page ---- */

const AuditCriteria = () => {
  const { has, guard, notifyDenied } = usePermissions();
  const requireAccess = makeRequireAccess({ has, guard, notifyDenied });
  const canManage = has("AUD.CRITERIA_MANAGE");

  const [segments, setSegments]   = useState([]);
  const [segment,  setSegment]    = useState("");
  const [rows,     setRows]       = useState([]);
  const [total,    setTotal]      = useState(0);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    authGet(`${API_BASE_URL}/api/Audit/Criteria/Segments`)
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setSegments(list);
        setSegment((cur) => cur || list[0]?.code || "");
      })
      .catch(() => showToast("Failed to load segments.", "error"));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadRows = useCallback(async () => {
    if (!segment) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ segment, search });
      const res    = await authGet(`${API_BASE_URL}/api/Audit/Criteria?${params}`);
      setRows(res?.rows || []);
      setTotal(res?.totalWeight ?? 0);
    } catch {
      showToast("Failed to load criteria.", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [segment, search]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const subSegments = useMemo(
    () => [...new Set(rows.map((r) => r.subSegment).filter(Boolean))].sort(),
    [rows]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.subSegment || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()];
  }, [rows]);

  const openAdd  = () => requireAccess("AUD.CRITERIA_MANAGE", () => { setEditing(null); setModalOpen(true); });
  const openEdit = (row) => requireAccess("AUD.CRITERIA_MANAGE", () => { setEditing(row); setModalOpen(true); });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const body = {
        auditSegment: segment,
        criteria:     form.criteria,
        subSegment:   form.subSegment,
        weightage:    form.weightage,
        displayOrder: form.displayOrder,
      };
      const res = editing?.recId
        ? await authSend(`${API_BASE_URL}/api/Audit/Criteria/${editing.recId}`, body, "PUT")
        : await authSend(`${API_BASE_URL}/api/Audit/Criteria`, body, "POST");

      if (!res.success) { showToast(res.message || "Save failed.", "error"); return; }
      setModalOpen(false);
      setEditing(null);
      showToast(res.message || "Saved.");
      loadRows();
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 10, fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#0f172a" }}>
      {toast && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, fontSize: 13,
          fontWeight: 600, background: toast.type === "success" ? "#e6f4ef" : "#fdf3f3",
          border: `1px solid ${toast.type === "success" ? "#b3d9cc" : "#f0c4c0"}`,
          color: toast.type === "success" ? "#2e7d5e" : "#b91c1c" }}>
          {toast.msg}
        </div>
      )}

      {/* ---- header ---- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
            Dashboard › Audit › Criteria
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>Audit Criteria</h2>
        </div>
        <button onClick={openAdd} disabled={!segment}
          style={{ background: "#334b71", color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 20px", fontWeight: 700, fontSize: 13,
            cursor: segment ? "pointer" : "not-allowed", opacity: segment ? 1 : 0.6 }}>
          + Add Criteria
        </button>
      </div>

      {!canManage && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, fontSize: 13,
          background: "#f0f4fa", border: "1px solid #c8d5e8", color: "#334b71", fontWeight: 600 }}>
          View only — changing audit criteria requires the Audit Criteria permission.
        </div>
      )}

      {/* ---- filters ---- */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={segment} onChange={(e) => setSegment(e.target.value)}
          style={{ height: 38, padding: "0 12px", border: "1.5px solid #e2e8f0",
            borderRadius: 10, fontSize: 13, background: "#fff", minWidth: 220 }}>
          {segments.length === 0 && <option value="">Loading segments…</option>}
          {segments.map((s) => (
            <option key={s.code} value={s.code}>{s.name} ({s.count})</option>
          ))}
        </select>
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search criteria, code or sub-segment…"
          style={{ flex: 1, height: 38, padding: "0 14px", border: "1.5px solid #e2e8f0",
            borderRadius: 10, fontSize: 13, outline: "none" }} />
      </div>

      {!loading && rows.length > 0 && !search && <WeightBar total={total} />}

      {/* ---- table ---- */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#334b71" }}>
              {["Code", "Criteria", "Weightage", "Order", "Used In", ""].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700,
                  fontSize: 11, color: "#fff", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                No criteria found for this segment.
              </td></tr>
            ) : grouped.map(([sub, list]) => (
              <React.Fragment key={sub}>
                <tr>
                  <td colSpan={6} style={{ padding: "9px 14px", background: "#f1f5f9",
                    fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase",
                    letterSpacing: ".06em", borderBottom: "1px solid #e2e8f0" }}>
                    {sub}
                    <span style={{ fontWeight: 600, color: "#94a3b8", marginLeft: 8 }}>
                      {list.reduce((s, r) => s + r.weightValue, 0)}%
                    </span>
                  </td>
                </tr>
                {list.map((r) => (
                  <tr key={r.recId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#334b71", whiteSpace: "nowrap" }}>
                      {r.criteriaCode}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, lineHeight: 1.45 }}>{r.criteria}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, whiteSpace: "nowrap" }}>{r.weightage}</td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>{r.displayOrder}</td>
                    <td style={{ padding: "12px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {r.usageCount > 0
                        ? `${r.usageCount} audit${r.usageCount === 1 ? "" : "s"}`
                        : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => openEdit(r)}
                        style={{ padding: "4px 12px", border: "1px solid #334b71", borderRadius: 6,
                          background: "#fff", color: "#334b71", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <CriteriaModal
        open={modalOpen}
        initial={editing}
        segment={segment}
        subSegments={subSegments}
        saving={saving}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
      />
    </div>
  );
};

export default AuditCriteria;