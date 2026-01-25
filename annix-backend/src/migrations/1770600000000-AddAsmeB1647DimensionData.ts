import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsmeB1647DimensionData1770600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const b1647aResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47A'`,
    );
    let b1647aId: number;
    if (b1647aResult.length === 0) {
      const insertResult = await queryRunner.query(
        `INSERT INTO flange_standards (code) VALUES ('ASME B16.47A') RETURNING id`,
      );
      b1647aId = insertResult[0].id;
    } else {
      b1647aId = b1647aResult[0].id;
    }

    const wnTypeResult = await queryRunner.query(
      `SELECT id FROM flange_types WHERE code = '/2'`,
    );
    const wnTypeId = wnTypeResult[0]?.id || null;

    const blTypeResult = await queryRunner.query(
      `SELECT id FROM flange_types WHERE code = '/8'`,
    );
    const blTypeId = blTypeResult[0]?.id || null;

    const pressureClasses = ['150', '300', '600', '900'];
    const pressureClassIds: Record<string, number> = {};

    for (const pc of pressureClasses) {
      const existing = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = '${pc}' AND "standardId" = ${b1647aId}`,
      );
      if (existing.length === 0) {
        const result = await queryRunner.query(
          `INSERT INTO flange_pressure_classes (designation, "standardId") VALUES ('${pc}', ${b1647aId}) RETURNING id`,
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
      } else {
        const insertResult = await queryRunner.query(
          `INSERT INTO nominal_outside_diameters (nominal_diameter_mm, outside_diameter_mm) VALUES (${nb}, ${nb}) RETURNING id`,
        );
        nbIdMap[Number(nps)] = insertResult[0].id;
      }
    }

    const boltIds: Record<string, number> = {};
    const boltSizes = [
      'M30',
      'M33',
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
    ];
    for (const size of boltSizes) {
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${size}'`,
      );
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
      [26, 870, 68, 676, 2, 24, 35, 'M30', 806, 136],
      [28, 925, 72, 727, 2, 28, 35, 'M30', 864, 156],
      [30, 985, 75, 781, 2, 28, 35, 'M30', 914, 181],
      [32, 1060, 81, 832, 2, 28, 42, 'M36', 978, 229],
      [34, 1110, 83, 883, 2, 32, 42, 'M36', 1029, 245],
      [36, 1170, 91, 933, 2, 32, 42, 'M36', 1086, 290],
      [38, 1240, 87, 991, 2, 32, 42, 'M36', 1149, 327],
      [40, 1290, 91, 1041, 2, 36, 42, 'M36', 1200, 352],
      [42, 1345, 97, 1092, 2, 36, 42, 'M36', 1257, 404],
      [44, 1405, 102, 1143, 2, 40, 42, 'M36', 1314, 449],
      [46, 1455, 103, 1197, 2, 40, 42, 'M36', 1365, 481],
      [48, 1510, 108, 1248, 2, 44, 42, 'M36', 1422, 538],
      [50, 1570, 111, 1302, 2, 44, 48, 'M42', 1480, 576],
      [52, 1625, 116, 1353, 2, 44, 48, 'M42', 1537, 640],
      [54, 1685, 121, 1403, 2, 44, 48, 'M42', 1594, 719],
      [56, 1745, 124, 1457, 2, 48, 48, 'M42', 1651, 798],
      [58, 1805, 129, 1508, 2, 48, 48, 'M42', 1708, 869],
      [60, 1855, 132, 1559, 2, 52, 48, 'M42', 1759, 928],
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
      [26, 870, 68, 0, 2, 24, 35, 'M30', 806, 318],
      [28, 925, 72, 0, 2, 28, 35, 'M30', 864, 378],
      [30, 985, 75, 0, 2, 28, 35, 'M30', 914, 445],
      [32, 1060, 81, 0, 2, 28, 42, 'M36', 978, 561],
      [34, 1110, 83, 0, 2, 32, 42, 'M36', 1029, 628],
      [36, 1170, 91, 0, 2, 32, 42, 'M36', 1086, 760],
      [38, 1240, 87, 0, 2, 32, 42, 'M36', 1149, 825],
      [40, 1290, 91, 0, 2, 36, 42, 'M36', 1200, 925],
      [42, 1345, 97, 0, 2, 36, 42, 'M36', 1257, 1080],
      [44, 1405, 102, 0, 2, 40, 42, 'M36', 1314, 1232],
      [46, 1455, 103, 0, 2, 40, 42, 'M36', 1365, 1343],
      [48, 1510, 108, 0, 2, 44, 42, 'M36', 1422, 1519],
      [50, 1570, 111, 0, 2, 44, 48, 'M42', 1480, 1686],
      [52, 1625, 116, 0, 2, 44, 48, 'M42', 1537, 1885],
      [54, 1685, 121, 0, 2, 44, 48, 'M42', 1594, 2104],
      [56, 1745, 124, 0, 2, 48, 48, 'M42', 1651, 2328],
      [58, 1805, 129, 0, 2, 48, 48, 'M42', 1708, 2574],
      [60, 1855, 132, 0, 2, 52, 48, 'M42', 1759, 2791],
    ];

    const class600WnData: [
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
      [26, 1015, 114, 748, 2, 28, 51, 'M45', 914, 426],
      [28, 1075, 118, 803, 2, 28, 54, 'M48', 965, 481],
      [30, 1130, 121, 862, 2, 28, 54, 'M48', 1022, 549],
      [32, 1195, 124, 918, 2, 28, 60, 'M52', 1080, 624],
      [34, 1245, 127, 973, 2, 28, 60, 'M52', 1130, 699],
      [36, 1315, 130, 1032, 2, 28, 67, 'M56', 1194, 773],
      [38, 1270, 159, 1022, 2, 28, 60, 'M52', 1162, 667],
      [40, 1320, 165, 1073, 2, 32, 60, 'M52', 1213, 739],
      [42, 1405, 175, 1127, 2, 28, 67, 'M56', 1283, 921],
      [44, 1455, 179, 1181, 2, 32, 67, 'M56', 1334, 980],
      [46, 1510, 186, 1235, 2, 32, 67, 'M56', 1391, 1093],
      [48, 1595, 195, 1289, 2, 32, 73, 'M64', 1461, 1295],
      [50, 1670, 203, 1343, 2, 28, 79, 'M64', 1524, 1510],
      [52, 1720, 210, 1394, 2, 32, 79, 'M64', 1575, 1615],
      [54, 1780, 216, 1448, 2, 32, 79, 'M64', 1632, 1778],
      [56, 1855, 224, 1502, 2, 32, 86, 'M64', 1695, 1941],
      [58, 1905, 229, 1553, 2, 32, 86, 'M64', 1746, 2105],
      [60, 1995, 240, 1610, 2, 28, 92, 'M64', 1822, 2268],
    ];

    const class600BlData: [
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
      [26, 1015, 114, 0, 2, 28, 51, 'M45', 914, 798],
      [28, 1075, 118, 0, 2, 28, 54, 'M48', 965, 935],
      [30, 1130, 121, 0, 2, 28, 54, 'M48', 1022, 1099],
      [32, 1195, 124, 0, 2, 28, 60, 'M52', 1080, 1295],
      [34, 1245, 127, 0, 2, 28, 60, 'M52', 1130, 1468],
      [36, 1315, 130, 0, 2, 28, 67, 'M56', 1194, 1725],
      [38, 1270, 159, 0, 2, 28, 60, 'M52', 1162, 1544],
      [40, 1320, 165, 0, 2, 32, 60, 'M52', 1213, 1741],
      [42, 1405, 175, 0, 2, 28, 67, 'M56', 1283, 2080],
      [44, 1455, 179, 0, 2, 32, 67, 'M56', 1334, 2316],
      [46, 1510, 186, 0, 2, 32, 67, 'M56', 1391, 2612],
      [48, 1595, 195, 0, 2, 32, 73, 'M64', 1461, 3056],
      [50, 1670, 203, 0, 2, 28, 79, 'M64', 1524, 3490],
      [52, 1720, 210, 0, 2, 32, 79, 'M64', 1575, 3822],
      [54, 1780, 216, 0, 2, 32, 79, 'M64', 1632, 4233],
      [56, 1855, 224, 0, 2, 32, 86, 'M64', 1695, 4776],
      [58, 1905, 229, 0, 2, 32, 86, 'M64', 1746, 5177],
      [60, 1995, 240, 0, 2, 28, 92, 'M64', 1822, 5946],
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
        pressureClassIds['150'],
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
        pressureClassIds['150'],
        blTypeId,
      );
    }

    for (const row of class600WnData) {
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
        pressureClassIds['600'],
        wnTypeId,
      );
    }

    for (const row of class600BlData) {
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
        pressureClassIds['600'],
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
      await queryRunner.query(
        `DELETE FROM flange_dimensions WHERE "standardId" = ${standardId}`,
      );
      await queryRunner.query(
        `DELETE FROM flange_pressure_classes WHERE "standardId" = ${standardId}`,
      );
    }
  }
}
