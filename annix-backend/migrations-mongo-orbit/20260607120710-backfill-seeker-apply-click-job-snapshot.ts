import type { mongo } from "mongoose";

const CLICKS = "cv_assistant_seeker_apply_clicks";
const JOBS = "cv_assistant_external_jobs";

// Backfill the job snapshot onto existing apply-clicks so applications whose
// external job is still on the board keep their title/company/etc. Clicks whose
// job has already been pruned can't be recovered and stay generic.
export const up = async (db: mongo.Db): Promise<void> => {
  const clicks = db.collection(CLICKS);
  const jobs = db.collection(JOBS);
  const cursor = clicks.find({
    externalJobId: { $ne: null },
    $or: [{ jobTitle: { $exists: false } }, { jobTitle: null }],
  });
  for await (const click of cursor) {
    const job = await jobs.findOne({ _id: click.externalJobId });
    if (!job) continue;
    await clicks.updateOne(
      { _id: click._id },
      {
        $set: {
          jobTitle: job.title ?? null,
          jobCompany: job.company ?? null,
          jobLocation: job.locationArea ?? job.locationRaw ?? null,
          jobSalaryMin: job.salaryMin ?? null,
          jobSalaryMax: job.salaryMax ?? null,
          jobSalaryCurrency: job.salaryCurrency ?? null,
        },
      },
    );
  }
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(CLICKS).updateMany(
    {},
    {
      $unset: {
        jobTitle: "",
        jobCompany: "",
        jobLocation: "",
        jobSalaryMin: "",
        jobSalaryMax: "",
        jobSalaryCurrency: "",
      },
    },
  );
};
