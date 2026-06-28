// The `AnnixOrbitUser` entity + its `cv_assistant_users` store were retired in M5
// (ADR-0001 #425). This file is kept ONLY for the `AnnixOrbitRole` enum, which has
// ~40 importers across the Orbit codebase.
export enum AnnixOrbitRole {
  VIEWER = "viewer",
  RECRUITER = "recruiter",
  ADMIN = "admin",
  INDIVIDUAL = "individual",
  STUDENT = "student",
}
