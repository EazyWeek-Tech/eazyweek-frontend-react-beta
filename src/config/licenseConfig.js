// licenseConfig.js  (frontend — Vite/ESM)
// Reads the canonical tier -> feature map and exposes helpers the Sidebar,
// route guards and the upgrade notice use to decide what a tenant can see.

import licenseFeatures from "./licenseFeatures.json";

const { featureSets, tierLabels = {}, featureMeta = {} } = licenseFeatures;

/**
 * Resolve the effective feature set for a tenant.
 * @param {string} tier  "launch" | "grow" | "scale"
 * @param {object} overrides  optional { add: string[], remove: string[] }  (the "Custom" in Scale & Custom)
 * @returns {Set<string>}
 */
export function resolveFeatures(tier, overrides = null) {
  const base = new Set(featureSets[tier] || featureSets.launch);
  if (overrides && typeof overrides === "object") {
    (overrides.add || []).forEach((f) => base.add(f));
    (overrides.remove || []).forEach((f) => base.delete(f));
  }
  return base;
}

/**
 * Read tier + overrides off the logged-in user object (same object you
 * already pass to <Sidebar currentUser={user} />).
 */
export function getFeatureSet(currentUser) {
  const tier = currentUser?.licenseTier || "launch";
  const overrides = currentUser?.licenseOverrides || null;
  return resolveFeatures(tier, overrides);
}

/** True if a single feature is active. Untagged items (no feature key) are always visible. */
export function hasFeature(featureKey, featureSet) {
  if (!featureKey) return true;
  return featureSet.has(featureKey);
}

/**
 * Filter a nav array TWO levels deep:
 *   - drop top-level items whose feature isn't licensed
 *   - drop submenu items whose feature isn't licensed
 *   - drop any parent left with an empty submenu
 * Items without a `feature` key are treated as always-on.
 */
export function filterNavByLicense(navItems, featureSet) {
  return navItems
    .filter((item) => hasFeature(item.feature, featureSet))
    .map((item) => {
      if (!item.submenu) return item;
      const submenu = item.submenu.filter((s) => hasFeature(s.feature, featureSet));
      return { ...item, submenu };
    })
    .filter((item) => !item.submenu || item.submenu.length > 0);
}

/* ---------------------------------------------------------------------------
   Metadata helpers — used to explain WHY a feature is locked and HOW to get it
   --------------------------------------------------------------------------- */

/** Human-readable label + one-line blurb for a feature key. */
export function getFeatureMeta(featureKey) {
  return featureMeta[featureKey] || { label: featureKey, blurb: "" };
}

/** Human-readable label for a tier key, e.g. "grow" -> "Grow". */
export function getTierLabel(tier) {
  return tierLabels[tier] || tier;
}

/** All base tiers that include a feature, as keys, e.g. loyalty -> ["grow","scale"]. */
export function tiersThatInclude(featureKey) {
  return licenseFeatures.tiers.filter((t) => (featureSets[t] || []).includes(featureKey));
}

/** The lowest base tier that unlocks a feature, or null if it's a custom-only add-on. */
export function minimumTierFor(featureKey) {
  return tiersThatInclude(featureKey)[0] || null;
}