import type { mongo } from "mongoose";

const PROFILES = "cv_assistant_profiles";
const DOCUMENTS = "cv_assistant_individual_documents";

interface ProfileDocument {
  _id: number;
  userType: string;
  cvFilePath?: string | null;
  rawCvText?: string | null;
  onboardingCompletedAt?: Date | null;
}

export const up = async (db: mongo.Db): Promise<void> => {
  const profiles = db.collection<ProfileDocument>(PROFILES);
  const candidates = await profiles
    .find({ userType: "individual", onboardingCompletedAt: { $in: [null, undefined] } })
    .toArray();
  if (candidates.length === 0) {
    return;
  }

  const cvDocs = await db
    .collection(DOCUMENTS)
    .find({ kind: "cv" })
    .project({ profileId: 1 })
    .toArray();
  const profileIdsWithCvDoc = new Set(cvDocs.map((doc) => doc.profileId));

  const stamp = new Date();
  const established = candidates.filter((profile) => {
    const hasCvFile = typeof profile.cvFilePath === "string" && profile.cvFilePath.length > 0;
    const hasRawCv = typeof profile.rawCvText === "string" && profile.rawCvText.length > 0;
    const hasCvDoc = profileIdsWithCvDoc.has(profile._id);
    return hasCvFile || hasRawCv || hasCvDoc;
  });

  await Promise.all(
    established.map((profile) =>
      profiles.updateOne({ _id: profile._id }, { $set: { onboardingCompletedAt: stamp } }),
    ),
  );
};

export const down = async (): Promise<void> => {};
