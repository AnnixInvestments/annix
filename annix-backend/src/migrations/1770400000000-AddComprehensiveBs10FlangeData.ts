import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComprehensiveBs10FlangeData1770400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const pressureCategoryColumnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'flange_pressure_classes' AND column_name = 'pressureCategory'
    `);
    if (pressureCategoryColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE flange_pressure_classes
        ADD COLUMN "pressureCategory" varchar NULL
      `);
    }

    const existingStandard = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );
    let standardId: number;
    if (existingStandard.length === 0) {
      const insertResult = await queryRunner.query(
        `INSERT INTO flange_standards (code) VALUES ('BS 10') RETURNING id`,
      );
      standardId = insertResult[0].id;
    } else {
      standardId = existingStandard[0].id;
    }

    const flangeTypeResult = await queryRunner.query(
      `SELECT id FROM flange_types WHERE code = '/3'`,
    );
    const flangeTypeId = flangeTypeResult[0]?.id || null;

    const tableDesignations = [
      { designation: "T/D", pressureCategory: "Low Pressure" },
      { designation: "T/E", pressureCategory: "Low Pressure" },
      { designation: "T/F", pressureCategory: "Medium Pressure" },
      { designation: "T/H", pressureCategory: "Medium Pressure" },
      { designation: "T/J", pressureCategory: "High Pressure" },
      { designation: "T/K", pressureCategory: "High Pressure" },
    ];

    const pressureClassIds: Record<string, number> = {};
    for (const table of tableDesignations) {
      const existing = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = '${table.designation}' AND "standardId" = ${standardId}`,
      );
      if (existing.length === 0) {
        const result = await queryRunner.query(
          `INSERT INTO flange_pressure_classes (designation, "standardId", "pressureCategory") VALUES ('${table.designation}', ${standardId}, '${table.pressureCategory}') RETURNING id`,
        );
        pressureClassIds[table.designation] = result[0].id;
      } else {
        pressureClassIds[table.designation] = existing[0].id;
        await queryRunner.query(
          `UPDATE flange_pressure_classes SET "pressureCategory" = '${table.pressureCategory}' WHERE id = ${existing[0].id}`,
        );
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
      const result = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${size}'`);
      if (result.length > 0) {
        boltIds[size] = result[0].id;
      }
    }

    const tableDData: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number,
    ][] = [
      [15, 95, 14, 22, 2, 4, 14, "M12", 67, 0.8],
      [20, 102, 14, 28, 2, 4, 14, "M12", 73, 0.9],
      [25, 114, 14, 34, 2, 4, 14, "M12", 83, 1.1],
      [32, 121, 16, 43, 2, 4, 14, "M12", 89, 1.3],
      [40, 133, 16, 49, 2, 4, 14, "M12", 99, 1.6],
      [50, 152, 18, 61, 2, 4, 18, "M16", 115, 2.2],
      [65, 165, 18, 74, 2, 4, 18, "M16", 127, 2.7],
      [80, 184, 20, 89, 2, 8, 18, "M16", 149, 3.5],
      [100, 216, 20, 115, 2, 8, 18, "M16", 178, 4.6],
      [125, 254, 22, 141, 2, 8, 18, "M16", 210, 6.4],
      [150, 279, 22, 169, 2, 8, 18, "M16", 235, 7.5],
      [200, 337, 24, 220, 3, 8, 22, "M20", 292, 11.0],
      [250, 406, 26, 274, 3, 12, 22, "M20", 356, 16.0],
      [300, 457, 28, 325, 3, 12, 22, "M20", 406, 20.5],
      [350, 521, 30, 356, 3, 12, 22, "M20", 463, 26.0],
      [400, 578, 32, 407, 3, 16, 22, "M20", 521, 33.0],
      [450, 641, 34, 458, 3, 16, 26, "M24", 584, 40.0],
      [500, 705, 36, 509, 3, 20, 26, "M24", 641, 50.0],
      [600, 826, 40, 610, 3, 20, 30, "M27", 756, 72.0],
    ];

    const tableEData: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number,
    ][] = [
      [15, 95, 16, 22, 2, 4, 14, "M12", 67, 0.9],
      [20, 102, 16, 28, 2, 4, 14, "M12", 73, 1.0],
      [25, 114, 16, 34, 2, 4, 14, "M12", 83, 1.2],
      [32, 121, 18, 43, 2, 4, 14, "M12", 89, 1.5],
      [40, 133, 18, 49, 2, 4, 14, "M12", 99, 1.8],
      [50, 152, 20, 61, 2, 4, 18, "M16", 115, 2.5],
      [65, 165, 20, 74, 2, 4, 18, "M16", 127, 3.0],
      [80, 184, 22, 89, 2, 8, 18, "M16", 149, 4.0],
      [100, 216, 24, 115, 2, 8, 18, "M16", 178, 5.5],
      [125, 254, 26, 141, 2, 8, 18, "M16", 210, 7.5],
      [150, 279, 26, 169, 2, 8, 22, "M20", 235, 9.0],
      [200, 337, 28, 220, 3, 12, 22, "M20", 292, 13.5],
      [250, 406, 30, 274, 3, 12, 22, "M20", 356, 19.5],
      [300, 457, 32, 325, 3, 12, 26, "M24", 406, 25.0],
      [350, 521, 34, 356, 3, 16, 26, "M24", 463, 32.0],
      [400, 578, 38, 407, 3, 16, 26, "M24", 521, 40.5],
      [450, 641, 40, 458, 3, 16, 30, "M27", 584, 50.0],
      [500, 705, 44, 509, 3, 20, 30, "M27", 641, 62.0],
      [600, 826, 48, 610, 3, 20, 33, "M30", 756, 90.0],
    ];

    const tableFData: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number,
    ][] = [
      [15, 95, 18, 22, 2, 4, 14, "M12", 67, 1.0],
      [20, 102, 18, 28, 2, 4, 14, "M12", 73, 1.1],
      [25, 114, 20, 34, 2, 4, 18, "M16", 83, 1.4],
      [32, 121, 20, 43, 2, 4, 18, "M16", 89, 1.6],
      [40, 140, 22, 49, 2, 4, 18, "M16", 102, 2.2],
      [50, 159, 22, 61, 2, 4, 18, "M16", 121, 2.8],
      [65, 178, 24, 74, 2, 8, 18, "M16", 140, 3.8],
      [80, 191, 24, 89, 2, 8, 18, "M16", 152, 4.3],
      [100, 229, 26, 115, 3, 8, 22, "M20", 191, 6.5],
      [125, 267, 28, 141, 3, 8, 22, "M20", 222, 8.5],
      [150, 305, 30, 169, 3, 12, 22, "M20", 260, 12.0],
      [200, 362, 32, 220, 3, 12, 26, "M24", 311, 17.0],
      [250, 432, 36, 274, 3, 12, 26, "M24", 375, 25.0],
      [300, 489, 38, 325, 3, 16, 26, "M24", 425, 32.0],
      [350, 559, 42, 356, 3, 16, 30, "M27", 489, 42.0],
      [400, 616, 46, 407, 3, 16, 30, "M27", 546, 52.0],
      [450, 686, 48, 458, 3, 20, 33, "M30", 610, 65.0],
      [500, 749, 52, 509, 3, 20, 33, "M30", 673, 80.0],
      [600, 876, 58, 610, 3, 20, 36, "M33", 800, 115.0],
    ];

    const tableHData: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number,
    ][] = [
      [15, 114, 20, 22, 2, 4, 18, "M16", 83, 1.5],
      [20, 121, 20, 28, 2, 4, 18, "M16", 89, 1.7],
      [25, 133, 22, 34, 2, 4, 18, "M16", 99, 2.0],
      [32, 140, 22, 43, 2, 4, 18, "M16", 102, 2.3],
      [40, 152, 24, 49, 2, 4, 18, "M16", 114, 2.8],
      [50, 165, 24, 61, 2, 4, 22, "M20", 127, 3.4],
      [65, 191, 26, 74, 2, 8, 22, "M20", 152, 4.8],
      [80, 210, 28, 89, 2, 8, 22, "M20", 168, 5.8],
      [100, 254, 30, 115, 3, 8, 22, "M20", 210, 8.5],
      [125, 292, 32, 141, 3, 8, 26, "M24", 241, 11.0],
      [150, 330, 34, 169, 3, 12, 26, "M24", 279, 15.5],
      [200, 400, 38, 220, 3, 12, 26, "M24", 343, 24.0],
      [250, 470, 42, 274, 3, 12, 30, "M27", 406, 35.0],
      [300, 533, 46, 325, 3, 16, 30, "M27", 463, 47.0],
      [350, 597, 50, 356, 3, 16, 33, "M30", 521, 60.0],
      [400, 660, 54, 407, 3, 20, 33, "M30", 584, 76.0],
      [450, 724, 58, 458, 3, 20, 36, "M33", 648, 94.0],
      [500, 787, 62, 509, 3, 20, 36, "M33", 705, 115.0],
      [600, 914, 70, 610, 3, 24, 39, "M36", 832, 165.0],
    ];

    const tableJData: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number,
    ][] = [
      [15, 121, 22, 22, 2, 4, 18, "M16", 89, 1.8],
      [20, 133, 24, 28, 2, 4, 18, "M16", 99, 2.2],
      [25, 146, 26, 34, 2, 4, 22, "M20", 108, 2.7],
      [32, 159, 26, 43, 2, 4, 22, "M20", 117, 3.1],
      [40, 171, 28, 49, 2, 4, 22, "M20", 130, 3.8],
      [50, 191, 30, 61, 2, 8, 22, "M20", 149, 5.0],
      [65, 216, 32, 74, 2, 8, 22, "M20", 171, 6.5],
      [80, 241, 34, 89, 2, 8, 26, "M24", 194, 8.5],
      [100, 286, 38, 115, 3, 8, 26, "M24", 235, 12.5],
      [125, 330, 42, 141, 3, 8, 30, "M27", 273, 17.0],
      [150, 368, 44, 169, 3, 12, 30, "M27", 311, 23.0],
      [200, 451, 50, 220, 3, 12, 33, "M30", 387, 38.0],
      [250, 533, 56, 274, 3, 16, 33, "M30", 457, 55.0],
      [300, 603, 60, 325, 3, 16, 36, "M33", 521, 72.0],
      [350, 673, 66, 356, 3, 20, 36, "M33", 584, 95.0],
      [400, 743, 72, 407, 3, 20, 39, "M36", 654, 120.0],
      [450, 813, 78, 458, 3, 20, 39, "M36", 718, 150.0],
      [500, 876, 84, 509, 3, 24, 39, "M36", 781, 180.0],
      [600, 1010, 95, 610, 3, 24, 45, "M36", 908, 260.0],
    ];

    const tableKData: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number,
    ][] = [
      [15, 133, 26, 22, 2, 4, 22, "M20", 99, 2.4],
      [20, 146, 28, 28, 2, 4, 22, "M20", 108, 3.0],
      [25, 159, 30, 34, 2, 4, 22, "M20", 117, 3.6],
      [32, 171, 32, 43, 2, 4, 22, "M20", 130, 4.2],
      [40, 184, 34, 49, 2, 4, 26, "M24", 143, 5.2],
      [50, 210, 36, 61, 2, 8, 26, "M24", 165, 7.0],
      [65, 241, 40, 74, 2, 8, 26, "M24", 191, 9.5],
      [80, 267, 42, 89, 2, 8, 26, "M24", 216, 12.0],
      [100, 318, 48, 115, 3, 8, 30, "M27", 260, 18.0],
      [125, 368, 52, 141, 3, 12, 30, "M27", 305, 25.0],
      [150, 413, 56, 169, 3, 12, 33, "M30", 343, 34.0],
      [200, 502, 64, 220, 3, 16, 33, "M30", 425, 55.0],
      [250, 591, 72, 274, 3, 16, 36, "M33", 502, 80.0],
      [300, 667, 78, 325, 3, 20, 36, "M33", 571, 105.0],
      [350, 743, 86, 356, 3, 20, 39, "M36", 641, 135.0],
      [400, 819, 94, 407, 3, 24, 39, "M36", 717, 175.0],
      [450, 895, 100, 458, 3, 24, 45, "M36", 787, 215.0],
      [500, 965, 108, 509, 3, 24, 45, "M36", 857, 265.0],
      [600, 1110, 120, 610, 3, 28, 52, "M36", 995, 380.0],
    ];

    const allTableData: [
      string,
      [number, number, number, number, number, number, number, string, number, number][],
    ][] = [
      ["T/D", tableDData],
      ["T/E", tableEData],
      ["T/F", tableFData],
      ["T/H", tableHData],
      ["T/J", tableJData],
      ["T/K", tableKData],
    ];

    for (const [tableDesignation, dataRows] of allTableData) {
      const pressureClassId = pressureClassIds[tableDesignation];

      for (const row of dataRows) {
        const [nb, D, b, d4, f, numHoles, d1, boltSize, pcd, massKg] = row;
        const nbId = nbIdMap[nb];
        const boltId = boltIds[boltSize] || null;

        if (nbId && pressureClassId) {
          const existingDim = await queryRunner.query(
            `SELECT id FROM flange_dimensions WHERE "nominalOutsideDiameterId" = ${nbId} AND "standardId" = ${standardId} AND "pressureClassId" = ${pressureClassId}`,
          );
          if (existingDim.length === 0) {
            await queryRunner.query(`
              INSERT INTO flange_dimensions ("nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId", "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg")
              VALUES (${nbId}, ${standardId}, ${pressureClassId}, ${flangeTypeId || "NULL"}, ${D}, ${b}, ${d4}, ${f}, ${numHoles}, ${d1}, ${boltId || "NULL"}, ${pcd}, ${massKg})
            `);
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const standardResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );
    if (standardResult.length > 0) {
      const standardId = standardResult[0].id;
      await queryRunner.query(`DELETE FROM flange_dimensions WHERE "standardId" = ${standardId}`);
      await queryRunner.query(
        `DELETE FROM flange_pressure_classes WHERE "standardId" = ${standardId}`,
      );
      await queryRunner.query(`DELETE FROM flange_standards WHERE id = ${standardId}`);
    }
  }
}
