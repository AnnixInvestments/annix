import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBs10IntegralFlangeData1771700000000 implements MigrationInterface {
  name = "AddBs10IntegralFlangeData1771700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding BS 10 integral (weld neck) flange data...");

    const bs10Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );
    if (bs10Result.length === 0) {
      console.warn("BS 10 standard not found, skipping...");
      return;
    }
    const standardId = bs10Result[0].id;

    const weldNeckResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/2'`);
    if (weldNeckResult.length === 0) {
      console.warn("Weld neck flange type /2 not found, skipping...");
      return;
    }
    const flangeTypeId = weldNeckResult[0].id;

    const pressureClassIds: Record<string, number> = {};
    const tables = ["T/D", "T/E", "T/F", "T/H", "T/J", "T/K"];
    for (const table of tables) {
      const result = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = '${table}' AND "standardId" = ${standardId}`,
      );
      if (result.length > 0) {
        pressureClassIds[table] = result[0].id;
      }
    }

    const nbSizes = [
      15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
    ];
    const nbIdMap: Record<number, number> = {};
    for (const nb of nbSizes) {
      const result = await queryRunner.query(
        `SELECT id FROM nominal_outside_diameters WHERE nominal_diameter_mm = ${nb} LIMIT 1`,
      );
      if (result.length > 0) {
        nbIdMap[nb] = result[0].id;
      }
    }

    const boltIds: Record<string, number> = {};
    const boltSizes = ["M12", "M16", "M20", "M24", "M27", "M30", "M33", "M36"];
    for (const size of boltSizes) {
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${size}' AND head_style = 'hex' LIMIT 1`,
      );
      if (result.length > 0) {
        boltIds[size] = result[0].id;
      }
    }

    const tableDWN: Array<
      [number, number, number, number, number, number, number, string, number, number]
    > = [
      [15, 95, 18, 22, 2, 4, 14, "M12", 67, 1.1],
      [20, 102, 18, 28, 2, 4, 14, "M12", 73, 1.2],
      [25, 114, 18, 34, 2, 4, 14, "M12", 83, 1.5],
      [32, 121, 20, 43, 2, 4, 14, "M12", 89, 1.8],
      [40, 133, 20, 49, 2, 4, 14, "M12", 99, 2.2],
      [50, 152, 22, 61, 2, 4, 18, "M16", 115, 3.0],
      [65, 165, 22, 74, 2, 4, 18, "M16", 127, 3.6],
      [80, 184, 24, 89, 2, 8, 18, "M16", 149, 4.8],
      [100, 216, 24, 115, 2, 8, 18, "M16", 178, 6.2],
      [125, 254, 26, 141, 2, 8, 18, "M16", 210, 8.5],
      [150, 279, 26, 169, 2, 8, 18, "M16", 235, 10.0],
      [200, 337, 28, 220, 3, 8, 22, "M20", 292, 14.5],
      [250, 406, 30, 274, 3, 12, 22, "M20", 356, 21.0],
      [300, 457, 32, 325, 3, 12, 22, "M20", 406, 27.0],
      [350, 521, 34, 356, 3, 12, 22, "M20", 463, 34.0],
      [400, 578, 36, 407, 3, 16, 22, "M20", 521, 43.0],
      [450, 641, 38, 458, 3, 16, 26, "M24", 584, 52.0],
      [500, 705, 40, 509, 3, 20, 26, "M24", 641, 65.0],
      [600, 826, 44, 610, 3, 20, 30, "M27", 756, 94.0],
    ];

    const tableEWN: Array<
      [number, number, number, number, number, number, number, string, number, number]
    > = [
      [15, 95, 20, 22, 2, 4, 14, "M12", 67, 1.2],
      [20, 102, 20, 28, 2, 4, 14, "M12", 73, 1.4],
      [25, 114, 20, 34, 2, 4, 14, "M12", 83, 1.6],
      [32, 121, 22, 43, 2, 4, 14, "M12", 89, 2.0],
      [40, 133, 22, 49, 2, 4, 14, "M12", 99, 2.4],
      [50, 152, 24, 61, 2, 4, 18, "M16", 115, 3.4],
      [65, 165, 24, 74, 2, 4, 18, "M16", 127, 4.0],
      [80, 184, 26, 89, 2, 8, 18, "M16", 149, 5.4],
      [100, 216, 28, 115, 2, 8, 18, "M16", 178, 7.4],
      [125, 254, 30, 141, 2, 8, 18, "M16", 210, 10.0],
      [150, 279, 30, 169, 2, 8, 22, "M20", 235, 12.0],
      [200, 337, 32, 220, 3, 12, 22, "M20", 292, 18.0],
      [250, 406, 34, 274, 3, 12, 22, "M20", 356, 26.0],
      [300, 457, 36, 325, 3, 12, 26, "M24", 406, 33.0],
      [350, 521, 38, 356, 3, 16, 26, "M24", 463, 42.0],
      [400, 578, 42, 407, 3, 16, 26, "M24", 521, 53.0],
      [450, 641, 44, 458, 3, 16, 30, "M27", 584, 65.0],
      [500, 705, 48, 509, 3, 20, 30, "M27", 641, 81.0],
      [600, 826, 52, 610, 3, 20, 33, "M30", 756, 117.0],
    ];

    const tableFWN: Array<
      [number, number, number, number, number, number, number, string, number, number]
    > = [
      [15, 95, 22, 22, 2, 4, 14, "M12", 67, 1.4],
      [20, 102, 22, 28, 2, 4, 14, "M12", 73, 1.5],
      [25, 114, 24, 34, 2, 4, 18, "M16", 83, 1.9],
      [32, 121, 24, 43, 2, 4, 18, "M16", 89, 2.2],
      [40, 140, 26, 49, 2, 4, 18, "M16", 102, 3.0],
      [50, 159, 26, 61, 2, 4, 18, "M16", 121, 3.8],
      [65, 178, 28, 74, 2, 8, 18, "M16", 140, 5.1],
      [80, 191, 28, 89, 2, 8, 18, "M16", 152, 5.8],
      [100, 229, 30, 115, 3, 8, 22, "M20", 191, 8.7],
      [125, 267, 32, 141, 3, 8, 22, "M20", 222, 11.4],
      [150, 305, 34, 169, 3, 12, 22, "M20", 260, 16.0],
      [200, 362, 36, 220, 3, 12, 26, "M24", 311, 22.7],
      [250, 432, 40, 274, 3, 12, 26, "M24", 375, 33.4],
      [300, 489, 42, 325, 3, 16, 26, "M24", 425, 42.7],
      [350, 559, 46, 356, 3, 16, 30, "M27", 489, 56.0],
      [400, 616, 50, 407, 3, 16, 30, "M27", 546, 69.4],
      [450, 686, 52, 458, 3, 20, 33, "M30", 610, 86.7],
      [500, 749, 56, 509, 3, 20, 33, "M30", 673, 106.7],
      [600, 876, 62, 610, 3, 20, 36, "M33", 800, 153.4],
    ];

    const tableHWN: Array<
      [number, number, number, number, number, number, number, string, number, number]
    > = [
      [15, 114, 24, 22, 2, 4, 18, "M16", 83, 2.0],
      [20, 121, 24, 28, 2, 4, 18, "M16", 89, 2.3],
      [25, 133, 26, 34, 2, 4, 18, "M16", 99, 2.7],
      [32, 140, 26, 43, 2, 4, 18, "M16", 102, 3.1],
      [40, 152, 28, 49, 2, 4, 18, "M16", 114, 3.8],
      [50, 165, 28, 61, 2, 4, 22, "M20", 127, 4.5],
      [65, 191, 30, 74, 2, 8, 22, "M20", 152, 6.4],
      [80, 210, 32, 89, 2, 8, 22, "M20", 168, 7.8],
      [100, 254, 34, 115, 3, 8, 22, "M20", 210, 11.4],
      [125, 292, 36, 141, 3, 8, 26, "M24", 241, 14.7],
      [150, 330, 38, 169, 3, 12, 26, "M24", 279, 20.7],
      [200, 400, 42, 220, 3, 12, 26, "M24", 343, 32.0],
      [250, 470, 46, 274, 3, 12, 30, "M27", 406, 46.7],
      [300, 533, 50, 325, 3, 16, 30, "M27", 463, 62.7],
      [350, 597, 54, 356, 3, 16, 33, "M30", 521, 80.0],
      [400, 660, 58, 407, 3, 20, 33, "M30", 584, 101.4],
      [450, 724, 62, 458, 3, 20, 36, "M33", 648, 125.4],
      [500, 787, 66, 509, 3, 20, 36, "M33", 705, 153.4],
      [600, 914, 74, 610, 3, 24, 39, "M36", 832, 220.0],
    ];

    const tableJWN: Array<
      [number, number, number, number, number, number, number, string, number, number]
    > = [
      [15, 121, 26, 22, 2, 4, 18, "M16", 89, 2.4],
      [20, 133, 28, 28, 2, 4, 18, "M16", 99, 3.0],
      [25, 146, 30, 34, 2, 4, 22, "M20", 108, 3.6],
      [32, 159, 30, 43, 2, 4, 22, "M20", 117, 4.2],
      [40, 171, 32, 49, 2, 4, 22, "M20", 130, 5.1],
      [50, 191, 34, 61, 2, 8, 22, "M20", 149, 6.7],
      [65, 216, 36, 74, 2, 8, 22, "M20", 171, 8.7],
      [80, 241, 38, 89, 2, 8, 26, "M24", 194, 11.4],
      [100, 286, 42, 115, 3, 8, 26, "M24", 235, 16.7],
      [125, 330, 46, 141, 3, 8, 30, "M27", 273, 22.7],
      [150, 368, 48, 169, 3, 12, 30, "M27", 311, 30.7],
      [200, 451, 54, 220, 3, 12, 33, "M30", 387, 50.7],
      [250, 533, 60, 274, 3, 16, 33, "M30", 457, 73.4],
      [300, 603, 64, 325, 3, 16, 36, "M33", 521, 96.0],
      [350, 673, 70, 356, 3, 20, 36, "M33", 584, 126.7],
      [400, 743, 76, 407, 3, 20, 39, "M36", 654, 160.0],
      [450, 813, 82, 458, 3, 20, 39, "M36", 718, 200.0],
      [500, 876, 88, 509, 3, 24, 39, "M36", 781, 240.0],
      [600, 1010, 100, 610, 3, 24, 45, "M36", 908, 347.0],
    ];

    const tableKWN: Array<
      [number, number, number, number, number, number, number, string, number, number]
    > = [
      [15, 133, 30, 22, 2, 4, 22, "M20", 99, 3.2],
      [20, 146, 32, 28, 2, 4, 22, "M20", 108, 4.0],
      [25, 159, 34, 34, 2, 4, 22, "M20", 117, 4.8],
      [32, 171, 36, 43, 2, 4, 22, "M20", 130, 5.6],
      [40, 184, 38, 49, 2, 4, 26, "M24", 143, 7.0],
      [50, 203, 40, 61, 2, 8, 26, "M24", 162, 9.0],
      [65, 229, 42, 74, 2, 8, 26, "M24", 184, 11.7],
      [80, 254, 46, 89, 2, 8, 30, "M27", 206, 15.0],
      [100, 305, 50, 115, 3, 8, 30, "M27", 254, 22.0],
      [125, 349, 54, 141, 3, 12, 30, "M27", 292, 30.0],
      [150, 400, 58, 169, 3, 12, 33, "M30", 343, 41.0],
      [200, 483, 64, 220, 3, 16, 33, "M30", 419, 62.0],
      [250, 565, 72, 274, 3, 16, 36, "M33", 495, 90.0],
      [300, 641, 78, 325, 3, 20, 36, "M33", 565, 117.0],
    ];

    const allData: Array<{
      table: string;
      data: Array<[number, number, number, number, number, number, number, string, number, number]>;
    }> = [
      { table: "T/D", data: tableDWN },
      { table: "T/E", data: tableEWN },
      { table: "T/F", data: tableFWN },
      { table: "T/H", data: tableHWN },
      { table: "T/J", data: tableJWN },
      { table: "T/K", data: tableKWN },
    ];

    for (const { table, data } of allData) {
      const pressureClassId = pressureClassIds[table];
      if (!pressureClassId) {
        console.warn(`Pressure class ${table} not found, skipping...`);
        continue;
      }

      for (const row of data) {
        const [nb, D, b, d4, f, numHoles, d1, bolt, pcd, mass] = row;
        const nominalId = nbIdMap[nb];
        if (!nominalId) continue;

        const boltId = boltIds[bolt] || null;

        const existing = await queryRunner.query(`
          SELECT id FROM flange_dimensions
          WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${standardId}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${flangeTypeId}
        `);

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions (
              "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
              "D", "b", "d4", "f", "num_holes", "d1", "pcd", "mass_kg", "boltId"
            ) VALUES (
              ${nominalId}, ${standardId}, ${pressureClassId}, ${flangeTypeId},
              ${D}, ${b}, ${d4}, ${f}, ${numHoles}, ${d1}, ${pcd}, ${mass}, ${boltId || "NULL"}
            )
          `);
        }
      }
      console.warn(`Added BS 10 ${table} weld neck flange data`);
    }

    console.warn("BS 10 integral (weld neck) flange data added successfully.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Removing BS 10 weld neck flange data...");

    const bs10Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );
    if (bs10Result.length === 0) return;
    const standardId = bs10Result[0].id;

    const weldNeckResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/2'`);
    if (weldNeckResult.length === 0) return;
    const flangeTypeId = weldNeckResult[0].id;

    await queryRunner.query(`
      DELETE FROM flange_dimensions
      WHERE "standardId" = ${standardId} AND "flangeTypeId" = ${flangeTypeId}
    `);
  }
}
