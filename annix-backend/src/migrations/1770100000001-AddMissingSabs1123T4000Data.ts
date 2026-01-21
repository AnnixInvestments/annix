import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingSabs1123T4000Data1770100000001
  implements MigrationInterface
{
  name = 'AddMissingSabs1123T4000Data1770100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding missing SABS 1123 T4000 flange data for 350-600NB...');

    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`
    );
    if (sabs1123Result.length === 0) {
      console.warn('SABS 1123 standard not found, skipping...');
      return;
    }
    const sabs1123Id = sabs1123Result[0].id;

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(
        `SELECT id FROM flange_types WHERE code = '${code}'`
      );
      return result[0]?.id;
    };

    const typeIds: Record<string, number | undefined> = {
      '/1': await getTypeId('/1'),
      '/2': await getTypeId('/2'),
      '/3': await getTypeId('/3'),
      '/7': await getTypeId('/7'),
      '/8': await getTypeId('/8'),
    };

    const getPressureClassId = async (designation: string) => {
      const result = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${designation}' AND "standardId" = ${sabs1123Id}
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

    const getNominalId = async (nominalMm: number) => {
      const result = await queryRunner.query(`
        SELECT id FROM nominal_outside_diameters
        WHERE nominal_diameter_mm = ${nominalMm}
        LIMIT 1
      `);
      return result[0]?.id;
    };

    // Missing SABS 1123 T4000 flange dimension data for 350-600NB
    // Format: [NB, type, pressureClass, D, b, d4, f, holes, d1, bolt, pcd, mass, boltLength]
    // Based on SABS 1123 / SANS 1123 Table 4000 standard

    const flangeData: Array<[number, string, number, number, number, number, number, number, number, string, number, number, number]> = [
      // ===== 350NB (355.6 OD) T4000 =====
      [350, '/2', 4000, 650, 90, 363, 4, 16, 45, 'M42', 580, 160.00, 235],
      [350, '/3', 4000, 650, 62, 363, 4, 16, 45, 'M42', 580, 105.00, 165],
      [350, '/1', 4000, 650, 58, 363, 4, 16, 45, 'M42', 580, 95.00, 155],
      [350, '/7', 4000, 650, 68, 363, 4, 16, 45, 'M42', 580, 115.00, 180],
      [350, '/8', 4000, 650, 90, 0, 4, 16, 45, 'M42', 580, 140.00, 235],

      // ===== 400NB (406.4 OD) T4000 =====
      [400, '/2', 4000, 710, 96, 413, 4, 16, 48, 'M45', 635, 195.00, 250],
      [400, '/3', 4000, 710, 68, 413, 4, 16, 48, 'M45', 635, 135.00, 180],
      [400, '/1', 4000, 710, 64, 413, 4, 16, 48, 'M45', 635, 125.00, 170],
      [400, '/7', 4000, 710, 74, 413, 4, 16, 48, 'M45', 635, 150.00, 195],
      [400, '/8', 4000, 710, 96, 0, 4, 16, 48, 'M45', 635, 175.00, 250],

      // ===== 450NB (457.2 OD) T4000 =====
      [450, '/2', 4000, 770, 102, 463, 4, 20, 48, 'M45', 690, 245.00, 265],
      [450, '/3', 4000, 770, 72, 463, 4, 20, 48, 'M45', 690, 165.00, 190],
      [450, '/1', 4000, 770, 68, 463, 4, 20, 48, 'M45', 690, 155.00, 180],
      [450, '/7', 4000, 770, 78, 463, 4, 20, 48, 'M45', 690, 180.00, 205],
      [450, '/8', 4000, 770, 102, 0, 4, 20, 48, 'M45', 690, 215.00, 265],

      // ===== 500NB (508.0 OD) T4000 =====
      [500, '/2', 4000, 840, 110, 525, 4, 20, 52, 'M48', 755, 305.00, 285],
      [500, '/3', 4000, 840, 78, 525, 4, 20, 52, 'M48', 755, 210.00, 205],
      [500, '/1', 4000, 840, 74, 525, 4, 20, 52, 'M48', 755, 195.00, 195],
      [500, '/7', 4000, 840, 84, 525, 4, 20, 52, 'M48', 755, 230.00, 220],
      [500, '/8', 4000, 840, 110, 0, 4, 20, 52, 'M48', 755, 270.00, 285],

      // ===== 600NB (609.6 OD) T4000 =====
      [600, '/2', 4000, 990, 130, 630, 5, 20, 62, 'M56', 890, 455.00, 335],
      [600, '/3', 4000, 990, 92, 630, 5, 20, 62, 'M56', 890, 310.00, 240],
      [600, '/1', 4000, 990, 88, 630, 5, 20, 62, 'M56', 890, 290.00, 230],
      [600, '/7', 4000, 990, 100, 630, 5, 20, 62, 'M56', 890, 345.00, 260],
      [600, '/8', 4000, 990, 130, 0, 5, 20, 62, 'M56', 890, 405.00, 335],
    ];

    for (const row of flangeData) {
      const [nb, typeCode, pressureValue, D, b, d4, f, holes, d1, bolt, pcd, mass, boltLength] = row;

      const nominalId = await getNominalId(nb);
      if (!nominalId) {
        console.warn(`Nominal size ${nb} not found, skipping...`);
        continue;
      }

      const flangeTypeId = typeIds[typeCode];
      const designation = `${pressureValue}${typeCode}`;
      const pressureClassId = await getPressureClassId(designation);
      if (!pressureClassId) {
        console.warn(`Pressure class ${designation} not found, skipping...`);
        continue;
      }

      const boltId = await getBoltId(bolt);

      const existing = await queryRunner.query(`
        SELECT id FROM flange_dimensions
        WHERE "nominalOutsideDiameterId" = ${nominalId}
        AND "standardId" = ${sabs1123Id}
        AND "pressureClassId" = ${pressureClassId}
        ${flangeTypeId ? `AND "flangeTypeId" = ${flangeTypeId}` : ''}
      `);

      if (existing.length > 0) {
        await queryRunner.query(`
          UPDATE flange_dimensions SET
            "D" = ${D}, "b" = ${b}, "d4" = ${d4}, "f" = ${f},
            "num_holes" = ${holes}, "d1" = ${d1}, "pcd" = ${pcd},
            "mass_kg" = ${mass}, "boltId" = ${boltId || 'NULL'}
          WHERE id = ${existing[0].id}
        `);
        console.warn(`Updated ${nb}NB T${pressureValue}${typeCode}`);
      } else {
        await queryRunner.query(`
          INSERT INTO flange_dimensions (
            "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
            "D", "b", "d4", "f", "num_holes", "d1", "pcd", "mass_kg", "boltId"
          ) VALUES (
            ${nominalId}, ${sabs1123Id}, ${pressureClassId}, ${flangeTypeId || 'NULL'},
            ${D}, ${b}, ${d4}, ${f}, ${holes}, ${d1}, ${pcd}, ${mass}, ${boltId || 'NULL'}
          )
        `);
        console.warn(`Inserted ${nb}NB T${pressureValue}${typeCode}`);
      }

    }

    console.warn('Missing SABS 1123 T4000 flange data added successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Removing SABS 1123 T4000 data for 350-600NB...');

    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`
    );
    if (sabs1123Result.length === 0) return;
    const sabs1123Id = sabs1123Result[0].id;

    const getNominalId = async (nominalMm: number) => {
      const result = await queryRunner.query(`
        SELECT id FROM nominal_outside_diameters
        WHERE nominal_diameter_mm = ${nominalMm}
        LIMIT 1
      `);
      return result[0]?.id;
    };

    const nbSizes = [350, 400, 450, 500, 600];
    for (const nb of nbSizes) {
      const nominalId = await getNominalId(nb);
      if (nominalId) {
        const pressureClassResult = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation LIKE '4000%' AND "standardId" = ${sabs1123Id}
        `);
        for (const pc of pressureClassResult) {
          await queryRunner.query(`
            DELETE FROM flange_dimensions
            WHERE "nominalOutsideDiameterId" = ${nominalId}
            AND "standardId" = ${sabs1123Id}
            AND "pressureClassId" = ${pc.id}
          `);
        }
      }
    }
  }
}
