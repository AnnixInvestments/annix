import type { mongo } from "mongoose";

// Backfill skillsAnalyzedAt for external jobs that already carry extracted skills,
// so the new jobsMissingSkills(skillsAnalyzedAt == null) queue doesn't re-run the
// Gemini analysis over every already-processed job after this ships. Idempotent
// (only touches non-empty-skills jobs that aren't stamped yet); uses server $$NOW.

const COLLECTION = "cv_assistant_external_jobs";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany(
    {
      extractedSkills: { $type: "array", $not: { $size: 0 } },
      $or: [{ skillsAnalyzedAt: { $exists: false } }, { skillsAnalyzedAt: null }],
    },
    [{ $set: { skillsAnalyzedAt: "$$NOW" } }],
  );
};

export const down = async (_db: mongo.Db): Promise<void> => {
  // Forward-only: leave skillsAnalyzedAt stamped — unsetting would re-queue every
  // job for re-analysis.
};
