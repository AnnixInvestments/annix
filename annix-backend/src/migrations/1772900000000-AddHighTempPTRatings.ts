import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHighTempPTRatings1772900000000 implements MigrationInterface {
  name = 'AddHighTempPTRatings1772900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding high-temperature P-T ratings (>450°C)...');

    const b165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );

    if (b165Result.length === 0) {
      console.warn('ASME B16.5 standard not found, skipping...');
      return;
    }

    const standardId = b165Result[0].id;

    const pressureClasses = await queryRunner.query(`
      SELECT id, designation FROM flange_pressure_classes
      WHERE "standardId" = ${standardId}
    `);

    const classMap: Record<string, number> = {};
    for (const pc of pressureClasses) {
      classMap[pc.designation] = pc.id;
    }

    const f5HighTempData: Record<string, Record<number, number>> = {
      '150': { '454': 6.9, '482': 5.5, '510': 4.1, '538': 2.8 },
      '300': { '454': 18.3, '482': 14.8, '510': 11.0, '538': 7.6 },
      '400': { '454': 24.3, '482': 19.7, '510': 14.7, '538': 10.1 },
      '600': { '454': 36.5, '482': 29.6, '510': 22.0, '538': 15.2 },
      '900': { '454': 54.8, '482': 44.4, '510': 33.0, '538': 22.7 },
      '1500': { '454': 91.3, '482': 73.9, '510': 55.0, '538': 37.9 },
      '2500': { '454': 152.1, '482': 123.2, '510': 91.7, '538': 63.1 },
    };

    const f9HighTempData: Record<string, Record<number, number>> = {
      '150': { '454': 8.6, '482': 7.2, '510': 5.5, '538': 3.8, '566': 2.5 },
      '300': { '454': 23.0, '482': 19.4, '510': 14.8, '538': 10.3, '566': 6.8 },
      '400': { '454': 30.7, '482': 25.9, '510': 19.7, '538': 13.7, '566': 9.1 },
      '600': {
        '454': 46.0,
        '482': 38.8,
        '510': 29.6,
        '538': 20.6,
        '566': 13.6,
      },
      '900': {
        '454': 69.1,
        '482': 58.2,
        '510': 44.4,
        '538': 30.9,
        '566': 20.4,
      },
      '1500': {
        '454': 115.1,
        '482': 97.0,
        '510': 74.0,
        '538': 51.5,
        '566': 34.0,
      },
      '2500': {
        '454': 191.8,
        '482': 161.7,
        '510': 123.4,
        '538': 85.8,
        '566': 56.6,
      },
    };

    const f91HighTempData: Record<string, Record<number, number>> = {
      '150': {
        '454': 10.8,
        '482': 9.8,
        '510': 8.6,
        '538': 7.2,
        '566': 5.7,
        '593': 4.2,
        '621': 2.9,
      },
      '300': {
        '454': 29.0,
        '482': 26.2,
        '510': 23.0,
        '538': 19.4,
        '566': 15.3,
        '593': 11.3,
        '621': 7.8,
      },
      '400': {
        '454': 38.7,
        '482': 34.9,
        '510': 30.7,
        '538': 25.9,
        '566': 20.4,
        '593': 15.1,
        '621': 10.4,
      },
      '600': {
        '454': 58.0,
        '482': 52.4,
        '510': 46.0,
        '538': 38.8,
        '566': 30.6,
        '593': 22.6,
        '621': 15.6,
      },
      '900': {
        '454': 87.0,
        '482': 78.6,
        '510': 69.1,
        '538': 58.2,
        '566': 45.9,
        '593': 33.9,
        '621': 23.4,
      },
      '1500': {
        '454': 145.0,
        '482': 130.9,
        '510': 115.1,
        '538': 97.0,
        '566': 76.5,
        '593': 56.5,
        '621': 39.0,
      },
      '2500': {
        '454': 241.7,
        '482': 218.2,
        '510': 191.8,
        '538': 161.7,
        '566': 127.5,
        '593': 94.2,
        '621': 65.0,
      },
    };

    const incoloy800Data: Record<string, Record<number, number>> = {
      '150': {
        '454': 8.6,
        '482': 7.6,
        '510': 6.5,
        '538': 5.5,
        '566': 4.5,
        '593': 3.6,
        '621': 2.8,
        '649': 2.1,
        '677': 1.5,
      },
      '300': {
        '454': 23.0,
        '482': 20.3,
        '510': 17.4,
        '538': 14.8,
        '566': 12.1,
        '593': 9.6,
        '621': 7.5,
        '649': 5.6,
        '677': 4.0,
      },
      '400': {
        '454': 30.7,
        '482': 27.1,
        '510': 23.2,
        '538': 19.7,
        '566': 16.1,
        '593': 12.8,
        '621': 10.0,
        '649': 7.5,
        '677': 5.4,
      },
      '600': {
        '454': 46.0,
        '482': 40.6,
        '510': 34.8,
        '538': 29.6,
        '566': 24.2,
        '593': 19.2,
        '621': 15.0,
        '649': 11.2,
        '677': 8.0,
      },
      '900': {
        '454': 69.1,
        '482': 60.9,
        '510': 52.2,
        '538': 44.4,
        '566': 36.3,
        '593': 28.8,
        '621': 22.5,
        '649': 16.9,
        '677': 12.1,
      },
      '1500': {
        '454': 115.1,
        '482': 101.5,
        '510': 87.0,
        '538': 74.0,
        '566': 60.5,
        '593': 48.0,
        '621': 37.5,
        '649': 28.1,
        '677': 20.1,
      },
      '2500': {
        '454': 191.8,
        '482': 169.1,
        '510': 145.0,
        '538': 123.4,
        '566': 100.8,
        '593': 80.0,
        '621': 62.5,
        '649': 46.8,
        '677': 33.5,
      },
    };

    const titaniumGr2Data: Record<string, Record<number, number>> = {
      '150': { '204': 17.2, '260': 15.1, '316': 12.9 },
      '300': { '204': 46.4, '260': 40.8, '316': 35.1 },
      '400': { '204': 61.9, '260': 54.4, '316': 46.8 },
      '600': { '204': 92.8, '260': 81.6, '316': 70.2 },
      '900': { '204': 139.2, '260': 122.4, '316': 105.3 },
      '1500': { '204': 232.0, '260': 204.0, '316': 175.5 },
      '2500': { '204': 386.7, '260': 340.0, '316': 292.5 },
    };

    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Alloy Steel A182 F5 (Group 1.9)',
      f5HighTempData,
    );
    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Alloy Steel A182 F9 (Group 1.10)',
      f9HighTempData,
    );
    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Alloy Steel A182 F91 (Group 1.14)',
      f91HighTempData,
    );
    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Incoloy 800/800H (Group 4.4)',
      incoloy800Data,
    );
    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Titanium Grade 2 (Group 5.1)',
      titaniumGr2Data,
    );

    console.warn('High-temperature P-T ratings added successfully.');
  }

  private async insertPTRatings(
    queryRunner: QueryRunner,
    classMap: Record<string, number>,
    materialGroup: string,
    data: Record<string, Record<number, number>>,
  ): Promise<void> {
    for (const [designation, temps] of Object.entries(data)) {
      const classId = classMap[designation];
      if (!classId) continue;

      for (const [tempStr, pressureBar] of Object.entries(temps)) {
        const temp = parseFloat(tempStr);
        await queryRunner.query(
          `
          INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
          DO UPDATE SET max_pressure_bar = $4
        `,
          [classId, materialGroup, temp, pressureBar],
        );
      }
    }
    console.warn(`Added high-temp P-T ratings for ${materialGroup}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const b165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );
    if (b165Result.length === 0) return;
    const standardId = b165Result[0].id;

    const materials = [
      'Alloy Steel A182 F5 (Group 1.9)',
      'Alloy Steel A182 F9 (Group 1.10)',
      'Alloy Steel A182 F91 (Group 1.14)',
      'Incoloy 800/800H (Group 4.4)',
      'Titanium Grade 2 (Group 5.1)',
    ];

    for (const material of materials) {
      await queryRunner.query(
        `
        DELETE FROM flange_pt_ratings
        WHERE pressure_class_id IN (SELECT id FROM flange_pressure_classes WHERE "standardId" = $1)
        AND material_group = $2
      `,
        [standardId, material],
      );
    }
  }
}
