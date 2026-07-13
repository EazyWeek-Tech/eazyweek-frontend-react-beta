// masterAccess.js
// ─────────────────────────────────────────────────────────────────────────────
// Combined RBAC (Role) + Hierarchy (Level) gate for the Master screens.
//
//   • Role  → the permission matrix from Role Master, read via usePermissions().has()
//   • Level → WHERE in the hierarchy the action is allowed:
//               - Masters (Service, Employee, Package, Product, Centre,
//                 Practitioner …) are managed at the LEGAL ENTITY level.
//               - Customer Master is the exception → managed at the CENTRE level.
//
// Buttons stay visible everywhere; the gate runs on click. All denials are shown
// through the app's OWN permission toast (usePermissions → guard / notifyDenied),
// so the message looks identical to Audit / Case / Opportunity screens:
//   • role-only failure  → guard(code, fn)         (app's default "role" toast)
//   • level / both failure → notifyDenied(message)  (same toast, our message)
//
// Usage in a screen:
//   const { has, guard, notifyDenied } = usePermissions();
//   const requireAccess = makeRequireAccess({ has, guard, notifyDenied });
//   <button onClick={() => requireAccess("MDM.SERVICES_CREATE", openCreate)}>+ Create</button>
//
//   // Customer Master (centre-level):
//   <button onClick={() => requireAccess("MDM.CUSTOMERS_CREATE", openCreate, { level: "centre" })}>…</button>
//
//   // Handler-entry defence:
//   const gate = checkAccess({ has, code: "MDM.PACKAGES_EDIT" });
//   if (!gate.ok) { notifyDenied(gate.message); return; }

const MSG = {
  role:       "Your role does not have this right. Contact Admin/Product Team.",
  entity:     "This action is available at Entity level only (Admin / Product Team roles).",
  centre:     "This action is available at Centre level only (Admin / Product Team roles).",
  bothEntity: "Your role can't do this, and it's only available at Entity level (Admin / Product Team).",
  bothCentre: "Your role can't do this, and it's only available at Centre level (Admin / Product Team).",
};

// Level source: the JWT user object placed in storage at login.
export const isEntityLevel = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    return u.isEntityLevel === true;
  } catch {
    return false;
  }
};

// Pure check — no side effects. Returns { ok, levelOk, roleOk, message }.
//   level: "entity" (default) | "centre"
export const checkAccess = ({ has, code, level = "entity" } = {}) => {
  const entity  = isEntityLevel();
  const levelOk = level === "centre" ? !entity : entity;
  const roleOk  = typeof has === "function" ? !!has(code) : true;

  let message = "";
  if (!levelOk && !roleOk) message = level === "centre" ? MSG.bothCentre : MSG.bothEntity;
  else if (!levelOk)       message = level === "centre" ? MSG.centre     : MSG.entity;
  else if (!roleOk)        message = MSG.role;

  return { ok: levelOk && roleOk, levelOk, roleOk, message };
};

// Click wrapper — runs fn only when Role + Level both pass; otherwise routes the
// denial through the app's permission toast (guard / notifyDenied).
export const makeRequireAccess = ({ has, guard, notifyDenied } = {}) => (code, fn, opts = {}) => {
  const res = checkAccess({ has, code, level: opts.level });
  if (res.ok) { fn(); return; }
  if (res.levelOk && !res.roleOk && typeof guard === "function") { guard(code, fn); return; }
  if (typeof notifyDenied === "function") notifyDenied(res.message);
};

export default { isEntityLevel, checkAccess, makeRequireAccess };