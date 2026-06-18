// #358 master-data audit — DN1200 + SANS DN15 duplicate cleanup.
// Decision (Andrew, 2026-06-18): correct PN16 DN1200 to cross-referenced
// BS 4504 / EN 1092-1 values; delete PN10/25/40 DN1200 (not reliably sourced /
// undefined >DN600); delete the SANS 4000/3 DN15 legacy duplicate (id 13,
// flangeTypeId null — keep typed id 72).
//
// Dry-run by default: snapshots affected rows to a backup file and previews,
// NO writes. Set APPLY=1 to perform the writes.
//
// Usage:
//   node scripts/apply-358-flange-dn1200.mjs            # dry run (uses annix-backend/.env)
//   APPLY=1 node scripts/apply-358-flange-dn1200.mjs    # apply
import dns from "node:dns";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(scriptDir, "..", "annix-backend");
// dotenv/mongoose live in annix-backend/node_modules (not root), so resolve
// them from there regardless of where this script sits or is run from.
const require = createRequire(path.join(backendDir, "package.json"));
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const envFile = process.env.ENV_FILE || path.join(backendDir, ".env");
dotenv.config({ path: envFile });
if (process.env.MONGO_DNS_SERVERS) dns.setServers(process.env.MONGO_DNS_SERVERS.split(","));

const APPLY = process.env.APPLY === "1";

// PN16 DN1200 correction — cross-referenced (roymech BS4504 + valvias EN1092-1).
const PN16_DN1200 = { D: 1485, pcd: 1390, num_holes: 32, d1: 48 };
const DELETE_CLASSES_DN1200 = [10, 25, 40];
const SANS_DN15_DUP_ID = 13;

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
  if (bs4504Id == null) throw new Error("BS 4504 standard not found");
  const dnId = (mm) => nominals.find((n) => Number(n.nominal_diameter_mm) === mm)?._id;
  const classIds = (n) =>
    classes.filter((c) => numericClassOf(c.designation) === n).map((c) => c._id);
  const dimsCol = db.collection("flange_dimensions");
  const dn1200 = dnId(1200);
  if (dn1200 == null) throw new Error("DN1200 nominal not found");

  const designationById = new Map(classes.map((c) => [String(c._id), c.designation]));
  const dnById = new Map(nominals.map((n) => [String(n._id), Number(n.nominal_diameter_mm)]));
  const label = (r) =>
    `${designationById.get(String(r.pressureClassId))} DN${dnById.get(String(r.nominalOutsideDiameterId))}`;

  const pn16Filter = {
    standardId: bs4504Id,
    pressureClassId: { $in: classIds(16) },
    nominalOutsideDiameterId: dn1200,
  };
  const deleteFilter = {
    standardId: bs4504Id,
    pressureClassId: { $in: DELETE_CLASSES_DN1200.flatMap(classIds) },
    nominalOutsideDiameterId: dn1200,
  };

  // ---- Snapshot every row we might touch (BEFORE writes) ----
  const pn16Rows = await dimsCol.find(pn16Filter).toArray();
  const deleteRows = await dimsCol.find(deleteFilter).toArray();
  const dupRow = await dimsCol.findOne({ _id: SANS_DN15_DUP_ID });
  const snapshot = [...pn16Rows, ...deleteRows, ...(dupRow ? [dupRow] : [])];
  const backupPath = path.join(scriptDir, `backup-358-flange-dn1200-${db.databaseName}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2));
  console.log(`\nSnapshot: ${snapshot.length} affected rows -> ${backupPath}`);

  // ---- Preview ----
  console.log(`\n[1] CORRECT PN16 DN1200 (${pn16Rows.length} rows -> D1485/PCD1390/32xØ48):`);
  for (const r of pn16Rows)
    console.log(
      `  id ${r._id} ${label(r)}: D ${r.D}->1485, PCD ${r.pcd}->1390, holes ${r.num_holes}->32, d1 ${r.d1}->48`,
    );
  console.log(`\n[2] DELETE PN10/25/40 DN1200 (${deleteRows.length} rows):`);
  for (const r of deleteRows)
    console.log(`  id ${r._id} ${label(r)}: D=${r.D} PCD=${r.pcd} ${r.num_holes}xØ${r.d1}`);
  console.log(`\n[3] DELETE SANS 4000/3 DN15 duplicate id ${SANS_DN15_DUP_ID}:`);
  if (!dupRow) {
    console.log("  NOT FOUND — already removed?");
  } else {
    const ok =
      dupRow.flangeTypeId == null &&
      dupRow.pressureClassId === 13 &&
      dupRow.nominalOutsideDiameterId === 4;
    console.log(
      `  id ${dupRow._id} ${label(dupRow)} flangeTypeId=${dupRow.flangeTypeId} — safety check ${ok ? "PASS" : "FAIL (will skip)"}`,
    );
  }

  if (!APPLY) {
    console.log("\nDRY RUN — no writes. Re-run with APPLY=1 to apply.");
    await mongoose.disconnect();
    return;
  }

  // ---- Apply ----
  console.log("\nAPPLYING...");
  const upd = await dimsCol.updateMany(pn16Filter, { $set: PN16_DN1200 });
  const del = await dimsCol.deleteMany(deleteFilter);
  let dupDeleted = 0;
  if (
    dupRow &&
    dupRow.flangeTypeId == null &&
    dupRow.pressureClassId === 13 &&
    dupRow.nominalOutsideDiameterId === 4
  ) {
    dupDeleted = (await dimsCol.deleteOne({ _id: SANS_DN15_DUP_ID })).deletedCount;
  }
  console.log(
    `  PN16 corrected: ${upd.modifiedCount}; DN1200 deleted: ${del.deletedCount}; DN15 dup deleted: ${dupDeleted}`,
  );

  // ---- Verify: no impossible BS 4504 rows remain ----
  const remaining = [];
  for (const r of await dimsCol.find({ standardId: bs4504Id }).toArray()) {
    if (Number(r.pcd) >= Number(r.D) || Number(r.pcd) + Number(r.d1) >= Number(r.D))
      remaining.push(`id ${r._id} ${label(r)}`);
  }
  console.log(
    `\nVerify: ${remaining.length} impossible BS 4504 rows remain${remaining.length ? `:\n  ${remaining.join("\n  ")}` : " — clean."}`,
  );

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
