import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSabs1123MaterialPTRatings1772000000000 implements MigrationInterface {
  name = 'AddSabs1123MaterialPTRatings1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding SABS 1123 material-specific P-T ratings...');

    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    if (sabs1123Result.length === 0) {
      console.warn('SABS 1123 standard not found, skipping...');
      return;
    }
    const standardId = sabs1123Result[0].id;

    const pressureClasses = await queryRunner.query(`
      SELECT id, designation FROM flange_pressure_classes
      WHERE "standardId" = ${standardId}
    `);

    const classMap: Record<string, number> = {};
    for (const pc of pressureClasses) {
      const baseDesignation = pc.designation.split('/')[0];
      if (!classMap[baseDesignation]) {
        classMap[baseDesignation] = pc.id;
      }
    }

    const ss316Data: Record<string, Record<number, number>> = {
      '1000': {
        '-29': 10.0,
        '50': 10.0,
        '100': 9.0,
        '150': 8.3,
        '200': 7.5,
        '250': 6.7,
        '300': 5.8,
        '350': 5.0,
        '400': 4.2,
      },
      '1600': {
        '-29': 16.0,
        '50': 16.0,
        '100': 14.4,
        '150': 13.3,
        '200': 12.0,
        '250': 10.7,
        '300': 9.3,
        '350': 8.0,
        '400': 6.7,
      },
      '2500': {
        '-29': 25.0,
        '50': 25.0,
        '100': 22.5,
        '150': 20.8,
        '200': 18.8,
        '250': 16.7,
        '300': 14.6,
        '350': 12.5,
        '400': 10.4,
      },
      '4000': {
        '-29': 40.0,
        '50': 40.0,
        '100': 36.0,
        '150': 33.3,
        '200': 30.0,
        '250': 26.7,
        '300': 23.3,
        '350': 20.0,
        '400': 16.7,
      },
    };

    const ss304Data: Record<string, Record<number, number>> = {
      '1000': {
        '-29': 10.0,
        '50': 10.0,
        '100': 9.2,
        '150': 8.5,
        '200': 7.7,
        '250': 6.8,
        '300': 6.0,
        '350': 5.3,
        '400': 4.7,
        '450': 4.0,
      },
      '1600': {
        '-29': 16.0,
        '50': 16.0,
        '100': 14.7,
        '150': 13.6,
        '200': 12.3,
        '250': 10.9,
        '300': 9.6,
        '350': 8.5,
        '400': 7.5,
        '450': 6.4,
      },
      '2500': {
        '-29': 25.0,
        '50': 25.0,
        '100': 23.0,
        '150': 21.3,
        '200': 19.2,
        '250': 17.1,
        '300': 15.0,
        '350': 13.3,
        '400': 11.7,
        '450': 10.0,
      },
      '4000': {
        '-29': 40.0,
        '50': 40.0,
        '100': 36.8,
        '150': 34.0,
        '200': 30.8,
        '250': 27.3,
        '300': 24.0,
        '350': 21.3,
        '400': 18.7,
        '450': 16.0,
      },
    };

    const f11Data: Record<string, Record<number, number>> = {
      '1000': {
        '-29': 10.0,
        '50': 10.0,
        '100': 9.7,
        '150': 9.3,
        '200': 9.0,
        '250': 8.7,
        '300': 8.2,
        '350': 7.5,
        '400': 6.7,
        '450': 5.7,
        '500': 4.5,
      },
      '1600': {
        '-29': 16.0,
        '50': 16.0,
        '100': 15.5,
        '150': 14.9,
        '200': 14.4,
        '250': 13.9,
        '300': 13.1,
        '350': 12.0,
        '400': 10.7,
        '450': 9.1,
        '500': 7.2,
      },
      '2500': {
        '-29': 25.0,
        '50': 25.0,
        '100': 24.3,
        '150': 23.3,
        '200': 22.5,
        '250': 21.7,
        '300': 20.5,
        '350': 18.8,
        '400': 16.7,
        '450': 14.2,
        '500': 11.3,
      },
      '4000': {
        '-29': 40.0,
        '50': 40.0,
        '100': 38.8,
        '150': 37.3,
        '200': 36.0,
        '250': 34.7,
        '300': 32.8,
        '350': 30.0,
        '400': 26.7,
        '450': 22.7,
        '500': 18.0,
      },
    };

    const f22Data: Record<string, Record<number, number>> = {
      '1000': {
        '-29': 10.0,
        '50': 10.0,
        '100': 9.8,
        '150': 9.5,
        '200': 9.2,
        '250': 9.0,
        '300': 8.7,
        '350': 8.2,
        '400': 7.5,
        '450': 6.7,
        '500': 5.7,
        '538': 4.7,
      },
      '1600': {
        '-29': 16.0,
        '50': 16.0,
        '100': 15.7,
        '150': 15.2,
        '200': 14.7,
        '250': 14.4,
        '300': 13.9,
        '350': 13.1,
        '400': 12.0,
        '450': 10.7,
        '500': 9.1,
        '538': 7.5,
      },
      '2500': {
        '-29': 25.0,
        '50': 25.0,
        '100': 24.5,
        '150': 23.8,
        '200': 23.0,
        '250': 22.5,
        '300': 21.7,
        '350': 20.5,
        '400': 18.8,
        '450': 16.7,
        '500': 14.2,
        '538': 11.7,
      },
      '4000': {
        '-29': 40.0,
        '50': 40.0,
        '100': 39.2,
        '150': 38.0,
        '200': 36.8,
        '250': 36.0,
        '300': 34.7,
        '350': 32.8,
        '400': 30.0,
        '450': 26.7,
        '500': 22.7,
        '538': 18.7,
      },
    };

    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Stainless Steel 316 (Group 2.2)',
      ss316Data,
    );
    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Stainless Steel 304 (Group 2.1)',
      ss304Data,
    );
    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Alloy Steel A182 F11 (Group 2.3)',
      f11Data,
    );
    await this.insertPTRatings(
      queryRunner,
      classMap,
      'Alloy Steel A182 F22 (Group 2.4)',
      f22Data,
    );

    console.warn('SABS 1123 material P-T ratings added successfully.');
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
    console.warn(`Added SABS 1123 P-T ratings for ${materialGroup}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    if (sabs1123Result.length === 0) return;
    const standardId = sabs1123Result[0].id;

    const materials = [
      'Stainless Steel 316 (Group 2.2)',
      'Stainless Steel 304 (Group 2.1)',
      'Alloy Steel A182 F11 (Group 2.3)',
      'Alloy Steel A182 F22 (Group 2.4)',
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
