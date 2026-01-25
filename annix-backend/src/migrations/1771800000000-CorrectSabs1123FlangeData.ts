import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectSabs1123FlangeData1771800000000 implements MigrationInterface {
  name = 'CorrectSabs1123FlangeData1771800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Correcting SABS 1123 flange dimension data...');

    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    if (sabs1123Result.length === 0) {
      console.warn('SABS 1123 standard not found, skipping...');
      return;
    }
    const sabs1123Id = sabs1123Result[0].id;

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
        WHERE designation = '${designation}' AND "standardId" = ${sabs1123Id}
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
      pressureClass: number,
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
      const pressureClassDesignation = `${pressureClass}${typeCode}`;
      const pressureClassId = await getPressureClassId(
        pressureClassDesignation,
      );
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId) {
        console.warn(
          `Skipping ${nb}NB ${pressureClass}${typeCode} - missing IDs`,
        );
        return;
      }

      await queryRunner.query(`
        UPDATE flange_dimensions SET
          "D" = ${D}, "b" = ${b}, "num_holes" = ${holes}, "d1" = ${d1},
          "boltId" = ${boltId || 'NULL'}, "pcd" = ${pcd}, "mass_kg" = ${mass}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${sabs1123Id}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${typeId}
      `);
    };

    // CORRECTED SABS 1123 DATA - Cross-referenced from multiple authoritative sources
    // Format: [NB, type, pressureClass, D, b, holes, d1, bolt, pcd, mass]

    // ===== 300NB CORRECTIONS =====
    // T600 (PN6)
    await updateFlange(300, '/3', 600, 440, 18, 12, 22, 'M20', 395, 12.0);
    await updateFlange(300, '/2', 600, 440, 26, 12, 22, 'M20', 395, 18.0);
    await updateFlange(300, '/8', 600, 440, 24, 12, 22, 'M20', 395, 24.0);
    // T1000 (PN10)
    await updateFlange(300, '/3', 1000, 445, 20, 12, 22, 'M20', 400, 18.0);
    await updateFlange(300, '/2', 1000, 445, 32, 12, 22, 'M20', 400, 32.0);
    await updateFlange(300, '/8', 1000, 445, 28, 12, 22, 'M20', 400, 36.0);
    // T1600 (PN16)
    await updateFlange(300, '/3', 1600, 460, 25, 12, 26, 'M24', 410, 28.0);
    await updateFlange(300, '/2', 1600, 460, 40, 12, 26, 'M24', 410, 48.0);
    await updateFlange(300, '/8', 1600, 460, 36, 12, 26, 'M24', 410, 48.0);
    // T2500 (PN25)
    await updateFlange(300, '/3', 2500, 485, 38, 16, 30, 'M27', 430, 45.0);
    await updateFlange(300, '/2', 2500, 485, 56, 16, 30, 'M27', 430, 72.0);
    await updateFlange(300, '/8', 2500, 485, 52, 16, 30, 'M27', 430, 72.0);
    // T4000 (PN40)
    await updateFlange(300, '/3', 4000, 515, 45, 16, 33, 'M30', 450, 62.0);
    await updateFlange(300, '/2', 4000, 515, 70, 16, 33, 'M30', 450, 100.0);
    await updateFlange(300, '/8', 4000, 515, 65, 16, 33, 'M30', 450, 100.0);

    // ===== 350NB CORRECTIONS =====
    // T600 (PN6)
    await updateFlange(350, '/3', 600, 490, 20, 12, 22, 'M20', 445, 15.0);
    await updateFlange(350, '/2', 600, 490, 28, 12, 22, 'M20', 445, 22.0);
    await updateFlange(350, '/8', 600, 490, 26, 12, 22, 'M20', 445, 33.0);
    // T1000 (PN10)
    await updateFlange(350, '/3', 1000, 505, 22, 16, 22, 'M20', 460, 26.0);
    await updateFlange(350, '/2', 1000, 505, 36, 16, 22, 'M20', 460, 45.0);
    await updateFlange(350, '/8', 1000, 505, 32, 16, 22, 'M20', 460, 48.0);
    // T1600 (PN16)
    await updateFlange(350, '/3', 1600, 520, 28, 16, 26, 'M24', 470, 38.0);
    await updateFlange(350, '/2', 1600, 520, 46, 16, 26, 'M24', 470, 65.0);
    await updateFlange(350, '/8', 1600, 520, 42, 16, 26, 'M24', 470, 65.0);
    // T2500 (PN25)
    await updateFlange(350, '/3', 2500, 555, 42, 16, 33, 'M30', 490, 60.0);
    await updateFlange(350, '/2', 2500, 555, 64, 16, 33, 'M30', 490, 95.0);
    await updateFlange(350, '/8', 2500, 555, 58, 16, 33, 'M30', 490, 100.0);

    // ===== 400NB CORRECTIONS =====
    // T600 (PN6)
    await updateFlange(400, '/3', 600, 540, 20, 16, 22, 'M20', 495, 17.0);
    await updateFlange(400, '/2', 600, 540, 30, 16, 22, 'M20', 495, 28.0);
    await updateFlange(400, '/8', 600, 540, 28, 16, 22, 'M20', 495, 43.0);
    // T1000 (PN10)
    await updateFlange(400, '/3', 1000, 565, 25, 16, 26, 'M24', 515, 38.0);
    await updateFlange(400, '/2', 1000, 565, 40, 16, 26, 'M24', 515, 65.0);
    await updateFlange(400, '/8', 1000, 565, 36, 16, 26, 'M24', 515, 62.0);
    // T1600 (PN16)
    await updateFlange(400, '/3', 1600, 580, 32, 16, 26, 'M24', 525, 55.0);
    await updateFlange(400, '/2', 1600, 580, 52, 16, 26, 'M24', 525, 95.0);
    await updateFlange(400, '/8', 1600, 580, 48, 16, 26, 'M24', 525, 85.0);
    // T2500 (PN25)
    await updateFlange(400, '/3', 2500, 620, 48, 16, 36, 'M33', 550, 85.0);
    await updateFlange(400, '/2', 2500, 620, 72, 16, 36, 'M33', 550, 135.0);
    await updateFlange(400, '/8', 2500, 620, 68, 16, 36, 'M33', 550, 135.0);

    // ===== 450NB CORRECTIONS =====
    // T600 (PN6)
    await updateFlange(450, '/3', 600, 595, 22, 16, 22, 'M20', 550, 22.0);
    await updateFlange(450, '/2', 600, 595, 32, 16, 22, 'M20', 550, 35.0);
    await updateFlange(450, '/8', 600, 595, 30, 16, 22, 'M20', 550, 54.0);
    // T1000 (PN10)
    await updateFlange(450, '/3', 1000, 615, 28, 20, 26, 'M24', 565, 50.0);
    await updateFlange(450, '/2', 1000, 615, 44, 20, 26, 'M24', 565, 85.0);
    await updateFlange(450, '/8', 1000, 615, 40, 20, 26, 'M24', 565, 78.0);
    // T1600 (PN16)
    await updateFlange(450, '/3', 1600, 640, 34, 20, 26, 'M24', 585, 72.0);
    await updateFlange(450, '/2', 1600, 640, 56, 20, 26, 'M24', 585, 120.0);
    await updateFlange(450, '/8', 1600, 640, 52, 20, 26, 'M24', 585, 108.0);
    // T2500 (PN25)
    await updateFlange(450, '/3', 2500, 670, 50, 20, 36, 'M33', 600, 110.0);
    await updateFlange(450, '/2', 2500, 670, 78, 20, 36, 'M33', 600, 175.0);
    await updateFlange(450, '/8', 2500, 670, 72, 20, 36, 'M33', 600, 175.0);

    // ===== 500NB CORRECTIONS - VERIFIED AGAINST MULTIPLE SOURCES =====
    // T600 (PN6) - CORRECTED: d1=22, bolt=M20
    await updateFlange(500, '/3', 600, 645, 25, 20, 22, 'M20', 600, 24.0);
    await updateFlange(500, '/2', 600, 645, 36, 20, 22, 'M20', 600, 38.0);
    await updateFlange(500, '/1', 600, 645, 22, 20, 22, 'M20', 600, 20.0);
    await updateFlange(500, '/8', 600, 645, 32, 20, 22, 'M20', 600, 52.0);
    // T1000 (PN10) - CORRECTED: D=670, PCD=620, d1=26, bolt=M24
    await updateFlange(500, '/3', 1000, 670, 32, 20, 26, 'M24', 620, 42.0);
    await updateFlange(500, '/2', 1000, 670, 48, 20, 26, 'M24', 620, 68.0);
    await updateFlange(500, '/1', 1000, 670, 28, 20, 26, 'M24', 620, 36.0);
    await updateFlange(500, '/8', 1000, 670, 42, 20, 26, 'M24', 620, 72.0);
    // T1600 (PN16) - CORRECTED: D=715, PCD=650, d1=33, bolt=M30
    await updateFlange(500, '/3', 1600, 715, 40, 20, 33, 'M30', 650, 72.0);
    await updateFlange(500, '/2', 1600, 715, 60, 20, 33, 'M30', 650, 115.0);
    await updateFlange(500, '/1', 1600, 715, 36, 20, 33, 'M30', 650, 62.0);
    await updateFlange(500, '/8', 1600, 715, 54, 20, 33, 'M30', 650, 100.0);
    // T2500 (PN25) - CORRECTED: D=730, PCD=660, d1=36, bolt=M33
    await updateFlange(500, '/3', 2500, 730, 55, 20, 36, 'M33', 660, 105.0);
    await updateFlange(500, '/2', 2500, 730, 82, 20, 36, 'M33', 660, 165.0);
    await updateFlange(500, '/1', 2500, 730, 50, 20, 36, 'M33', 660, 90.0);
    await updateFlange(500, '/8', 2500, 730, 72, 20, 36, 'M33', 660, 145.0);
    // T4000 (PN40) - ADD NEW: D=755, PCD=670, d1=42, bolt=M39
    await updateFlange(500, '/3', 4000, 755, 70, 20, 42, 'M39', 670, 145.0);
    await updateFlange(500, '/2', 4000, 755, 98, 20, 42, 'M39', 670, 210.0);
    await updateFlange(500, '/1', 4000, 755, 64, 20, 42, 'M39', 670, 125.0);
    await updateFlange(500, '/8', 4000, 755, 88, 20, 42, 'M39', 670, 195.0);

    // ===== 600NB CORRECTIONS =====
    // T600 (PN6)
    await updateFlange(600, '/3', 600, 755, 24, 20, 26, 'M24', 705, 32.0);
    await updateFlange(600, '/2', 600, 755, 38, 20, 26, 'M24', 705, 52.0);
    await updateFlange(600, '/8', 600, 755, 34, 20, 26, 'M24', 705, 85.0);
    // T1000 (PN10)
    await updateFlange(600, '/3', 1000, 780, 36, 20, 30, 'M27', 725, 75.0);
    await updateFlange(600, '/2', 1000, 780, 56, 20, 30, 'M27', 725, 125.0);
    await updateFlange(600, '/8', 1000, 780, 50, 20, 30, 'M27', 725, 135.0);
    // T1600 (PN16)
    await updateFlange(600, '/3', 1600, 840, 48, 20, 33, 'M30', 770, 120.0);
    await updateFlange(600, '/2', 1600, 840, 72, 20, 33, 'M30', 770, 195.0);
    await updateFlange(600, '/8', 1600, 840, 66, 20, 33, 'M30', 770, 195.0);

    // Ensure T4000 pressure classes exist for 500NB
    const t4000Types = ['/1', '/2', '/3', '/8'];
    for (const typeCode of t4000Types) {
      const designation = `4000${typeCode}`;
      const existing = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${designation}' AND "standardId" = ${sabs1123Id}
      `);
      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${designation}', ${sabs1123Id})
        `);
      }
    }

    // Insert T4000 records for 500NB if they don't exist
    const nb500Id = await getNominalId(500);
    for (const typeCode of ['/1', '/2', '/3', '/8']) {
      const typeId = typeIds[typeCode as keyof typeof typeIds];
      const pressureClassId = await getPressureClassId(`4000${typeCode}`);
      const boltId = await getBoltId('M39');

      if (nb500Id && typeId && pressureClassId) {
        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nb500Id}
            AND "standardId" = ${sabs1123Id}
            AND "pressureClassId" = ${pressureClassId}
            AND "flangeTypeId" = ${typeId}
        `);

        if (existing.length === 0) {
          const data = {
            '/1': { b: 64, mass: 125.0 },
            '/2': { b: 98, mass: 210.0 },
            '/3': { b: 70, mass: 145.0 },
            '/8': { b: 88, mass: 195.0 },
          };
          const { b, mass } = data[typeCode as keyof typeof data];

          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg"
            ) VALUES (
              ${nb500Id}, ${sabs1123Id}, ${pressureClassId}, ${typeId},
              755, ${b}, 525, 4, 20, 42, ${boltId || 'NULL'}, 670, ${mass}
            )
          `);
        }
      }
    }

    console.warn('SABS 1123 flange data corrections complete');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Reverting SABS 1123 corrections is not supported - data was incorrect before',
    );
  }
}
