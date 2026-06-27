import { AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import type { OrbitIdentityModule } from "./entities/orbit-identity.entity";
import { ORBIT_IDENTITY_COLLECTIONS } from "./repositories/orbit-identity.repository.mongo";

/**
 * Single source of truth for the module ↔ scope ↔ collection ↔ account-type
 * relationships used by the per-module identity split (ADR-0001). Reuses the S0
 * `OrbitIdentityModule` type, the S1 `ORBIT_IDENTITY_COLLECTIONS`, and mirrors
 * `ORBIT_SCOPE_BY_USER_TYPE` (auth.service.ts) — kept in lockstep by the
 * exhaustive records below.
 */
export type OrbitModule = OrbitIdentityModule;

export const ORBIT_MODULES: readonly OrbitModule[] = ["company", "seeker", "recruiter", "student"];

interface OrbitModuleDescriptor {
  scope: string;
  collection: string;
  userType: AnnixOrbitUserType;
}

// Note: the "seeker" module is the INDIVIDUAL user type (orbit:seeker scope).
const ORBIT_MODULE_DESCRIPTORS: Record<OrbitModule, OrbitModuleDescriptor> = {
  company: {
    scope: "orbit:company",
    collection: "orbit_company_identities",
    userType: AnnixOrbitUserType.COMPANY,
  },
  seeker: {
    scope: "orbit:seeker",
    collection: "orbit_seeker_identities",
    userType: AnnixOrbitUserType.INDIVIDUAL,
  },
  recruiter: {
    scope: "orbit:recruiter",
    collection: "orbit_recruiter_identities",
    userType: AnnixOrbitUserType.RECRUITER,
  },
  student: {
    scope: "orbit:student",
    collection: "orbit_student_identities",
    userType: AnnixOrbitUserType.STUDENT,
  },
};

// Compile-time guard that the collections here match the S1 export exactly.
const _collectionsParity: ReadonlySet<string> = new Set(ORBIT_IDENTITY_COLLECTIONS);
for (const module of ORBIT_MODULES) {
  const descriptor = ORBIT_MODULE_DESCRIPTORS[module];
  if (!_collectionsParity.has(descriptor.collection)) {
    throw new Error(`Orbit module collection drift: ${descriptor.collection}`);
  }
}

export function scopeForModule(module: OrbitModule): string {
  return ORBIT_MODULE_DESCRIPTORS[module].scope;
}

export function collectionForModule(module: OrbitModule): string {
  return ORBIT_MODULE_DESCRIPTORS[module].collection;
}

export function userTypeForModule(module: OrbitModule): AnnixOrbitUserType {
  return ORBIT_MODULE_DESCRIPTORS[module].userType;
}

/** The `accountType` string a client sends for this module (= the user-type value). */
export function accountTypeForModule(module: OrbitModule): string {
  return ORBIT_MODULE_DESCRIPTORS[module].userType;
}

export function moduleForScope(scope: string | null | undefined): OrbitModule | null {
  if (!scope) {
    return null;
  }
  const match = ORBIT_MODULES.find((module) => ORBIT_MODULE_DESCRIPTORS[module].scope === scope);
  return match ?? null;
}

export function moduleForUserType(userType: AnnixOrbitUserType | null): OrbitModule | null {
  if (!userType) {
    return null;
  }
  const match = ORBIT_MODULES.find(
    (module) => ORBIT_MODULE_DESCRIPTORS[module].userType === userType,
  );
  return match ?? null;
}
