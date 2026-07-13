// ============================================================================
// RoleMaster.jsx — Role Master & Security Settings screen
// Settings > Legal Entity > Security. Single-file, inline styles, C palette.
// Talks to /api/Security/*. Gated by SEC.VIEW / SEC.EDIT / SEC.ADD via
// /me/permissions (Admins pass automatically as super-roles).
//
// ── INTEGRATION SHIM (adjust these four to match your app, then delete note) ──
//   API_BASE        : base URL for the API
//   getToken()      : how the JWT is stored
//   getCurrentUser(): the logged-in user object
//   getActiveCentre(): the active clinic/centre code
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE = "/api"; // e.g. "http://localhost:8080/api" in dev

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || {};
  } catch {
    return {};
  }
}
function getActiveCentre() {
  const u = getCurrentUser();
  return (
    u.centerCode ||
    u.CENTERCODE ||
    u.centreCode ||
    localStorage.getItem("centerCode") ||
    localStorage.getItem("activeCentre") ||
    ""
  );
}

async function authFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}
const unwrap = (json) =>
  Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : json?.data ?? json;

// ── palette ──────────────────────────────────────────────────────────────────
const C = {
  navy: "#334b71",
  navyDk: "#071D49",
  coral: "#cc6b5c",
  gold: "#d4a853",
  slate: "#8da0b8",
  green: "#4a9e8a",
  bg: "#f4f7fb",
  card: "#ffffff",
  line: "#e5ebf3",
  text: "#22314a",
  sub: "#6e7b8f",
};

// ── small building blocks ────────────────────────────────────────────────────
function Badge({ children, color }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: "#fff",
        background: color,
        borderRadius: 6,
        padding: "2px 7px",
      }}
    >
      {children}
    </span>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? C.coral : C.green;
  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        right: 18,
        zIndex: 50,
        background: bg,
        color: "#fff",
        padding: "11px 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        boxShadow: "0 8px 24px rgba(7,29,73,.18)",
        maxWidth: 380,
      }}
      onClick={onClose}
      role="status"
    >
      {toast.message}
    </div>
  );
}

