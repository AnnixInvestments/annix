import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEN1092MaterialPTRatings1778100000000 implements MigrationInterface {
  name = "AddEN1092MaterialPTRatings1778100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding EN 1092-1 Ferritic and Martensitic Stainless Steel P-T ratings...");

    const insertPtRating = async (
      classId: number,
      materialGroup: string,
      tempC: number,
      pressureBar: number,
    ) => {
      await queryRunner.query(
        `
        INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
        DO UPDATE SET max_pressure_bar = $4
      `,
        [classId, materialGroup, tempC, pressureBar],
      );
    };

    // Get BS 4504 standard (which uses EN 1092-1 PN designations)
    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );

    if (bs4504Result.length === 0) {
      console.warn("BS 4504 standard not found, skipping EN 1092-1 P-T ratings...");
      return;
    }

    const standardId = bs4504Result[0].id;

    const pressureClasses = await queryRunner.query(
      `SELECT id, designation FROM flange_pressure_classes WHERE "standardId" = $1`,
      [standardId],
    );

    // Map PN designations to base pressure in bar
    const pnToPressure: Record<string, number> = {
      "2.5/3": 2.5,
      "6/3": 6,
      "10/3": 10,
      "16/3": 16,
      "25/3": 25,
      "40/3": 40,
      "63/3": 63,
      "100/3": 100,
      "160/3": 160,
      "250/3": 250,
      "320/3": 320,
      "400/3": 400,
    };

    // EN 1092-1 Material Group derating factors for temperature
    // Based on EN 1092-1 Table 8 and material allowable stresses

    // Ferritic Stainless Steel (EN material group 8 - X6Cr17/1.4016/TP430 equivalent)
    // Lower creep strength than austenitic at elevated temperatures
    const ferriticDerating: [number, number][] = [
      [-29, 1.0],
      [20, 1.0],
      [50, 1.0],
      [100, 0.95],
      [150, 0.9],
      [200, 0.85],
      [250, 0.8],
      [300, 0.75],
      [350, 0.68],
      [400, 0.6],
      [450, 0.5],
      [500, 0.38],
    ];

    // Martensitic Stainless Steel (EN material group 7 - X20Cr13/1.4021/TP420 equivalent)
    // Lower ductility than ferritic, more restricted temperature range
    const martensiticDerating: [number, number][] = [
      [-29, 1.0],
      [20, 1.0],
      [50, 1.0],
      [100, 0.92],
      [150, 0.85],
      [200, 0.78],
      [250, 0.72],
      [300, 0.65],
      [350, 0.56],
      [400, 0.45],
    ];

    // Insert P-T ratings for each pressure class
    for (const pc of pressureClasses) {
      const designation = pc.designation;
      const basePressure = pnToPressure[designation];

      if (!basePressure) {
        // Try to extract PN value from designation
        const match = designation.match(/^(\d+(?:\.\d+)?)/);
        if (!match) continue;
        const pnValue = parseFloat(match[1]);
        if (Number.isNaN(pnValue)) continue;

        // Insert ferritic ratings
        for (const [tempC, factor] of ferriticDerating) {
          const pressure = Math.round(pnValue * factor * 10) / 10;
          await insertPtRating(pc.id, "Ferritic Stainless Steel (Group 7.1)", tempC, pressure);
        }

        // Insert martensitic ratings
        for (const [tempC, factor] of martensiticDerating) {
          const pressure = Math.round(pnValue * factor * 10) / 10;
          await insertPtRating(pc.id, "Martensitic Stainless Steel (Group 6.1)", tempC, pressure);
        }
      } else {
        // Insert ferritic ratings
        for (const [tempC, factor] of ferriticDerating) {
          const pressure = Math.round(basePressure * factor * 10) / 10;
          await insertPtRating(pc.id, "Ferritic Stainless Steel (Group 7.1)", tempC, pressure);
        }

        // Insert martensitic ratings
        for (const [tempC, factor] of martensiticDerating) {
          const pressure = Math.round(basePressure * factor * 10) / 10;
          await insertPtRating(pc.id, "Martensitic Stainless Steel (Group 6.1)", tempC, pressure);
        }
      }
    }

    // Also add to SABS 1123 if available
    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );

    if (sabs1123Result.length > 0) {
      console.warn("Adding SABS 1123 Ferritic/Martensitic P-T ratings...");

      const sabs1123Classes = await queryRunner.query(
        `SELECT id, designation FROM flange_pressure_classes WHERE "standardId" = $1`,
        [sabs1123Result[0].id],
      );

      for (const pc of sabs1123Classes) {
        const match = pc.designation.match(/^(\d+)/);
        if (!match) continue;
        const pnValue = parseInt(match[1], 10);
        if (Number.isNaN(pnValue)) continue;

        // Insert ferritic ratings
        for (const [tempC, factor] of ferriticDerating) {
          const pressure = Math.round(pnValue * factor * 10) / 10;
          await insertPtRating(pc.id, "Ferritic Stainless Steel (Group 7.1)", tempC, pressure);
        }

        // Insert martensitic ratings
        for (const [tempC, factor] of martensiticDerating) {
          const pressure = Math.round(pnValue * factor * 10) / 10;
          await insertPtRating(pc.id, "Martensitic Stainless Steel (Group 6.1)", tempC, pressure);
        }
      }
    }

    console.warn("EN 1092-1 / BS 4504 / SABS 1123 Ferritic/Martensitic P-T ratings added.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get BS 4504 and SABS 1123 class IDs
    const classes = await queryRunner.query(`
      SELECT fpc.id
      FROM flange_pressure_classes fpc
      JOIN flange_standards fs ON fpc."standardId" = fs.id
      WHERE fs.code IN ('BS 4504', 'SABS 1123')
    `);

    const classIds = classes.map((c: { id: number }) => c.id);

    if (classIds.length > 0) {
      await queryRunner.query(
        `
        DELETE FROM flange_pt_ratings
        WHERE pressure_class_id = ANY($1)
        AND material_group IN (
          'Ferritic Stainless Steel (Group 7.1)',
          'Martensitic Stainless Steel (Group 6.1)'
        )
      `,
        [classIds],
      );
    }
  }
}
