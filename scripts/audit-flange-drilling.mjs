// Read-only audit of flange drilling consistency (GitHub issue #358).
// Canonical rules live in annix-backend/src/flange-dimension/flange-drilling-consistency.ts
// (unit-tested); this script applies the same grouping against the live database:
// within one (standard, numeric table rating, DN) every flange type must share
// (D, PCD, hole count, hole diameter), and PCD must sit inside the flange OD.
// Usage: node scripts/audit-flange-drilling.mjs  (reads annix-backend/.env)
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "annix-backend");
dotenv.config({ path: path.join(backendDir, ".env") });
if (process.env.MONGO_DNS_SERVERS) dns.setServers(process.env.MONGO_DNS_SERVERS.split(","));

const numericClassOf = (designation) => {
  const match = (designation || "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGO_DATABASE || "annix_production",
  });
  const db = mongoose.connection.db;

  const [dimensions, classes, nominals, standards] = await Promise.all([
    db.collection("flange_dimensions").find({}).toArray(),
    db.collection("flange_pressure_classes").find({}).toArray(),
    db.collection("nominal_outside_diameters").find({}).toArray(),
    db.collection("flange_standards").find({}).toArray(),
  ]);

  const classById = new Map(classes.map((c) => [Number(c._id), c]));
  const dnById = new Map(nominals.map((n) => [Number(n._id), n]));
  const standardById = new Map(standards.map((s) => [Number(s._id), s]));

  console.log(
    `loaded: ${dimensions.length} dimensions, ${classes.length} classes, ${nominals.length} nominal ODs, ${standards.length} standards`,
  );
  const rows = dimensions
    .map((d) => {
      const pressureClass = classById.get(Number(d.pressureClassId));
      const nominal = dnById.get(Number(d.nominalOutsideDiameterId));
      if (!pressureClass || !nominal) return null;
      return {
        id: Number(d._id),
        standardId: d.standardId == null ? null : Number(d.standardId),
        classDesignation: pressureClass.designation,
        nominalDiameterMm: Number(nominal.nominal_diameter_mm),
        D: Number(d.D),
        pcd: Number(d.pcd),
        numHoles: Number(d.num_holes),
        d1: Number(d.d1),
        b: Number(d.b),
        mass_kg: Number(d.mass_kg),
      };
    })
    .filter(Boolean);
  if (rows.length < dimensions.length) {
    console.log(
      `WARNING: ${dimensions.length - rows.length} dimension rows dropped (missing class/DN join)`,
    );
  }

  const groups = new Map();
  for (const row of rows) {
    const numericClass = numericClassOf(row.classDesignation);
    if (numericClass === null) continue;
    const key = `${row.standardId}|${numericClass}|${row.nominalDiameterMm}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let inconsistent = 0;
  for (const [key, groupRows] of [...groups.entries()].sort()) {
    const variants = new Map();
    for (const row of groupRows) {
      const vKey = [row.D, row.pcd, row.numHoles, row.d1].join("|");
      if (!variants.has(vKey)) variants.set(vKey, []);
      variants.get(vKey).push(row);
    }
    if (variants.size <= 1) continue;
    inconsistent += 1;
    const [standardId, numericClass, dn] = key.split("|");
    const standardName = standardById.get(Number(standardId))?.name || `standard ${standardId}`;
    console.log(`\n[INCONSISTENT] ${standardName} class ${numericClass} DN${dn}`);
    const sorted = [...variants.values()].sort((a, b) => b.length - a.length);
    const majority = sorted.length > 1 && sorted[0].length > sorted[1].length ? sorted[0] : null;
    for (const variantRows of sorted) {
      const sample = variantRows[0];
      const tag = majority === variantRows ? "MAJORITY " : majority ? "MINORITY " : "SPLIT    ";
      console.log(
        `  ${tag} D=${sample.D} PCD=${sample.pcd} ${sample.numHoles}xØ${sample.d1}  rows: ${variantRows
          .map((r) => `${r.classDesignation}(id ${r.id})`)
          .join(", ")}`,
      );
    }
    if (majority) {
      const minorityIds = sorted
        .slice(1)
        .flatMap((v) => v.map((r) => r.id))
        .join(", ");
      const m = sorted[0][0];
      console.log(
        `  PROPOSAL: set rows [${minorityIds}] to D=${m.D} PCD=${m.pcd} holes=${m.numHoles} d1=${m.d1} (verify against the standard before applying)`,
      );
    } else {
      console.log("  PROPOSAL: no majority - settle from the standard book");
    }
  }

  console.log(`\nInconsistent (standard, class, DN) groups: ${inconsistent}`);

  console.log("\n[IMPOSSIBLE DRILLING]");
  let impossible = 0;
  for (const row of rows) {
    const reasons = [];
    if (row.pcd >= row.D) reasons.push(`PCD ${row.pcd} >= OD ${row.D}`);
    else if (row.pcd + row.d1 >= row.D) reasons.push("holes break flange edge (PCD+d1 >= OD)");
    if (row.D <= 0 || row.pcd <= 0 || row.numHoles <= 0 || row.d1 <= 0)
      reasons.push("non-positive drilling value");
    if (reasons.length > 0) {
      impossible += 1;
      const standardName =
        standardById.get(Number(row.standardId))?.name || `standard ${row.standardId}`;
      console.log(
        `  id ${row.id} ${standardName} ${row.classDesignation} DN${row.nominalDiameterMm}: ${reasons.join("; ")}`,
      );
    }
  }
  console.log(`Impossible rows: ${impossible}`);

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
