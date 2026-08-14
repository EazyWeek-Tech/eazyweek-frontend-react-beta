"use client";

import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../../config";

const UPLOAD_ENDPOINT = "/api/Opportunity/UploadNoShowExcel";

const EXPECTED_HEADERS = [
  "THERAPISTCODE",
  "THERAPISTNAME",
  "SERVICENAME",
  "APPOINTMENTDATETIME",
  "CustID",
  "CustName",
  "CustMobileNo",
  "ClinicCode",
  "OppCode",
];

const MAX_ROWS = 5000;

/* ---- value helpers ---- */
const normHeader = (s) =>
  (s ?? "").toString().trim().replace(/\s+/g, "").toLowerCase();

const clean = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);

  let s = String(v);
  s = s.replace(/\u0000/g, "");
  s = s.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  s = s.replace(/\u00A0/g, " ");
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/\s+/g, " ");
  return s.trim();
};

const isRowEmpty = (obj) =>
  !Object.values(obj || {}).some((v) => clean(v) !== "");

const pad2 = (n) => String(n).padStart(2, "0");

const toISODate = (v) => {
  if (v === null || v === undefined) return "";

  if (v instanceof Date && !Number.isNaN(+v)) {
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }

  if (typeof v === "number") {
    const dt = XLSX.SSF.parse_date_code(v);
    if (dt && dt.y && dt.m && dt.d) {
      return `${dt.y}-${pad2(dt.m)}-${pad2(dt.d)}`;
    }
    return "";
  }

  const s = clean(v);
  if (!s) return "";

  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

  const dt = new Date(s);
  if (!Number.isNaN(+dt)) {
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  }

  return "";
};

const validateHeaders = (sheetHeaders = []) => {
  const found = sheetHeaders.map(normHeader);
  const expected = EXPECTED_HEADERS.map(normHeader);
  const missing = expected.filter((e) => !found.includes(e));
  return { ok: missing.length === 0, missing };
};

const toLine = (rowObj) => {
  const get = (key) => {
    if (rowObj?.[key] !== undefined) return rowObj[key];
    const nk = normHeader(key);
    const hitKey = Object.keys(rowObj || {}).find((k) => normHeader(k) === nk);
    return hitKey ? rowObj[hitKey] : "";
  };

  return {
    therapistCode: clean(get("THERAPISTCODE")),
    therapistName: clean(get("THERAPISTNAME")),
    serviceName: clean(get("SERVICENAME")),
    appointmentDate: toISODate(get("APPOINTMENTDATETIME")),
    custID: clean(get("CustID")),
    custName: clean(get("CustName")),
    custMobileNo: clean(get("CustMobileNo")),
    clinicCode: clean(get("ClinicCode")),
    campignCode: clean(get("OppCode")),
  };
};

const authHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* storage unavailable */
  }
  return headers;
};

const statusStyle = (status) => {
  if (status === "inserted") return { color: "#145a2a", fontWeight: 600 };
  if (status === "skipped") return { color: "#7a5b1d", fontWeight: 600 };
  return { color: "#7a1d1d", fontWeight: 600 };
};

