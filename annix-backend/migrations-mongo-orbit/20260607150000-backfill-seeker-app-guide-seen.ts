import type { mongo } from "mongoose";

// The first-run app-download + feedback-widget popups only show when a seeker
// profile has appGuideSeen=false. Existing seekers are not first-timers, so
// mark them as already seen — only genuinely new sign-ups (default false) get
// the onboarding popups. Idempotent.
const PROFILES = "cv_assistant_profiles";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(PROFILES)
    .updateMany(
      { userType: "individual", appGuideSeen: { $in: [null, undefined] } },
      { $set: { appGuideSeen: true } },
    );
};

export const down = async (): Promise<void> => {};
