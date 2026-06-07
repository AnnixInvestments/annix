import type { mongo } from "mongoose";

const JOBS = "cv_assistant_external_jobs";
const SOURCES = "cv_assistant_job_market_sources";

// Self-contained mirror of resolveMonthlySalary (migrations must not import src).
const PROVIDER_PERIOD: Record<string, "year" | "month"> = {
  adzuna: "year",
  careerjet: "year",
  remotive: "year",
  jooble: "year",
  dpsa: "year",
  executiveplacements: "month",
  jobplacements: "month",
  jobmail: "month",
  careerjunction: "month",
};
const ANNUAL_FLOOR = 120_000;
const MONTHLY_CEILING = 5_000;

function resolvePeriod(provider: string | null, reference: number): "year" | "month" {
  const known = provider ? PROVIDER_PERIOD[provider] : undefined;
  if (known === "month" && reference >= ANNUAL_FLOOR) return "year";
  if (known === "year" && reference > 0 && reference < MONTHLY_CEILING) return "month";
  if (known) return known;
  return reference >= ANNUAL_FLOOR ? "year" : "month";
}

export const up = async (db: mongo.Db): Promise<void> => {
  const sourceDocs = await db
    .collection(SOURCES)
    .find({}, { projection: { _id: 1, provider: 1 } })
    .toArray();
  const providerBySource = new Map<unknown, string>();
  for (const source of sourceDocs) {
    providerBySource.set(source._id, source.provider);
  }

  const jobs = db.collection(JOBS);
  const cursor = jobs.find({
    $and: [
      { $or: [{ salaryMin: { $ne: null } }, { salaryMax: { $ne: null } }] },
      { $or: [{ salaryPeriod: { $exists: false } }, { salaryPeriod: null }] },
    ],
  });
  for await (const job of cursor) {
    const salaryMin = job.salaryMin != null ? Number(job.salaryMin) : null;
    const salaryMax = job.salaryMax != null ? Number(job.salaryMax) : null;
    if (salaryMin === null && salaryMax === null) continue;
    const provider = providerBySource.get(job.sourceId) ?? null;
    const reference = salaryMax ?? salaryMin ?? 0;
    const period = resolvePeriod(provider, reference);
    const divisor = period === "year" ? 12 : 1;
    await jobs.updateOne(
      { _id: job._id },
      {
        $set: {
          salaryPeriod: period,
          salaryMonthlyMin: salaryMin === null ? null : Math.round(salaryMin / divisor),
          salaryMonthlyMax: salaryMax === null ? null : Math.round(salaryMax / divisor),
        },
      },
    );
  }
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(JOBS)
    .updateMany({}, { $unset: { salaryPeriod: "", salaryMonthlyMin: "", salaryMonthlyMax: "" } });
};
