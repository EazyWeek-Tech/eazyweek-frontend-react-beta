// src/pages/Opportunity/AddLeadCustomerList.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const AddLeadCustomerList = () => {
  const { oppCode: oppCodeFromParam } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  // Resolve oppCode from: URL param -> navigation state -> sessionStorage
  const resolvedOppCode =
    oppCodeFromParam ||
    state?.oppCode ||
    window.sessionStorage.getItem("oppCode") ||
    "";

  // Persist once we know it
  useEffect(() => {
    if (resolvedOppCode) {
      window.sessionStorage.setItem("oppCode", resolvedOppCode);
    }
  }, [resolvedOppCode]);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/Customer/LoadCustomers`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        setCustomers(arr);
      } catch (e) {
        console.error(e);
        setError("Failed to load customers.");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => {
      return (
        (c.custId || "").toLowerCase().includes(s) ||
        (c.firstName || "").toLowerCase().includes(s) ||
        (c.lastName || "").toLowerCase().includes(s) ||
        (c.mobile || "").toLowerCase().includes(s) ||
        (c.centerName || "").toLowerCase().includes(s)
      );
    });
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const currentRows = filtered.slice(startIdx, startIdx + pageSize);

  // Navigate to ManualOppCustomerDetails with prefilled state
  const handleOpenCustomer = (row) => {
    if (!resolvedOppCode) {
      alert("Opportunity code is missing. Please open this page from an opportunity.");
      return;
    }

    const H = {
    custID: row.custId,
    custName: [row.firstName, row.lastName].filter(Boolean).join(" ").trim(),
    custMobileNo: row.mobile,
    clinicLocation: row.centerName,
    email: row.email,
    preferredLanguage: "Arabic",
  };

  // code = customer id (clicked)
  const code = row.custId;
  const oppcode = resolvedOppCode;


  navigate(`/manuallead/${oppcode}/${code}`, {
    state: { oppCode: resolvedOppCode, header: H },
  });

  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
        <div style={{ fontWeight: 700, color: "#334155" }}>
          {resolvedOppCode ? `Opportunity: ${resolvedOppCode}` : "Opportunity: (not set)"}
        </div>
        <div style={{ flex: 1 }} />
        <input
          style={{
            flex: 1,
            maxWidth: 520,
            height: 38,
            border: "1px solid #d0d7de",
            borderRadius: 6,
            padding: "0 10px",
          }}
          placeholder="Search by custId, name, phone or center…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <button
          style={{
            background: "#14233c",
            color: "#fff",
            border: 0,
            borderRadius: 6,
            padding: "0 16px",
            height: 38,
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => {}}
        >
          Search
        </button>
      </div>

      {loading && <div style={{ padding: 24 }}>Loading…</div>}
      {error && <div style={{ padding: 24, color: "#c33" }}>{error}</div>}

      {!loading && !error && (
        <>
          <div style={{ overflowX: "auto", background: "#fff", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={th}>Code</th>
                  <th style={th}>First Name</th>
                  <th style={th}>Last Name</th>
                  <th style={th}>Phone No.</th>
                  <th style={th}>Center</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((r) => (
                  <tr key={r.custId} style={{ borderBottom: "1px solid #f1f3f5" }}>
                    <td style={td}>
                      <button
                        onClick={() => handleOpenCustomer(r)}
                        style={{
                          color: "#1f4b91",
                          textDecoration: "underline",
                          background: "none",
                          border: 0,
                          padding: 0,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                        title="Open Add Lead"
                      >
                        {r.custId}
                      </button>
                    </td>
                    <td style={td}>{r.firstName}</td>
                    <td style={td}>{r.lastName}</td>
                    <td style={td}>{r.mobile}</td>
                    <td style={td}>{r.centerName}</td>
                  </tr>
                ))}
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...td, textAlign: "center", color: "#6b7280" }}>
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "#6b7280" }}>
              Showing {filtered.length === 0 ? 0 : startIdx + 1} to{" "}
              {Math.min(startIdx + pageSize, filtered.length)} of {filtered.length}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  height: 34,
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  padding: "0 8px",
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span style={{ color: "#6b7280" }}>per page</span>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                style={pgBtn}
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>

              {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                const num = i + 1;
                return (
                  <button
                    key={num}
                    style={{ ...pgBtn, ...(page === num ? pgBtnActive : null) }}
                    onClick={() => setPage(num)}
                  >
                    {num}
                  </button>
                );
              })}

              {totalPages > 10 && <span style={{ padding: "4px 8px" }}>…</span>}

              <button
                style={pgBtn}
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const th = { textAlign: "left", padding: "10px 8px", fontWeight: 700, color: "#334155" };
const td = { padding: "10px 8px", color: "#111827", whiteSpace: "nowrap" };

const pgBtn = {
  padding: "6px 10px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
};
const pgBtnActive = {
  background: "#14233c",
  color: "#fff",
  borderColor: "#14233c",
};

export default AddLeadCustomerList;
