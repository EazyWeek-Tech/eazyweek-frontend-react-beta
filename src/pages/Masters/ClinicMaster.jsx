import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

const TOKEN = () => localStorage.getItem("token");

const ClinicMaster = () => {
  const [clinics, setClinics]       = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [confirm, setConfirm]       = useState(null);
  const [toast, setToast]           = useState(null);
  const [form, setForm]             = useState({ zone: "", code: "", name: "", address: "" });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchClinics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/master/LoadCenters`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      if (json.success) {
        setClinics(json.data);
        setFiltered(json.data);
      }
    } catch {
      showToast("Failed to load clinics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClinics(); }, []);

  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(
      clinics.filter((c) =>
        [c.name, c.code, c.zone, c.address].join(" ").toLowerCase().includes(s)
      )
    );
  }, [search, clinics]);

  const handleSave = async () => {
    if (!form.code || !form.name) return showToast("Code and Name are required", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/master/ClinicInsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Clinic added successfully");
        setDrawerOpen(false);
        setForm({ zone: "", code: "", name: "", address: "" });
        fetchClinics();
      } else {
        showToast(json.message || "Failed to add clinic", "error");
      }
    } catch {
      showToast("Error saving clinic", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (clinic) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/master/ClinicRemove`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({ code: clinic.code }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Clinic removed successfully");
        setClinics((prev) => prev.filter((c) => c.code !== clinic.code));
      } else {
        showToast(json.message || "Failed to remove clinic", "error");
      }
    } catch {
      showToast("Error removing clinic", "error");
    } finally {
      setConfirm(null);
    }
  };

  const ZONES = ["No Zone", "North", "South", "East", "West", "Entity"];

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <div style={s.breadcrumb}>
            <a href="/dashboard" style={s.breadLink}>Dashboard</a>
            <span style={s.breadSep}> › </span>
            <span>Manage Clinics</span>
          </div>
          <h1 style={s.title}>Clinics</h1>
          <p style={s.subtitle}>{filtered.length} clinic{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={s.addBtn} onClick={() => setDrawerOpen(true)}>+ Add Clinic</button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 400, marginBottom: 16 }}>
        <span style={s.searchIcon}>🔍</span>
        <input
          style={s.searchInput}
          placeholder="Search by name, code, zone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button style={s.clearBtn} onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* Table */}
      <div style={s.card}>
        {loading ? (
          <div style={s.loader}>Loading clinics...</div>
        ) : filtered.length === 0 ? (
          <div style={s.loader}>No clinics found</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Zone", "Code", "Name", "Address", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.code} style={s.tr}>
                  <td style={s.td}>
                    <span style={s.zoneBadge}>{c.zone || "—"}</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.codeTag}>{c.code}</span>
                  </td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{c.name}</td>
                  <td style={{ ...s.td, color: "#6b7280", fontSize: 12, maxWidth: 280 }}>{c.address || "—"}</td>
                  <td style={s.td}>
                    <button
                      style={s.deleteBtn}
                      onClick={() => setConfirm(c)}
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

      {/* Add Clinic Drawer */}
      {drawerOpen && (
        <>
          <div style={s.overlay} onClick={() => setDrawerOpen(false)} />
          <div style={s.drawer}>
            <div style={s.drawerHeader}>
              <div>
                <h2 style={s.drawerTitle}>Add Clinic</h2>
                <p style={s.drawerSub}>Fill in the details below</p>
              </div>
              <button style={s.closeBtn} onClick={() => setDrawerOpen(false)}>✕</button>
            </div>

            <div style={s.drawerBody}>
              <div style={s.field}>
                <label style={s.label}>Zone</label>
                <select
                  style={s.input}
                  value={form.zone}
                  onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                >
                  <option value="">Select zone</option>
                  {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Clinic Code *</label>
                <input
                  style={s.input}
                  placeholder="e.g. Bright"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Clinic Name *</label>
                <input
                  style={s.input}
                  placeholder="e.g. Bright Clinics"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Address</label>
                <textarea
                  style={{ ...s.input, height: 80, resize: "vertical" }}
                  placeholder="Full clinic address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>

            <div style={s.drawerFooter}>
              <button style={{ ...s.footerBtn, ...s.ghostBtn }} onClick={() => setDrawerOpen(false)}>
                Cancel
              </button>
              <button style={{ ...s.footerBtn, ...s.primaryBtn }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Clinic"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirm Modal */}
      {confirm && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <div style={s.modalIcon}>⚠️</div>
            <h3 style={s.modalTitle}>Remove Clinic?</h3>
            <p style={s.modalBody}>
              Are you sure you want to remove <strong>{confirm.name}</strong> ({confirm.code})?
              This action cannot be undone.
            </p>
            <div style={s.modalActions}>
              <button style={{ ...s.footerBtn, ...s.ghostBtn }} onClick={() => setConfirm(null)}>Cancel</button>
              <button style={{ ...s.footerBtn, ...s.dangerBtn }} onClick={() => handleDelete(confirm)}>
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
  page: { padding: "24px", fontFamily: "Inter, sans-serif", maxWidth: 1000, margin: "0 auto" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  breadcrumb: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  breadLink: { color: "#334B71", textDecoration: "none" },
  breadSep: { margin: "0 6px" },
  title: { fontSize: 24, fontWeight: 600, color: "#111827", margin: "0 0 4px" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: 0 },
  addBtn: { background: "#334B71", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 },
  searchInput: { width: "100%", padding: "9px 36px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  clearBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  loader: { textAlign: "center", padding: 40, color: "#6b7280", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  tr: { transition: "background 0.1s" },
  td: { padding: "12px 16px", fontSize: 13, color: "#374151", borderBottom: "1px solid #f3f4f6" },
  codeTag: { background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500 },
  zoneBadge: { background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 4, fontSize: 12 },
  deleteBtn: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 },
  drawer: { position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid #e5e7eb" },
  drawerTitle: { fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 },
  drawerSub: { fontSize: 12, color: "#6b7280", margin: "4px 0 0" },
  closeBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af" },
  drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  drawerFooter: { padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 10 },
  footerBtn: { height: 36, padding: "0 18px", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none" },
  primaryBtn: { background: "#334B71", color: "#fff" },
  ghostBtn: { background: "#fff", border: "1px solid #d1d5db", color: "#374151" },
  dangerBtn: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: 12, padding: 28, width: 380, maxWidth: "90vw" },
  modalIcon: { fontSize: 32, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 8px" },
  modalBody: { fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: "0 0 20px" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
  toast: { position: "fixed", bottom: 24, right: 24, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 14px rgba(0,0,0,0.12)" },
  toastSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #6ee7b7" },
  toastError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" },
};

export default ClinicMaster;