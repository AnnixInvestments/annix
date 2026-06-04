import type { mongo } from "mongoose";

const COLLECTION = "orbit_dismiss_reasons";
const COUNTERS = "counters";
const CODE_INDEX = "code_1";

interface SeedDismissReason {
  code: string;
  label: string;
  muteAction: "company" | "category" | null;
}

const SEED: SeedDismissReason[] = [
  { code: "wrong_location", label: "Wrong location", muteAction: null },
  { code: "workplace_location", label: "Location of work place", muteAction: null },
  { code: "too_senior", label: "Too senior for me", muteAction: null },
  { code: "too_junior", label: "Too junior for me", muteAction: null },
  { code: "wrong_field", label: "Wrong field / industry", muteAction: "category" },
  { code: "pay_too_low", label: "Pay too low", muteAction: null },
  { code: "not_company", label: "Not interested in this company", muteAction: "company" },
  { code: "other", label: "Just not interested", muteAction: null },
];

interface DismissReasonDocument {
  _id: number;
  code: string;
  label: string;
  muteAction: "company" | "category" | null;
  sortOrder: number;
  active: boolean;
}

interface CounterDocument {
  _id: string;
  seq: number;
}

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection<DismissReasonDocument>(COLLECTION);
  const existing = await collection.countDocuments();
  if (existing === 0) {
    await collection.insertMany(
      SEED.map((seed, index) => ({
        _id: index + 1,
        code: seed.code,
        label: seed.label,
        muteAction: seed.muteAction,
        sortOrder: index + 1,
        active: true,
      })),
    );
    await db
      .collection<CounterDocument>(COUNTERS)
      .updateOne({ _id: COLLECTION }, { $set: { seq: SEED.length } }, { upsert: true });
  }
  await collection.createIndex({ code: 1 }, { unique: true, name: CODE_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection<DismissReasonDocument>(COLLECTION).deleteMany({});
};
