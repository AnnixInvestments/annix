// #358 master-data fix applier (BS 4504 large-bore drilling + PN40 delete +
// SANS 4000 DN15 PCD typo). Mirrors migration
// 20260618090000-fix-bs4504-largebore-pcd-and-sans4000-dn15.
//
// Dry-run by default: snapshots affected rows to a backup file and prints a
// preview, NO writes. Set APPLY=1 to perform the writes (snapshot is still
// taken first so the change is restorable — down() is irreversible).
//
// Usage:
//   ENV_FILE=<path-to-annix-backend/.env> node scripts/apply-358-flange-fix.mjs        # dry run
//   ENV_FILE=<path> APPLY=1 node scripts/apply-358-flange-fix.mjs                       # apply
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.ENV_FILE || path.join(scriptDir, "..", "annix-backend", ".env");
dotenv.config({ path: envFile });
if (process.env.MONGO_DNS_SERVERS) dns.setServers(process.env.MONGO_DNS_SERVERS.split(","));

const APPLY = process.env.APPLY === "1";

// [numericClass, DN, OD(D), PCD, numHoles, holeDia(d1)] — cross-referenced.
const BS4504_DRILLING = [
  [10, 700, 895, 840, 24, 30],
  [10, 800, 1015, 950, 24, 33],
  [10, 900, 1115, 1050, 28, 33],
  [10, 1000, 1230, 1160, 28, 36],
  [16, 700, 910, 840, 24, 36],
  [16, 800, 1025, 950, 24, 39],
  [16, 900, 1125, 1050, 28, 39],
  [16, 1000, 1255, 1170, 28, 42],
  [25, 700, 960, 875, 24, 42],
  [25, 800, 1085, 990, 24, 48],
  [25, 900, 1185, 1090, 28, 48],
  [25, 1000, 1320, 1210, 28, 56],
];
const PN40_DELETE_DNS = [700, 800, 900, 1000];

