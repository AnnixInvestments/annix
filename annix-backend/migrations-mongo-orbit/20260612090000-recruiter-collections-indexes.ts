import type { mongo } from "mongoose";

// The recruiter module's collections are all agency-scoped: every read filters
// by companyId (and the per-candidate ones also by candidateId), but the
// collections were created with autoIndex:false and no explicit indexes
// (issue #337). Forward-only: each createIndex is idempotent.
const COMPANY_SCOPED = [
  "orbit_clients",
  "orbit_placements",
  "orbit_talent_candidates",
  "orbit_submissions",
  "orbit_talent_pools",
  "orbit_shortlists",
  "orbit_jobs",
  "orbit_recruiter_interviews",
  "orbit_audit_events",
  "orbit_compliance_items",
  "orbit_team_invites",
] as const;

const CANDIDATE_SCOPED = [
  "orbit_submissions",
  "orbit_audit_events",
  "orbit_compliance_items",
  "orbit_recruiter_interviews",
] as const;

export const up = async (db: mongo.Db): Promise<void> => {
  for (const collection of COMPANY_SCOPED) {
    await db.collection(collection).createIndex({ companyId: 1 });
  }
  for (const collection of CANDIDATE_SCOPED) {
    await db.collection(collection).createIndex({ companyId: 1, candidateId: 1 });
  }
  // Team invites are looked up by token on acceptance.
  await db.collection("orbit_team_invites").createIndex({ token: 1 });
};

export const down = async (): Promise<void> => {};
