import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token");

const EmployeeSegmentMapping = ({ employee, onBack }) => {
  const [clinics, setClinics]           = useState([]);
  const [segments, setSegments]         = useState([]);
  const [mappings, setMappings]         = useState([]);
  const [selectedClinic, setSelectedClinic]   = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [saving, setSaving]             = useState(false);
  const [loading, setLoading]           = useState(true);
  const [toast, setToast]               = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load clinics
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/master/LoadCenters`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        const json = await res.json();
        if (json.success) setClinics(json.data);
      } catch { console.error("Failed to load clinics"); }
    };
    fetchClinics();
  }, []);

  // Load audit segments
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/audit/segments`, {
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        const json = await res.json();
        if (json.success) setSegments(json.data);
      } catch { console.error("Failed to load segments"); }
    };
    fetchSegments();
  }, []);

  // Load existing mappings for this employee
  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/master/LoadAuditMappingEmpWise`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN()}`,
          },
          body: JSON.stringify({ employeeCode: employee.EMPLOYEECODE }),
        }
      );
      const json = await res.json();
      if (json.success) setMappings(json.data);
    } catch { console.error("Failed to load mappings"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (employee.EMPLOYEECODE) fetchMappings();
  }, [employee.EMPLOYEECODE]);

  const handleAdd = async () => {
    if (!selectedClinic || !selectedSegment) {
      return showToast("Please select both clinic and segment", "error");
    }
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE_URL}/api/master/AuditMappingEmpInsert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN()}`,
        },
        body: JSON.stringify({
          employeeCode: employee.EMPLOYEECODE,
          clinicCode:   selectedClinic,
          auditSegment: selectedSegment,
          createdBy:    user.employeeCode || "",
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Segment mapping added");
        setSelectedClinic("");
        setSelectedSegment("");
        fetchMappings();
      } else {
        showToast(json.message || "Failed to add mapping", "error");
      }
    } catch {
      showToast("Failed to add mapping", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (mapping) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/master/AuditMappingEmpRemove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN()}`,
        },
        body: JSON.stringify({
          employeeCode: employee.EMPLOYEECODE,
          auditSegment: mapping.auditSegment || mapping.AuditSegment,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Mapping removed");
        fetchMappings();
      } else {
        showToast(json.message || "Failed to remove", "error");
      }
    } catch {
      showToast("Failed to remove mapping", "error");
    } finally {
      setConfirmRemove(null);
    }
  };

  return (
    <div style={s.page}>
      {/* Breadcrumb */}
      <div style={s.breadcrumb}>
        <a href="/dashboard" style={s.breadLink}>Dashboard</a>
        <span style={s.breadSep}> › </span>
        <span style={s.breadLink} onClick={onBack} role="button">Employees</span>
        <span style={s.breadSep}> › </span>
        <span>Segment Mapping</span>
      </div>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Audit Segment Mapping</h1>
          <p style={s.subtitle}>
            {employee.EMPLOYEECODE} — {employee.FIRSTNAME} {employee.LASTNAME}
          </p>
        </div>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
      </div>

      {/* Add Mapping Card */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Add New Mapping</div>
        <div style={s.addRow}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Clinic</label>
            <select
              style={s.select}
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
            >
              <option value="">Select clinic</option>
              {clinics.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={s.label}>Audit Segment</label>
            <select
              style={s.select}
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
            >
              <option value="">Select segment</option>
              {segments.length > 0
                ? segments.map((seg) => (
                    <option key={seg.code || seg.CODE} value={seg.code || seg.CODE}>
                      {seg.name || seg.NAME}
                    </option>
                  ))
                : (
                  // Fallback hardcoded segments if API not ready yet
                  ["Digital", "Grooming", "Medical", "Safety", "Customer Service", "Administrative"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))
                )
              }
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              style={{ ...s.btn, ...s.primaryBtn }}
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? "Adding..." : "+ Add"}
            </button>
          </div>
        </div>
      </div>

      {/* Existing Mappings */}
      <div style={{ ...s.card, marginTop: 16 }}>
        <div style={s.sectionTitle}>Current Mappings</div>
        {loading ? (
          <div style={s.emptyState}>Loading mappings...</div>
        ) : mappings.length === 0 ? (
          <div style={s.emptyState}>No segment mappings found for this employee.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Segment", "Clinic", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mappings.map((m, i) => (
                <tr key={i}>
                  <td style={s.td}>
                    <span style={s.segBadge}>{m.auditSegment || m.AuditSegment}</span>
                  </td>
                  <td style={s.td}>{m.clinicName || m.ClinicName || "—"}</td>
                  <td style={s.td}>
                    <button
                      style={s.removeBtn}
                      onClick={() => setConfirmRemove(m)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Remove Modal */}
      {confirmRemove && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h3 style={s.modalTitle}>Remove Mapping?</h3>
            <p style={s.modalBody}>
              Remove <strong>{confirmRemove.auditSegment || confirmRemove.AuditSegment}</strong> mapping
              for {employee.FIRSTNAME}?
            </p>
            <div style={s.modalActions}>
              <button style={{ ...s.btn, ...s.ghostBtn }} onClick={() => setConfirmRemove(null)}>Cancel</button>
              <button style={{ ...s.btn, ...s.dangerBtn }} onClick={() => handleRemove(confirmRemove)}>
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, ...(toast.type === "error" ? s.toastError : s.toastSuccess) }}>
          {toast.text}
        </div>
      )}
    </div>
  );
};

const s = {
  page: { padding: "24px", fontFamily: "Inter, sans-serif", maxWidth: 900, margin: "0 auto" },
  breadcrumb: { fontSize: 12, color: "#9ca3af", marginBottom: 16 },
  breadLink: { color: "#334B71", textDecoration: "none", cursor: "pointer" },
  breadSep: { margin: "0 6px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 600, color: "#111827", margin: "0 0 4px" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: 0 },
  backBtn: { background: "#fff", border: "1px solid #d1d5db", color: "#374151", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#fff", background: "#334B71", padding: "8px 12px", borderRadius: 6, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-block" },
  addRow: { display: "flex", gap: 16, alignItems: "flex-end" },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 5 },
  select: { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff" },
  btn: { padding: "9px 18px", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", whiteSpace: "nowrap" },
  primaryBtn: { background: "#334B71", color: "#fff" },
  dangerBtn: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" },
  ghostBtn: { background: "#fff", border: "1px solid #d1d5db", color: "#374151" },
  emptyState: { textAlign: "center", padding: 32, color: "#9ca3af", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  td: { padding: "12px 16px", fontSize: 13, color: "#374151", borderBottom: "1px solid #f3f4f6" },
  segBadge: { background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500 },
  removeBtn: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: 12, padding: 28, width: 380, maxWidth: "90vw" },
  modalTitle: { fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 8px" },
  modalBody: { fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: "0 0 20px" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
  toast: { position: "fixed", bottom: 24, right: 24, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 14px rgba(0,0,0,0.12)" },
  toastSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #6ee7b7" },
  toastError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" },
};

export default EmployeeSegmentMapping;