import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import { usePermissions } from "../Settings/usePermissions";
import { makeRequireAccess, checkAccess } from "../Settings/masterAccess";

const TOKEN = () => localStorage.getItem("token");

const DoctorMaster = () => {
  const [doctors, setDoctors]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clinics, setClinics]     = useState([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast]         = useState(null);

  const [form, setForm] = useState({
    employeeCode: "",
    associatedClinic: "",
  });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };
  const { has, guard, notifyDenied } = usePermissions();
  const requireAccess = makeRequireAccess({ has, guard, notifyDenied });

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/master/LoadDoctorMapping`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      if (json.success) setDoctors(json.data);
    } catch { showToast("Failed to load practitioners", "error"); }
    finally { setLoading(false); }
  }, []);

  // Load doctor employees — filtered by job title on backend
  const fetchDoctorEmployees = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/api/employee/doctors`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      if (json.success) setEmployees(json.data);
    } catch { console.error("Failed to load doctor employees"); }
  }, []);

  const fetchClinics = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/api/master/LoadCenters`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const json = await res.json();
      if (json.success) setClinics(json.data);
    } catch { console.error("Failed to load clinics"); }
  }, []);

  useEffect(() => {
    fetchDoctors();
    fetchDoctorEmployees();
    fetchClinics();
  }, [fetchDoctors, fetchDoctorEmployees, fetchClinics]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const openModal = () => {
    setForm({ employeeCode: "", associatedClinic: "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const gate = checkAccess({ has, code: "MDM.PRACTITIONERS_CREATE" });
    if (!gate.ok) { notifyDenied(gate.message); return; }
    if (!form.employeeCode)      return showToast("Please select a doctor", "error");
    if (!form.associatedClinic)  return showToast("Please select a clinic", "error");

    // Get name from selected employee
    const emp = employees.find(
      (e) => e.EMPLOYEECODE === form.employeeCode || e.CODE === form.employeeCode
    );

    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/master/DoctorMappingInsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({
          employeeCode:     form.employeeCode,
          firstName:        emp?.FIRSTNAME || emp?.NAME?.split(" ")[0] || "",
          lastName:         emp?.LASTNAME  || emp?.NAME?.split(" ").slice(1).join(" ") || "",
          associatedClinic: form.associatedClinic,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Practitioner mapped successfully");
        setModalOpen(false);
        fetchDoctors();
      } else {
        showToast(json.message || "Failed to add", "error");
      }
    } catch { showToast("An error occurred", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (doctor) => {
    const gate = checkAccess({ has, code: "MDM.PRACTITIONERS_DELETE" });
    if (!gate.ok) { notifyDenied(gate.message); setConfirmDelete(null); return; }
    try {
      const res  = await fetch(`${API_BASE_URL}/api/master/DoctorMappingRemove`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}` },
        body: JSON.stringify({ employeeCode: doctor.employeeCode }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Mapping removed successfully");
        fetchDoctors();
      } else {
        showToast(json.message || "Delete failed", "error");
      }
    } catch { showToast("An error occurred", "error"); }
    finally { setConfirmDelete(null); }
  };

  const filtered = doctors.filter((d) =>
    [d.firstName, d.lastName, d.employeeCode, d.associatedClinic]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <div style={s.breadcrumb}>
            <a href="/dashboard" style={s.breadLink}>Dashboard</a>
            <span style={s.breadSep}> › </span>
            <span>Manage Practitioners</span>
          </div>
          <h1 style={s.title}>Doctors / Therapists</h1>
          <p style={s.subtitle}>{filtered.length} practitioner mapping{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={s.addBtn} onClick={() => requireAccess("MDM.PRACTITIONERS_CREATE", openModal)}>+ Map Practitioner</button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 400, marginBottom: 16 }}>
        <span style={s.searchIcon}>🔍</span>
        <input
          style={s.searchInput}
          placeholder="Search by name, code, clinic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <button style={s.clearBtn} onClick={() => setSearch("")}>✕</button>}
      </div>

      {/* Table */}
      <div style={s.card}>
        {loading ? (
          <div style={s.loader}>Loading practitioners...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍⚕️</div>
            <p style={{ color: "#6b7280", fontSize: 14 }}>No practitioner mappings found</p>
            <button style={s.addBtn} onClick={() => requireAccess("MDM.PRACTITIONERS_CREATE", openModal)}>+ Map First Practitioner</button>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Employee Code", "First Name", "Last Name", "Associated Clinic", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr>
                  <td style={s.td}><span style={s.codeTag}>{d.employeeCode}</span></td>
                  <td style={s.td}>{d.firstName}</td>
                  <td style={s.td}>{d.lastName}</td>
                  <td style={s.td}>{d.associatedClinic}</td>
                  <td style={s.td}>
                    <button style={s.deleteBtn} onClick={() => requireAccess("MDM.PRACTITIONERS_DELETE", () => setConfirmDelete(d))}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal Popup */}
      {modalOpen && (
        <div style={s.modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>Map Practitioner to Clinic</h3>
                <p style={s.modalSub}>Select a doctor/therapist and assign them to a clinic</p>
              </div>
              <button style={s.closeBtn} onClick={() => setModalOpen(false)}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={s.modalBody}>
              {/* Doctor dropdown */}
              <div style={s.field}>
                <label style={s.label}>Doctor / Therapist</label>
                <select
                  name="employeeCode"
                  value={form.employeeCode}
                  onChange={handleChange}
                  style={s.select}
                >
                  <option value="">— Select practitioner —</option>
                  {employees.length === 0 ? (
                    <option disabled>No doctors found</option>
                  ) : (
                    employees.map((emp) => (
                      <option
                        key={emp.EMPLOYEECODE || emp.CODE}
                        value={emp.EMPLOYEECODE || emp.CODE}
                      >
                        {`${emp.FIRSTNAME || ""} ${emp.LASTNAME || ""}`.trim() || emp.NAME} — {emp.JOB}
                      </option>
                    ))
                  )}
                </select>
                {employees.length === 0 && (
                  <p style={s.hint}>
                    No employees found with doctor/therapist job titles.
                    Assign job titles in Employee Master first.
                  </p>
                )}
              </div>

              {/* Selected employee preview */}
              {form.employeeCode && (() => {
                const emp = employees.find(
                  (e) => (e.EMPLOYEECODE || e.CODE) === form.employeeCode
                );
                return emp ? (
                  <div style={s.empPreview}>
                    <div style={s.empPreviewName}>
                      {`${emp.FIRSTNAME || ""} ${emp.LASTNAME || ""}`.trim() || emp.NAME}
                    </div>
                    <div style={s.empPreviewDetail}>{emp.EMPLOYEECODE || emp.CODE} · {emp.JOB}</div>
                  </div>
                ) : null;
              })()}

              {/* Clinic dropdown */}
              <div style={s.field}>
                <label style={s.label}>Assign to Clinic</label>
                <select
                  name="associatedClinic"
                  value={form.associatedClinic}
                  onChange={handleChange}
                  style={s.select}
                >
                  <option value="">— Select clinic —</option>
                  {clinics.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={s.infoBox}>
                ℹ️ One practitioner can be mapped to multiple clinics by adding them again with a different clinic.
              </div>
            </div>

            {/* Modal Footer */}
            <div style={s.modalFooter}>
              <button style={{ ...s.footerBtn, ...s.ghostBtn }} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button style={{ ...s.footerBtn, ...s.primaryBtn }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Map Practitioner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div style={s.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...s.modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>️</div>
              <h3 style={s.modalTitle}>Remove Mapping?</h3>
              <p style={{ fontSize: 14, color: "#6b7280", margin: "8px 0 20px", lineHeight: 1.6 }}>
                Remove <strong>{confirmDelete.firstName} {confirmDelete.lastName}</strong> from{" "}
                <strong>{confirmDelete.associatedClinic}</strong>?
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button style={{ ...s.footerBtn, ...s.ghostBtn }} onClick={() => setConfirmDelete(null)}>
                  Cancel
                </button>
                <button style={{ ...s.footerBtn, ...s.dangerBtn }} onClick={() => handleDelete(confirmDelete)}>
                  Yes, Remove
                </button>
              </div>
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
  page:          { padding: "24px", fontFamily: "Inter, sans-serif", maxWidth: 1000, margin: "0 auto" },
  pageHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  breadcrumb:    { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  breadLink:     { color: "#334B71", textDecoration: "none" },
  breadSep:      { margin: "0 6px" },
  title:         { fontSize: 24, fontWeight: 600, color: "#111827", margin: "0 0 4px" },
  subtitle:      { fontSize: 13, color: "#6b7280", margin: 0 },
  addBtn:        { background: "#334B71", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  searchIcon:    { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 },
  searchInput:   { width: "100%", padding: "9px 36px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  clearBtn:      { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14 },
  card:          { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  loader:        { textAlign: "center", padding: 40, color: "#6b7280", fontSize: 14 },
  empty:         { textAlign: "center", padding: "48px 24px" },
  table:         { width: "100%", borderCollapse: "collapse" },
  th:            { padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#fff", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", background: "#334b71" },
  td:            { padding: "12px 16px", fontSize: 13, color: "#374151", borderBottom: "1px solid #f3f4f6" },
  codeTag:       { background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500 },
  deleteBtn:     { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" },
  modalOverlay:  { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal:         { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" },
  modalHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid #e5e7eb" },
  modalTitle:    { fontSize: 17, fontWeight: 600, color: "#111827", margin: 0 },
  modalSub:      { fontSize: 12, color: "#6b7280", margin: "4px 0 0" },
  closeBtn:      { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af" },
  modalBody:     { padding: "20px 24px" },
  modalFooter:   { padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 10 },
  field:         { marginBottom: 16 },
  label:         { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" },
  select:        { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", cursor: "pointer" },
  hint:          { fontSize: 12, color: "#ef4444", marginTop: 6 },
  empPreview:    { background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginBottom: 16 },
  empPreviewName:{ fontWeight: 600, fontSize: 14, color: "#1e40af" },
  empPreviewDetail:{ fontSize: 12, color: "#3b82f6", marginTop: 2 },
  infoBox:       { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#166534", marginTop: 4 },
  footerBtn:     { height: 36, padding: "0 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none" },
  primaryBtn:    { background: "#334B71", color: "#fff" },
  ghostBtn:      { background: "#fff", border: "1px solid #d1d5db", color: "#374151" },
  dangerBtn:     { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" },
  toast:         { position: "fixed", bottom: 24, right: 24, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 14px rgba(0,0,0,0.12)" },
  toastSuccess:  { background: "#ecfdf5", color: "#065f46", border: "1px solid #6ee7b7" },
  toastError:    { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" },
};

export default DoctorMaster;