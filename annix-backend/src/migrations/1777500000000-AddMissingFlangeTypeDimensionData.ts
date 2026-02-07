import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingFlangeTypeDimensionData1777500000000 implements MigrationInterface {
  name = "AddMissingFlangeTypeDimensionData1777500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding missing flange type dimension data...");

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );
    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    const asmeB165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );

    const bs4504Id = bs4504Result[0]?.id;
    const sabs1123Id = sabs1123Result[0]?.id;
    const asmeB165Id = asmeB165Result[0]?.id;

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '${code}'`);
      return result[0]?.id;
    };

    const type4Id = await getTypeId("/4");
    const type5Id = await getTypeId("/5");

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
        `SELECT id FROM bolts WHERE designation = '${designation}'`,
      );
      return result[0]?.id;
    };

    if (bs4504Id && type4Id) {
      console.warn("Adding BS 4504 /4 (Threaded) dimension data for PN16...");

      const threadedPN16Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 16, 65, 4, 14, "M12", 0.72, 40],
        [20, 105, 18, 75, 4, 14, "M12", 1.04, 45],
        [25, 115, 18, 85, 4, 14, "M12", 1.25, 45],
        [32, 140, 18, 100, 4, 18, "M16", 1.81, 50],
        [40, 150, 18, 110, 4, 18, "M16", 2.06, 50],
        [50, 165, 18, 125, 4, 18, "M16", 2.39, 55],
        [65, 185, 18, 145, 4, 18, "M16", 2.97, 55],
        [80, 200, 20, 160, 8, 18, "M16", 3.78, 55],
        [100, 220, 20, 180, 8, 18, "M16", 4.38, 60],
        [125, 250, 22, 210, 8, 18, "M16", 6.07, 65],
        [150, 285, 22, 240, 8, 22, "M20", 7.24, 65],
      ];

      const pn16Designation = "16/4";
      let pn16ClassId: number;

      const existingPN16Class = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${pn16Designation}' AND "standardId" = ${bs4504Id}
      `);

      if (existingPN16Class.length === 0) {
        const insertResult = await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${pn16Designation}', ${bs4504Id})
          RETURNING id
        `);
        pn16ClassId = insertResult[0].id;
      } else {
        pn16ClassId = existingPN16Class[0].id;
      }

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of threadedPN16Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) {
          console.warn(`Nominal diameter ${nb} not found, skipping...`);
          continue;
        }

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${pn16ClassId}
          AND "flangeTypeId" = ${type4Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${pn16ClassId}, ${type4Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("Adding BS 4504 /4 (Threaded) dimension data for PN10...");

      const threadedPN10Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 14, 65, 4, 14, "M12", 0.52, 35],
        [20, 105, 16, 75, 4, 14, "M12", 0.78, 40],
        [25, 115, 16, 85, 4, 14, "M12", 0.95, 40],
        [32, 140, 16, 100, 4, 18, "M16", 1.45, 45],
        [40, 150, 16, 110, 4, 18, "M16", 1.65, 45],
        [50, 165, 16, 125, 4, 18, "M16", 1.95, 50],
        [65, 185, 16, 145, 4, 18, "M16", 2.45, 50],
        [80, 200, 18, 160, 8, 18, "M16", 3.2, 50],
        [100, 220, 18, 180, 8, 18, "M16", 3.8, 55],
      ];

      const pn10Designation = "10/4";
      let pn10ClassId: number;

      const existingPN10Class = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${pn10Designation}' AND "standardId" = ${bs4504Id}
      `);

      if (existingPN10Class.length === 0) {
        const insertResult = await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${pn10Designation}', ${bs4504Id})
          RETURNING id
        `);
        pn10ClassId = insertResult[0].id;
      } else {
        pn10ClassId = existingPN10Class[0].id;
      }

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of threadedPN10Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${pn10ClassId}
          AND "flangeTypeId" = ${type4Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${pn10ClassId}, ${type4Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("Adding BS 4504 /4 (Threaded) dimension data for PN25...");

      const threadedPN25Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 16, 65, 4, 14, "M12", 0.85, 45],
        [20, 105, 18, 75, 4, 14, "M12", 1.15, 50],
        [25, 115, 18, 85, 4, 14, "M12", 1.4, 50],
        [32, 140, 20, 100, 4, 18, "M16", 2.1, 55],
        [40, 150, 20, 110, 4, 18, "M16", 2.4, 55],
        [50, 165, 22, 125, 4, 18, "M16", 3.0, 60],
        [65, 185, 22, 145, 8, 18, "M16", 3.8, 60],
        [80, 200, 24, 160, 8, 18, "M16", 4.8, 65],
        [100, 235, 24, 190, 8, 22, "M20", 6.2, 70],
      ];

      const pn25Designation = "25/4";
      let pn25ClassId: number;

      const existingPN25Class = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${pn25Designation}' AND "standardId" = ${bs4504Id}
      `);

      if (existingPN25Class.length === 0) {
        const insertResult = await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${pn25Designation}', ${bs4504Id})
          RETURNING id
        `);
        pn25ClassId = insertResult[0].id;
      } else {
        pn25ClassId = existingPN25Class[0].id;
      }

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of threadedPN25Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${pn25ClassId}
          AND "flangeTypeId" = ${type4Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${pn25ClassId}, ${type4Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("Adding BS 4504 /4 (Threaded) dimension data for PN40...");

      const threadedPN40Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 16, 65, 4, 14, "M12", 0.95, 50],
        [20, 105, 18, 75, 4, 14, "M12", 1.3, 55],
        [25, 115, 20, 85, 4, 14, "M12", 1.6, 55],
        [32, 140, 22, 100, 4, 18, "M16", 2.4, 60],
        [40, 150, 22, 110, 4, 18, "M16", 2.8, 60],
        [50, 165, 24, 125, 4, 18, "M16", 3.5, 65],
        [65, 185, 26, 145, 8, 18, "M16", 4.5, 70],
        [80, 200, 28, 160, 8, 18, "M16", 5.8, 75],
        [100, 235, 30, 190, 8, 22, "M20", 7.8, 80],
      ];

      const pn40Designation = "40/4";
      let pn40ClassId: number;

      const existingPN40Class = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${pn40Designation}' AND "standardId" = ${bs4504Id}
      `);

      if (existingPN40Class.length === 0) {
        const insertResult = await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${pn40Designation}', ${bs4504Id})
          RETURNING id
        `);
        pn40ClassId = insertResult[0].id;
      } else {
        pn40ClassId = existingPN40Class[0].id;
      }

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of threadedPN40Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${pn40ClassId}
          AND "flangeTypeId" = ${type4Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${pn40ClassId}, ${type4Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("BS 4504 /4 (Threaded) dimension data added for PN10, PN16, PN25, PN40.");
    }

    if (bs4504Id && type5Id) {
      console.warn("Adding BS 4504 /5 (Slip-On Boss) dimension data...");

      const slipOnBossPN16Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 14, 65, 4, 14, "M12", 0.55, 40],
        [20, 105, 16, 75, 4, 14, "M12", 0.8, 45],
        [25, 115, 16, 85, 4, 14, "M12", 1.0, 45],
        [32, 140, 18, 100, 4, 18, "M16", 1.55, 50],
        [40, 150, 18, 110, 4, 18, "M16", 1.8, 50],
        [50, 165, 18, 125, 4, 18, "M16", 2.15, 55],
        [65, 185, 18, 145, 4, 18, "M16", 2.7, 55],
        [80, 200, 20, 160, 8, 18, "M16", 3.5, 55],
        [100, 220, 20, 180, 8, 18, "M16", 4.15, 60],
        [125, 250, 22, 210, 8, 18, "M16", 5.8, 65],
        [150, 285, 22, 240, 8, 22, "M20", 7.0, 65],
        [200, 340, 24, 295, 8, 22, "M20", 11.0, 70],
        [250, 395, 26, 350, 12, 22, "M20", 16.5, 75],
        [300, 445, 26, 400, 12, 22, "M20", 22.0, 80],
      ];

      const pn16Designation5 = "16/5";
      let pn16Class5Id: number;

      const existingPN16Class5 = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${pn16Designation5}' AND "standardId" = ${bs4504Id}
      `);

      if (existingPN16Class5.length === 0) {
        const insertResult = await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${pn16Designation5}', ${bs4504Id})
          RETURNING id
        `);
        pn16Class5Id = insertResult[0].id;
      } else {
        pn16Class5Id = existingPN16Class5[0].id;
      }

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of slipOnBossPN16Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${pn16Class5Id}
          AND "flangeTypeId" = ${type5Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${pn16Class5Id}, ${type5Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("Adding BS 4504 /5 (Slip-On Boss) PN10 and PN25 data...");

      const slipOnBossPN10Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 12, 65, 4, 14, "M12", 0.42, 35],
        [20, 105, 14, 75, 4, 14, "M12", 0.6, 40],
        [25, 115, 14, 85, 4, 14, "M12", 0.75, 40],
        [32, 140, 14, 100, 4, 18, "M16", 1.2, 45],
        [40, 150, 14, 110, 4, 18, "M16", 1.4, 45],
        [50, 165, 14, 125, 4, 18, "M16", 1.7, 50],
        [65, 185, 14, 145, 4, 18, "M16", 2.15, 50],
        [80, 200, 16, 160, 8, 18, "M16", 2.8, 50],
        [100, 220, 16, 180, 8, 18, "M16", 3.4, 55],
        [125, 250, 18, 210, 8, 18, "M16", 4.8, 60],
        [150, 285, 18, 240, 8, 22, "M20", 5.8, 60],
        [200, 340, 20, 295, 8, 22, "M20", 9.0, 65],
        [250, 395, 22, 350, 12, 22, "M20", 13.5, 70],
        [300, 445, 22, 400, 12, 22, "M20", 18.0, 75],
      ];

      const pn10Designation5 = "10/5";
      let pn10Class5Id: number;

      const existingPN10Class5 = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${pn10Designation5}' AND "standardId" = ${bs4504Id}
      `);

      if (existingPN10Class5.length === 0) {
        const insertResult = await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${pn10Designation5}', ${bs4504Id})
          RETURNING id
        `);
        pn10Class5Id = insertResult[0].id;
      } else {
        pn10Class5Id = existingPN10Class5[0].id;
      }

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of slipOnBossPN10Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${pn10Class5Id}
          AND "flangeTypeId" = ${type5Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${pn10Class5Id}, ${type5Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const slipOnBossPN25Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 16, 65, 4, 14, "M12", 0.68, 45],
        [20, 105, 18, 75, 4, 14, "M12", 0.95, 50],
        [25, 115, 18, 85, 4, 14, "M12", 1.18, 50],
        [32, 140, 20, 100, 4, 18, "M16", 1.85, 55],
        [40, 150, 20, 110, 4, 18, "M16", 2.15, 55],
        [50, 165, 22, 125, 4, 18, "M16", 2.7, 60],
        [65, 185, 22, 145, 8, 18, "M16", 3.4, 60],
        [80, 200, 24, 160, 8, 18, "M16", 4.4, 65],
        [100, 235, 24, 190, 8, 22, "M20", 5.8, 70],
        [125, 270, 26, 220, 8, 22, "M20", 8.5, 75],
        [150, 300, 28, 250, 8, 22, "M20", 11.5, 80],
        [200, 360, 30, 310, 12, 22, "M20", 18.0, 85],
        [250, 425, 32, 370, 12, 26, "M24", 27.0, 95],
        [300, 485, 34, 430, 16, 26, "M24", 37.0, 100],
      ];

      const pn25Designation5 = "25/5";
      let pn25Class5Id: number;

      const existingPN25Class5 = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${pn25Designation5}' AND "standardId" = ${bs4504Id}
      `);

      if (existingPN25Class5.length === 0) {
        const insertResult = await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${pn25Designation5}', ${bs4504Id})
          RETURNING id
        `);
        pn25Class5Id = insertResult[0].id;
      } else {
        pn25Class5Id = existingPN25Class5[0].id;
      }

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of slipOnBossPN25Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${pn25Class5Id}
          AND "flangeTypeId" = ${type5Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${pn25Class5Id}, ${type5Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("Adding BS 4504 /5 (Slip-On Boss) PN40 data...");

      const slipOnBossPN40Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 18, 65, 4, 14, "M12", 0.78, 50],
        [20, 105, 20, 75, 4, 14, "M12", 1.1, 55],
        [25, 115, 20, 85, 4, 14, "M12", 1.35, 55],
        [32, 140, 22, 100, 4, 18, "M16", 2.1, 60],
        [40, 150, 22, 110, 4, 18, "M16", 2.45, 60],
        [50, 165, 24, 125, 4, 18, "M16", 3.1, 65],
        [65, 185, 26, 145, 8, 18, "M16", 4.0, 70],
        [80, 200, 28, 160, 8, 18, "M16", 5.2, 75],
        [100, 235, 30, 190, 8, 22, "M20", 7.2, 80],
        [125, 270, 32, 220, 8, 22, "M20", 10.0, 85],
        [150, 300, 34, 250, 8, 22, "M20", 14.0, 90],
        [200, 375, 38, 320, 12, 26, "M24", 22.0, 100],
        [250, 450, 42, 385, 12, 30, "M27", 34.0, 115],
        [300, 515, 46, 450, 16, 30, "M27", 48.0, 125],
      ];

      const pn40Designation5 = "40/5";
      let pn40Class5Id: number;

      const existingPN40Class5 = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${pn40Designation5}' AND "standardId" = ${bs4504Id}
      `);

      if (existingPN40Class5.length === 0) {
        const insertResult = await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${pn40Designation5}', ${bs4504Id})
          RETURNING id
        `);
        pn40Class5Id = insertResult[0].id;
      } else {
        pn40Class5Id = existingPN40Class5[0].id;
      }

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of slipOnBossPN40Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${pn40Class5Id}
          AND "flangeTypeId" = ${type5Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${bs4504Id}, ${pn40Class5Id}, ${type5Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("BS 4504 /5 (Slip-On Boss) dimension data added for PN10, PN16, PN25, PN40.");
    }

    if (asmeB165Id && type5Id) {
      console.warn("Adding ASME B16.5 Socket Weld flange dimension data...");

      const swClass150Data: Array<
        [number, number, number, number, number, number, number, string, number, number]
      > = [
        [15, 89, 11, 60, 4, 16, 22, '1/2"', 0.45, 50],
        [20, 98, 13, 70, 4, 16, 28, '1/2"', 0.91, 55],
        [25, 108, 14, 79, 4, 16, 35, '1/2"', 0.91, 55],
        [32, 117, 16, 89, 4, 16, 43, '1/2"', 1.36, 60],
        [40, 127, 18, 98, 4, 16, 49, '1/2"', 1.36, 65],
        [50, 152, 19, 121, 4, 19, 62, '5/8"', 2.27, 75],
        [65, 178, 21, 140, 4, 19, 75, '5/8"', 3.18, 80],
        [80, 190, 24, 152, 4, 19, 91, '5/8"', 3.63, 85],
        [100, 229, 24, 190, 8, 19, 116, '5/8"', 5.9, 90],
      ];

      for (const [nb, D, b, pcd, holes, d1, d4, bolt, mass, boltLength] of swClass150Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class150Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '150%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class150Result.length === 0) continue;
        const class150Id = class150Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class150Id}
          AND "flangeTypeId" = ${type5Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class150Id}, ${type5Id},
              ${D}, ${b}, ${d4}, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const swClass300Data: Array<
        [number, number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 14, 67, 4, 16, 22, '1/2"', 0.68, 55],
        [20, 117, 16, 83, 4, 19, 28, '5/8"', 1.36, 65],
        [25, 124, 17, 89, 4, 19, 35, '5/8"', 1.81, 70],
        [32, 133, 19, 98, 4, 19, 43, '5/8"', 2.27, 75],
        [40, 156, 21, 114, 4, 22, 49, '3/4"', 3.18, 85],
        [50, 165, 22, 127, 8, 19, 62, '5/8"', 4.08, 90],
        [65, 191, 25, 149, 8, 22, 75, '3/4"', 5.44, 100],
        [80, 210, 29, 168, 8, 22, 91, '3/4"', 6.8, 110],
        [100, 254, 32, 200, 8, 22, 116, '3/4"', 11.3, 120],
      ];

      for (const [nb, D, b, pcd, holes, d1, d4, bolt, mass, boltLength] of swClass300Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class300Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '300%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class300Result.length === 0) continue;
        const class300Id = class300Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class300Id}
          AND "flangeTypeId" = ${type5Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class300Id}, ${type5Id},
              ${D}, ${b}, ${d4}, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const swClass600Data: Array<
        [number, number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 14, 67, 4, 16, 22, '1/2"', 0.68, 55],
        [20, 117, 17, 83, 4, 19, 28, '5/8"', 1.59, 70],
        [25, 124, 19, 89, 4, 19, 35, '5/8"', 2.04, 75],
        [32, 133, 21, 98, 4, 19, 43, '5/8"', 2.72, 80],
        [40, 156, 23, 114, 4, 22, 49, '3/4"', 3.63, 90],
        [50, 165, 25, 127, 8, 19, 62, '5/8"', 4.99, 100],
        [65, 191, 29, 149, 8, 22, 75, '3/4"', 6.8, 115],
        [80, 210, 32, 168, 8, 22, 91, '3/4"', 8.16, 125],
      ];

      for (const [nb, D, b, pcd, holes, d1, d4, bolt, mass, boltLength] of swClass600Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class600Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '600%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class600Result.length === 0) continue;
        const class600Id = class600Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class600Id}
          AND "flangeTypeId" = ${type5Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class600Id}, ${type5Id},
              ${D}, ${b}, ${d4}, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const swClass900Data: Array<
        [number, number, number, number, number, number, number, string, number, number]
      > = [
        [15, 121, 22, 83, 4, 22, 22, '3/4"', 1.59, 75],
        [20, 130, 25, 89, 4, 22, 28, '3/4"', 2.27, 85],
        [25, 149, 29, 102, 4, 26, 35, '7/8"', 3.18, 95],
        [40, 178, 38, 124, 4, 26, 49, '7/8"', 5.44, 115],
        [50, 216, 44, 165, 8, 26, 62, '7/8"', 10.4, 140],
        [65, 241, 51, 184, 8, 29, 75, '1"', 14.5, 160],
        [80, 283, 57, 216, 8, 32, 91, '1-1/8"', 22.2, 185],
      ];

      for (const [nb, D, b, pcd, holes, d1, d4, bolt, mass, boltLength] of swClass900Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class900Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '900%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class900Result.length === 0) continue;
        const class900Id = class900Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class900Id}
          AND "flangeTypeId" = ${type5Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class900Id}, ${type5Id},
              ${D}, ${b}, ${d4}, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("ASME B16.5 Socket Weld flange data added (Classes 150, 300, 600, 900).");
    }

    if (asmeB165Id && type4Id) {
      console.warn("Adding ASME B16.5 Lap Joint flange dimension data...");

      const ljClass150Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 89, 11, 60, 4, 16, '1/2"', 0.5, 45],
        [20, 99, 13, 70, 4, 16, '1/2"', 1.0, 50],
        [25, 108, 14, 79, 4, 16, '1/2"', 1.0, 55],
        [32, 117, 16, 89, 4, 16, '1/2"', 1.0, 60],
        [40, 127, 18, 98, 4, 16, '1/2"', 1.0, 65],
        [50, 152, 19, 121, 4, 19, '5/8"', 2.0, 75],
        [65, 178, 22, 140, 4, 19, '5/8"', 3.0, 80],
        [80, 191, 24, 152, 4, 19, '5/8"', 4.0, 85],
        [100, 229, 24, 191, 8, 19, '5/8"', 6.0, 90],
        [150, 279, 25, 241, 8, 22, '3/4"', 9.0, 95],
        [200, 343, 28, 299, 8, 22, '3/4"', 14.0, 100],
        [250, 406, 30, 362, 12, 25, '7/8"', 20.0, 110],
        [300, 483, 32, 432, 12, 25, '7/8"', 29.0, 115],
        [600, 813, 48, 749, 20, 35, '1-1/4"', 125.0, 150],
      ];

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of ljClass150Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class150Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '150%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class150Result.length === 0) continue;
        const class150Id = class150Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class150Id}
          AND "flangeTypeId" = ${type4Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class150Id}, ${type4Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const ljClass300Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 14, 67, 4, 16, '1/2"', 1.2, 55],
        [20, 117, 16, 83, 4, 19, '5/8"', 1.4, 65],
        [25, 124, 17, 89, 4, 19, '5/8"', 1.8, 70],
        [32, 133, 19, 98, 4, 19, '5/8"', 2.3, 75],
        [40, 156, 21, 114, 4, 22, '3/4"', 3.2, 85],
        [50, 165, 22, 127, 8, 19, '5/8"', 4.1, 90],
        [65, 191, 25, 149, 8, 22, '3/4"', 5.5, 100],
        [80, 210, 29, 168, 8, 22, '3/4"', 6.8, 110],
        [100, 254, 32, 200, 8, 22, '3/4"', 11.0, 120],
        [150, 318, 37, 270, 12, 22, '3/4"', 20.0, 140],
        [200, 381, 41, 330, 12, 25, '7/8"', 33.0, 155],
        [250, 444, 46, 387, 16, 29, '1"', 50.0, 175],
        [300, 521, 51, 451, 16, 32, '1-1/8"', 75.0, 195],
      ];

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of ljClass300Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class300Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '300%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class300Result.length === 0) continue;
        const class300Id = class300Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class300Id}
          AND "flangeTypeId" = ${type4Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class300Id}, ${type4Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const ljClass600Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 95, 14, 67, 4, 16, '1/2"', 1.2, 55],
        [20, 117, 17, 83, 4, 19, '5/8"', 1.59, 70],
        [25, 124, 19, 89, 4, 19, '5/8"', 2.04, 75],
        [32, 133, 21, 98, 4, 19, '5/8"', 2.72, 80],
        [40, 156, 23, 114, 4, 22, '3/4"', 3.63, 90],
        [50, 165, 25, 127, 8, 19, '5/8"', 4.99, 100],
        [65, 191, 29, 149, 8, 22, '3/4"', 6.8, 115],
        [80, 210, 32, 168, 8, 22, '3/4"', 8.16, 125],
        [100, 273, 38, 216, 8, 26, '7/8"', 15.9, 150],
        [150, 356, 48, 292, 12, 29, '1"', 34.0, 190],
        [200, 419, 54, 349, 12, 32, '1-1/8"', 52.0, 230],
        [250, 508, 62, 432, 16, 35, '1-1/4"', 82.0, 280],
        [300, 559, 67, 489, 20, 35, '1-1/4"', 105.0, 320],
      ];

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of ljClass600Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class600Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '600%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class600Result.length === 0) continue;
        const class600Id = class600Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class600Id}
          AND "flangeTypeId" = ${type4Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class600Id}, ${type4Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const ljClass900Data: Array<
        [number, number, number, number, number, number, string, number, number]
      > = [
        [15, 121, 22, 83, 4, 22, '3/4"', 1.59, 75],
        [20, 130, 25, 89, 4, 22, '3/4"', 2.27, 85],
        [25, 149, 29, 102, 4, 26, '7/8"', 3.18, 95],
        [40, 178, 38, 124, 4, 26, '7/8"', 5.44, 115],
        [50, 216, 44, 165, 8, 26, '7/8"', 10.4, 140],
        [65, 241, 51, 184, 8, 29, '1"', 14.5, 160],
        [80, 283, 57, 216, 8, 32, '1-1/8"', 22.2, 185],
        [100, 305, 64, 241, 8, 35, '1-1/4"', 30.8, 210],
        [150, 457, 87, 356, 12, 38, '1-3/8"', 82.0, 300],
        [200, 546, 102, 432, 12, 44, '1-5/8"', 140.0, 370],
        [250, 610, 114, 495, 16, 44, '1-5/8"', 195.0, 420],
        [300, 673, 124, 559, 20, 44, '1-5/8"', 265.0, 480],
      ];

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, boltLength] of ljClass900Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class900Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '900%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class900Result.length === 0) continue;
        const class900Id = class900Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class900Id}
          AND "flangeTypeId" = ${type4Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class900Id}, ${type4Id},
              ${D}, ${b}, 0, 2, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, ${boltLength},
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn("ASME B16.5 Lap Joint flange data added (Classes 150, 300, 600, 900).");
    }

    const type7Id = await getTypeId("/7");

    if (asmeB165Id && type7Id) {
      console.warn("Adding ASME B16.48 Spectacle Blind dimension data for ASME B16.5...");

      const sbClass150Data: Array<
        [number, number, number, number, number, number, string, number, number, number]
      > = [
        [15, 89, 10, 60, 4, 16, '1/2"', 0.9, 130, 15],
        [20, 99, 10, 70, 4, 16, '1/2"', 1.2, 145, 18],
        [25, 108, 12, 79, 4, 16, '1/2"', 1.5, 160, 20],
        [32, 117, 14, 89, 4, 16, '1/2"', 2.1, 175, 22],
        [40, 127, 14, 98, 4, 16, '1/2"', 2.5, 190, 25],
        [50, 152, 16, 121, 4, 19, '5/8"', 3.8, 225, 30],
        [65, 178, 16, 140, 4, 19, '5/8"', 5.0, 260, 35],
        [80, 190, 18, 152, 8, 19, '5/8"', 6.5, 280, 40],
        [100, 229, 18, 191, 8, 19, '5/8"', 8.5, 330, 48],
        [150, 279, 22, 241, 8, 22, '3/4"', 14.0, 400, 58],
        [200, 343, 24, 299, 8, 22, '3/4"', 22.0, 485, 70],
        [250, 406, 26, 362, 12, 25, '7/8"', 34.0, 570, 82],
        [300, 483, 28, 432, 12, 25, '7/8"', 48.0, 665, 95],
      ];

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, centerDist, webWidth] of sbClass150Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class150Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '150%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class150Result.length === 0) continue;
        const class150Id = class150Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class150Id}
          AND "flangeTypeId" = ${type7Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class150Id}, ${type7Id},
              ${D}, ${b}, 0, 0, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, NULL,
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const sbClass300Data: Array<
        [number, number, number, number, number, number, string, number, number, number]
      > = [
        [15, 95, 14, 67, 4, 16, '1/2"', 1.2, 140, 15],
        [20, 117, 16, 83, 4, 19, '5/8"', 1.8, 170, 20],
        [25, 124, 17, 89, 4, 19, '5/8"', 2.3, 180, 22],
        [32, 133, 19, 98, 4, 19, '5/8"', 3.2, 195, 25],
        [40, 156, 21, 114, 4, 22, '3/4"', 4.2, 225, 30],
        [50, 165, 22, 127, 8, 19, '5/8"', 5.5, 240, 35],
        [65, 191, 25, 149, 8, 22, '3/4"', 7.5, 280, 42],
        [80, 210, 29, 168, 8, 22, '3/4"', 10.0, 305, 48],
        [100, 254, 32, 200, 8, 22, '3/4"', 14.5, 360, 58],
        [150, 318, 37, 270, 12, 22, '3/4"', 26.0, 455, 72],
        [200, 381, 41, 330, 12, 25, '7/8"', 42.0, 540, 85],
        [250, 444, 48, 387, 16, 29, '1"', 62.0, 630, 100],
        [300, 521, 54, 451, 16, 32, '1-1/8"', 90.0, 735, 115],
      ];

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, centerDist, webWidth] of sbClass300Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class300Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '300%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class300Result.length === 0) continue;
        const class300Id = class300Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class300Id}
          AND "flangeTypeId" = ${type7Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class300Id}, ${type7Id},
              ${D}, ${b}, 0, 0, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, NULL,
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const sbClass600Data: Array<
        [number, number, number, number, number, number, string, number, number, number]
      > = [
        [15, 95, 14, 67, 4, 16, '1/2"', 1.5, 140, 15],
        [20, 117, 17, 83, 4, 19, '5/8"', 2.2, 170, 20],
        [25, 124, 19, 89, 4, 19, '5/8"', 2.8, 180, 22],
        [32, 133, 21, 98, 4, 19, '5/8"', 3.8, 195, 25],
        [40, 156, 23, 114, 4, 22, '3/4"', 5.0, 225, 30],
        [50, 165, 25, 127, 8, 19, '5/8"', 6.8, 240, 35],
        [65, 191, 29, 149, 8, 22, '3/4"', 9.2, 280, 42],
        [80, 210, 32, 168, 8, 22, '3/4"', 12.0, 305, 48],
        [100, 273, 38, 216, 8, 26, '7/8"', 20.0, 390, 60],
        [150, 356, 48, 292, 12, 29, '1"', 40.0, 500, 75],
        [200, 419, 54, 349, 12, 32, '1-1/8"', 62.0, 590, 90],
        [250, 508, 62, 432, 16, 35, '1-1/4"', 100.0, 710, 105],
        [300, 559, 67, 489, 20, 35, '1-1/4"', 130.0, 780, 120],
      ];

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, centerDist, webWidth] of sbClass600Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class600Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '600%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class600Result.length === 0) continue;
        const class600Id = class600Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class600Id}
          AND "flangeTypeId" = ${type7Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class600Id}, ${type7Id},
              ${D}, ${b}, 0, 0, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, NULL,
              ${pcd}, ${mass}
            )
          `);
        }
      }

      const sbClass900Data: Array<
        [number, number, number, number, number, number, string, number, number, number]
      > = [
        [15, 121, 22, 83, 4, 22, '3/4"', 2.0, 175, 20],
        [20, 130, 25, 89, 4, 22, '3/4"', 2.8, 190, 22],
        [25, 149, 29, 102, 4, 26, '7/8"', 4.0, 215, 26],
        [40, 178, 38, 124, 4, 26, '7/8"', 7.0, 260, 35],
        [50, 216, 44, 165, 8, 26, '7/8"', 12.5, 315, 45],
        [65, 241, 51, 184, 8, 29, '1"', 18.0, 355, 55],
        [80, 283, 57, 216, 8, 32, '1-1/8"', 28.0, 410, 65],
        [100, 305, 64, 241, 8, 35, '1-1/4"', 40.0, 445, 75],
        [150, 457, 87, 356, 12, 38, '1-3/8"', 105.0, 640, 100],
        [200, 546, 102, 432, 12, 44, '1-5/8"', 175.0, 765, 120],
        [250, 610, 114, 495, 16, 44, '1-5/8"', 245.0, 855, 140],
        [300, 673, 124, 559, 20, 44, '1-5/8"', 330.0, 945, 160],
      ];

      for (const [nb, D, b, pcd, holes, d1, bolt, mass, centerDist, webWidth] of sbClass900Data) {
        const nominalId = await getNominalId(nb);
        const boltId = await getBoltId(bolt);

        if (!nominalId) continue;

        const class900Result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '900%' AND "standardId" = ${asmeB165Id}
          LIMIT 1
        `);

        if (class900Result.length === 0) continue;
        const class900Id = class900Result[0].id;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "pressureClassId" = ${class900Id}
          AND "flangeTypeId" = ${type7Id}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", b, d4, f, num_holes, d1, "boltId", bolt_length_mm, pcd, mass_kg
            ) VALUES (
              ${nominalId}, ${asmeB165Id}, ${class900Id}, ${type7Id},
              ${D}, ${b}, 0, 0, ${holes}, ${d1},
              ${boltId ? boltId : "NULL"}, NULL,
              ${pcd}, ${mass}
            )
          `);
        }
      }

      console.warn(
        "ASME B16.48 Spectacle Blind data added for ASME B16.5 (Classes 150, 300, 600, 900).",
      );
    }

    console.warn("Missing flange type dimension data migration completed.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Removing added flange dimension data...");

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );
    const asmeB165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );

    if (bs4504Result[0]?.id) {
      await queryRunner.query(`
        DELETE FROM flange_dimensions
        WHERE "standardId" = ${bs4504Result[0].id}
        AND "pressureClassId" IN (
          SELECT id FROM flange_pressure_classes
          WHERE designation IN ('16/4', '10/4', '25/4', '16/5', '10/5', '25/5')
          AND "standardId" = ${bs4504Result[0].id}
        )
      `);

      await queryRunner.query(`
        DELETE FROM flange_pressure_classes
        WHERE designation IN ('16/4', '10/4', '25/4', '40/4', '16/5', '10/5', '25/5', '40/5')
        AND "standardId" = ${bs4504Result[0].id}
      `);
    }

    const type4Result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/4'`);
    const type5Result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/5'`);

    if (asmeB165Result[0]?.id && type4Result[0]?.id) {
      await queryRunner.query(`
        DELETE FROM flange_dimensions
        WHERE "standardId" = ${asmeB165Result[0].id}
        AND "flangeTypeId" = ${type4Result[0].id}
      `);
    }

    if (asmeB165Result[0]?.id && type5Result[0]?.id) {
      await queryRunner.query(`
        DELETE FROM flange_dimensions
        WHERE "standardId" = ${asmeB165Result[0].id}
        AND "flangeTypeId" = ${type5Result[0].id}
      `);
    }

    const type7Result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/7'`);

    if (asmeB165Result[0]?.id && type7Result[0]?.id) {
      await queryRunner.query(`
        DELETE FROM flange_dimensions
        WHERE "standardId" = ${asmeB165Result[0].id}
        AND "flangeTypeId" = ${type7Result[0].id}
      `);
    }
  }
}