const numericClassOf = (d) => {
  const m = (d || "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGO_DATABASE || "annix_production",
  });
  const db = mongoose.connection.db;
  console.log(
    `Connected to "${db.databaseName}"  (APPLY=${APPLY ? "YES — WRITING" : "no — dry run"})`,
  );

  const [standards, classes, nominals] = await Promise.all([
    db.collection("flange_standards").find({}).toArray(),
    db.collection("flange_pressure_classes").find({}).toArray(),
    db.collection("nominal_outside_diameters").find({}).toArray(),
  ]);
  const stdId = (name) => standards.find((s) => s.code === name || s.name === name)?._id;
  const bs4504Id = stdId("BS 4504");
  const sansId = stdId("SABS 1123");
  if (bs4504Id == null || sansId == null) throw new Error("standards not found");
  const dnId = (mm) => nominals.find((n) => Number(n.nominal_diameter_mm) === mm)?._id;
  const classIds = (n) =>
    classes.filter((c) => numericClassOf(c.designation) === n).map((c) => c._id);
  const dimsCol = db.collection("flange_dimensions");

  // ---- Build the exact filters ----
  const correctFilters = BS4504_DRILLING.map(([cls, dn, D, pcd, num_holes, d1]) => ({
    label: `BS4504 ${cls} DN${dn}`,
    set: { D, pcd, num_holes, d1 },
    filter: {
      standardId: bs4504Id,
      pressureClassId: { $in: classIds(cls) },
      nominalOutsideDiameterId: dnId(dn),
    },
  }));
  const pn40Filter = {
    standardId: bs4504Id,
    pressureClassId: { $in: classIds(40) },
    nominalOutsideDiameterId: { $in: PN40_DELETE_DNS.map(dnId).filter((x) => x != null) },
  };
  const sansFilter = {
    standardId: sansId,
    pressureClassId: { $in: classIds(4000) },
    nominalOutsideDiameterId: dnId(15),
    pcd: 56,
  };

  // ---- Snapshot every row we might touch (BEFORE writes) ----
  const designationById = new Map(classes.map((c) => [String(c._id), c.designation]));
  const dnById = new Map(nominals.map((n) => [String(n._id), Number(n.nominal_diameter_mm)]));
  const label = (r) =>
    `${designationById.get(String(r.pressureClassId))} DN${dnById.get(String(r.nominalOutsideDiameterId))}`;

  const affected = new Map();
  for (const c of correctFilters)
    for (const r of await dimsCol.find(c.filter).toArray()) affected.set(String(r._id), r);
  const pn40Rows = await dimsCol.find(pn40Filter).toArray();
  for (const r of pn40Rows) affected.set(String(r._id), r);
  const sansRows = await dimsCol.find(sansFilter).toArray();
  for (const r of sansRows) affected.set(String(r._id), r);

  const backupPath = path.join(scriptDir, `backup-358-flange-${db.databaseName}.json`);
  fs.writeFileSync(backupPath, JSON.stringify([...affected.values()], null, 2));
  console.log(`\nSnapshot: ${affected.size} affected rows -> ${backupPath}`);

  // ---- Preview ----
  console.log("\n[1] BS 4504 drilling corrections (current -> new):");
  for (const c of correctFilters) {
    const rows = await dimsCol.find(c.filter).toArray();
    for (const r of rows) {
      const changed =
        r.D !== c.set.D ||
        r.pcd !== c.set.pcd ||
        r.num_holes !== c.set.num_holes ||
        r.d1 !== c.set.d1;
      console.log(
        `  id ${r._id} ${label(r)}: D ${r.D}->${c.set.D}, PCD ${r.pcd}->${c.set.pcd}, holes ${r.num_holes}->${c.set.num_holes}, d1 ${r.d1}->${c.set.d1}${changed ? "" : "  (no change)"}`,
      );
    }
  }
  console.log(`\n[2] BS 4504 PN40 rows to DELETE: ${pn40Rows.length}`);
  for (const r of pn40Rows)
    console.log(`  id ${r._id} ${label(r)}: D=${r.D} PCD=${r.pcd} ${r.num_holes}xØ${r.d1}`);
  console.log(`\n[3] SANS 1123 4000 DN15 PCD=56 -> 65 rows: ${sansRows.length}`);
  for (const r of sansRows)
    console.log(
      `  id ${r._id} ${label(r)}: PCD ${r.pcd}->65, holes ${r.num_holes}->4, d1 ${r.d1}->14`,
    );

  if (!APPLY) {
    console.log("\nDRY RUN — no writes. Re-run with APPLY=1 to apply.");
    await mongoose.disconnect();
    return;
  }

  // ---- Apply ----
  console.log("\nAPPLYING...");
  let corrected = 0;
  for (const c of correctFilters) {
    const res = await dimsCol.updateMany(c.filter, { $set: c.set });
    corrected += res.modifiedCount;
  }
  const del = await dimsCol.deleteMany(pn40Filter);
  const sans = await dimsCol.updateMany(sansFilter, { $set: { pcd: 65, num_holes: 4, d1: 14 } });
  console.log(
    `  corrected: ${corrected} rows; deleted: ${del.deletedCount}; SANS DN15 fixed: ${sans.modifiedCount}`,
  );

  // ---- Verify (impossible rows for BS4504/SANS should be gone for these) ----
  const remaining = [];
  for (const r of await dimsCol.find({ standardId: { $in: [bs4504Id, sansId] } }).toArray()) {
    if (Number(r.pcd) >= Number(r.D) || Number(r.pcd) + Number(r.d1) >= Number(r.D))
      remaining.push(`id ${r._id} ${label(r)}`);
  }
  console.log(
    `\nVerify: ${remaining.length} impossible BS4504/SANS rows remain${remaining.length ? `:\n  ${remaining.join("\n  ")}` : " — clean."}`,
  );

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
