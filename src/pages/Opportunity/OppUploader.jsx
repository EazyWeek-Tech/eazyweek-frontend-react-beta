// src/pages/Opportunity/OppUploader.jsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../../config";

const UPLOAD_ENDPOINT = "/api/Opportunity/UploadNoShowExcel";

// Excel headers (case-insensitive; spaces ignored)
const EXPECTED_HEADERS = [
  "THERAPISTNAME",
  "SERVICENAME",
  "APPOINTMENTDATETIME",
  "CustID",
  "CustName",
  "CustMobileNo",
  "ClinicCode",
  "OppCode",
];

const normHeader = (s) =>
  (s ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

const trim = (s) => (s ?? "").toString().trim();
const isRowEmpty = (obj) =>
  !Object.values(obj || {}).some((v) => trim(v) !== "");

/** Excel date -> string (backend-friendly) */
const normalizeDateValue = (v) => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date && !Number.isNaN(+v)) return v.toISOString();

  if (typeof v === "number") {
    const dt = XLSX.SSF.parse_date_code(v);
    if (dt && dt.y && dt.m && dt.d) {
      const iso = new Date(
        Date.UTC(dt.y, dt.m - 1, dt.d, dt.H || 0, dt.M || 0, dt.S || 0)
      );
      if (!Number.isNaN(+iso)) return iso.toISOString();
    }
    return String(v);
  }

  return String(v).trim();
};

const validateHeaders = (sheetHeaders = []) => {
  const found = sheetHeaders.map(normHeader);
  const expected = EXPECTED_HEADERS.map(normHeader);

  const missing = [];
  for (const e of expected) {
    if (!found.includes(e)) missing.push(e);
  }

  return { ok: missing.length === 0, missing };
};

/** Convert excel row object -> backend "line" shape */
const toLine = (rowObj) => {
  // rowObj may have original header keys; normalize by header name
  const get = (key) => {
    // Try direct, then case/space normalized match
    if (rowObj?.[key] !== undefined) return rowObj[key];
    const nk = normHeader(key);
    const hitKey = Object.keys(rowObj || {}).find((k) => normHeader(k) === nk);
    return hitKey ? rowObj[hitKey] : "";
  };

  return {
    therapistName: trim(get("THERAPISTNAME")),
    serviceName: trim(get("SERVICENAME")),
    appointmentDate: normalizeDateValue(get("APPOINTMENTDATETIME")), // ✅ as per required JSON
    custID: trim(get("CustID")), // ✅ as per required JSON (custID)
    custName: trim(get("CustName")),
    custMobileNo: trim(get("CustMobileNo")),
    clinicCode: trim(get("ClinicCode")),
    campignCode: trim(get("OppCode")), // ✅ map OppCode -> campignCode (spelling per API)
  };
};

export default function OppUploader() {
  const inputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [lines, setLines] = useState([]); // ✅ lines format
  const [rawHeaders, setRawHeaders] = useState([]);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const payloadPreview = useMemo(
    () => ({ uploadNoShowLinesJson: lines }),
    [lines]
  );

  const resetAll = () => {
    setFileName("");
    setLines([]);
    setRawHeaders([]);
    setError("");
    setSuccessMsg("");
    setParsing(false);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePick = () => {
    setError("");
    setSuccessMsg("");
    inputRef.current?.click();
  };

  const handleFile = async (e) => {
    setError("");
    setSuccessMsg("");
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
      const wb = XLSX.read(data, {
        type: "array",
        cellDates: true,
        cellText: false,
      });

      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) {
        setError("No sheet found in the uploaded file.");
        setParsing(false);
        return;
      }

      const ws = wb.Sheets[sheetName];

      // Validate headers
      const aoa = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: true,
        defval: "",
        blankrows: false,
      });

      const headerRow = (aoa?.[0] || []).map((h) => String(h ?? "").trim());
      setRawHeaders(headerRow);

      const { ok, missing } = validateHeaders(headerRow);
      if (!ok) {
        const missingPretty = EXPECTED_HEADERS.filter((h) =>
          missing.includes(normHeader(h))
        );
        setError(
          `Invalid template. Missing headers: ${missingPretty.join(", ")}`
        );
        setParsing(false);
        return;
      }

      // Read rows as objects using sheet headers
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
    setSuccessMsg("");

    if (!lines.length) {
      setError("Please upload a file first.");
      return;
    }

    setUploading(true);
    try {
      const url = `${API_BASE_URL}${UPLOAD_ENDPOINT}`;

      // ✅ required API format
      const payload = {
        uploadNoShowLinesJson: lines,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed with status ${res.status}`);
      }

      // backend might return json or text
      let msg = "";
      try {
        const data = await res.json();
        msg =
          data?.message ||
          data?.Message ||
          data?.statusMessage ||
          JSON.stringify(data);
      } catch {
        msg = await res.text().catch(() => "");
      }

      setSuccessMsg(
        msg
          ? `Uploaded ${lines.length} rows successfully. ${msg}`
          : `Uploaded ${lines.length} rows successfully.`
      );
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
          className="pribtn"
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

        {fileName ? (
          <span style={{ opacity: 0.8 }}>File: {fileName}</span>
        ) : null}
      </div>

      <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
        <div>
          Expected headers (Row 1):{" "}
          <b>{EXPECTED_HEADERS.join(" | ")}</b>
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

      {successMsg ? (
        <div
          style={{
            padding: 10,
            border: "1px solid #b7f3c4",
            background: "#f2fff6",
            color: "#145a2a",
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          {successMsg}
        </div>
      ) : null}

      {!!lines.length && (
        <>
          <div style={{ marginBottom: 8, opacity: 0.9 }}>
            <b>Total rows:</b> {lines.length}
          </div>

          {/* Preview table */}
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
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
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

          {/* JSON preview */}
          <details>
            <summary style={{ cursor: "pointer" }}>
              Show JSON payload (first 5 lines)
            </summary>
            <pre
              style={{
                marginTop: 10,
                padding: 12,
                background: "#0b1020",
                color: "#e6e9ef",
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 320,
                fontSize: 12,
              }}
            >
              {JSON.stringify(
                { uploadNoShowLinesJson: lines.slice(0, 5) },
                null,
                2
              )}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
