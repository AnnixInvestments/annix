import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";

interface SeedTier {
  tier: string;
  label: string;
  matchStrictness: string;
  maxJobResults: number | null;
  features: {
    applyToJobs: boolean;
    viewSalaries: boolean;
    nixCvBuilder: boolean;
    jobListingSite: boolean;
  };
  displayOrder: number;
}

const TIERS: SeedTier[] = [
  {
    tier: "soft",
    label: "Soft (free)",
    matchStrictness: "soft",
    maxJobResults: 20,
    features: {
      applyToJobs: true,
      viewSalaries: false,
      nixCvBuilder: false,
      jobListingSite: false,
    },
    displayOrder: 10,
  },
  {
    tier: "medium",
    label: "Medium",
    matchStrictness: "medium",
    maxJobResults: 50,
    features: {
      applyToJobs: true,
      viewSalaries: true,
      nixCvBuilder: true,
      jobListingSite: false,
    },
    displayOrder: 20,
  },
  {
    tier: "hard",
    label: "Heavy",
    matchStrictness: "hard",
    maxJobResults: null,
    features: {
      applyToJobs: true,
      viewSalaries: true,
      nixCvBuilder: true,
      jobListingSite: true,
    },
    displayOrder: 30,
  },
];

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  const existing = await collection.countDocuments();
  if (existing > 0) {
    return;
  }
  const now = new Date();
  const docs = TIERS.map((tier, index) => ({
    _id: index + 1,
    ...tier,
    createdAt: now,
    updatedAt: now,
  }));
  await collection.insertMany(docs as never);
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).deleteMany({});
};
