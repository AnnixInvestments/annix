import type { mongo } from "mongoose";

/**
 * GitHub issue #358 — master-data audit.
 *
 * PREPARED — NOT YET APPLIED TO PROD. Requires engineering sign-off on the
 * values below AND a re-run of `node scripts/audit-flange-drilling.mjs`
 * against the live DB to confirm the affected row set before this is run.
 *
 * Fixes two master-data defects in `flange_dimensions`:
 *
 * 1. BS 4504 large-bore "impossible drilling" rows (PCD >= OD). The audit
 *    flagged BS 4504 DN700-DN1000 /3 and /8 rows whose PCD exceeds the
 *    flange OD — physically impossible. Corrected to the standard
 *    EN 1092-1 / BS 4504 values below, each cross-referenced across
 *    >= 2 independent published tables (wermac.org, valvias.com,
 *    roymech.org); single-source outliers were rejected:
 *      - PN16 DN700 hole count: 24 (valvias+wermac) over roymech's 36
 *      - PN25 DN900 OD: 1185 (roymech+wermac) over valvias' 1158
 *    Bolt sizes implied by the hole Ø (PN10 M27/M30/M33, PN16 M33/M36/M39,
 *    PN25 M39/M45/M52). NOTE: this migration sets drilling only (D, pcd,
 *    num_holes, d1); the per-row `boltId` is intentionally left for the
 *    separate "bolt data absent from dimension lookups" item — the 3D card
 *    already derives the bolt from the hole Ø.
 *
 * 2. EN 1092-1 / BS 4504 PN40 is not defined above DN600, so any BS 4504
 *    class-40 DN700-DN1000 rows are spurious and are DELETED. <-- confirm
 *    this deletion explicitly before applying; if Annix intends to keep
 *    large-bore PN40 from another source, drop this step.
 *
 * 3. SANS 1123 Table 4000 DN15 typo: one /3 row carries PCD 56 where the
 *    table drills PCD 65 (4 x Ø14, M12) — confirmed against the BS 4504
 *    PN40 DN15 analogue (4 holes, PCD 65) and the other SANS 4000 DN15
 *    type rows. Corrected to PCD 65 / 4 holes / Ø14.
 *
 * down() cannot restore the pre-fix values (the corrupted originals are not
 * preserved) nor the deleted PN40 rows; restore from backup if ever needed.
 */

const STANDARD_BS4504 = "BS 4504";
const STANDARD_SANS = "SABS 1123";

// [numericClass, DN, OD(D), PCD, numHoles, holeDia(d1)] — cross-referenced.
const BS4504_DRILLING: [number, number, number, number, number, number][] = [
  // PN10
  [10, 700, 895, 840, 24, 30],
  [10, 800, 1015, 950, 24, 33],
  [10, 900, 1115, 1050, 28, 33],
  [10, 1000, 1230, 1160, 28, 36],
  // PN16
  [16, 700, 910, 840, 24, 36],
  [16, 800, 1025, 950, 24, 39],
  [16, 900, 1125, 1050, 28, 39],
  [16, 1000, 1255, 1170, 28, 42],
  // PN25
  [25, 700, 960, 875, 24, 42],
  [25, 800, 1085, 990, 24, 48],
  [25, 900, 1185, 1090, 28, 48],
  [25, 1000, 1320, 1210, 28, 56],
];

const PN40_DELETE_DNS = [700, 800, 900, 1000];

const numericClassOf = (designation: string | undefined): number | null => {
  const match = (designation || "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

export const up = async (db: mongo.Db): Promise<void> => {
  const [standards, classes, nominals] = await Promise.all([
    db.collection("flange_standards").find({}).toArray(),
    db.collection("flange_pressure_classes").find({}).toArray(),
    db.collection("nominal_outside_diameters").find({}).toArray(),
  ]);

  const standardId = (name: string) =>
    standards.find((s) => s.code === name || s.name === name)?._id;
  const bs4504Id = standardId(STANDARD_BS4504);
  const sansId = standardId(STANDARD_SANS);
  if (bs4504Id == null || sansId == null) {
    throw new Error("flange_standards: BS 4504 / SABS 1123 not found — aborting #358 fix");
  }

  const dnId = (mm: number) => nominals.find((n) => Number(n.nominal_diameter_mm) === mm)?._id;
  const classIdsForNumeric = (numericClass: number) =>
    classes.filter((c) => numericClassOf(c.designation) === numericClass).map((c) => c._id);

  // 1. Correct BS 4504 large-bore drilling (applies to every type row of the
  //    class+DN, e.g. /1 /2 /3 /8 — they share drilling by definition).
  for (const [cls, dn, D, pcd, num_holes, d1] of BS4504_DRILLING) {
    const nomId = dnId(dn);
    const clsIds = classIdsForNumeric(cls);
    if (nomId == null || clsIds.length === 0) continue;
    await db.collection("flange_dimensions").updateMany(
      {
        standardId: bs4504Id,
        pressureClassId: { $in: clsIds },
        nominalOutsideDiameterId: nomId,
      },
      { $set: { D, pcd, num_holes, d1 } },
    );
  }

  // 2. Delete spurious BS 4504 PN40 large-bore rows (no standard above DN600).
  const pn40Ids = classIdsForNumeric(40);
  const pn40DnIds = PN40_DELETE_DNS.map(dnId).filter((id) => id != null);
  if (pn40Ids.length > 0 && pn40DnIds.length > 0) {
    await db.collection("flange_dimensions").deleteMany({
      standardId: bs4504Id,
      pressureClassId: { $in: pn40Ids },
      nominalOutsideDiameterId: { $in: pn40DnIds },
    });
  }

  // 3. SANS 1123 Table 4000 DN15 PCD typo (56 -> 65, 4 x Ø14).
  const sans4000Ids = classIdsForNumeric(4000);
  const dn15Id = dnId(15);
  if (sans4000Ids.length > 0 && dn15Id != null) {
    await db.collection("flange_dimensions").updateMany(
      {
        standardId: sansId,
        pressureClassId: { $in: sans4000Ids },
        nominalOutsideDiameterId: dn15Id,
        pcd: 56,
      },
      { $set: { pcd: 65, num_holes: 4, d1: 14 } },
    );
  }
};

export const down = async (_db: mongo.Db): Promise<void> => {
  // Irreversible: pre-fix drilling values and the deleted PN40 rows are not
  // preserved here. Restore from a database backup if a rollback is required.
};
