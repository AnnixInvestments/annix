import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";

const NEW_LABELS: Record<string, string> = {
  soft: "Explorer (free)",
  medium: "Pathfinder",
  hard: "Trailblazer",
};

const OLD_LABELS: Record<string, string> = {
  soft: "Soft (free)",
  medium: "Medium",
  hard: "Heavy",
};

async function applyLabels(db: mongo.Db, labels: Record<string, string>): Promise<void> {
  const collection = db.collection(COLLECTION);
  const now = new Date();
  await Promise.all(
    Object.entries(labels).map(([tier, label]) =>
      collection.updateOne({ tier }, { $set: { label, updatedAt: now } }),
    ),
  );
}

export const up = async (db: mongo.Db): Promise<void> => {
  await applyLabels(db, NEW_LABELS);
};

export const down = async (db: mongo.Db): Promise<void> => {
  await applyLabels(db, OLD_LABELS);
};
