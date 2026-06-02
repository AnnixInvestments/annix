import type { mongo } from "mongoose";

const COLLECTION = "orbit_credential_types";
const COUNTERS = "counters";
const CODE_INDEX = "code_1";

interface SeedCredentialType {
  code: string;
  label: string;
  description: string;
}

const SEED: SeedCredentialType[] = [
  {
    code: "medical",
    label: "Medical Certificate",
    description:
      'Certificate of Fitness (CoF / "red ticket") confirming you\'re medically fit for the role.',
  },
  {
    code: "mine_induction",
    label: "Mine Induction",
    description: "Site-specific safety induction required before entering a mine.",
  },
  {
    code: "blasting",
    label: "Blasting Ticket",
    description: "Authorisation to handle explosives and break rock.",
  },
  {
    code: "eye_test",
    label: "Eye Test",
    description: "Vision screening, often paired with the medical.",
  },
  {
    code: "lift_driver",
    label: "Forklift Licence",
    description: "Licence to operate a forklift / lift truck.",
  },
  {
    code: "plant_operator",
    label: "Plant / Machine Operator",
    description: "Earth-moving plant competency (excavator, loader, dozer).",
  },
  {
    code: "tmm_licence",
    label: "Trackless Mobile Machinery (TMM)",
    description: "Licence to operate trackless mobile machinery on a mine.",
  },
  {
    code: "crane_operator",
    label: "Crane Operator",
    description: "Mobile or overhead crane operating licence.",
  },
  {
    code: "rigging",
    label: "Rigging / Slinging",
    description: "Rigger or slinger competency for lifting loads.",
  },
  {
    code: "drivers_licence",
    label: "Driver's Licence",
    description: "Code B/C/EC road driving licence.",
  },
  {
    code: "prdp",
    label: "Professional Driving Permit (PrDP)",
    description: "Professional Driving Permit for goods, passengers or dangerous goods.",
  },
  {
    code: "working_at_heights",
    label: "Working at Heights",
    description: "Fall-protection competency for elevated work.",
  },
  {
    code: "confined_space",
    label: "Confined Space Entry",
    description: "Entry and work in confined spaces.",
  },
  {
    code: "scaffolding",
    label: "Scaffolding",
    description: "Scaffold erector / inspector competency.",
  },
  {
    code: "h2s_awareness",
    label: "H2S Awareness",
    description: "Hydrogen-sulphide gas hazard awareness.",
  },
  {
    code: "gas_testing",
    label: "Gas Testing",
    description: "Atmospheric / gas testing competency.",
  },
  {
    code: "first_aid",
    label: "First Aid",
    description: "First-aid responder certificate (Level 1–3).",
  },
  {
    code: "fire_fighting",
    label: "Fire Fighting",
    description: "Basic fire-fighting / fire-marshal competency.",
  },
  {
    code: "hazmat",
    label: "Dangerous Goods / Hazchem",
    description: "Handling and transport of dangerous goods.",
  },
  {
    code: "welding",
    label: "Welding (Coded)",
    description: "Coded welder qualification.",
  },
  {
    code: "other",
    label: "Other",
    description: "Any credential not listed here.",
  },
];

interface CredentialTypeDocument {
  _id: number;
  code: string;
  label: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

interface CounterDocument {
  _id: string;
  seq: number;
}

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection<CredentialTypeDocument>(COLLECTION);
  const existing = await collection.countDocuments();
  if (existing === 0) {
    await collection.insertMany(
      SEED.map((seed, index) => ({
        _id: index + 1,
        code: seed.code,
        label: seed.label,
        description: seed.description,
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
  await db
    .collection<CredentialTypeDocument>(COLLECTION)
    .dropIndex(CODE_INDEX)
    .catch(() => undefined);
  await db.collection<CredentialTypeDocument>(COLLECTION).deleteMany({});
  await db.collection<CounterDocument>(COUNTERS).deleteOne({ _id: COLLECTION });
};
