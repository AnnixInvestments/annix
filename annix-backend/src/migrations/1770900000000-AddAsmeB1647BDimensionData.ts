import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAsmeB1647BDimensionData1770900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    let b1647bId: number;
    const b1647bResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47B'`,
    );
    if (b1647bResult.length === 0) {
      const insertResult = await queryRunner.query(
        `INSERT INTO flange_standards (code) VALUES ('ASME B16.47B') RETURNING id`,
      );
      b1647bId = insertResult[0].id;
    } else {
      b1647bId = b1647bResult[0].id;
    }

    const wnTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/2'`);
    const wnTypeId = wnTypeResult[0]?.id || null;

    const blTypeResult = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '/8'`);
    const blTypeId = blTypeResult[0]?.id || null;

    const pressureClasses = ["150", "300"];
    const pressureClassIds: Record<string, number> = {};

    for (const pc of pressureClasses) {
      const existing = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = '${pc}' AND "standardId" = ${b1647bId}`,
      );
      if (existing.length === 0) {
        const result = await queryRunner.query(
          `INSERT INTO flange_pressure_classes (designation, "standardId") VALUES ('${pc}', ${b1647bId}) RETURNING id`,
        );
        pressureClassIds[pc] = result[0].id;
      } else {
        pressureClassIds[pc] = existing[0].id;
      }
    }

    const npsToNbMap: Record<number, number> = {
      26: 650,
      28: 700,
      30: 750,
      32: 800,
      34: 850,
      36: 900,
      38: 950,
      40: 1000,
      42: 1050,
      44: 1100,
      46: 1150,
      48: 1200,
      50: 1250,
      52: 1300,
      54: 1350,
      56: 1400,
      58: 1450,
      60: 1500,
    };

    const nbIdMap: Record<number, number> = {};
    for (const [nps, nb] of Object.entries(npsToNbMap)) {
      const result = await queryRunner.query(
        `SELECT id FROM nominal_outside_diameters WHERE nominal_diameter_mm = ${nb} LIMIT 1`,
      );
      if (result.length > 0) {
        nbIdMap[Number(nps)] = result[0].id;
      }
    }

    const boltIds: Record<string, number> = {};
    const boltSizes = [
      "M20",
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
    ];
    for (const size of boltSizes) {
      const result = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${size}'`);
      if (result.length > 0) {
        boltIds[size] = result[0].id;
      }
    }

    const class150WnData: [
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
      [26, 785, 41, 660, 2, 36, 22, "M20", 745, 95],
      [28, 835, 45, 711, 2, 40, 22, "M20", 795, 115],
      [30, 885, 45, 762, 2, 44, 22, "M20", 846, 130],
      [32, 940, 46, 813, 2, 48, 22, "M20", 900, 150],
      [34, 1005, 49, 864, 2, 40, 25, "M24", 957, 175],
      [36, 1055, 53, 914, 2, 44, 25, "M24", 1010, 200],
      [38, 1125, 54, 965, 2, 40, 29, "M27", 1070, 230],
      [40, 1175, 56, 1016, 2, 44, 29, "M27", 1121, 260],
      [42, 1225, 59, 1067, 2, 48, 29, "M27", 1172, 295],
      [44, 1275, 61, 1118, 2, 52, 29, "M27", 1222, 330],
      [46, 1340, 62, 1168, 2, 40, 32, "M30", 1284, 370],
      [48, 1390, 65, 1219, 2, 44, 32, "M30", 1335, 410],
      [50, 1445, 68, 1270, 2, 48, 32, "M30", 1386, 455],
      [52, 1495, 70, 1321, 2, 52, 32, "M30", 1437, 500],
      [54, 1550, 72, 1372, 2, 56, 32, "M30", 1492, 550],
      [56, 1600, 73, 1422, 2, 60, 32, "M30", 1543, 600],
      [58, 1675, 75, 1473, 2, 48, 35, "M33", 1611, 660],
      [60, 1725, 76, 1524, 2, 52, 35, "M33", 1662, 720],
    ];

    const class150BlData: [
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
      [26, 785, 45, 0, 2, 36, 22, "M20", 745, 220],
      [28, 835, 48, 0, 2, 40, 22, "M20", 795, 265],
      [30, 885, 51, 0, 2, 44, 22, "M20", 846, 315],
      [32, 940, 54, 0, 2, 48, 22, "M20", 900, 375],
      [34, 1005, 57, 0, 2, 40, 25, "M24", 957, 440],
      [36, 1055, 59, 0, 2, 44, 25, "M24", 1010, 505],
      [38, 1125, 64, 0, 2, 40, 29, "M27", 1070, 605],
      [40, 1175, 67, 0, 2, 44, 29, "M27", 1121, 690],
      [42, 1225, 68, 0, 2, 48, 29, "M27", 1172, 775],
      [44, 1275, 72, 0, 2, 52, 29, "M27", 1222, 870],
      [46, 1340, 75, 0, 2, 40, 32, "M30", 1284, 980],
      [48, 1390, 78, 0, 2, 44, 32, "M30", 1335, 1090],
      [50, 1445, 81, 0, 2, 48, 32, "M30", 1386, 1210],
      [52, 1495, 84, 0, 2, 52, 32, "M30", 1437, 1340],
      [54, 1550, 87, 0, 2, 56, 32, "M30", 1492, 1480],
      [56, 1600, 91, 0, 2, 60, 32, "M30", 1543, 1630],
      [58, 1675, 94, 0, 2, 48, 35, "M33", 1611, 1810],
      [60, 1725, 97, 0, 2, 52, 35, "M33", 1662, 1990],
    ];

    const class300WnData: [
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
      [26, 865, 89, 660, 2, 32, 35, "M33", 803, 245],
      [28, 920, 89, 711, 2, 36, 35, "M33", 857, 285],
      [30, 990, 94, 762, 2, 36, 38, "M36", 921, 345],
      [32, 1055, 103, 813, 2, 32, 41, "M39", 978, 420],
      [34, 1110, 103, 864, 2, 36, 41, "M39", 1032, 475],
      [36, 1170, 103, 914, 2, 32, 45, "M42", 1089, 530],
      [38, 1220, 111, 965, 2, 36, 45, "M42", 1140, 595],
      [40, 1275, 116, 1016, 2, 40, 45, "M42", 1191, 675],
      [42, 1335, 119, 1067, 2, 36, 48, "M45", 1245, 765],
      [44, 1385, 127, 1118, 2, 40, 48, "M45", 1295, 850],
      [46, 1460, 129, 1168, 2, 36, 51, "M48", 1365, 955],
      [48, 1510, 129, 1219, 2, 40, 51, "M48", 1416, 1045],
      [50, 1560, 138, 1270, 2, 44, 51, "M48", 1467, 1150],
      [52, 1615, 143, 1321, 2, 48, 51, "M48", 1518, 1260],
      [54, 1675, 137, 1372, 2, 48, 51, "M48", 1578, 1375],
      [56, 1765, 154, 1422, 2, 36, 60, "M56", 1651, 1580],
      [58, 1825, 154, 1473, 2, 40, 60, "M56", 1713, 1725],
      [60, 1880, 151, 1524, 2, 40, 60, "M56", 1764, 1850],
    ];

    const class300BlData: [
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
      [26, 865, 89, 0, 2, 32, 35, "M33", 803, 470],
      [28, 920, 89, 0, 2, 36, 35, "M33", 857, 560],
      [30, 990, 94, 0, 2, 36, 38, "M36", 921, 680],
      [32, 1055, 103, 0, 2, 32, 41, "M39", 978, 825],
      [34, 1110, 103, 0, 2, 36, 41, "M39", 1032, 945],
      [36, 1170, 103, 0, 2, 32, 45, "M42", 1089, 1085],
      [38, 1220, 111, 0, 2, 36, 45, "M42", 1140, 1235],
      [40, 1275, 116, 0, 2, 40, 45, "M42", 1191, 1405],
      [42, 1335, 119, 0, 2, 36, 48, "M45", 1245, 1590],
      [44, 1385, 127, 0, 2, 40, 48, "M45", 1295, 1785],
      [46, 1460, 130, 0, 2, 36, 51, "M48", 1365, 2020],
      [48, 1510, 135, 0, 2, 40, 51, "M48", 1416, 2240],
      [50, 1560, 140, 0, 2, 44, 51, "M48", 1467, 2485],
      [52, 1615, 144, 0, 2, 48, 51, "M48", 1518, 2745],
      [54, 1675, 149, 0, 2, 48, 51, "M48", 1578, 3025],
      [56, 1765, 157, 0, 2, 36, 60, "M56", 1651, 3450],
      [58, 1825, 162, 0, 2, 40, 60, "M56", 1713, 3830],
      [60, 1880, 167, 0, 2, 40, 60, "M56", 1764, 4180],
    ];

    const insertFlangeDimension = async (
      nps: number,
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
      if (nbId) {
        const existing = await queryRunner.query(
          `SELECT id FROM flange_dimensions WHERE "nominalOutsideDiameterId" = ${nbId} AND "standardId" = ${b1647bId} AND "pressureClassId" = ${pressureClassId} AND "flangeTypeId" ${flangeTypeId ? `= ${flangeTypeId}` : "IS NULL"}`,
        );
        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions ("nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId", "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg")
            VALUES (${nbId}, ${b1647bId}, ${pressureClassId}, ${flangeTypeId || "NULL"}, ${D}, ${b}, ${d4}, ${f}, ${numHoles}, ${d1}, ${boltId || "NULL"}, ${pcd}, ${massKg})
          `);
        }
      }
    };

    for (const row of class150WnData) {
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
        wnTypeId,
      );
    }

    for (const row of class150BlData) {
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
        blTypeId,
      );
    }

    for (const row of class300WnData) {
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
        wnTypeId,
      );
    }

    for (const row of class300BlData) {
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
        blTypeId,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const standardResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47B'`,
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
