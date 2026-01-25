import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsmeB165FlangeTypeWeights1778000200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const asmeB165Id = await this.flangeStandardId(queryRunner, 'ASME B16.5');

    const weldNeckWeights = this.asmeB165WeldNeckWeights();
    const slipOnWeights = this.asmeB165SlipOnWeights();
    const blindWeights = this.asmeB165BlindWeights();

    for (const pc of Object.keys(weldNeckWeights)) {
      const values = Object.entries(weldNeckWeights[pc])
        .map(
          ([nb, weight]) => `(${asmeB165Id}, '${pc}', 'WN', ${nb}, ${weight})`,
        )
        .join(', ');
      if (values) {
        await queryRunner.query(`
          INSERT INTO flange_type_weights (flange_standard_id, pressure_class, flange_type_code, nominal_bore_mm, weight_kg)
          VALUES ${values}
        `);
      }
    }

    for (const pc of Object.keys(slipOnWeights)) {
      const values = Object.entries(slipOnWeights[pc])
        .map(
          ([nb, weight]) => `(${asmeB165Id}, '${pc}', 'SO', ${nb}, ${weight})`,
        )
        .join(', ');
      if (values) {
        await queryRunner.query(`
          INSERT INTO flange_type_weights (flange_standard_id, pressure_class, flange_type_code, nominal_bore_mm, weight_kg)
          VALUES ${values}
        `);
      }
    }

    for (const pc of Object.keys(blindWeights)) {
      const values = Object.entries(blindWeights[pc])
        .map(
          ([nb, weight]) => `(${asmeB165Id}, '${pc}', 'BL', ${nb}, ${weight})`,
        )
        .join(', ');
      if (values) {
        await queryRunner.query(`
          INSERT INTO flange_type_weights (flange_standard_id, pressure_class, flange_type_code, nominal_bore_mm, weight_kg)
          VALUES ${values}
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const asmeB165Id = await this.flangeStandardId(queryRunner, 'ASME B16.5');
    await queryRunner.query(
      `DELETE FROM flange_type_weights WHERE flange_standard_id = ${asmeB165Id}`,
    );
  }

  private async flangeStandardId(
    queryRunner: QueryRunner,
    code: string,
  ): Promise<string> {
    const result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = $1`,
      [code],
    );
    return result.length === 0 ? 'NULL' : result[0].id.toString();
  }

  private asmeB165WeldNeckWeights(): Record<string, Record<number, number>> {
    return {
      '150': {
        15: 0.5,
        20: 0.6,
        25: 0.8,
        32: 1.1,
        40: 1.4,
        50: 1.8,
        65: 2.5,
        80: 3.2,
        100: 4.5,
        125: 6.4,
        150: 8.2,
        200: 13.6,
        250: 20.4,
        300: 29.5,
        350: 40.8,
        400: 52.2,
        450: 65.8,
        500: 81.6,
        600: 120.0,
      },
      '300': {
        15: 0.9,
        20: 1.1,
        25: 1.4,
        32: 2.0,
        40: 2.5,
        50: 3.4,
        65: 4.5,
        80: 5.9,
        100: 8.2,
        125: 11.4,
        150: 15.0,
        200: 25.4,
        250: 38.6,
        300: 54.5,
        350: 77.1,
        400: 99.8,
        450: 127.0,
        500: 158.8,
        600: 236.0,
      },
      '400': {
        15: 1.1,
        20: 1.4,
        25: 1.8,
        32: 2.5,
        40: 3.2,
        50: 4.3,
        65: 5.7,
        80: 7.5,
        100: 10.5,
        125: 14.5,
        150: 19.1,
        200: 32.3,
        250: 49.1,
        300: 69.5,
        350: 98.2,
        400: 127.1,
        450: 161.8,
        500: 202.0,
        600: 300.5,
      },
      '600': {
        15: 1.4,
        20: 1.8,
        25: 2.3,
        32: 3.2,
        40: 4.1,
        50: 5.4,
        65: 7.3,
        80: 9.5,
        100: 13.2,
        125: 18.6,
        150: 24.5,
        200: 41.4,
        250: 63.2,
        300: 89.1,
        350: 126.0,
        400: 163.2,
        450: 207.7,
        500: 259.1,
        600: 385.5,
      },
      '900': {
        15: 2.0,
        20: 2.7,
        25: 3.6,
        40: 6.4,
        50: 9.1,
        65: 13.2,
        80: 17.3,
        100: 25.5,
        150: 50.0,
        200: 86.4,
        250: 136.4,
        300: 195.5,
        350: 272.7,
        400: 354.5,
        450: 454.5,
        500: 568.2,
        600: 859.1,
      },
      '1500': {
        15: 3.2,
        20: 4.1,
        25: 5.9,
        40: 10.9,
        50: 16.4,
        80: 31.8,
        100: 49.1,
        150: 99.1,
        200: 172.7,
        250: 281.8,
        300: 418.2,
      },
      '2500': {
        15: 5.0,
        20: 6.4,
        25: 9.5,
        40: 19.1,
        50: 31.8,
        80: 68.2,
        100: 113.6,
        150: 254.5,
        200: 472.7,
        250: 781.8,
        300: 1159.1,
      },
    };
  }

  private asmeB165SlipOnWeights(): Record<string, Record<number, number>> {
    return {
      '150': {
        15: 0.4,
        20: 0.5,
        25: 0.6,
        32: 0.9,
        40: 1.1,
        50: 1.4,
        65: 1.9,
        80: 2.5,
        100: 3.4,
        125: 4.8,
        150: 6.1,
        200: 10.0,
        250: 14.8,
        300: 21.4,
        350: 29.1,
        400: 37.3,
        450: 46.8,
        500: 58.2,
        600: 85.0,
      },
      '300': {
        15: 0.7,
        20: 0.9,
        25: 1.1,
        32: 1.6,
        40: 2.0,
        50: 2.7,
        65: 3.5,
        80: 4.5,
        100: 6.1,
        125: 8.4,
        150: 11.0,
        200: 18.2,
        250: 27.3,
        300: 38.2,
        350: 54.1,
        400: 69.5,
        450: 88.2,
        500: 110.0,
        600: 163.6,
      },
      '400': {
        15: 0.9,
        20: 1.1,
        25: 1.4,
        32: 2.0,
        40: 2.5,
        50: 3.4,
        65: 4.5,
        80: 5.7,
        100: 7.7,
        125: 10.7,
        150: 14.1,
        200: 23.2,
        250: 34.5,
        300: 48.6,
        350: 68.6,
        400: 88.2,
        450: 111.8,
        500: 139.5,
        600: 207.7,
      },
      '600': {
        15: 1.1,
        20: 1.4,
        25: 1.8,
        32: 2.5,
        40: 3.2,
        50: 4.3,
        65: 5.7,
        80: 7.3,
        100: 9.8,
        125: 13.6,
        150: 18.0,
        200: 29.5,
        250: 44.1,
        300: 62.3,
        350: 87.7,
        400: 113.2,
        450: 143.6,
        500: 179.1,
        600: 266.4,
      },
    };
  }

  private asmeB165BlindWeights(): Record<string, Record<number, number>> {
    return {
      '150': {
        15: 0.5,
        20: 0.7,
        25: 0.9,
        32: 1.2,
        40: 1.5,
        50: 2.0,
        65: 2.8,
        80: 3.6,
        100: 5.0,
        125: 7.0,
        150: 9.1,
        200: 15.0,
        250: 22.3,
        300: 32.3,
        350: 45.0,
        400: 57.7,
        450: 72.7,
        500: 90.5,
        600: 133.2,
      },
      '300': {
        15: 1.0,
        20: 1.2,
        25: 1.5,
        32: 2.2,
        40: 2.8,
        50: 3.7,
        65: 5.0,
        80: 6.4,
        100: 9.1,
        125: 12.5,
        150: 16.4,
        200: 27.7,
        250: 42.7,
        300: 60.5,
        350: 85.0,
        400: 110.5,
        450: 140.9,
        500: 176.4,
        600: 262.7,
      },
      '400': {
        15: 1.2,
        20: 1.5,
        25: 2.0,
        32: 2.8,
        40: 3.5,
        50: 4.7,
        65: 6.4,
        80: 8.2,
        100: 11.6,
        125: 15.9,
        150: 21.0,
        200: 35.5,
        250: 54.5,
        300: 77.3,
        350: 108.6,
        400: 141.4,
        450: 180.0,
        500: 225.5,
        600: 335.9,
      },
      '600': {
        15: 1.5,
        20: 2.0,
        25: 2.5,
        32: 3.5,
        40: 4.5,
        50: 6.0,
        65: 8.2,
        80: 10.5,
        100: 14.8,
        125: 20.5,
        150: 27.0,
        200: 45.5,
        250: 70.0,
        300: 99.1,
        350: 140.0,
        400: 181.8,
        450: 231.8,
        500: 290.0,
        600: 432.7,
      },
      '900': {
        15: 2.2,
        20: 3.0,
        25: 4.0,
        40: 7.0,
        50: 10.0,
        65: 14.5,
        80: 19.1,
        100: 28.2,
        150: 55.5,
        200: 95.5,
        250: 150.9,
        300: 216.4,
        350: 302.3,
        400: 393.2,
        450: 504.5,
        500: 631.4,
        600: 954.5,
      },
      '1500': {
        15: 3.6,
        20: 4.5,
        25: 6.6,
        40: 12.0,
        50: 18.2,
        80: 35.0,
        100: 54.5,
        150: 110.0,
        200: 191.4,
        250: 313.2,
        300: 464.5,
      },
      '2500': {
        15: 5.5,
        20: 7.1,
        25: 10.5,
        40: 21.4,
        50: 35.5,
        80: 75.9,
        100: 126.4,
        150: 283.2,
        200: 527.3,
        250: 871.4,
        300: 1293.2,
      },
    };
  }
}
