import type { Model } from "mongoose";

export interface JobInfo {
  jobNumber: string | null;
  jcNumber: string | null;
}

export async function jobInfoByCardId(
  jobCardModel: Model<Record<string, unknown>>,
  jobCardIds: number[],
): Promise<Map<number, JobInfo>> {
  const uniqueIds = [...new Set(jobCardIds.filter((id) => id !== null && id !== undefined))];
  if (uniqueIds.length === 0) {
    return new Map();
  }
  const docs = await jobCardModel
    .find({ _id: { $in: uniqueIds } })
    .select({ jobNumber: 1, jcNumber: 1 })
    .lean()
    .exec();
  return docs.reduce((acc, doc) => {
    const id = (doc as { _id: number })._id;
    acc.set(id, {
      jobNumber: ((doc as { jobNumber?: string | null }).jobNumber as string | null) || null,
      jcNumber: ((doc as { jcNumber?: string | null }).jcNumber as string | null) || null,
    });
    return acc;
  }, new Map<number, JobInfo>());
}
