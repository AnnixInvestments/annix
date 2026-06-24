import type { mongo } from "mongoose";

const EMBED_FIELDS = [
  "id",
  "companyId",
  "key",
  "label",
  "sortOrder",
  "isSystem",
  "isBackground",
  "triggerAfterStep",
  "actionLabel",
  "branchColor",
  "phaseActionLabels",
  "stepOutcomes",
  "branchType",
  "rejoinAtStep",
] as const;

export const up = async (db: mongo.Db): Promise<void> => {
  const companies = await db.collection("stock_control_companies").find({}).toArray();

  await companies.reduce(async (prev, company) => {
    await prev;

    if (company.workflowStepConfigs) {
      return;
    }

    const rows = await db
      .collection("workflow_step_configs")
      .find({ companyId: company._id })
      .toArray();

    if (rows.length === 0) {
      return;
    }

    const workflowStepConfigs = rows.map((row) => {
      const source: Record<string, unknown> = { ...row, id: row._id };
      return EMBED_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
        acc[field] = source[field] === undefined ? null : source[field];
        return acc;
      }, {});
    });

    await db
      .collection("stock_control_companies")
      .updateOne({ _id: company._id }, { $set: { workflowStepConfigs } });
  }, Promise.resolve());
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection("stock_control_companies")
    .updateMany({}, { $unset: { workflowStepConfigs: "" } });
};
