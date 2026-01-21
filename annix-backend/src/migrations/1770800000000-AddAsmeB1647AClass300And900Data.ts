import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsmeB1647AClass300And900Data1770800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const b1647aResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47A'`,
    );
    if (b1647aResult.length === 0) {
      return;
    }
    const b1647aId = b1647aResult[0].id;

    const wnTypeResult = await queryRunner.query(
      `SELECT id FROM flange_types WHERE code = '/2'`,
    );
    const wnTypeId = wnTypeResult[0]?.id || null;

    const blTypeResult = await queryRunner.query(
      `SELECT id FROM flange_types WHERE code = '/8'`,
    );
    const blTypeId = blTypeResult[0]?.id || null;

    const class300Result = await queryRunner.query(
      `SELECT id FROM flange_pressure_classes WHERE designation = '300' AND "standardId" = ${b1647aId}`,
    );
    const class300Id = class300Result[0]?.id;

    const class900Result = await queryRunner.query(
      `SELECT id FROM flange_pressure_classes WHERE designation = '900' AND "standardId" = ${b1647aId}`,
    );
    const class900Id = class900Result[0]?.id;

    if (!class300Id || !class900Id) {
      return;
    }

    const largeBoltSizes = ['M72', 'M80'];
    for (const size of largeBoltSizes) {
      const existing = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${size}'`,
      );
      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO bolts (designation, grade, material, head_style, thread_type) VALUES ('${size}', '8.8', 'Carbon Steel', 'hex', 'coarse')`,
        );
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
      'M36',
      'M39',
      'M42',
      'M45',
      'M48',
      'M52',
      'M56',
      'M64',
      'M72',
      'M80',
      '2-3/4"',
      '3"',
      '3-1/4"',
      '3-1/2"',
      '3-3/4"',
      '4"',
    ];
    for (const size of boltSizes) {
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${size}'`,
      );
      if (result.length > 0) {
        boltIds[size] = result[0].id;
      }
    }

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
      [26, 972, 79, 721, 2, 28, 45, 'M39', 876, 283],
      [28, 1035, 86, 775, 2, 28, 45, 'M39', 940, 343],
      [30, 1092, 92, 827, 2, 28, 48, 'M42', 997, 395],
      [32, 1149, 99, 881, 2, 28, 51, 'M45', 1054, 455],
      [34, 1207, 102, 937, 2, 28, 51, 'M45', 1105, 511],
      [36, 1270, 105, 991, 2, 32, 54, 'M48', 1168, 568],
      [38, 1168, 108, 994, 7, 32, 41, 'M36', 1092, 318],
      [40, 1238, 114, 1055, 7, 32, 45, 'M39', 1156, 348],
      [42, 1289, 119, 1099, 7, 32, 45, 'M39', 1207, 420],
      [44, 1353, 124, 1149, 7, 32, 48, 'M42', 1264, 476],
      [46, 1416, 129, 1204, 7, 28, 51, 'M45', 1321, 549],
      [48, 1467, 108, 1248, 7, 32, 41, 'M36', 1422, 587],
      [50, 1530, 140, 1305, 7, 32, 54, 'M48', 1429, 664],
      [52, 1581, 145, 1356, 7, 32, 54, 'M48', 1480, 715],
      [54, 1657, 152, 1410, 7, 28, 61, 'M52', 1549, 857],
      [56, 1708, 154, 1464, 7, 28, 61, 'M52', 1600, 905],
      [58, 1759, 159, 1514, 7, 32, 61, 'M52', 1651, 952],
      [60, 1810, 164, 1565, 7, 32, 61, 'M52', 1702, 1015],
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
      [26, 972, 84, 0, 2, 28, 45, 'M39', 876, 460],
      [28, 1035, 90, 0, 2, 28, 45, 'M39', 940, 566],
      [30, 1092, 95, 0, 2, 28, 48, 'M42', 997, 663],
      [32, 1149, 100, 0, 2, 28, 51, 'M45', 1054, 771],
      [34, 1207, 105, 0, 2, 28, 51, 'M45', 1105, 893],
      [36, 1270, 111, 0, 2, 32, 54, 'M48', 1168, 1044],
      [38, 1168, 108, 0, 7, 32, 41, 'M36', 1092, 875],
      [40, 1238, 114, 0, 7, 32, 45, 'M39', 1156, 1039],
      [42, 1289, 119, 0, 7, 32, 45, 'M39', 1207, 1177],
      [44, 1353, 124, 0, 7, 32, 48, 'M42', 1264, 1346],
      [46, 1416, 129, 0, 7, 28, 51, 'M45', 1321, 1536],
      [48, 1467, 108, 0, 7, 32, 41, 'M36', 1422, 1707],
      [50, 1530, 140, 0, 7, 32, 54, 'M48', 1429, 1944],
      [52, 1581, 145, 0, 7, 32, 54, 'M48', 1480, 2153],
      [54, 1657, 152, 0, 7, 28, 61, 'M52', 1549, 2494],
      [56, 1708, 154, 0, 7, 28, 61, 'M52', 1600, 2682],
      [58, 1759, 159, 0, 7, 32, 61, 'M52', 1651, 2925],
      [60, 1810, 164, 0, 7, 32, 61, 'M52', 1702, 3198],
    ];

    const class900WnData: [
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
      [26, 1086, 140, 775, 7, 20, 73, 'M64', 953, 686],
      [28, 1168, 143, 832, 7, 20, 79, 'M72', 1022, 808],
      [30, 1232, 149, 889, 7, 20, 79, 'M72', 1086, 933],
      [32, 1315, 159, 946, 7, 20, 86, 'M80', 1156, 1116],
      [34, 1397, 165, 1006, 7, 20, 92, 'M80', 1226, 1310],
      [36, 1461, 172, 1064, 7, 20, 92, 'M80', 1289, 1479],
      [38, 1461, 191, 1073, 7, 20, 92, 'M80', 1289, 1445],
      [40, 1511, 197, 1127, 7, 24, 92, 'M80', 1340, 1529],
      [42, 1562, 206, 1176, 7, 24, 92, 'M80', 1391, 1666],
      [44, 1648, 214, 1235, 7, 24, 99, 'M80', 1464, 1939],
      [46, 1734, 226, 1292, 7, 24, 105, 'M80', 1537, 2265],
      [48, 1784, 233, 1343, 7, 24, 105, 'M80', 1588, 2433],
    ];

    const class900BlData: [
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
      [26, 1086, 160, 0, 7, 20, 73, 'M64', 953, 1087],
      [28, 1168, 172, 0, 7, 20, 79, 'M72', 1022, 1342],
      [30, 1232, 182, 0, 7, 20, 79, 'M72', 1086, 1602],
      [32, 1315, 194, 0, 7, 20, 86, 'M80', 1156, 1929],
      [34, 1397, 205, 0, 7, 20, 92, 'M80', 1226, 2299],
      [36, 1461, 214, 0, 7, 20, 92, 'M80', 1289, 2651],
      [38, 1461, 216, 0, 7, 20, 92, 'M80', 1289, 2676],
      [40, 1511, 224, 0, 7, 24, 92, 'M80', 1340, 2940],
      [42, 1562, 232, 0, 7, 24, 92, 'M80', 1391, 3271],
      [44, 1648, 243, 0, 7, 24, 99, 'M80', 1464, 3801],
      [46, 1734, 276, 0, 7, 24, 105, 'M80', 1537, 4414],
      [48, 1784, 264, 0, 7, 24, 105, 'M80', 1588, 4850],
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
          `SELECT id FROM flange_dimensions WHERE "nominalOutsideDiameterId" = ${nbId} AND "standardId" = ${b1647aId} AND "pressureClassId" = ${pressureClassId} AND "flangeTypeId" ${flangeTypeId ? `= ${flangeTypeId}` : 'IS NULL'}`,
        );
        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO flange_dimensions ("nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId", "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg")
            VALUES (${nbId}, ${b1647aId}, ${pressureClassId}, ${flangeTypeId || 'NULL'}, ${D}, ${b}, ${d4}, ${f}, ${numHoles}, ${d1}, ${boltId || 'NULL'}, ${pcd}, ${massKg})
          `);
        }
      }
    };

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
        class300Id,
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
        class300Id,
        blTypeId,
      );
    }

    for (const row of class900WnData) {
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
        class900Id,
        wnTypeId,
      );
    }

    for (const row of class900BlData) {
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
        class900Id,
        blTypeId,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const standardResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47A'`,
    );
    if (standardResult.length > 0) {
      const standardId = standardResult[0].id;

      const class300Result = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = '300' AND "standardId" = ${standardId}`,
      );
      const class900Result = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = '900' AND "standardId" = ${standardId}`,
      );

      if (class300Result.length > 0) {
        await queryRunner.query(
          `DELETE FROM flange_dimensions WHERE "standardId" = ${standardId} AND "pressureClassId" = ${class300Result[0].id}`,
        );
      }
      if (class900Result.length > 0) {
        await queryRunner.query(
          `DELETE FROM flange_dimensions WHERE "standardId" = ${standardId} AND "pressureClassId" = ${class900Result[0].id}`,
        );
      }
    }
  }
}
