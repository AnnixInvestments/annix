import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectBs10BoltHoleSizes1774200000000 implements MigrationInterface {
  name = 'CorrectBs10BoltHoleSizes1774200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Correcting BS10 bolt hole sizes (d1 values)...');

    const bs10Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );
    if (bs10Result.length === 0) {
      console.warn('BS 10 standard not found, skipping...');
      return;
    }
    const bs10Id = bs10Result[0].id;

    const getNominalId = async (nominalMm: number) => {
      const result = await queryRunner.query(`
        SELECT id FROM nominal_outside_diameters
        WHERE nominal_diameter_mm = ${nominalMm}
        LIMIT 1
      `);
      return result[0]?.id;
    };

    const getPressureClassId = async (designation: string) => {
      const result = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${designation}' AND "standardId" = ${bs10Id}
      `);
      return result[0]?.id;
    };

    const updateBoltHoleSize = async (
      nb: number,
      tableCode: string,
      newD1: number,
    ) => {
      const nominalId = await getNominalId(nb);
      const pressureClassId = await getPressureClassId(tableCode);

      if (!nominalId || !pressureClassId) {
        return;
      }

      await queryRunner.query(`
        UPDATE flange_dimensions SET "d1" = ${newD1}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${bs10Id}
          AND "pressureClassId" = ${pressureClassId}
      `);
    };

    // BS10 bolt hole clearances per BS EN ISO 273:
    // For M20 (3/4" equiv): hole = 22mm
    // For M22 (7/8" equiv): hole = 24mm
    // For M24 (1" equiv): hole = 26mm
    // For M27 (1-1/8" equiv): hole = 30mm
    // For M30 (1-1/4" equiv): hole = 33mm
    // For M33 (1-3/8" equiv): hole = 36mm
    // For M36 (1-1/2" equiv): hole = 39mm
    // For M42 (1-3/4" equiv): hole = 45mm

    // ===== 300NB (12") =====
    await updateBoltHoleSize(300, 'T/D', 22); // M20 -> 22mm hole
    await updateBoltHoleSize(300, 'T/E', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(300, 'T/F', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(300, 'T/H', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(300, 'T/J', 26); // M24 -> 26mm hole
    await updateBoltHoleSize(300, 'T/K', 30); // M27 -> 30mm hole

    // ===== 350NB (14") =====
    await updateBoltHoleSize(350, 'T/D', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(350, 'T/E', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(350, 'T/F', 26); // M24 -> 26mm hole
    await updateBoltHoleSize(350, 'T/H', 26); // M24 -> 26mm hole
    await updateBoltHoleSize(350, 'T/J', 30); // M27 -> 30mm hole
    await updateBoltHoleSize(350, 'T/K', 33); // M30 -> 33mm hole

    // ===== 400NB (16") =====
    await updateBoltHoleSize(400, 'T/D', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(400, 'T/E', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(400, 'T/F', 26); // M24 -> 26mm hole
    await updateBoltHoleSize(400, 'T/H', 26); // M24 -> 26mm hole
    await updateBoltHoleSize(400, 'T/J', 30); // M27 -> 30mm hole
    await updateBoltHoleSize(400, 'T/K', 33); // M30 -> 33mm hole

    // ===== 450NB (18") =====
    await updateBoltHoleSize(450, 'T/D', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(450, 'T/E', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(450, 'T/F', 30); // M27 -> 30mm hole
    await updateBoltHoleSize(450, 'T/H', 30); // M27 -> 30mm hole
    await updateBoltHoleSize(450, 'T/J', 33); // M30 -> 33mm hole
    await updateBoltHoleSize(450, 'T/K', 36); // M33 -> 36mm hole

    // ===== 500NB (20") =====
    await updateBoltHoleSize(500, 'T/D', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(500, 'T/E', 24); // M22 -> 24mm hole
    await updateBoltHoleSize(500, 'T/F', 33); // M30 -> 33mm hole
    await updateBoltHoleSize(500, 'T/H', 33); // M30 -> 33mm hole
    await updateBoltHoleSize(500, 'T/J', 36); // M33 -> 36mm hole
    await updateBoltHoleSize(500, 'T/K', 39); // M36 -> 39mm hole

    // ===== 600NB (24") =====
    await updateBoltHoleSize(600, 'T/D', 26); // M24 -> 26mm hole
    await updateBoltHoleSize(600, 'T/E', 30); // M27 -> 30mm hole
    await updateBoltHoleSize(600, 'T/F', 33); // M30 -> 33mm hole
    await updateBoltHoleSize(600, 'T/H', 33); // M30 -> 33mm hole
    await updateBoltHoleSize(600, 'T/J', 39); // M36 -> 39mm hole
    await updateBoltHoleSize(600, 'T/K', 45); // M42 -> 45mm hole

    console.warn('BS10 bolt hole size corrections complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('BS10 bolt hole size correction rollback not implemented');
  }
}
