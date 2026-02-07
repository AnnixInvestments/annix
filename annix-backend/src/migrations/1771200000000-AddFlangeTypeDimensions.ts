import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFlangeTypeDimensions1771200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const b165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );
    if (b165Result.length === 0) {
      return;
    }
    const b165Id = b165Result[0].id;

    const ljTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/4'`);
    const ljTypeId = ljTypeResult[0]?.id || null;

    const swTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/5'`);
    const swTypeId = swTypeResult[0]?.id || null;

    const thTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/6'`);
    const thTypeId = thTypeResult[0]?.id || null;

    const orTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/7'`);
    const orTypeId = orTypeResult[0]?.id || null;

    const pressureClassIds: Record<string, number> = {};
    const pressureClasses = ["150", "300", "600", "900", "1500", "2500"];
    for (const pc of pressureClasses) {
      const result = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = '${pc}' AND "standardId" = ${b165Id}`,
      );
      if (result.length > 0) {
        pressureClassIds[pc] = result[0].id;
      }
    }

    const npsToNbMap: Record<string, number> = {
      "1/2": 15,
      "3/4": 20,
      "1": 25,
      "1-1/4": 32,
      "1-1/2": 40,
      "2": 50,
      "2-1/2": 65,
      "3": 80,
      "3-1/2": 90,
      "4": 100,
      "5": 125,
      "6": 150,
      "8": 200,
      "10": 250,
      "12": 300,
      "14": 350,
      "16": 400,
      "18": 450,
      "20": 500,
      "24": 600,
    };

    const nbIdMap: Record<string, number> = {};
    for (const [nps, nb] of Object.entries(npsToNbMap)) {
      const result = await queryRunner.query(
        `SELECT id FROM nominal_outside_diameters WHERE nominal_diameter_mm = ${nb} LIMIT 1`,
      );
      if (result.length > 0) {
        nbIdMap[nps] = result[0].id;
      }
    }

    const boltIds: Record<string, number> = {};
    const boltSizes = [
      "M12",
      "M14",
      "M16",
      "M20",
      "M22",
      "M24",
      "M27",
      "M30",
      "M33",
      "M36",
      "M39",
      "M42",
      "M45",
      "M48",
      "M52",
      "M56",
      "M64",
    ];
    for (const size of boltSizes) {
      const result = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${size}'`);
      if (result.length > 0) {
        boltIds[size] = result[0].id;
      }
    }

    const insertFlangeDimension = async (
      nps: string,
      D: number,
      b: number,
      d4: number,
      f: number,
      numHoles: number,
      d1: number,
      boltSize: string,
      pcd: number,
      massKg: number,
      pressureClassId: number,
      flangeTypeId: number | null,
    ) => {
      const nbId = nbIdMap[nps];
      const boltId = boltIds[boltSize] || null;
      if (nbId && flangeTypeId) {
        const existing = await queryRunner.query(
          `SELECT id FROM flange_dimensions WHERE "nominalOutsideDiameterId" = ${nbId} AND "standardId" = ${b165Id} AND "pressureClassId" = ${pressureClassId} AND "flangeTypeId" = ${flangeTypeId}`,
        );
        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions ("nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId", "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg")
            VALUES (${nbId}, ${b165Id}, ${pressureClassId}, ${flangeTypeId}, ${D}, ${b}, ${d4}, ${f}, ${numHoles}, ${d1}, ${boltId || "NULL"}, ${pcd}, ${massKg})
          `);
        }
      }
    };

    const ljClass150Data: [
      string,
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
      ["1/2", 89, 11, 22, 2, 4, 16, "M14", 60, 0.5],
      ["3/4", 99, 13, 28, 2, 4, 16, "M14", 70, 0.6],
      ["1", 108, 14, 35, 2, 4, 16, "M14", 79, 0.8],
      ["1-1/4", 117, 16, 44, 2, 4, 16, "M14", 89, 1.0],
      ["1-1/2", 127, 18, 51, 2, 4, 16, "M14", 98, 1.3],
      ["2", 152, 19, 64, 2, 4, 19, "M16", 121, 1.8],
      ["2-1/2", 178, 22, 76, 2, 4, 19, "M16", 140, 2.7],
      ["3", 191, 24, 90, 2, 4, 19, "M16", 152, 3.2],
      ["3-1/2", 216, 24, 102, 2, 8, 19, "M16", 178, 4.1],
      ["4", 229, 24, 115, 2, 8, 19, "M16", 191, 4.5],
      ["5", 254, 24, 141, 2, 8, 22, "M20", 216, 5.4],
      ["6", 279, 26, 170, 2, 8, 22, "M20", 241, 6.8],
      ["8", 343, 29, 221, 2, 8, 22, "M20", 298, 10.4],
      ["10", 406, 31, 276, 2, 12, 26, "M22", 362, 14.5],
      ["12", 483, 33, 328, 2, 12, 26, "M22", 432, 20.4],
      ["14", 533, 36, 359, 2, 12, 30, "M27", 476, 27.2],
      ["16", 597, 38, 410, 2, 16, 30, "M27", 540, 36.3],
      ["18", 635, 41, 461, 2, 16, 33, "M30", 578, 43.1],
      ["20", 699, 43, 513, 2, 20, 33, "M30", 635, 52.2],
      ["24", 813, 48, 616, 2, 20, 36, "M33", 749, 79.4],
    ];

    const ljClass300Data: [
      string,
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
      ["1/2", 95, 14, 22, 2, 4, 16, "M14", 66, 0.9],
      ["3/4", 117, 16, 28, 2, 4, 19, "M16", 83, 1.4],
      ["1", 124, 18, 35, 2, 4, 19, "M16", 89, 1.8],
      ["1-1/4", 133, 19, 44, 2, 4, 19, "M16", 98, 2.2],
      ["1-1/2", 156, 21, 51, 2, 4, 22, "M20", 114, 3.2],
      ["2", 165, 22, 64, 2, 8, 19, "M16", 127, 3.6],
      ["2-1/2", 190, 25, 76, 2, 8, 22, "M20", 149, 5.4],
      ["3", 210, 29, 90, 2, 8, 22, "M20", 168, 7.3],
      ["3-1/2", 229, 30, 102, 2, 8, 26, "M22", 184, 9.1],
      ["4", 254, 32, 115, 2, 8, 26, "M22", 200, 11.3],
      ["5", 279, 35, 141, 2, 8, 26, "M22", 235, 14.5],
      ["6", 318, 37, 170, 2, 12, 26, "M22", 270, 20.0],
      ["8", 381, 43, 221, 2, 12, 30, "M27", 330, 31.8],
      ["10", 444, 48, 276, 2, 16, 30, "M27", 387, 45.4],
      ["12", 521, 51, 328, 2, 16, 33, "M30", 451, 63.5],
    ];

    const ljClass600Data: [
      string,
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
      ["1/2", 95, 14, 22, 7, 4, 16, "M14", 66, 0.9],
      ["3/4", 117, 16, 28, 7, 4, 19, "M16", 83, 1.4],
      ["1", 124, 18, 35, 7, 4, 19, "M16", 89, 1.8],
      ["1-1/4", 133, 21, 44, 7, 4, 19, "M16", 98, 2.4],
      ["1-1/2", 156, 22, 51, 7, 4, 22, "M20", 114, 3.4],
      ["2", 165, 25, 64, 7, 8, 19, "M16", 127, 4.5],
      ["2-1/2", 190, 29, 76, 7, 8, 22, "M20", 149, 6.4],
      ["3", 210, 32, 90, 7, 8, 22, "M20", 168, 8.6],
      ["3-1/2", 229, 35, 102, 7, 8, 26, "M22", 184, 11.3],
      ["4", 273, 38, 115, 7, 8, 26, "M22", 216, 15.4],
      ["5", 330, 44, 141, 7, 8, 30, "M27", 267, 25.4],
      ["6", 356, 48, 170, 7, 12, 30, "M27", 292, 32.7],
      ["8", 419, 56, 221, 7, 12, 33, "M30", 349, 50.8],
      ["10", 508, 64, 276, 7, 16, 36, "M33", 432, 81.6],
      ["12", 559, 70, 328, 7, 20, 36, "M33", 489, 104.3],
      ["14", 603, 79, 359, 7, 20, 39, "M36", 527, 136.1],
      ["16", 686, 86, 410, 7, 20, 42, "M39", 603, 181.4],
      ["18", 743, 92, 461, 7, 20, 45, "M42", 654, 222.3],
      ["20", 813, 102, 513, 7, 24, 45, "M42", 724, 290.3],
      ["24", 940, 117, 616, 7, 24, 52, "M48", 838, 367.4],
    ];

    const swClass150Data: [
      string,
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
      ["1/2", 89, 11, 22, 2, 4, 16, "M14", 60, 0.45],
      ["3/4", 99, 13, 28, 2, 4, 16, "M14", 70, 0.68],
      ["1", 108, 14, 35, 2, 4, 16, "M14", 79, 0.91],
      ["1-1/4", 117, 16, 44, 2, 4, 16, "M14", 89, 1.27],
      ["1-1/2", 127, 18, 51, 2, 4, 16, "M14", 98, 1.59],
      ["2", 152, 19, 64, 2, 4, 19, "M16", 121, 2.27],
      ["2-1/2", 178, 22, 76, 2, 4, 19, "M16", 140, 3.63],
      ["3", 191, 24, 90, 2, 4, 19, "M16", 152, 4.54],
    ];

    const swClass300Data: [
      string,
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
      ["1/2", 95, 14, 22, 2, 4, 16, "M14", 66, 0.91],
      ["3/4", 117, 16, 28, 2, 4, 19, "M16", 83, 1.59],
      ["1", 124, 18, 35, 2, 4, 19, "M16", 89, 2.04],
      ["1-1/4", 133, 19, 44, 2, 4, 19, "M16", 98, 2.72],
      ["1-1/2", 156, 21, 51, 2, 4, 22, "M20", 114, 3.63],
      ["2", 165, 22, 64, 2, 8, 19, "M16", 127, 4.08],
      ["2-1/2", 190, 25, 76, 2, 8, 22, "M20", 149, 5.9],
    ];

    const swClass600Data: [
      string,
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
      ["1/2", 95, 14, 22, 7, 4, 16, "M14", 66, 0.91],
      ["3/4", 117, 16, 28, 7, 4, 19, "M16", 83, 1.59],
      ["1", 124, 18, 35, 7, 4, 19, "M16", 89, 2.04],
      ["1-1/4", 133, 21, 44, 7, 4, 19, "M16", 98, 2.95],
      ["1-1/2", 156, 22, 51, 7, 4, 22, "M20", 114, 3.86],
      ["2", 165, 25, 64, 7, 8, 19, "M16", 127, 4.99],
      ["2-1/2", 190, 29, 76, 7, 8, 22, "M20", 149, 6.8],
    ];

    const thClass150Data: [
      string,
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
      ["1/2", 89, 11, 22, 2, 4, 16, "M14", 60, 0.45],
      ["3/4", 99, 13, 28, 2, 4, 16, "M14", 70, 0.68],
      ["1", 108, 14, 35, 2, 4, 16, "M14", 79, 0.91],
      ["1-1/4", 117, 16, 44, 2, 4, 16, "M14", 89, 1.27],
      ["1-1/2", 127, 18, 51, 2, 4, 16, "M14", 98, 1.59],
      ["2", 152, 19, 64, 2, 4, 19, "M16", 121, 2.27],
      ["2-1/2", 178, 22, 76, 2, 4, 19, "M16", 140, 3.63],
      ["3", 191, 24, 90, 2, 4, 19, "M16", 152, 4.54],
      ["3-1/2", 216, 24, 102, 2, 8, 19, "M16", 178, 5.9],
      ["4", 229, 24, 115, 2, 8, 19, "M16", 191, 6.8],
      ["5", 254, 24, 141, 2, 8, 22, "M20", 216, 8.16],
      ["6", 279, 26, 170, 2, 8, 22, "M20", 241, 10.43],
      ["8", 343, 29, 221, 2, 8, 22, "M20", 298, 15.88],
      ["10", 406, 31, 276, 2, 12, 26, "M22", 362, 22.68],
      ["12", 483, 33, 328, 2, 12, 26, "M22", 432, 31.75],
      ["14", 533, 36, 359, 2, 12, 30, "M27", 476, 40.82],
      ["16", 597, 38, 410, 2, 16, 30, "M27", 540, 52.16],
      ["18", 635, 41, 461, 2, 16, 33, "M30", 578, 63.5],
      ["20", 699, 43, 513, 2, 20, 33, "M30", 635, 79.38],
      ["24", 813, 48, 616, 2, 20, 36, "M33", 749, 99.79],
    ];

    const thClass300Data: [
      string,
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
      ["1/2", 95, 14, 22, 2, 4, 16, "M14", 66, 0.91],
      ["3/4", 117, 16, 28, 2, 4, 19, "M16", 83, 1.59],
      ["1", 124, 18, 35, 2, 4, 19, "M16", 89, 2.04],
      ["1-1/4", 133, 19, 44, 2, 4, 19, "M16", 98, 2.72],
      ["1-1/2", 156, 21, 51, 2, 4, 22, "M20", 114, 3.63],
      ["2", 165, 22, 64, 2, 8, 19, "M16", 127, 4.08],
      ["2-1/2", 190, 25, 76, 2, 8, 22, "M20", 149, 5.9],
      ["3", 210, 29, 90, 2, 8, 22, "M20", 168, 7.71],
      ["4", 254, 32, 115, 2, 8, 26, "M22", 200, 12.25],
      ["5", 279, 35, 141, 2, 8, 26, "M22", 235, 15.42],
      ["6", 318, 37, 170, 2, 12, 26, "M22", 270, 21.32],
      ["8", 381, 43, 221, 2, 12, 30, "M27", 330, 26.31],
    ];

    const orClass300Data: [
      string,
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
      ["1", 125, 89, 35, 7, 4, 16, "M14", 89, 3.2],
      ["1-1/2", 155, 102, 51, 7, 4, 19, "M16", 114, 5.4],
      ["2", 165, 117, 64, 7, 8, 16, "M14", 127, 6.8],
      ["3", 210, 152, 90, 7, 8, 19, "M16", 168, 11.3],
      ["4", 255, 191, 115, 7, 8, 22, "M20", 200, 18.1],
      ["6", 320, 241, 170, 7, 12, 22, "M20", 270, 31.8],
      ["8", 380, 299, 221, 7, 12, 26, "M22", 330, 49.9],
      ["10", 445, 362, 276, 7, 16, 26, "M22", 387, 72.6],
      ["12", 520, 432, 328, 7, 16, 30, "M27", 451, 99.8],
      ["14", 585, 476, 359, 7, 20, 30, "M27", 514, 127.0],
      ["16", 650, 540, 410, 7, 20, 33, "M30", 578, 163.3],
      ["18", 710, 578, 461, 7, 24, 33, "M30", 635, 199.6],
      ["20", 775, 635, 513, 7, 24, 36, "M33", 699, 244.9],
      ["24", 915, 749, 616, 7, 24, 42, "M39", 838, 349.3],
    ];

    const orClass600Data: [
      string,
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
      ["1", 125, 89, 35, 7, 4, 16, "M14", 89, 4.5],
      ["1-1/2", 155, 102, 51, 7, 4, 22, "M20", 114, 7.3],
      ["2", 165, 117, 64, 7, 8, 19, "M16", 127, 9.1],
      ["3", 210, 152, 90, 7, 8, 22, "M20", 168, 14.5],
      ["4", 275, 191, 115, 7, 8, 26, "M22", 216, 25.4],
      ["6", 355, 241, 170, 7, 12, 26, "M22", 292, 45.4],
      ["8", 420, 299, 221, 7, 12, 33, "M30", 349, 72.6],
      ["10", 510, 362, 276, 7, 16, 36, "M33", 432, 113.4],
      ["12", 560, 432, 328, 7, 20, 36, "M33", 489, 149.7],
    ];

    if (ljTypeId && pressureClassIds["150"]) {
      for (const row of ljClass150Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["150"],
          ljTypeId,
        );
      }
    }

    if (ljTypeId && pressureClassIds["300"]) {
      for (const row of ljClass300Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["300"],
          ljTypeId,
        );
      }
    }

    if (ljTypeId && pressureClassIds["600"]) {
      for (const row of ljClass600Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["600"],
          ljTypeId,
        );
      }
    }

    if (swTypeId && pressureClassIds["150"]) {
      for (const row of swClass150Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["150"],
          swTypeId,
        );
      }
    }

    if (swTypeId && pressureClassIds["300"]) {
      for (const row of swClass300Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["300"],
          swTypeId,
        );
      }
    }

    if (swTypeId && pressureClassIds["600"]) {
      for (const row of swClass600Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["600"],
          swTypeId,
        );
      }
    }

    if (thTypeId && pressureClassIds["150"]) {
      for (const row of thClass150Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["150"],
          thTypeId,
        );
      }
    }

    if (thTypeId && pressureClassIds["300"]) {
      for (const row of thClass300Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["300"],
          thTypeId,
        );
      }
    }

    if (orTypeId && pressureClassIds["300"]) {
      for (const row of orClass300Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["300"],
          orTypeId,
        );
      }
    }

    if (orTypeId && pressureClassIds["600"]) {
      for (const row of orClass600Data) {
        await insertFlangeDimension(
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          pressureClassIds["600"],
          orTypeId,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const standardResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );
    if (standardResult.length > 0) {
      const standardId = standardResult[0].id;

      const ljTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/4'`);
      const swTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/5'`);
      const thTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/6'`);
      const orTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/7'`);

      const typeIds = [
        ljTypeResult[0]?.id,
        swTypeResult[0]?.id,
        thTypeResult[0]?.id,
        orTypeResult[0]?.id,
      ].filter((id) => id);

      if (typeIds.length > 0) {
        await queryRunner.query(
          `DELETE FROM flange_dimensions WHERE "standardId" = ${standardId} AND "flangeTypeId" IN (${typeIds.join(",")})`,
        );
      }
    }
  }
}
