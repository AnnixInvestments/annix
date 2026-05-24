/**
 * FuturePath (education→funding) is a role-scoped SECTION inside Annix Orbit,
 * not a separate app — it has no own login/admin card. This constant tracks the
 * section's own maturity independently of the parent ANNIX_ORBIT_VERSION.
 *
 * Versioning rules (major.minor.patch):
 * - patch (+1): bug fixes, tweaks
 * - minor (+1, patch resets to 0): new features/pages within the section
 * - major (+1): redesigns / breaking UX
 */
export const ORBIT_EDUCATION_VERSION = "0.1.0";
