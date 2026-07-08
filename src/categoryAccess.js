// Shared access + auth helper for the Case Category / Category-Mapping screens.
//
// Access rule (confirmed from the live session model):
//   • Legal-Entity level = the active centre equals the hierarchy's entity code
//                          (a clinic-level user is scoped to their clinic).
//   • canManage = atLegalEntity  -> ANY role may create / edit / delete / activate
//                                   at the legal entity. Clinic level is VIEW-ONLY.
//
// Importing this module also installs a one-time fetch patch that attaches the
// Bearer token to /api/ calls (these pages otherwise fetch cookie-only and 401,
// which shows up as empty "No records found" tables). Guarded by the same flag
// the rest of the app uses, so it never double-patches.

const trim = (s) => (s ?? "").toString().trim();

if (typeof window !== "undefined" && !window.__fetchLoggerInstalled) {
  window.__fetchLoggerInstalled = true;
  const __origFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    try {
      const url = typeof input === "string" ? input : input?.url;
      const isApi = typeof url === "string" && url.includes("/api/");
      const h = init.headers || {};
      const hasAuth =
        (h && (h.Authorization || h.authorization)) ||
        (typeof h.get === "function" && h.get("Authorization"));
      if (isApi && !hasAuth) {
        const tok =
          sessionStorage.getItem("ssoToken") ||
          localStorage.getItem("token") ||
          sessionStorage.getItem("token") ||
          "";
        if (tok) init = { ...init, headers: { ...h, Authorization: `Bearer ${tok}` } };
      }
    } catch {
      /* non-plain headers — leave untouched */
    }
    return __origFetch(input, init);
  };
}

const readObj = (keys) => {
  for (const k of keys) {
    let raw = null;
    try {
      raw =
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k)) ||
        (typeof localStorage !== "undefined" && localStorage.getItem(k));
    } catch {
      raw = null;
    }
    if (!raw) continue;
    try {
      const o = JSON.parse(raw);
      if (o && typeof o === "object") return o;
    } catch {
      /* not JSON — skip */
    }
  }
  return {};
};

const pick = (keys, fields) => {
  const o = readObj(keys);
  if (o && typeof o === "object") {
    const hasField = fields.some((f) => o[f] != null && String(o[f]).trim() !== "");
    if (!hasField && o.data && typeof o.data === "object") return o.data;
  }
  return o;
};

const norm = (s) => trim(s).toUpperCase();

const readDirect = (k) => {
  try {
    return trim(
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k)) ||
        (typeof localStorage !== "undefined" && localStorage.getItem(k)) ||
        ""
    );
  } catch {
    return "";
  }
};

// The role + the *currently active* centre. NOTE: loginCode/topCode are NOT a
// reliable entity signal — opening a case rewrites both (and the userSession
// object) to the active clinic code. So we treat loginCode/topCode/centerCode as
// the ACTIVE centre, and get the true legal-entity code from the hierarchy API.
export function getCategoryAccess() {
  const user = pick(
    ["user", "userDetails", "currentUser", "authUser", "sessionUser"],
    ["role", "roleName", "userRole", "centerCode"]
  );
  const sess = pick(
    ["userSession", "session", "sessionInfo", "auth"],
    ["loginCode", "LoginCode", "topCode", "TopCode"]
  );

  const role = trim(user.role || user.roleName || user.userRole);
  const isAdmin = role.toLowerCase() === "admin";
  const isEntityLevel =
    user.isEntityLevel === true ||
    String(user.isEntityLevel).toLowerCase() === "true";

  // Some environments store placeholders like "Not Set" in the session
  // loginCode/topCode — treat those (and blanks) as empty so the chain falls
  // through to the real user.centerCode instead of stopping on "Not Set".
  const clean = (v) => {
    const t = trim(v);
    if (!t) return "";
    return /^(not\s*set|null|undefined|n\/a|na|-)$/i.test(t) ? "" : t;
  };

  // Active centre = whatever the app currently considers "selected".
  const activeCenter =
    clean(readDirect("loginCode")) ||
    clean(sess.loginCode) ||
    clean(sess.LoginCode) ||
    clean(sess.topCode) ||
    clean(sess.TopCode) ||
    clean(user.centerCode);

  return { role, isAdmin, activeCenter, isEntityLevel };
}

// Cache the entity code for the session (the legal entity doesn't change).
// A failed/empty result is NOT cached, so a later call can retry (covers a
// first request that raced auth on beta).
let __entityCodePromise = null;
async function fetchEntityCode(apiBaseUrl) {
  if (__entityCodePromise) return __entityCodePromise;
  const p = (async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/Settings/Centre/Hierarchy`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return "";
      const raw = await res.json();
      const data = raw && raw.data !== undefined ? raw.data : raw;
      return trim(data && data.entity && data.entity.code);
    } catch {
      return "";
    }
  })();
  __entityCodePromise = p;
  // Clear the cache if it resolved empty (or threw) so the next call retries.
  p.then((code) => {
    if (!code) __entityCodePromise = null;
  }).catch(() => {
    __entityCodePromise = null;
  });
  return p;
}

// Authoritative async check. canManage whenever the active centre is the legal
// entity (active centre === the hierarchy's entity code) — for ANY role.
// Fails closed (view-only) until the entity code resolves.
export async function resolveCategoryAccess(apiBaseUrl) {
  const { role, isAdmin, activeCenter, isEntityLevel } = getCategoryAccess();
  const entityCode = await fetchEntityCode(apiBaseUrl);
  // Prefer the authoritative comparison (active centre === hierarchy entity code).
  // If the entity code can't be resolved (e.g. the call failed on beta), fall
  // back to the user's isEntityLevel flag so an entity admin isn't locked out.
  const atLegalEntity = entityCode
    ? norm(activeCenter) === norm(entityCode)
    : isEntityLevel;
  return {
    role,
    isAdmin,
    activeCenter,
    entityCode,
    isEntityLevel,
    atLegalEntity,
    // Any role may create / edit / delete / activate at the legal entity.
    canManage: atLegalEntity,
  };
}

export default getCategoryAccess;