// ── Add Role modal ───────────────────────────────────────────────────────────
function AddRoleModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      setErr("Enter a role name.");
      return;
    }
    setBusy(true);
    setErr("");
    const ok = await onCreate({ rname: name.trim(), rcode: code.trim() || undefined });
    setBusy(false);
    if (ok !== true) setErr(ok || "Could not create the role.");
  };

  return (
    <div className="rm-overlay" onMouseDown={onClose}>
      <div className="rm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px", color: C.navyDk, fontSize: 17 }}>Add role</h3>
        <p style={{ margin: "0 0 16px", color: C.sub, fontSize: 12.5 }}>
          New roles start with no permissions. Set them from the matrix after creating.
        </p>
        <label className="rm-lbl">Role name</label>
        <input
          className="rm-input"
          value={name}
          maxLength={100}
          autoFocus
          placeholder="e.g. Billing Supervisor"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <label className="rm-lbl" style={{ marginTop: 12 }}>
          Role code <span style={{ color: C.sub, fontWeight: 500 }}>(optional — auto-generated if blank)</span>
        </label>
        <input
          className="rm-input"
          value={code}
          maxLength={50}
          placeholder="e.g. BSV001"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {err && <div className="rm-err">{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="rm-btn rm-btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="rm-btn rm-btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create role"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Permission matrix ────────────────────────────────────────────────────────
function PermissionMatrix({ data, draft, setDraft, readOnly, canEdit }) {
  const disabled = readOnly || !canEdit;

  const toggleActivity = (activityId, value) => {
    if (disabled) return;
    setDraft((d) => ({ ...d, [activityId]: value ? 1 : 0 }));
  };

  const toggleModule = (mod, value) => {
    if (disabled) return;
    setDraft((d) => {
      const next = { ...d };
      mod.activities.forEach((a) => {
        next[a.activityId] = value ? 1 : 0;
      });
      return next;
    });
  };

  return (
    <div>
      {data.modules.map((mod) => {
        const allOn = mod.activities.every((a) => (draft[a.activityId] ?? a.isGranted) === 1);
        const someOn = mod.activities.some((a) => (draft[a.activityId] ?? a.isGranted) === 1);
        let lastArea = "__init__";
        return (
          <div key={mod.moduleCode} className="rm-modcard">
            <div className="rm-modhead">
              <label className="rm-modcheck">
                <input
                  type="checkbox"
                  checked={allOn}
                  ref={(el) => el && (el.indeterminate = !allOn && someOn)}
                  disabled={disabled}
                  onChange={(e) => toggleModule(mod, e.target.checked)}
                />
                <span>{mod.moduleName}</span>
              </label>
              <span className="rm-modcount">
                {mod.activities.filter((a) => (draft[a.activityId] ?? a.isGranted) === 1).length}
                {" / "}
                {mod.activities.length}
              </span>
            </div>

            <div className="rm-actgrid">
              {mod.activities.map((a) => {
                const showArea = a.area && a.area !== lastArea;
                lastArea = a.area || lastArea;
                const on = (draft[a.activityId] ?? a.isGranted) === 1;
                return (
                  <React.Fragment key={a.activityId}>
                    {showArea && <div className="rm-area">{a.area}</div>}
                    <label className={`rm-act ${on ? "rm-act-on" : ""} ${disabled ? "rm-act-dis" : ""}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={disabled}
                        onChange={(e) => toggleActivity(a.activityId, e.target.checked)}
                      />
                      <span>{a.name}</span>
                    </label>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function RoleMaster() {
  const [perms, setPerms] = useState(null); // { isSuper, codes:Set }
  const [permsError, setPermsError] = useState("");
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [matrix, setMatrix] = useState(null); // { role, readOnly, modules }
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = "ok") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const has = useCallback(
    (code) => !!perms && (perms.isSuper || perms.codes.has(code)),
    [perms]
  );
  const canView = has("SEC.VIEW") || !!perms?.isSuper;
  const canEdit = has("SEC.EDIT");
  const canAdd = has("SEC.ADD");

  // Load permissions for the active centre, then the roles list.
  useEffect(() => {
    (async () => {
      const centre = getActiveCentre();
      const { ok, json } = await authFetch(
        `/Security/me/permissions?centre=${encodeURIComponent(centre)}`
      );
      if (ok && json?.data) {
        setPerms({ isSuper: !!json.data.isSuper, codes: new Set(json.data.codes || []) });
      } else {
        setPermsError(json?.message || "Could not resolve your permissions.");
        setPerms({ isSuper: false, codes: new Set() });
      }
    })();
  }, []);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    const { ok, json } = await authFetch("/Security/roles");
    setRolesLoading(false);
    if (ok) setRoles(unwrap(json) || []);
    else notify(json?.message || "Failed to load roles.", "error");
  }, [notify]);

  useEffect(() => {
    if (canView) loadRoles();
  }, [canView, loadRoles]);

  const openRole = useCallback(
    async (recId) => {
      setSelectedId(recId);
      setMatrix(null);
      setDraft({});
      setMatrixLoading(true);
      const { ok, json } = await authFetch(`/Security/roles/${recId}/matrix`);
      setMatrixLoading(false);
      if (ok && json?.data) {
        setMatrix(json.data);
        const seed = {};
        json.data.modules.forEach((m) =>
          m.activities.forEach((a) => (seed[a.activityId] = a.isGranted))
        );
        setDraft(seed);
      } else {
        notify(json?.message || "Failed to load permissions.", "error");
      }
    },
    [notify]
  );

  const dirty = useMemo(() => {
    if (!matrix) return false;
    for (const m of matrix.modules) {
      for (const a of m.activities) {
        if ((draft[a.activityId] ?? a.isGranted) !== a.isGranted) return true;
      }
    }
    return false;
  }, [matrix, draft]);

  const save = async () => {
    if (!matrix || !dirty) return;
    const grants = [];
    matrix.modules.forEach((m) =>
      m.activities.forEach((a) =>
        grants.push({ activityId: a.activityId, isGranted: draft[a.activityId] ?? a.isGranted })
      )
    );
    setSaving(true);
    const { ok, json } = await authFetch(`/Security/roles/${matrix.role.recId}/matrix`, {
      method: "PUT",
      body: JSON.stringify({ grants }),
    });
    setSaving(false);
    if (ok) {
      notify(`Saved. ${json?.data?.changed ?? 0} permission change(s) applied.`);
      openRole(matrix.role.recId);
    } else {
      notify(json?.message || "Could not save permissions.", "error");
    }
  };

  const resetDraft = () => {
    if (!matrix) return;
    const seed = {};
    matrix.modules.forEach((m) =>
      m.activities.forEach((a) => (seed[a.activityId] = a.isGranted))
    );
    setDraft(seed);
  };

  const createRole = async ({ rname, rcode }) => {
    const { ok, json } = await authFetch("/Security/roles", {
      method: "POST",
      body: JSON.stringify({ rname, rcode }),
    });
    if (ok) {
      setShowAdd(false);
      notify("Role created.");
      await loadRoles();
      if (json?.data?.RECID) openRole(json.data.RECID);
      return true;
    }
    return json?.message || false;
  };

  const deleteRole = async () => {
    if (!matrix) return;
    const { role } = matrix;
    if (!window.confirm(`Delete the role "${role.name}"? This cannot be undone.`)) return;
    const { ok, json } = await authFetch(`/Security/roles/${role.recId}`, { method: "DELETE" });
    if (ok) {
      notify("Role deleted.");
      setSelectedId(null);
      setMatrix(null);
      loadRoles();
    } else {
      notify(json?.message || "Could not delete the role.", "error");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        (r.RNAME || "").toLowerCase().includes(q) || (r.RCODE || "").toLowerCase().includes(q)
    );
  }, [roles, search]);

  // ── access gate ──
  if (perms && !canView) {
    return (
      <div style={sx.page}>
        <Styles />
        <div style={sx.gateCard}>
          <div style={{ fontSize: 40, marginBottom: 8 }}></div>
          <h2 style={{ margin: "0 0 6px", color: C.navyDk }}>Security settings are restricted</h2>
          <p style={{ color: C.sub, margin: 0, maxWidth: 420 }}>
            You need the Security Roles permission to view this page. Ask an administrator to grant
            it.
          </p>
          {permsError && <p style={{ color: C.coral, fontSize: 12.5, marginTop: 10 }}>{permsError}</p>}
        </div>
      </div>
    );
  }

  const selected = matrix?.role;

  return (
    <div style={sx.page}>
      <Styles />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div style={sx.header}>
        <div>
          <h1 style={sx.h1}>Role Master &amp; Security</h1>
          <div style={sx.crumb}>Settings › Legal Entity › Security</div>
        </div>
        {canAdd && (
          <button className="rm-btn rm-btn-primary" onClick={() => setShowAdd(true)}>
            + Add role
          </button>
        )}
      </div>

      <div style={sx.body}>
        {/* Roles list */}
        <aside style={sx.listPane}>
          <input
            className="rm-input"
            placeholder="Search roles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ margin: "0 0 10px" }}
          />
          {rolesLoading ? (
            <div style={sx.muted}>Loading roles…</div>
          ) : filtered.length === 0 ? (
            <div style={sx.muted}>No roles match your search.</div>
          ) : (
            filtered.map((r) => {
              const active = r.RECID === selectedId;
              return (
                <button
                  key={r.RECID}
                  className={`rm-roleitem ${active ? "rm-roleitem-active" : ""}`}
                  onClick={() => openRole(r.RECID)}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: active ? "#fff" : C.text }}>
                      {r.RNAME}
                    </span>
                    <span style={{ fontSize: 11, color: active ? "rgba(255,255,255,.75)" : C.sub }}>
                      {r.RCODE}
                      {r.Active === 0 ? " · inactive" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    {r.IsSuperRole === 1 && <Badge color={active ? C.gold : C.gold}>Full</Badge>}
                    {r.IsFixed === 1 && r.IsSuperRole !== 1 && (
                      <Badge color={active ? C.slate : C.slate}>Fixed</Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Matrix pane */}
        <section style={sx.matrixPane}>
          {!selected && !matrixLoading && (
            <div style={sx.empty}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>🛡️</div>
              <div style={{ fontWeight: 700, color: C.navy }}>Select a role</div>
              <div style={{ color: C.sub, fontSize: 13 }}>
                Choose a role on the left to view and edit its permissions.
              </div>
            </div>
          )}

          {matrixLoading && <div style={sx.muted}>Loading permissions…</div>}

          {selected && !matrixLoading && (
            <>
              <div style={sx.matrixHead}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ margin: 0, color: C.navyDk, fontSize: 18 }}>{selected.name}</h2>
                    {selected.isSuperRole === true && <Badge color={C.gold}>Full access</Badge>}
                    {selected.isFixed && !selected.isSuperRole && <Badge color={C.slate}>Fixed</Badge>}
                  </div>
                  <div style={{ color: C.sub, fontSize: 12, marginTop: 3 }}>{selected.code}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!matrix.readOnly && canEdit && !selected.isFixed && !selected.isSuperRole && (
                    <button className="rm-btn rm-btn-ghost rm-btn-danger" onClick={deleteRole}>
                      Delete role
                    </button>
                  )}
                  {!matrix.readOnly && canEdit && (
                    <>
                      <button className="rm-btn rm-btn-ghost" onClick={resetDraft} disabled={!dirty || saving}>
                        Reset
                      </button>
                      <button className="rm-btn rm-btn-primary" onClick={save} disabled={!dirty || saving}>
                        {saving ? "Saving…" : "Save changes"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {matrix.readOnly && (
                <div style={sx.lockNote}>
                  This role has full access to every module. Admin and Product Team permissions are
                  fixed and cannot be changed.
                </div>
              )}

              <PermissionMatrix
                data={matrix}
                draft={draft}
                setDraft={setDraft}
                readOnly={matrix.readOnly}
                canEdit={canEdit}
              />
            </>
          )}
        </section>
      </div>

      {showAdd && <AddRoleModal onClose={() => setShowAdd(false)} onCreate={createRole} />}
    </div>
  );
}

// ── layout styles (objects) ──────────────────────────────────────────────────
const sx = {
  page: { fontFamily: "Lato, system-ui, sans-serif", background: C.bg, minHeight: "100%", color: C.text },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 22px",
    borderBottom: `1px solid ${C.line}`,
    background: C.card,
  },
  h1: { margin: 0, fontSize: 20, color: C.navyDk, fontWeight: 800 },
  crumb: { fontSize: 12, color: C.sub, marginTop: 3 },
  body: { display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, padding: 16, alignItems: "start" },
  listPane: {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 12,
    padding: 12,
    maxHeight: "calc(100vh - 150px)",
    overflow: "auto",
    position: "sticky",
    top: 16,
  },
  matrixPane: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, minHeight: 420 },
  matrixHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 14,
    borderBottom: `1px solid ${C.line}`,
    marginBottom: 14,
  },
  muted: { color: C.sub, fontSize: 13, padding: 14 },
  empty: { textAlign: "center", padding: "70px 20px", color: C.sub },
  lockNote: {
    background: "#fbf6ea",
    border: `1px solid ${C.gold}`,
    color: "#7a5f1e",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 12.5,
    marginBottom: 14,
  },
  gateCard: {
    maxWidth: 480,
    margin: "80px auto",
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 14,
    padding: "36px 28px",
    textAlign: "center",
  },
};

// ── interactive styles (hover/focus/checkbox) ────────────────────────────────
function Styles() {
  return (
    <style>{`
      .rm-input{width:100%;box-sizing:border-box;height:38px;border:1px solid ${C.line};border-radius:9px;
        padding:0 12px;font:inherit;font-size:13px;color:${C.text};outline:none;background:#fff;}
      .rm-input:focus{border-color:${C.navy};box-shadow:0 0 0 3px rgba(51,75,113,.12);}
      .rm-lbl{display:block;font-size:12px;font-weight:700;color:${C.navy};margin-bottom:5px;}
      .rm-err{color:${C.coral};font-size:12px;margin-top:10px;font-weight:600;}

      .rm-btn{height:38px;padding:0 16px;border-radius:9px;font:inherit;font-size:13px;font-weight:700;
        cursor:pointer;border:1px solid transparent;transition:background .12s,color .12s,border-color .12s;}
      .rm-btn:disabled{opacity:.45;cursor:not-allowed;}
      .rm-btn-primary{background:${C.navy};color:#fff;}
      .rm-btn-primary:hover:not(:disabled){background:${C.navyDk};}
      .rm-btn-ghost{background:#fff;color:${C.navy};border-color:${C.line};}
      .rm-btn-ghost:hover:not(:disabled){border-color:${C.navy};}
      .rm-btn-danger{color:${C.coral};}
      .rm-btn-danger:hover:not(:disabled){border-color:${C.coral};background:#fdf3f1;}

      .rm-roleitem{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;
        text-align:left;background:#fff;border:1px solid ${C.line};border-radius:10px;padding:10px 12px;
        margin-bottom:7px;cursor:pointer;font:inherit;transition:border-color .12s,background .12s;}
      .rm-roleitem:hover{border-color:${C.navy};}
      .rm-roleitem-active{background:${C.navy};border-color:${C.navy};}

      .rm-modcard{border:1px solid ${C.line};border-radius:11px;margin-bottom:12px;overflow:hidden;}
      .rm-modhead{display:flex;align-items:center;justify-content:space-between;background:#f7fafd;
        padding:10px 14px;border-bottom:1px solid ${C.line};}
      .rm-modcheck{display:flex;align-items:center;gap:9px;font-weight:800;color:${C.navyDk};font-size:13.5px;cursor:pointer;}
      .rm-modcount{font-size:11.5px;font-weight:700;color:${C.sub};}
      .rm-actgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:2px 14px;padding:12px 14px;}
      .rm-area{grid-column:1/-1;font-size:10.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;
        color:${C.slate};margin:8px 0 2px;}
      .rm-act{display:flex;align-items:center;gap:8px;font-size:12.5px;color:${C.text};padding:5px 6px;
        border-radius:7px;cursor:pointer;}
      .rm-act:hover{background:#f4f7fb;}
      .rm-act-on{color:${C.navyDk};font-weight:600;}
      .rm-act-dis{cursor:not-allowed;color:${C.sub};}
      .rm-act input,.rm-modcheck input{width:16px;height:16px;accent-color:${C.navy};cursor:inherit;}

      .rm-overlay{position:fixed;inset:0;background:rgba(7,29,73,.4);display:flex;align-items:center;
        justify-content:center;z-index:40;}
      .rm-modal{background:#fff;border-radius:14px;padding:24px;width:420px;max-width:92vw;
        box-shadow:0 20px 60px rgba(7,29,73,.28);}
    `}</style>
  );
}