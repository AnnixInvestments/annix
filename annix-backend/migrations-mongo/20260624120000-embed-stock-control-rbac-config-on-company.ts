import type { mongo } from "mongoose";

export const up = async (db: mongo.Db): Promise<void> => {
  const companies = await db.collection("stock_control_companies").find({}).toArray();

  await companies.reduce(async (prev, company) => {
    await prev;

    if (company.rbacConfig) {
      return;
    }

    const rows = await db
      .collection("stock_control_rbac_config")
      .find({ companyId: company._id })
      .toArray();

    if (rows.length === 0) {
      return;
    }

    const rbacConfig = rows.reduce<Record<string, string[]>>((acc, row) => {
      const existing = acc[row.navKey] ?? [];
      return existing.includes(row.role) ? acc : { ...acc, [row.navKey]: [...existing, row.role] };
    }, {});

    await db
      .collection("stock_control_companies")
      .updateOne({ _id: company._id }, { $set: { rbacConfig } });
  }, Promise.resolve());
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection("stock_control_companies").updateMany({}, { $unset: { rbacConfig: "" } });
};
