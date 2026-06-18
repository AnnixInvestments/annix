import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * GitHub issue #358 — master-data audit (relational counterpart of the Mongo
 * migration 20260618090000-fix-bs4504-largebore-pcd-and-sans4000-dn15).
 *
 * PREPARED — NOT YET APPLIED. Sign off on the values and re-run
 * `node scripts/audit-flange-drilling.mjs` against the live DB to confirm the
 * affected rows before applying.
 *
 * 1. BS 4504 DN700-DN1000 "impossible drilling" rows (PCD >= OD) corrected to
 *    standard EN 1092-1 / BS 4504 drilling, each value cross-referenced across
 *    >= 2 published tables (wermac.org, valvias.com, roymech.org); outliers
 *    (PN16 DN700 36-hole, PN25 DN900 OD 1158) rejected. Drilling only — the
 *    per-row bolt FK is left to the separate bolt-data item.
 * 2. BS 4504 PN40 is undefined above DN600, so class-40 DN700-DN1000 rows are
 *    deleted (confirm before applying).
 * 3. SANS 1123 Table 4000 DN15 PCD typo 56 -> 65 (4 x Ø14).
 *
 * down() is not reversible (originals/deletions not preserved).
 */
export class FixBs4504LargeBorePcdAndSans4000Dn151820100000049000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Correct BS 4504 large-bore drilling for every type row of the
    //    class+DN. VALUES: (numericClass, DN, OD, PCD, numHoles, holeDia).
    await queryRunner.query(`
      UPDATE flange_dimensions fd
      SET "D" = v.od, pcd = v.pcd, num_holes = v.holes, d1 = v.d1
      FROM (VALUES
        ('10', 700, 895, 840, 24, 30),
        ('10', 800, 1015, 950, 24, 33),
        ('10', 900, 1115, 1050, 28, 33),
        ('10', 1000, 1230, 1160, 28, 36),
        ('16', 700, 910, 840, 24, 36),
        ('16', 800, 1025, 950, 24, 39),
        ('16', 900, 1125, 1050, 28, 39),
        ('16', 1000, 1255, 1170, 28, 42),
        ('25', 700, 960, 875, 24, 42),
        ('25', 800, 1085, 990, 24, 48),
        ('25', 900, 1185, 1090, 28, 48),
        ('25', 1000, 1320, 1210, 28, 56)
      ) AS v(cls, dn, od, pcd, holes, d1),
      flange_standards fs, flange_pressure_classes fpc, nominal_outside_diameters nod
      WHERE fs.code = 'BS 4504'
        AND fd."standardId" = fs.id
        AND fd."pressureClassId" = fpc.id
        AND fd."nominalOutsideDiameterId" = nod.id
        AND split_part(fpc.designation, '/', 1) = v.cls
        AND nod.nominal_diameter_mm = v.dn
    `);

    // 2. Delete spurious BS 4504 PN40 large-bore rows.
    await queryRunner.query(`
      DELETE FROM flange_dimensions fd
      USING flange_standards fs, flange_pressure_classes fpc, nominal_outside_diameters nod
      WHERE fs.code = 'BS 4504'
        AND fd."standardId" = fs.id
        AND fd."pressureClassId" = fpc.id
        AND fd."nominalOutsideDiameterId" = nod.id
        AND split_part(fpc.designation, '/', 1) = '40'
        AND nod.nominal_diameter_mm IN (700, 800, 900, 1000)
    `);

    // 3. SANS 1123 Table 4000 DN15 PCD typo (56 -> 65, 4 x Ø14).
    await queryRunner.query(`
      UPDATE flange_dimensions fd
      SET pcd = 65, num_holes = 4, d1 = 14
      FROM flange_standards fs, flange_pressure_classes fpc, nominal_outside_diameters nod
      WHERE fs.code = 'SABS 1123'
        AND fd."standardId" = fs.id
        AND fd."pressureClassId" = fpc.id
        AND fd."nominalOutsideDiameterId" = nod.id
        AND split_part(fpc.designation, '/', 1) = '4000'
        AND nod.nominal_diameter_mm = 15
        AND fd.pcd = 56
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible — pre-fix drilling values and the deleted PN40 rows are not
    // preserved. Restore from backup if a rollback is ever required.
  }
}
