import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectBs4504FlangeData1773600000000 implements MigrationInterface {
  name = 'CorrectBs4504FlangeData1773600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Correcting BS4504 / EN 1092-1 flange dimension data...');

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );
    if (bs4504Result.length === 0) {
      console.warn('BS 4504 standard not found, skipping...');
      return;
    }
    const bs4504Id = bs4504Result[0].id;

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
        WHERE designation = '${designation}' AND "standardId" = ${bs4504Id}
      `);
      return result[0]?.id;
    };

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(
        `SELECT id FROM flange_types WHERE code = '${code}'`,
      );
      return result[0]?.id;
    };

    const getBoltId = async (designation: string) => {
      if (!designation) return null;
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${designation}'`,
      );
      return result[0]?.id;
    };

    const typeIds = {
      '/1': await getTypeId('/1'),
      '/2': await getTypeId('/2'),
      '/3': await getTypeId('/3'),
      '/8': await getTypeId('/8'),
    };

    const updateFlange = async (
      nb: number,
      typeCode: string,
      pnValue: number,
      D: number,
      b: number,
      holes: number,
      d1: number,
      bolt: string,
      pcd: number,
      mass: number,
    ) => {
      const nominalId = await getNominalId(nb);
      const typeId = typeIds[typeCode as keyof typeof typeIds];
      const pressureClassDesignation = `${pnValue}${typeCode}`;
      const pressureClassId = await getPressureClassId(
        pressureClassDesignation,
      );
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId) {
        return;
      }

      await queryRunner.query(`
        UPDATE flange_dimensions SET
          "D" = ${D}, "b" = ${b}, "num_holes" = ${holes}, "d1" = ${d1},
          "boltId" = ${boltId || 'NULL'}, "pcd" = ${pcd}, "mass_kg" = ${mass}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${bs4504Id}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${typeId}
      `);
    };

    // ===== DN300 CORRECTIONS =====
    // PN6
    await updateFlange(300, '/3', 6, 440, 24, 12, 22, 'M20', 395, 11.0);
    await updateFlange(300, '/2', 6, 440, 28, 12, 22, 'M20', 395, 16.0);
    await updateFlange(300, '/8', 6, 440, 26, 12, 22, 'M20', 395, 22.0);
    // PN10
    await updateFlange(300, '/3', 10, 445, 28, 12, 22, 'M20', 400, 14.0);
    await updateFlange(300, '/2', 10, 445, 34, 12, 22, 'M20', 400, 22.0);
    await updateFlange(300, '/8', 10, 445, 30, 12, 22, 'M20', 400, 28.0);
    // PN16
    await updateFlange(300, '/3', 16, 460, 32, 12, 26, 'M24', 410, 18.0);
    await updateFlange(300, '/2', 16, 460, 40, 12, 26, 'M24', 410, 28.0);
    await updateFlange(300, '/8', 16, 460, 36, 12, 26, 'M24', 410, 36.0);
    // PN25
    await updateFlange(300, '/3', 25, 485, 40, 16, 30, 'M27', 430, 26.0);
    await updateFlange(300, '/2', 25, 485, 52, 16, 30, 'M27', 430, 42.0);
    await updateFlange(300, '/8', 25, 485, 46, 16, 30, 'M27', 430, 52.0);
    // PN40
    await updateFlange(300, '/3', 40, 515, 48, 16, 33, 'M30', 450, 36.0);
    await updateFlange(300, '/2', 40, 515, 62, 16, 33, 'M30', 450, 58.0);
    await updateFlange(300, '/8', 40, 515, 56, 16, 33, 'M30', 450, 72.0);

    // ===== DN350 CORRECTIONS =====
    // PN6
    await updateFlange(350, '/3', 6, 490, 26, 12, 22, 'M20', 445, 14.0);
    await updateFlange(350, '/2', 6, 490, 30, 12, 22, 'M20', 445, 20.0);
    await updateFlange(350, '/8', 6, 490, 28, 12, 22, 'M20', 445, 26.0);
    // PN10
    await updateFlange(350, '/3', 10, 505, 30, 16, 22, 'M20', 460, 18.0);
    await updateFlange(350, '/2', 10, 505, 38, 16, 22, 'M20', 460, 28.0);
    await updateFlange(350, '/8', 10, 505, 34, 16, 22, 'M20', 460, 36.0);
    // PN16
    await updateFlange(350, '/3', 16, 520, 36, 16, 26, 'M24', 470, 24.0);
    await updateFlange(350, '/2', 16, 520, 44, 16, 26, 'M24', 470, 36.0);
    await updateFlange(350, '/8', 16, 520, 40, 16, 26, 'M24', 470, 46.0);
    // PN25
    await updateFlange(350, '/3', 25, 555, 44, 16, 33, 'M30', 490, 36.0);
    await updateFlange(350, '/2', 25, 555, 56, 16, 33, 'M30', 490, 54.0);
    await updateFlange(350, '/8', 25, 555, 50, 16, 33, 'M30', 490, 68.0);
    // PN40
    await updateFlange(350, '/3', 40, 580, 54, 16, 36, 'M33', 510, 48.0);
    await updateFlange(350, '/2', 40, 580, 68, 16, 36, 'M33', 510, 74.0);
    await updateFlange(350, '/8', 40, 580, 62, 16, 36, 'M33', 510, 92.0);

    // ===== DN400 CORRECTIONS =====
    // PN6
    await updateFlange(400, '/3', 6, 540, 28, 16, 22, 'M20', 495, 18.0);
    await updateFlange(400, '/2', 6, 540, 34, 16, 22, 'M20', 495, 26.0);
    await updateFlange(400, '/8', 6, 540, 30, 16, 22, 'M20', 495, 32.0);
    // PN10
    await updateFlange(400, '/3', 10, 565, 32, 16, 26, 'M24', 515, 24.0);
    await updateFlange(400, '/2', 10, 565, 40, 16, 26, 'M24', 515, 36.0);
    await updateFlange(400, '/8', 10, 565, 36, 16, 26, 'M24', 515, 46.0);
    // PN16
    await updateFlange(400, '/3', 16, 580, 38, 16, 30, 'M27', 525, 32.0);
    await updateFlange(400, '/2', 16, 580, 48, 16, 30, 'M27', 525, 48.0);
    await updateFlange(400, '/8', 16, 580, 42, 16, 30, 'M27', 525, 58.0);
    // PN25
    await updateFlange(400, '/3', 25, 620, 48, 16, 36, 'M33', 550, 48.0);
    await updateFlange(400, '/2', 25, 620, 62, 16, 36, 'M33', 550, 72.0);
    await updateFlange(400, '/8', 25, 620, 56, 16, 36, 'M33', 550, 88.0);
    // PN40
    await updateFlange(400, '/3', 40, 660, 60, 16, 39, 'M36', 585, 68.0);
    await updateFlange(400, '/2', 40, 660, 78, 16, 39, 'M36', 585, 105.0);
    await updateFlange(400, '/8', 40, 660, 70, 16, 39, 'M36', 585, 125.0);

    // ===== DN450 CORRECTIONS =====
    // PN6
    await updateFlange(450, '/3', 6, 595, 28, 16, 22, 'M20', 550, 22.0);
    await updateFlange(450, '/2', 6, 595, 34, 16, 22, 'M20', 550, 32.0);
    await updateFlange(450, '/8', 6, 595, 30, 16, 22, 'M20', 550, 38.0);
    // PN10
    await updateFlange(450, '/3', 10, 615, 32, 20, 26, 'M24', 565, 28.0);
    await updateFlange(450, '/2', 10, 615, 42, 20, 26, 'M24', 565, 44.0);
    await updateFlange(450, '/8', 10, 615, 38, 20, 26, 'M24', 565, 54.0);
    // PN16
    await updateFlange(450, '/3', 16, 640, 42, 20, 30, 'M27', 585, 42.0);
    await updateFlange(450, '/2', 16, 640, 54, 20, 30, 'M27', 585, 62.0);
    await updateFlange(450, '/8', 16, 640, 48, 20, 30, 'M27', 585, 76.0);
    // PN25
    await updateFlange(450, '/3', 25, 670, 50, 20, 36, 'M33', 600, 58.0);
    await updateFlange(450, '/2', 25, 670, 66, 20, 36, 'M33', 600, 88.0);
    await updateFlange(450, '/8', 25, 670, 58, 20, 36, 'M33', 600, 105.0);
    // PN40
    await updateFlange(450, '/3', 40, 685, 66, 20, 39, 'M36', 610, 82.0);
    await updateFlange(450, '/2', 40, 685, 84, 20, 39, 'M36', 610, 125.0);
    await updateFlange(450, '/8', 40, 685, 76, 20, 39, 'M36', 610, 150.0);

    // ===== DN500 CORRECTIONS (KEY FIXES) =====
    // PN6 - CORRECTED: D=645, PCD=600, d1=22, bolt=M20
    await updateFlange(500, '/3', 6, 645, 30, 20, 22, 'M20', 600, 28.0);
    await updateFlange(500, '/2', 6, 645, 38, 20, 22, 'M20', 600, 42.0);
    await updateFlange(500, '/8', 6, 645, 34, 20, 22, 'M20', 600, 52.0);
    // PN10 - CORRECTED: D=670, PCD=620, d1=26, bolt=M24 (was showing PN16 values)
    await updateFlange(500, '/3', 10, 670, 34, 20, 26, 'M24', 620, 36.0);
    await updateFlange(500, '/2', 10, 670, 46, 20, 26, 'M24', 620, 56.0);
    await updateFlange(500, '/8', 10, 670, 40, 20, 26, 'M24', 620, 68.0);
    // PN16 - CORRECTED: D=715, PCD=650, d1=33, bolt=M30 (was showing PN25 values)
    await updateFlange(500, '/3', 16, 715, 46, 20, 33, 'M30', 650, 58.0);
    await updateFlange(500, '/2', 16, 715, 60, 20, 33, 'M30', 650, 88.0);
    await updateFlange(500, '/8', 16, 715, 52, 20, 33, 'M30', 650, 105.0);
    // PN25 - CORRECTED: D=730, PCD=660, d1=36, bolt=M33
    await updateFlange(500, '/3', 25, 730, 56, 20, 36, 'M33', 660, 78.0);
    await updateFlange(500, '/2', 25, 730, 74, 20, 36, 'M33', 660, 118.0);
    await updateFlange(500, '/8', 25, 730, 66, 20, 36, 'M33', 660, 140.0);
    // PN40 - CORRECTED: D=755, PCD=670, d1=42, bolt=M39
    await updateFlange(500, '/3', 40, 755, 72, 20, 42, 'M39', 670, 115.0);
    await updateFlange(500, '/2', 40, 755, 92, 20, 42, 'M39', 670, 175.0);
    await updateFlange(500, '/8', 40, 755, 84, 20, 42, 'M39', 670, 210.0);

    // ===== DN600 CORRECTIONS =====
    // PN6
    await updateFlange(600, '/3', 6, 755, 30, 20, 26, 'M24', 705, 40.0);
    await updateFlange(600, '/2', 6, 755, 40, 20, 26, 'M24', 705, 60.0);
    await updateFlange(600, '/8', 6, 755, 36, 20, 26, 'M24', 705, 75.0);
    // PN10
    await updateFlange(600, '/3', 10, 780, 36, 20, 30, 'M27', 725, 52.0);
    await updateFlange(600, '/2', 10, 780, 48, 20, 30, 'M27', 725, 80.0);
    await updateFlange(600, '/8', 10, 780, 42, 20, 30, 'M27', 725, 98.0);
    // PN16
    await updateFlange(600, '/3', 16, 840, 54, 20, 36, 'M33', 770, 92.0);
    await updateFlange(600, '/2', 16, 840, 70, 20, 36, 'M33', 770, 140.0);
    await updateFlange(600, '/8', 16, 840, 62, 20, 36, 'M33', 770, 165.0);
    // PN25
    await updateFlange(600, '/3', 25, 845, 68, 20, 39, 'M36', 770, 125.0);
    await updateFlange(600, '/2', 25, 845, 88, 20, 39, 'M36', 770, 190.0);
    await updateFlange(600, '/8', 25, 845, 78, 20, 39, 'M36', 770, 225.0);
    // PN40
    await updateFlange(600, '/3', 40, 890, 84, 20, 48, 'M45', 795, 175.0);
    await updateFlange(600, '/2', 40, 890, 108, 20, 48, 'M45', 795, 270.0);
    await updateFlange(600, '/8', 40, 890, 98, 20, 48, 'M45', 795, 320.0);

    console.warn('BS4504 / EN 1092-1 flange data corrections complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'BS4504 correction rollback not implemented - data would need manual restoration',
    );
  }
}
