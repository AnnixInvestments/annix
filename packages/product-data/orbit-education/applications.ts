/**
 * Application-tracker statuses (#304 Phase 1). Shared between the
 * annix-orbit-education backend and the FuturePath frontend so the workflow
 * stays in lockstep.
 */
export const ORBIT_EDUCATION_APPLICATION_STATUSES = [
  "interested",
  "applied",
  "interview",
  "accepted",
  "rejected",
  "waitlisted",
] as const;

export type OrbitEducationApplicationStatus = (typeof ORBIT_EDUCATION_APPLICATION_STATUSES)[number];

export function isOrbitEducationApplicationStatus(
  value: string,
): value is OrbitEducationApplicationStatus {
  return (ORBIT_EDUCATION_APPLICATION_STATUSES as readonly string[]).includes(value);
}