/* ---- component ---- */
export default function OppUploader() {
  const inputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [lines, setLines] = useState([]);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const problemRows = useMemo(
    () => (result?.rows || []).filter((r) => r.status !== "inserted"),
    [result]
  );

  const resetAll = () => {
    setFileName("");
    setLines([]);
    setRawHeaders([]);
    setError("");
    setResult(null);
    setParsing(false);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePick = () => {
    setError("");
    setResult(null);
    inputRef.current?.click();
  };

  const handleFile = async (e) => {
    setError("");
    setResult(null);
    setLines([]);
    setRawHeaders([]);

    const file = e.target.files?.[0];
    if (!file) return;

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError("Please upload a valid Excel file (.xlsx/.xls) or .csv");
      return;
    }

    setFileName(file.name);
    setParsing(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array", cellDates: true, cellText: false });

      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) {
        setError("No sheet found in the uploaded file.");
        setParsing(false);
        return;
      }

      const ws = wb.Sheets[sheetName];

      const aoa = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: true,
        defval: "",
        blankrows: false,
      });

      const headerRow = (aoa?.[0] || []).map((h) => clean(h));
      setRawHeaders(headerRow);

      const { ok, missing } = validateHeaders(headerRow);
      if (!ok) {
        const missingPretty = EXPECTED_HEADERS.filter((h) =>
          missing.includes(normHeader(h))
        );
        setError(`Invalid template. Missing headers: ${missingPretty.join(", ")}`);
        setParsing(false);
        return;
      }

      const objects = XLSX.utils.sheet_to_json(ws, {
        header: headerRow,
        raw: true,
        defval: "",
        range: 1,
        blankrows: false,
      });

      const normalizedLines = (objects || [])
        .map((obj) => toLine(obj))
        .filter((r) => !isRowEmpty(r));

      if (normalizedLines.length === 0) {
        setError("No data rows found (or all rows are empty).");
        setParsing(false);
        return;
      }

      if (normalizedLines.length > MAX_ROWS) {
        setError(
          `This file has ${normalizedLines.length} rows. Please split it into files of ${MAX_ROWS} rows or fewer.`
        );
        setParsing(false);
        return;
      }

      const badDates = normalizedLines.filter((r) => !r.appointmentDate).length;
      if (badDates) {
        setError(
          `${badDates} row(s) have an unreadable APPOINTMENTDATETIME. They will be rejected by the server; fix them or continue.`
        );
      }

      setLines(normalizedLines);
      setParsing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to parse the file. Please re-check the template.");
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    setError("");
    setResult(null);

    if (!lines.length) {
      setError("Please upload a file first.");
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${UPLOAD_ENDPOINT}`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ uploadNoShowLinesJson: lines }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || payload?.success === false) {
        throw new Error(
          payload?.message || `Upload failed with status ${res.status}`
        );
      }

      setResult({
        message: payload?.message || "Upload complete.",
        received: payload?.data?.received ?? lines.length,
        inserted: payload?.data?.inserted ?? 0,
        skipped: payload?.data?.skipped ?? 0,
        rejected: payload?.data?.rejected ?? 0,
        rows: payload?.data?.rows || [],
      });
      setUploading(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Upload failed.");
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Opportunity Excel Uploader - No Show</h2>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={handlePick}
          disabled={parsing || uploading}
          className="pribtn"
          style={{
            padding: "8px 12px",
            cursor: parsing || uploading ? "not-allowed" : "pointer",
          }}
        >
          {parsing ? "Parsing..." : "Upload Excel"}
        </button>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!lines.length || parsing || uploading}
          className="pribtn"
          style={{
            padding: "8px 12px",
            cursor:
              !lines.length || parsing || uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Sending..." : "Send to Backend"}
        </button>

        <button
          type="button"
          onClick={resetAll}
          disabled={parsing || uploading}
          className="secbtn"
        >
          Reset
        </button>

        {fileName ? <span style={{ opacity: 0.8 }}>File: {fileName}</span> : null}
      </div>

      <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
        <div>
          Expected headers (Row 1): <b>{EXPECTED_HEADERS.join(" | ")}</b>
        </div>
        {!!rawHeaders.length && (
          <div style={{ marginTop: 6 }}>
            Found headers: <b>{rawHeaders.join(" | ")}</b>
          </div>
        )}
      </div>

      {error ? (
        <div
          style={{
            padding: 10,
            border: "1px solid #f3b7b7",
            background: "#fff2f2",
            color: "#7a1d1d",
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      {result ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{result.message}</div>
          <div style={{ fontSize: 13 }}>
            Received {result.received} &middot; Inserted {result.inserted} &middot;
            Skipped {result.skipped} &middot; Rejected {result.rejected}
          </div>

          {!!problemRows.length && (
            <div
              style={{
                marginTop: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                overflow: "auto",
                maxHeight: 260,
                background: "#fff",
              }}
            >
              <table
                style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
              >
                <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                  <tr>
                    {["Row", "CustID", "OppCode", "Status", "Reason"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: 8,
                          borderBottom: "1px solid #e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {problemRows.map((r, idx) => (
                    <tr key={`${r.line}-${idx}`}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                        {r.line}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                        {r.custId}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                        {r.oppCode}
                      </td>
                      <td
                        style={{
                          padding: 8,
                          borderBottom: "1px solid #f1f5f9",
                          ...statusStyle(r.status),
                        }}
                      >
                        {r.status}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                        {r.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!!lines.length && (
        <>
          <div style={{ marginBottom: 8, opacity: 0.9 }}>
            <b>Total rows:</b> {lines.length}
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "auto",
              maxHeight: 320,
              marginBottom: 12,
            }}
          >
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                <tr>
                  {Object.keys(lines[0]).map((k) => (
                    <th
                      key={k}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.slice(0, 50).map((r, idx) => (
                  <tr key={idx}>
                    {Object.keys(lines[0]).map((k) => (
                      <td
                        key={k}
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #f1f5f9",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r?.[k] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}