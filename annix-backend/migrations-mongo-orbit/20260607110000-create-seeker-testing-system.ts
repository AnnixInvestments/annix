import type { mongo } from "mongoose";

const PHASES = "cv_assistant_seeker_test_phases";
const PARTICIPANTS = "cv_assistant_seeker_test_participants";
const PROGRESS = "cv_assistant_seeker_workflow_progress";
const STEPS = "cv_assistant_seeker_workflow_steps";
const ISSUES = "cv_assistant_seeker_test_issues";
const SNAPSHOTS = "cv_assistant_seeker_readiness_snapshots";
const EVENTS = "cv_assistant_seeker_events";

const ALL = [PHASES, PARTICIPANTS, PROGRESS, STEPS, ISSUES, SNAPSHOTS, EVENTS];

const ensureCollection = async (db: mongo.Db, name: string): Promise<void> => {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name);
  }
};

const SEED_PHASES = [
  {
    _id: "internal-test",
    name: "Internal Test",
    status: "pending",
    targetUsers: 10,
    actualUsers: 0,
    notes: "Crashes, broken UI, broken workflows (5-10 users, 7-14 days).",
    readinessPercentage: 0,
  },
  {
    _id: "closed-beta",
    name: "Closed Beta",
    status: "pending",
    targetUsers: 100,
    actualUsers: 0,
    notes: "Real user behaviour (50-100 seekers, 14-28 days).",
    readinessPercentage: 0,
  },
  {
    _id: "soft-launch",
    name: "Soft Launch",
    status: "pending",
    targetUsers: 500,
    actualUsers: 0,
    notes: "Scale, reliability, conversion, support load (200-500 seekers, 30 days).",
    readinessPercentage: 0,
  },
];

export const up = async (db: mongo.Db): Promise<void> => {
  await ALL.reduce(async (prev, name) => {
    await prev;
    await ensureCollection(db, name);
  }, Promise.resolve());

  await db.collection(PHASES).createIndex({ status: 1 }, { name: "idx_seeker_test_phase_status" });

  await db
    .collection(PARTICIPANTS)
    .createIndex(
      { candidateId: 1, phaseId: 1 },
      { name: "idx_seeker_participant_candidate_phase", unique: true },
    );
  await db
    .collection(PARTICIPANTS)
    .createIndex({ phaseId: 1 }, { name: "idx_seeker_participant_phase" });

  await db
    .collection(PROGRESS)
    .createIndex({ participantId: 1 }, { name: "idx_seeker_progress_participant", unique: true });
  await db
    .collection(PROGRESS)
    .createIndex({ candidateId: 1 }, { name: "idx_seeker_progress_candidate" });

  await db
    .collection(STEPS)
    .createIndex(
      { participantId: 1, stepKey: 1 },
      { name: "idx_seeker_step_participant_step", unique: true },
    );

  await db.collection(ISSUES).createIndex({ status: 1 }, { name: "idx_seeker_issue_status" });
  await db.collection(ISSUES).createIndex({ severity: 1 }, { name: "idx_seeker_issue_severity" });
  await db.collection(ISSUES).createIndex({ createdAt: -1 }, { name: "idx_seeker_issue_created" });

  await db
    .collection(SNAPSHOTS)
    .createIndex({ snapshotDate: 1 }, { name: "idx_seeker_snapshot_date", unique: true });
  await db
    .collection(SNAPSHOTS)
    .createIndex({ createdAt: -1 }, { name: "idx_seeker_snapshot_created" });

  await db
    .collection(EVENTS)
    .createIndex({ candidateId: 1 }, { name: "idx_seeker_event_candidate" });
  await db.collection(EVENTS).createIndex({ eventName: 1 }, { name: "idx_seeker_event_name" });
  await db.collection(EVENTS).createIndex({ ts: -1 }, { name: "idx_seeker_event_ts" });
  await db.collection(EVENTS).createIndex({ phaseId: 1 }, { name: "idx_seeker_event_phase" });
  await db.collection(EVENTS).createIndex({ ok: 1 }, { name: "idx_seeker_event_ok" });

  const now = new Date();
  await SEED_PHASES.reduce(async (prev, phase) => {
    await prev;
    await db.collection(PHASES).updateOne(
      { _id: phase._id as unknown as mongo.ObjectId },
      {
        $setOnInsert: {
          name: phase.name,
          startDate: null,
          endDate: null,
          status: phase.status,
          targetUsers: phase.targetUsers,
          actualUsers: phase.actualUsers,
          notes: phase.notes,
          readinessPercentage: phase.readinessPercentage,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }, Promise.resolve());
};

export const down = async (db: mongo.Db): Promise<void> => {
  await ALL.reduce(async (prev, name) => {
    await prev;
    await db
      .collection(name)
      .drop()
      .catch(() => undefined);
  }, Promise.resolve());
};
