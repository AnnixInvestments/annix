/**
 * Annix Orbit FuturePath (education→funding) shared constants. Curricula now
 * live in `@annix/product-data/orbit-education` (re-exported below); the
 * jurisdiction / minor-age / role constants below stay module-local because
 * they encode this module's compliance behaviour, not reference data.
 */

export {
  isOrbitEducationCurriculum,
  ORBIT_EDUCATION_CURRICULA,
  type OrbitEducationCurriculum,
} from "@annix/product-data/orbit-education";

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
