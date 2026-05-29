#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DATABASE;
if (!uri || !dbName) {
  console.error("MONGODB_URI and MONGO_DATABASE are required.");
  process.exit(1);
}

const collections = [
  { name: "scheduled_job_overrides", keyField: "jobName" },
  { name: "polling_job_overrides", keyField: "jobName" },
  { name: "scheduled_jobs_global_settings", keyField: "settingsKey" },
  { name: "polling_jobs_global_settings", keyField: "settingsKey" },
];

await mongoose.connect(uri, { dbName });
const db = mongoose.connection.db;

for (const { name, keyField } of collections) {
  const c = db.collection(name);
  const orphans = await c.find({ _id: { $type: "objectId" } }).toArray();
  if (orphans.length === 0) {
    console.log(`${name}: no ObjectId-keyed docs — already correct.`);
    continue;
  }

  const reKeyed = await Promise.all(
    orphans.map(async (orphan) => {
      const key = orphan[keyField];
      if (typeof key !== "string" || key.length === 0) {
        return { ok: false, orphanId: orphan._id, reason: `missing ${keyField}` };
      }
      const { _id, [keyField]: _drop, ...rest } = orphan;
      await c.updateOne({ _id: key }, { $setOnInsert: { _id: key, ...rest } }, { upsert: true });
      const exists = await c.countDocuments({ _id: key });
      return { ok: exists > 0, orphanId: orphan._id, key };
    }),
  );

  const deletableIds = reKeyed.filter((r) => r.ok).map((r) => r.orphanId);
  const skipped = reKeyed.filter((r) => !r.ok);
  const del = await c.deleteMany({ _id: { $in: deletableIds } });

  console.log(
    `${name}: re-keyed ${deletableIds.length}, deleted ${del.deletedCount} orphans` +
      (skipped.length > 0
        ? `, SKIPPED ${skipped.length} (${skipped.map((s) => s.reason).join(", ")})`
        : ""),
  );
  const remaining = await c.countDocuments({});
  const stillObjId = await c.countDocuments({ _id: { $type: "objectId" } });
  console.log(`  now ${remaining} docs total, ${stillObjId} still ObjectId-keyed.`);
}

await mongoose.disconnect();
