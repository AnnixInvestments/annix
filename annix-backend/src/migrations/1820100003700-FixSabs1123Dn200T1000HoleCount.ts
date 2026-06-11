import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * SANS 1123 Table 1000/3 DN200 has 8 bolt holes (matching the PN10 pattern:
 * 8 × Ø22 on a 295 PCD — see bnw_set_weights PN10/DN200), not 12. The 12-hole
 * pattern belongs to 1600/3. Every other DN in the table is correct; this
 * fixes the single bad row. Idempotent (guarded on num_holes = 12).
 */
export class FixSabs1123Dn200T1000HoleCount1820100003700 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE flange_dimensions fd
      SET num_holes = 8
      FROM flange_standards fs, flange_pressure_classes fpc, nominal_outside_diameters nod
      WHERE fd."standardId" = fs.id
        AND fd."pressureClassId" = fpc.id
        AND fd."nominalOutsideDiameterId" = nod.id
        AND fs.code = 'SABS 1123'
        AND fpc.designation = '1000/3'
        AND nod.nominal_diameter_mm = 200
        AND fd.num_holes = 12
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE flange_dimensions fd
      SET num_holes = 12
      FROM flange_standards fs, flange_pressure_classes fpc, nominal_outside_diameters nod
      WHERE fd."standardId" = fs.id
        AND fd."pressureClassId" = fpc.id
        AND fd."nominalOutsideDiameterId" = nod.id
        AND fs.code = 'SABS 1123'
        AND fpc.designation = '1000/3'
        AND nod.nominal_diameter_mm = 200
        AND fd.num_holes = 8
    `);
  }
}
