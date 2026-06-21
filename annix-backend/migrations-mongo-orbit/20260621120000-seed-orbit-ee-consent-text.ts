import type { mongo } from "mongoose";

// Seeds a default, open-ended EE consent-text version so EE disclosure works on
// a fresh Orbit database. Without an active version, resolveConsentTextVersionId
// throws BadRequestException and every seeker EE save returns 400. Test/prod had
// this row only because it was created by hand; this makes every environment
// self-heal. Idempotent: skips when an active (effectiveTo: null) version exists.

const COLLECTION = "cv_assistant_ee_consent_text_versions";

const DEFAULT_VERSION_LABEL = "v1-2026-default";

const DEFAULT_BODY = `Employment Equity disclosure consent (default v1)

This site collects information about your population group, gender, disability status,
nationality status, and any reasonable accommodations you may need. This information
is "special personal information" under the Protection of Personal Information Act
(POPIA, s26) and is collected only with your explicit consent for two purposes:

1. Employment Equity Act 55/1998 reporting (EEA2 / EEA4 statutory returns).
2. Fairness monitoring of the AI-assisted screening process (POPIA s71).

Your disclosure is voluntary. You may decline, select "prefer not to say" for any
field, withdraw consent later, request a copy of your data, or request deletion.
The AI candidate ranker does NOT have access to these attributes — they are stored
in a separate, role-restricted system and are used only for aggregate reporting and
fairness audits.

Customers must replace this default text with their own, lawyer-reviewed consent
notice before enabling EE disclosure for their job postings.`;

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  const activeExisting = await collection.countDocuments({ effectiveTo: null });
  if (activeExisting > 0) {
    return;
  }
  const highest = await collection.find().sort({ _id: -1 }).limit(1).toArray();
  const lastId = highest.length > 0 && typeof highest[0]._id === "number" ? highest[0]._id : 0;
  const now = new Date();
  await collection.insertOne({
    _id: (lastId + 1) as never,
    versionLabel: DEFAULT_VERSION_LABEL,
    body: DEFAULT_BODY,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    createdAt: now,
    updatedAt: now,
  } as never);
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).deleteMany({ versionLabel: DEFAULT_VERSION_LABEL });
};
