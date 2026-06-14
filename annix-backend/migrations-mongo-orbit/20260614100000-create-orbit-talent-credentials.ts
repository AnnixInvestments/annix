import type { mongo } from "mongoose";

// Issue #362 phase 3 — Industrial Skills Passport. Creates the
// recruiter-owned talent-credential collection + its indexes on the
// Orbit cluster (autoIndex is off, so indexes must be migrated). The
// (candidateId, expiresAt) index serves the per-candidate passport view;
// (companyId, expiresAt) serves the dashboard compliance-alert query.
// Idempotent.

const COLLECTION = "orbit_talent_credentials";

export const up = async (db: mongo.Db): Promise<void> => {
  const existing = await db.listCollections({ name: COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(COLLECTION);
  }
  await db
    .collection(COLLECTION)
    .createIndex(
      { candidateId: 1, expiresAt: 1 },
      { name: "idx_orbit_talent_credentials_candidate_expires" },
    );
  await db
    .collection(COLLECTION)
    .createIndex(
      { companyId: 1, expiresAt: 1 },
      { name: "idx_orbit_talent_credentials_company_expires" },
    );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .drop()
    .catch(() => undefined);
};
