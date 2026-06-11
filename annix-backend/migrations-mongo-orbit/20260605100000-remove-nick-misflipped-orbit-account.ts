import type { mongo } from "mongoose";

const COMPANIES = "cv_assistant_companies";
const PROFILES = "cv_assistant_profiles";
const JOB_POSTINGS = "cv_assistant_job_postings";

const PLACEHOLDER_COMPANY_NAME = "nick.barrett36@me.com's Company";

interface CompanyDocument {
  _id: number;
  name: string;
}

export const up = async (db: mongo.Db): Promise<void> => {
  const company = await db
    .collection<CompanyDocument>(COMPANIES)
    .findOne({ name: PLACEHOLDER_COMPANY_NAME });
  if (!company) {
    return;
  }
  const jobCount = await db.collection(JOB_POSTINGS).countDocuments({ companyId: company._id });
  if (jobCount > 0) {
    return;
  }
  await db.collection(PROFILES).deleteMany({ companyId: company._id, userType: "company" });
  await db.collection<CompanyDocument>(COMPANIES).deleteOne({ _id: company._id });
};

export const down = async (): Promise<void> => {};
