import React, { useState } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../../config";

const TOKEN = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const post = async (path, body) => {
  const res = await fetch(`${API_BASE_URL}/api/Courtesy/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || `Request failed (${res.status})`);
  return data.data ?? data;
};


const CourtesyCallUpload = ({ onClose }) => {
  const [fileName, setFileName] = useState("");
  const [rows, setRows]         = useState([]);
  const [preview, setPreview]   = useState(null);
  const [result, setResult]     = useState(null);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");

  const reset = () => { setRows([]); setPreview(null); setResult(null); setError(""); };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: "array", cellDates: false });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
      const out = json.map((r, i) => {
        const o = { __rowNum__: r.__rowNum__ ?? i + 1 };
        for (const k of Object.keys(r)) {
          if (k === "__rowNum__") continue;
          o[k] = r[k] == null ? "" : r[k];
        }
        return o;
      });
      setRows(out);
      const p = await post("UploadPreview", { rows: out });
      setPreview(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const publish = async () => {
    if (!rows.length) return;
    if (!window.confirm(`Create ${preview?.callsToCreate ?? 0} courtesy call(s) and append to ${preview?.callsToAppend ?? 0}? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      const r = await post("UploadPublish", { rows });
      setResult(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const Stat = ({ label, value, tone }) => (
    <div style={{ minWidth: 120, padding: "10px 14px", borderRadius: 8, background: tone || "#f8fafc", border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#1F4E79" }}>{value ?? 0}</div>
    </div>
  );

  const summary = result || preview;

  return (
    <div style={{ marginTop: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      {/* ===== HEADER ===== */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#1F4E79" }}>Courtesy Call Excel Upload</div>
        <button className="pribtn" onClick={onClose} style={{ padding: "6px 12px" }}>
          <i className="bx bx-x" />
        </button>
      </div>

      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16 }}>
        Columns expected: Appointment Date, Patient Code, Patient Name, Service Code, Service Name,
        Therapists Code, Therapist, Service Category, Service Subcategory, Center Name.
        One courtesy call is created per patient per centre per appointment date; each row becomes a
        service item under it. Completed calls are never touched; rows already present are skipped.
      </p>

      {/* ===== FILE ===== */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <label className="pribtn" style={{ cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
          <i className="bx bx-upload" style={{ marginRight: 6 }} />
          Choose Excel
          <input type="file" accept=".xlsx,.xls" onChange={onFile} disabled={busy} style={{ display: "none" }} />
        </label>
        {fileName && <span style={{ fontSize: 13, color: "#374151" }}>{fileName}</span>}
        {busy && <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 18, color: "#1F4E79" }} />}
      </div>

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fff5f5", color: "#991b1b", border: "1px solid #fecaca", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ===== SUMMARY ===== */}
      {summary && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <Stat label="Rows read" value={summary.rowsRead} />
            <Stat label="Rows skipped" value={summary.rowsSkipped} tone={summary.rowsSkipped ? "#fffbeb" : undefined} />
            <Stat label={result ? "Calls created" : "Calls to create"} value={result ? result.created : summary.callsToCreate} tone="#f0fdf4" />
            <Stat label={result ? "Calls appended" : "Calls to append"} value={result ? result.appended : summary.callsToAppend} />
            <Stat label="Completed (untouched)" value={summary.skippedCompleted} />
            <Stat label="Already present" value={summary.skippedDuplicate} />
            <Stat label={result ? "Items inserted" : "Items to insert"} value={result ? result.itemsInserted : summary.itemsToInsert} />
          </div>

          {summary.dateFrom && (
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
              Appointment dates {summary.dateFrom} to {summary.dateTo}
              {result?.firstReference && <> · references {result.firstReference} to {result.lastReference}</>}
            </div>
          )}

          {/* ===== PER CENTRE ===== */}
          {summary.perCentre?.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Centre", "Create", "Append", "Completed", "Already present", "Items", "Patients not in master"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e5e7eb", color: "#374151" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.perCentre.map((c) => (
                  <tr key={c.centre}>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>{c.centre}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>{c.create}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>{c.append}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>{c.skipCompleted}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>{c.skipDuplicate}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>{c.items}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6", color: c.customersNotFound ? "#b45309" : "#6b7280" }}>{c.customersNotFound}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {summary.unresolvedCentres?.length > 0 && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", fontSize: 13, marginBottom: 12 }}>
              Rows skipped because the centre could not be resolved:{" "}
              {summary.unresolvedCentres.map((u) => `${u.centreName || "(blank)"} (${u.rows})`).join(", ")}
            </div>
          )}

          {/* ===== SKIPPED ROWS ===== */}
          {summary.skipped?.length > 0 && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, color: "#374151" }}>
                {summary.skipped.length} skipped row(s) — show reasons
              </summary>
              <div style={{ maxHeight: 220, overflow: "auto", marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                {summary.skipped.slice(0, 500).map((s, i) => (
                  <div key={i}>Row {s.row}: {s.reason}</div>
                ))}
                {summary.skipped.length > 500 && <div>… {summary.skipped.length - 500} more</div>}
              </div>
            </details>
          )}

          {/* ===== ACTIONS ===== */}
          {!result && (
            <button
              className="pribtn"
              onClick={publish}
              disabled={busy || !preview || (preview.callsToCreate + preview.callsToAppend) === 0}
            >
              <i className="bx bx-check-circle" style={{ marginRight: 6 }} />
              Publish
            </button>
          )}
          {result && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontSize: 13 }}>
              <i className="bx bx-check-circle" style={{ marginRight: 6 }} />
              {result.message}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CourtesyCallUpload;