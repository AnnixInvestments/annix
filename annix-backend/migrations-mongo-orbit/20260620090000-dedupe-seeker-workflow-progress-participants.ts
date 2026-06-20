import type { mongo } from "mongoose";

const PARTICIPANTS = "cv_assistant_seeker_test_participants";
const PROGRESS = "cv_assistant_seeker_workflow_progress";
const STEPS = "cv_assistant_seeker_workflow_steps";

interface ProgressDoc {
  _id: string;
  participantId: string;
  candidateId: number;
  completedSteps?: number;
  lastActiveAt?: Date | null;
}

interface ParticipantDoc {
  _id: string;
  candidateId: number;
  joinedAt?: Date | null;
}

const millis = (value: Date | null | undefined): number => (value ? new Date(value).getTime() : 0);

const richestFirst = (a: ProgressDoc, b: ProgressDoc): number => {
  const stepsA = a.completedSteps ?? 0;
  const stepsB = b.completedSteps ?? 0;
  if (stepsA !== stepsB) {
    return stepsB - stepsA;
  }
  return millis(b.lastActiveAt) - millis(a.lastActiveAt);
};

const idFilter = (ids: string[]): mongo.Filter<mongo.Document> => ({
  _id: { $in: ids as unknown as mongo.ObjectId[] },
});

export const up = async (db: mongo.Db): Promise<void> => {
  const progressDocs = (await db.collection(PROGRESS).find().toArray()) as unknown as ProgressDoc[];

  const byCandidate = progressDocs.reduce<Map<number, ProgressDoc[]>>((acc, doc) => {
    if (typeof doc.candidateId !== "number") {
      return acc;
    }
    const list = acc.get(doc.candidateId) ?? [];
    list.push(doc);
    acc.set(doc.candidateId, list);
    return acc;
  }, new Map());

  await Array.from(byCandidate.entries()).reduce(async (prev, [candidateId, docs]) => {
    await prev;

    const keep = [...docs].sort(richestFirst)[0];

    const participants = (await db
      .collection(PARTICIPANTS)
      .find({ candidateId })
      .toArray()) as unknown as ParticipantDoc[];
    const participantIds = participants.map((participant) => String(participant._id));

    // The progress record we keep must point at a participant that still
    // exists; if its participant was already lost, re-point it at the newest
    // surviving participant before we prune the rest.
    const keepParticipantId =
      participantIds.includes(keep.participantId) || participants.length === 0
        ? keep.participantId
        : String([...participants].sort((a, b) => millis(b.joinedAt) - millis(a.joinedAt))[0]._id);

    if (keepParticipantId !== keep.participantId) {
      await db
        .collection(PROGRESS)
        .updateOne(
          { _id: keep._id as unknown as mongo.ObjectId },
          { $set: { participantId: keepParticipantId } },
        );
    }

    const dropProgressIds = docs
      .filter((doc) => doc._id !== keep._id)
      .map((doc) => String(doc._id));
    if (dropProgressIds.length > 0) {
      await db.collection(PROGRESS).deleteMany(idFilter(dropProgressIds));
    }

    const dropParticipantIds = participantIds.filter((id) => id !== keepParticipantId);
    if (dropParticipantIds.length > 0) {
      await db.collection(PARTICIPANTS).deleteMany(idFilter(dropParticipantIds));
      await db.collection(STEPS).deleteMany({ participantId: { $in: dropParticipantIds } });
    }
  }, Promise.resolve());
};

export const down = async (): Promise<void> => {
  // Forward-only data cleanup: the duplicate progress/participant/step rows it
  // removed were redundant copies of the survivor and cannot be reconstructed.
};
