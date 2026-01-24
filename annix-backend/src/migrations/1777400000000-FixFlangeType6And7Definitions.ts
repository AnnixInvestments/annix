import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixFlangeType6And7Definitions1777400000000 implements MigrationInterface {
  name = 'FixFlangeType6And7Definitions1777400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Fixing flange type /6 and /7 definitions and adding dimension data...');

    await queryRunner.query(`
      UPDATE flange_types
      SET name = 'Blank (Full Face)',
          abbreviation = 'BL-FF',
          description = 'Full Face Blank flange (solid) - same as blind but with flat face'
      WHERE code = '/6'
    `);

    await queryRunner.query(`
      UPDATE flange_types
      SET name = 'Spectacle Blank',
          abbreviation = 'SB',
          description = 'Blank disc for Spectacle Blind assemblies (figure-8 blanking device)'
      WHERE code = '/7'
    `);

    console.warn('Updated /6 to Blank (Full Face) and /7 to Spectacle Blank');

    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`
    );
    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`
    );

    const sabs1123Id = sabs1123Result[0]?.id;
    const bs4504Id = bs4504Result[0]?.id;

    const type6Result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/6'`);
    const type7Result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/7'`);
    const type8Result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/8'`);

    const type6Id = type6Result[0]?.id;
    const type7Id = type7Result[0]?.id;
    const type8Id = type8Result[0]?.id;

    if (!type6Id || !type7Id || !type8Id) {
      console.warn('Flange types /6, /7, or /8 not found, skipping dimension data...');
      return;
    }

    const getNominalId = async (nominalMm: number) => {
      const result = await queryRunner.query(`
        SELECT id FROM nominal_outside_diameters
        WHERE nominal_diameter_mm = ${nominalMm}
        LIMIT 1
      `);
      return result[0]?.id;
    };

    const getBoltId = async (designation: string) => {
      if (!designation) return null;
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${designation}'`
      );
      return result[0]?.id;
    };

    if (sabs1123Id) {
      console.warn('Adding SABS 1123 /6 (Blank Full Face) dimension data...');

      const existingBlindData = await queryRunner.query(`
        SELECT fd.*, fpc.designation as pressureDesignation
        FROM flange_dimensions fd
        JOIN flange_pressure_classes fpc ON fd."pressureClassId" = fpc.id
        WHERE fpc."standardId" = ${sabs1123Id}
        AND fd."flangeTypeId" = ${type8Id}
      `);

      for (const blind of existingBlindData) {
        if (!blind.pressureDesignation) continue;
        const pressureBase = blind.pressureDesignation.replace('/8', '');
        const type6Designation = `${pressureBase}/6`;

        const existingType6Class = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation = '${type6Designation}' AND "standardId" = ${sabs1123Id}
        `);

        let type6ClassId;
        if (existingType6Class.length === 0) {
          const insertResult = await queryRunner.query(`
            INSERT INTO flange_pressure_classes (designation, "standardId")
            VALUES ('${type6Designation}', ${sabs1123Id})
            RETURNING id
          `);
          type6ClassId = insertResult[0].id;
        } else {
          type6ClassId = existingType6Class[0].id;
        }

        const existingDim = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${blind.nominalOutsideDiameterId}
          AND "pressureClassId" = ${type6ClassId}
          AND "flangeTypeId" = ${type6Id}
        `);

        if (existingDim.length === 0) {
          const boltId = blind.boltId || null;
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${blind.nominalOutsideDiameterId}, ${sabs1123Id}, ${type6ClassId}, ${type6Id},
              ${blind.D}, ${blind.b}, 0, 0, ${blind.num_holes}, ${blind.d1},
              ${boltId ? boltId : 'NULL'}, ${blind.bolt_length_mm || 'NULL'},
              ${blind.pcd}, ${blind.mass_kg}
            )
          `);
        }
      }

      console.warn('Adding SABS 1123 /7 (Spectacle Blank) dimension data...');

      const spectacleBlankData: Array<[number, number, number, number, number, number, string, number, number, number, number]> = [
        [15, 1000, 95, 10, 4, 14, 'M12', 65, 0.9, 140, 15],
        [20, 1000, 105, 10, 4, 14, 'M12', 75, 1.2, 155, 18],
        [25, 1000, 115, 12, 4, 14, 'M12', 85, 1.5, 170, 20],
        [32, 1000, 140, 14, 4, 18, 'M16', 100, 2.4, 205, 25],
        [40, 1000, 150, 14, 4, 18, 'M16', 110, 2.9, 220, 28],
        [50, 1000, 165, 16, 4, 18, 'M16', 125, 3.8, 240, 32],
        [65, 1000, 185, 16, 8, 18, 'M16', 145, 5.0, 270, 38],
        [80, 1000, 200, 18, 8, 18, 'M16', 160, 6.5, 290, 42],
        [100, 1000, 220, 18, 8, 18, 'M16', 180, 8.5, 320, 50],
        [125, 1000, 250, 20, 8, 18, 'M16', 210, 12.0, 360, 58],
        [150, 1000, 285, 22, 8, 22, 'M20', 240, 16.0, 405, 68],
        [200, 1000, 340, 24, 12, 22, 'M20', 295, 25.0, 480, 82],
        [250, 1000, 395, 26, 12, 22, 'M20', 350, 38.0, 555, 98],
        [300, 1000, 445, 28, 12, 22, 'M20', 400, 52.0, 625, 112],

        [15, 1600, 95, 14, 4, 14, 'M12', 65, 1.2, 140, 15],
        [20, 1600, 105, 14, 4, 14, 'M12', 75, 1.6, 155, 18],
        [25, 1600, 115, 16, 4, 14, 'M12', 85, 2.0, 170, 20],
        [32, 1600, 140, 18, 4, 18, 'M16', 100, 3.2, 205, 25],
        [40, 1600, 150, 18, 4, 18, 'M16', 110, 3.8, 220, 28],
        [50, 1600, 165, 20, 4, 18, 'M16', 125, 5.0, 240, 32],
        [65, 1600, 185, 20, 8, 18, 'M16', 145, 6.5, 270, 38],
        [80, 1600, 200, 22, 8, 18, 'M16', 160, 8.5, 290, 42],
        [100, 1600, 235, 24, 8, 22, 'M20', 190, 12.0, 345, 55],
        [125, 1600, 270, 26, 8, 22, 'M20', 220, 17.0, 390, 65],
        [150, 1600, 300, 28, 8, 22, 'M20', 250, 23.0, 430, 75],
        [200, 1600, 360, 32, 12, 26, 'M24', 310, 38.0, 510, 92],
        [250, 1600, 425, 36, 12, 26, 'M24', 370, 58.0, 595, 110],
        [300, 1600, 485, 40, 16, 26, 'M24', 430, 82.0, 675, 128],

        [15, 2500, 95, 16, 4, 14, 'M12', 65, 1.4, 140, 15],
        [20, 2500, 105, 18, 4, 14, 'M12', 75, 1.9, 155, 18],
        [25, 2500, 115, 18, 4, 14, 'M12', 85, 2.3, 170, 20],
        [32, 2500, 140, 20, 4, 18, 'M16', 100, 3.8, 205, 25],
        [40, 2500, 150, 20, 4, 18, 'M16', 110, 4.5, 220, 28],
        [50, 2500, 165, 22, 4, 18, 'M16', 125, 5.8, 240, 32],
        [65, 2500, 185, 24, 8, 18, 'M16', 145, 7.8, 270, 38],
        [80, 2500, 200, 26, 8, 18, 'M16', 160, 10.0, 290, 42],
        [100, 2500, 235, 28, 8, 22, 'M20', 190, 14.5, 345, 55],
        [125, 2500, 270, 30, 8, 22, 'M20', 220, 20.5, 390, 65],
        [150, 2500, 300, 32, 8, 22, 'M20', 250, 28.0, 430, 75],
        [200, 2500, 375, 38, 12, 30, 'M27', 320, 50.0, 535, 98],
        [250, 2500, 450, 44, 12, 33, 'M30', 385, 78.0, 630, 118],
        [300, 2500, 515, 48, 16, 33, 'M30', 450, 110.0, 715, 138],
      ];

      for (const [nb, pressure, D, b, holes, d1, bolt, pcd, mass, centerDist, webWidth] of spectacleBlankData) {
        const nominalId = await getNominalId(nb);
        if (!nominalId) continue;

        const type7Designation = `${pressure}/7`;
        let type7ClassResult = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation = '${type7Designation}' AND "standardId" = ${sabs1123Id}
        `);

        let type7ClassId;
        if (type7ClassResult.length === 0) {
          const insertResult = await queryRunner.query(`
            INSERT INTO flange_pressure_classes (designation, "standardId")
            VALUES ('${type7Designation}', ${sabs1123Id})
            RETURNING id
          `);
          type7ClassId = insertResult[0].id;
        } else {
          type7ClassId = type7ClassResult[0].id;
        }

        const boltId = await getBoltId(bolt);

        const existingDim = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${type7ClassId}
          AND "flangeTypeId" = ${type7Id}
        `);

        if (existingDim.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${sabs1123Id}, ${type7ClassId}, ${type7Id},
              ${D}, ${b}, 0, ${webWidth}, ${holes}, ${d1},
              ${boltId ? boltId : 'NULL'}, ${pcd}, ${mass}
            )
          `);
        }
      }
    }

    if (bs4504Id) {
      console.warn('Adding BS 4504 /6 (Blank Full Face) dimension data...');

      const existingBlindData = await queryRunner.query(`
        SELECT fd.*, fpc.designation as pressureDesignation
        FROM flange_dimensions fd
        JOIN flange_pressure_classes fpc ON fd."pressureClassId" = fpc.id
        WHERE fpc."standardId" = ${bs4504Id}
        AND fd."flangeTypeId" = ${type8Id}
      `);

      for (const blind of existingBlindData) {
        if (!blind.pressureDesignation) continue;
        const baseDesignation = blind.pressureDesignation.replace(/\/\d+$/, '');
        const type6Designation = `${baseDesignation}/6`;

        let type6ClassResult = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation = '${type6Designation}' AND "standardId" = ${bs4504Id}
        `);

        let type6ClassId;
        if (type6ClassResult.length === 0) {
          const insertResult = await queryRunner.query(`
            INSERT INTO flange_pressure_classes (designation, "standardId")
            VALUES ('${type6Designation}', ${bs4504Id})
            RETURNING id
          `);
          type6ClassId = insertResult[0].id;
        } else {
          type6ClassId = type6ClassResult[0].id;
        }

        const existingDim = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${blind.nominalOutsideDiameterId}
          AND "pressureClassId" = ${type6ClassId}
          AND "flangeTypeId" = ${type6Id}
        `);

        if (existingDim.length === 0) {
          const boltId = blind.boltId || null;
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${blind.nominalOutsideDiameterId}, ${bs4504Id}, ${type6ClassId}, ${type6Id},
              ${blind.D}, ${blind.b}, 0, 0, ${blind.num_holes}, ${blind.d1},
              ${boltId ? boltId : 'NULL'}, ${blind.bolt_length_mm || 'NULL'},
              ${blind.pcd}, ${blind.mass_kg}
            )
          `);
        }
      }

      console.warn('Adding BS 4504 /7 (Spectacle Blank) dimension data...');

      const bs4504SpectacleData: Array<[number, string, number, number, number, number, string, number, number]> = [
        [15, 'PN16', 95, 14, 4, 14, 'M12', 65, 1.0],
        [20, 'PN16', 105, 14, 4, 14, 'M12', 75, 1.4],
        [25, 'PN16', 115, 14, 4, 14, 'M12', 85, 1.7],
        [32, 'PN16', 140, 16, 4, 18, 'M16', 100, 2.8],
        [40, 'PN16', 150, 16, 4, 18, 'M16', 110, 3.3],
        [50, 'PN16', 165, 18, 4, 18, 'M16', 125, 4.5],
        [65, 'PN16', 185, 18, 4, 18, 'M16', 145, 5.8],
        [80, 'PN16', 200, 20, 8, 18, 'M16', 160, 7.5],
        [100, 'PN16', 220, 20, 8, 18, 'M16', 180, 9.5],
        [125, 'PN16', 250, 22, 8, 18, 'M16', 210, 13.5],
        [150, 'PN16', 285, 22, 8, 22, 'M20', 240, 18.0],
        [200, 'PN16', 340, 24, 8, 22, 'M20', 295, 28.0],
        [250, 'PN16', 395, 26, 12, 22, 'M20', 350, 42.0],
        [300, 'PN16', 445, 26, 12, 22, 'M20', 400, 56.0],

        [15, 'PN25', 95, 16, 4, 14, 'M12', 65, 1.2],
        [20, 'PN25', 105, 16, 4, 14, 'M12', 75, 1.6],
        [25, 'PN25', 115, 16, 4, 14, 'M12', 85, 2.0],
        [32, 'PN25', 140, 18, 4, 18, 'M16', 100, 3.2],
        [40, 'PN25', 150, 18, 4, 18, 'M16', 110, 3.8],
        [50, 'PN25', 165, 20, 4, 18, 'M16', 125, 5.2],
        [65, 'PN25', 185, 22, 8, 18, 'M16', 145, 7.0],
        [80, 'PN25', 200, 24, 8, 18, 'M16', 160, 9.0],
        [100, 'PN25', 235, 24, 8, 22, 'M20', 190, 12.5],
        [125, 'PN25', 270, 26, 8, 22, 'M20', 220, 17.5],
        [150, 'PN25', 300, 28, 8, 22, 'M20', 250, 24.0],
        [200, 'PN25', 360, 30, 12, 22, 'M20', 310, 38.0],
        [250, 'PN25', 425, 32, 12, 26, 'M24', 370, 58.0],
        [300, 'PN25', 485, 34, 12, 26, 'M24', 430, 80.0],

        [15, 'PN40', 95, 18, 4, 14, 'M12', 65, 1.4],
        [20, 'PN40', 105, 18, 4, 14, 'M12', 75, 1.8],
        [25, 'PN40', 115, 18, 4, 14, 'M12', 85, 2.2],
        [32, 'PN40', 140, 20, 4, 18, 'M16', 100, 3.6],
        [40, 'PN40', 150, 20, 4, 18, 'M16', 110, 4.2],
        [50, 'PN40', 165, 22, 4, 18, 'M16', 125, 5.8],
        [65, 'PN40', 185, 24, 8, 18, 'M16', 145, 7.8],
        [80, 'PN40', 200, 26, 8, 18, 'M16', 160, 10.0],
        [100, 'PN40', 235, 28, 8, 22, 'M20', 190, 14.5],
        [125, 'PN40', 270, 30, 8, 22, 'M20', 220, 20.0],
        [150, 'PN40', 300, 32, 8, 22, 'M20', 250, 28.0],
        [200, 'PN40', 375, 38, 12, 26, 'M24', 320, 48.0],
        [250, 'PN40', 450, 42, 12, 30, 'M27', 385, 75.0],
        [300, 'PN40', 515, 46, 16, 30, 'M27', 450, 105.0],
      ];

      for (const [nb, pnClass, D, b, holes, d1, bolt, pcd, mass] of bs4504SpectacleData) {
        const nominalId = await getNominalId(nb);
        if (!nominalId) continue;

        const type7Designation = `${pnClass}/7`;
        let type7ClassResult = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation = '${type7Designation}' AND "standardId" = ${bs4504Id}
        `);

        let type7ClassId;
        if (type7ClassResult.length === 0) {
          const insertResult = await queryRunner.query(`
            INSERT INTO flange_pressure_classes (designation, "standardId")
            VALUES ('${type7Designation}', ${bs4504Id})
            RETURNING id
          `);
          type7ClassId = insertResult[0].id;
        } else {
          type7ClassId = type7ClassResult[0].id;
        }

        const boltId = await getBoltId(bolt);

        const existingDim = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${type7ClassId}
          AND "flangeTypeId" = ${type7Id}
        `);

        if (existingDim.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${type7ClassId}, ${type7Id},
              ${D}, ${b}, 0, 0, ${holes}, ${d1},
              ${boltId ? boltId : 'NULL'}, ${pcd}, ${mass}
            )
          `);
        }
      }
    }

    console.warn('Flange type /6 and /7 definitions and dimension data completed.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE flange_types
      SET name = 'Socket Weld',
          abbreviation = 'SW',
          description = 'Socket weld flange for small bore piping'
      WHERE code = '/6'
    `);

    await queryRunner.query(`
      UPDATE flange_types
      SET name = 'Hubbed Slip-On',
          abbreviation = 'HSO',
          description = 'Hubbed slip-on flange with reinforced hub'
      WHERE code = '/7'
    `);

    const type6Result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/6'`);
    const type7Result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/7'`);

    if (type6Result.length > 0) {
      await queryRunner.query(`
        DELETE FROM flange_dimensions WHERE "flangeTypeId" = ${type6Result[0].id}
      `);
    }

    if (type7Result.length > 0) {
      await queryRunner.query(`
        DELETE FROM flange_dimensions WHERE "flangeTypeId" = ${type7Result[0].id}
      `);
    }
  }
}
