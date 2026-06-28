import type { mongo } from "mongoose";

// Indexes backing the admin seeker-testing dashboard (overview + readiness),
// whose p95 was ~5.5s against a 1s target. Only the genuinely-new compound
// indexes are created here — the single-field/participant lookups are already
// covered by the baseline migration 20260607110000 (creating a duplicate key
// pattern under a new name throws IndexKeySpecsConflict and aborts the deploy).
// autoIndex is off on the Orbit cluster, so these must be created explicitly.
const INDEXES: Array<{
  collection: string;
  name: string;
  key: Record<string, 1 | -1>;
}> = [
  // countCompletedByStepKey aggregation ($match completed, $group stepKey)
  {
    collection: "cv_assistant_seeker_workflow_steps",
    name: "idx_steps_completed_stepkey",
    key: { completed: 1, stepKey: 1 },
  },
  // recentFailures (ok=false, sort ts desc) + errorRatePct failed count
  {
    collection: "cv_assistant_seeker_events",
    name: "idx_events_ok_ts",
    key: { ok: 1, ts: -1 },
  },
  // countByEventNameSince (eventName + ts window)
  {
    collection: "cv_assistant_seeker_events",
    name: "idx_events_eventname_ts",
    key: { eventName: 1, ts: 1 },
  },
];

export const up = async (db: mongo.Db): Promise<void> => {
  await Promise.all(
    INDEXES.map((index) =>
      db
        .collection(index.collection)
        .createIndex(index.key as mongo.IndexSpecification, { name: index.name }),
    ),
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await Promise.all(
    INDEXES.map((index) =>
      db
        .collection(index.collection)
        .dropIndex(index.name)
        .catch(() => undefined),
    ),
  );
};
