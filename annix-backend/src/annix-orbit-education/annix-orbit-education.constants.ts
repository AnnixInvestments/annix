/**
 * Annix Orbit FuturePath (education→funding) shared constants. Curricula and
 * per-institution score schemes will move to `packages/product-data/orbit-education/`
 * in Phase 1 (D6); kept module-local for the Phase 0 foundation.
 */

export const ORBIT_EDUCATION_CURRICULA = [
  "NSC",
  "IEB",
  "Cambridge",
  "IB",
  "GCSE",
  "A-Level",
  "US-GPA",
  "Other",
] as const;

export type OrbitEducationCurriculum = (typeof ORBIT_EDUCATION_CURRICULA)[number];

export function isOrbitEducationCurriculum(value: string): value is OrbitEducationCurriculum {
  return (ORBIT_EDUCATION_CURRICULA as readonly string[]).includes(value);
}

/**
 * Consent jurisdictions. POPIA + GDPR are live (D4). FERPA/COPPA are slot-ready
 * for the US corridor (D5) but NOT yet active — do not onboard US minors until
 * their consent text + flows are added.
 */
export const ORBIT_EDUCATION_JURISDICTIONS = ["POPIA", "GDPR", "FERPA", "COPPA"] as const;

export type OrbitEducationJurisdiction = (typeof ORBIT_EDUCATION_JURISDICTIONS)[number];

export const ORBIT_EDUCATION_ACTIVE_JURISDICTIONS: OrbitEducationJurisdiction[] = ["POPIA", "GDPR"];

/** Age below which a guardian consent row is required, per jurisdiction. */
export const ORBIT_EDUCATION_MINOR_AGE_THRESHOLD: Record<OrbitEducationJurisdiction, number> = {
  POPIA: 18,
  GDPR: 13,
  FERPA: 18,
  COPPA: 13,
};

export const GUARDIAN_LINK_STATUSES = ["invited", "accepted", "declined", "revoked"] as const;

export type GuardianLinkStatus = (typeof GUARDIAN_LINK_STATUSES)[number];

export const ORBIT_EDUCATION_CONSENT_ROLES = ["guardian", "self"] as const;

export type OrbitEducationConsentRole = (typeof ORBIT_EDUCATION_CONSENT_ROLES)[number];

/** RBAC role codes added to the existing Orbit app (`annix-orbit`) for FuturePath. */
export const ORBIT_EDUCATION_ROLE_CODES = ["student", "parent", "teacher"] as const;

export type OrbitEducationRoleCode = (typeof ORBIT_EDUCATION_ROLE_CODES)[number];
