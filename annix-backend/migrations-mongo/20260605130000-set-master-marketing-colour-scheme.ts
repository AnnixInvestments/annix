import type { mongo } from "mongoose";

const COLLECTION = "app_branding";
const MASTER_BRAND_CODE = "annix-investments";

const MARKETING_SCHEME = {
  backgroundLight: "#0a1733",
  backgroundDark: "#0a1733",
  gradientFrom: "#0b1b3a",
  gradientVia: "#0a1733",
  gradientTo: "#070f24",
};

const PREVIOUS_SCHEME = {
  backgroundLight: "#F8FAFC",
  backgroundDark: "#0F172A",
  gradientFrom: "#1a1a40",
  gradientVia: "#0d0d20",
  gradientTo: "#1a1a40",
};

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateOne({ _id: MASTER_BRAND_CODE as never }, { $set: MARKETING_SCHEME }, { upsert: false });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateOne({ _id: MASTER_BRAND_CODE as never }, { $set: PREVIOUS_SCHEME }, { upsert: false });
};
