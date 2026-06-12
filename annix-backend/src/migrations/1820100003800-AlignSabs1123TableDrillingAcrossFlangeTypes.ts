import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * SANS 1123 drills identically for every flange type within a pressure
 * table — that is the point of the table system. A subset of SABS 1123
 * rows (mostly types /2, /3 and /8) were imported with EN 1092-1 PN
 * geometry instead (e.g. 1000/3 DN300 carried PN10's 445/400/Ø22/12×M20
 * where SANS T1000 DN300 is 460/410/Ø26/12×M24), so bolt sets and
 * drilling disagreed between flange types of the same table.
 *
 * Propagate the type /1 row's drilling (D, PCD, hole Ø, hole count,
 * bolt) to every sibling row of the same (table, DN); type-specific
 * fields (thickness b, mass, bolt length) are left alone. Idempotent —
 * re-running matches zero rows once aligned. Applied to prod Mongo
 * directly on 2026-06-12 (46 rows; prior values recorded in notes).
 */
export class AlignSabs1123TableDrillingAcrossFlangeTypes1820100003800
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE flange_dimensions fd
      SET "D" = src."D",
          pcd = src.pcd,
          d1 = src.d1,
          num_holes = src.num_holes,
          "boltId" = src."boltId"
      FROM flange_dimensions src
      JOIN flange_pressure_classes spc ON src."pressureClassId" = spc.id
      JOIN flange_standards fs ON src."standardId" = fs.id,
           flange_pressure_classes fpc
      WHERE fs.code = 'SABS 1123'
        AND spc.designation LIKE '%/1'
        AND fd."standardId" = src."standardId"
        AND fd."nominalOutsideDiameterId" = src."nominalOutsideDiameterId"
        AND fd."pressureClassId" = fpc.id
        AND fd.id <> src.id
        AND split_part(fpc.designation, '/', 1) = split_part(spc.designation, '/', 1)
        AND (fd."D" IS DISTINCT FROM src."D"
          OR fd.pcd IS DISTINCT FROM src.pcd
          OR fd.d1 IS DISTINCT FROM src.d1
          OR fd.num_holes IS DISTINCT FROM src.num_holes
          OR fd."boltId" IS DISTINCT FROM src."boltId")
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible in SQL alone — the pre-alignment values are only
    // preserved in the Mongo rows' notes field. Restore from backup if
    // a rollback is ever genuinely required.
  }
}
