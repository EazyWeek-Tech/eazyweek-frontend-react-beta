import React, { useCallback, useEffect, useState } from "react";
import { Crumb, Field, TextInput, Toast } from "./VendorUI";
import { listVendorGroups, saveVendorGroup, setVendorGroupStatus } from "./vendorApi";
import "./vendor.css";

const blank = { groupCode: "", groupName: "", description: "", status: "Active" };

export default function VendorGroupMaster({ canManage = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listVendorGroups();
      const data = Array.isArray(res) ? res : (res && res.data) || [];
      setRows(data);
    } catch (err) {
      setToast({ type: "error", message: err.message });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setErrors({});
    setModal({ mode: "add", form: { ...blank } });
  };

  const openEdit = (g) => {
    setErrors({});
    setModal({
      mode: "edit",
      form: {
        groupCode: g.groupCode,
        groupName: g.groupName,
        description: g.description || "",
        status: g.status || "Active",
      },
    });
  };

  const setField = (key) => (e) =>
    setModal((m) => ({ ...m, form: { ...m.form, [key]: e.target.value } }));

  const save = async () => {
    const f = modal.form;
    const e = {};
    if (!f.groupCode.trim()) e.groupCode = "Group Code is required.";
    if (!f.groupName.trim()) e.groupName = "Group Name is required.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await saveVendorGroup({ ...f, mode: modal.mode });
      setToast({
        message: modal.mode === "add" ? "Vendor group added." : "Vendor group updated.",
      });
      setModal(null);
      load();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (g) => {
    const next = g.status === "Active" ? "Inactive" : "Active";
    try {
      await setVendorGroupStatus(g.groupCode, next);
      setToast({
        message: next === "Active" ? "Group activated." : "Group deactivated.",
      });
      load();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  return (
    <div className="vm-scope">
      <Crumb
        items={[
          { label: "Settings" },
          { label: "Supply Chain" },
          { label: "Vendor Group Master" },
        ]}
      />

      <div className="vm-head">
        <div>
          <h1 className="vm-title">Vendor Group Master</h1>
          <div className="vm-subtitle">
            Manage the vendor group values available in the Vendor Group field on
            Vendor Master.
          </div>
        </div>
        {canManage && (
          <button type="button" className="vm-btn vm-btn-primary" onClick={openAdd}>
            + Add Vendor Group
          </button>
        )}
      </div>

      {/* ---- list ---- */}
      <div className="vm-table-wrap">
        {loading ? (
          <div className="vm-loading">Loading vendor groups…</div>
        ) : rows.length === 0 ? (
          <div className="vm-empty">
            <b>No vendor groups yet</b>
            Add a group to make it selectable on Vendor Master.
          </div>
        ) : (
          <table className="vm-table">
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const locked = g.isSystem || g.groupCode === "NA";
                return (
                  <tr key={g.groupCode}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{g.groupName}</span>
                      {locked && (
                        <span className="vm-badge tone-grey" style={{ marginLeft: 10 }}>
                          SYSTEM DEFAULT
                        </span>
                      )}
                      <div className="vm-cell-code" style={{ marginTop: 3 }}>
                        {g.groupCode}
                        {g.description ? ` — ${g.description}` : ""}
                      </div>
                    </td>
                    <td
                      style={{
                        color: g.status === "Active" ? "#2c7a4b" : "#8b95a1",
                        fontWeight: 600,
                      }}
                    >
                      {g.status}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {locked || !canManage ? (
                        <span className="vm-btn-link is-muted">Locked</span>
                      ) : (
                        <span
                          className="vm-cell-actions"
                          style={{ justifyContent: "flex-end" }}
                        >
                          <button
                            type="button"
                            className="vm-btn-link"
                            onClick={() => openEdit(g)}
                          >
                            Edit
                          </button>
                          <span className="vm-sep">·</span>
                          <button
                            type="button"
                            className="vm-btn-link"
                            onClick={() => toggleStatus(g)}
                          >
                            {g.status === "Active" ? "Deactivate" : "Activate"}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- add / edit modal ---- */}
      {modal && (
        <div
          className="vm-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="vm-modal" role="dialog" aria-modal="true">
            <h3>{modal.mode === "add" ? "Add Vendor Group" : "Edit Vendor Group"}</h3>
            <p className="vm-modal-sub">Scoped to this Legal Entity.</p>

            <Field
              label="Group Code"
              required
              error={errors.groupCode}
              hint={
                modal.mode === "edit"
                  ? "Group Code cannot be changed once the group is created."
                  : ""
              }
            >
              <TextInput
                value={modal.form.groupCode}
                onChange={setField("groupCode")}
                disabled={modal.mode === "edit"}
                placeholder="e.g. DIST-01"
                error={errors.groupCode}
              />
            </Field>

            <Field label="Group Name" required error={errors.groupName}>
              <TextInput
                value={modal.form.groupName}
                onChange={setField("groupName")}
                placeholder="e.g. Distributor"
                error={errors.groupName}
              />
            </Field>

            <Field label="Description">
              <textarea
                className="vm-textarea"
                value={modal.form.description}
                onChange={setField("description")}
                placeholder="Optional — a short note on when to use this group"
              />
            </Field>

            <Field label="Status">
              <div className="vm-seg">
                <button
                  type="button"
                  className={modal.form.status === "Active" ? "is-on" : ""}
                  onClick={() =>
                    setModal((m) => ({ ...m, form: { ...m.form, status: "Active" } }))
                  }
                >
                  Active
                </button>
                <button
                  type="button"
                  className={modal.form.status === "Inactive" ? "is-on" : ""}
                  onClick={() =>
                    setModal((m) => ({ ...m, form: { ...m.form, status: "Inactive" } }))
                  }
                >
                  Inactive
                </button>
              </div>
            </Field>

            <div className="vm-modal-actions">
              <button
                type="button"
                className="vm-btn vm-btn-ghost"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="vm-btn vm-btn-primary"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Vendor Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClear={clearToast} />
    </div>
  );
}