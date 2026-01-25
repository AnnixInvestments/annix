import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsmeB1647FlangeTypeWeights1778000300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const asmeB1647AId = await this.flangeStandardId(
      queryRunner,
      'ASME B16.47 Series A',
    );
    const asmeB1647BId = await this.flangeStandardId(
      queryRunner,
      'ASME B16.47 Series B',
    );

    const seriesAWeldNeck = this.asmeB1647AWeldNeckWeights();
    const seriesABlind = this.asmeB1647ABlindWeights();
    const seriesBWeldNeck = this.asmeB1647BWeldNeckWeights();
    const seriesBBlind = this.asmeB1647BBlindWeights();

    for (const pc of Object.keys(seriesAWeldNeck)) {
      const values = Object.entries(seriesAWeldNeck[pc])
        .map(
          ([nb, weight]) =>
            `(${asmeB1647AId}, '${pc}', 'WN', ${nb}, ${weight})`,
        )
        .join(', ');
      if (values) {
        await queryRunner.query(`
          INSERT INTO flange_type_weights (flange_standard_id, pressure_class, flange_type_code, nominal_bore_mm, weight_kg)
          VALUES ${values}
        `);
      }
    }

    for (const pc of Object.keys(seriesABlind)) {
      const values = Object.entries(seriesABlind[pc])
        .map(
          ([nb, weight]) =>
            `(${asmeB1647AId}, '${pc}', 'BL', ${nb}, ${weight})`,
        )
        .join(', ');
      if (values) {
        await queryRunner.query(`
          INSERT INTO flange_type_weights (flange_standard_id, pressure_class, flange_type_code, nominal_bore_mm, weight_kg)
          VALUES ${values}
        `);
      }
    }

    for (const pc of Object.keys(seriesBWeldNeck)) {
      const values = Object.entries(seriesBWeldNeck[pc])
        .map(
          ([nb, weight]) =>
            `(${asmeB1647BId}, '${pc}', 'WN', ${nb}, ${weight})`,
        )
        .join(', ');
      if (values) {
        await queryRunner.query(`
          INSERT INTO flange_type_weights (flange_standard_id, pressure_class, flange_type_code, nominal_bore_mm, weight_kg)
          VALUES ${values}
        `);
      }
    }

    for (const pc of Object.keys(seriesBBlind)) {
      const values = Object.entries(seriesBBlind[pc])
        .map(
          ([nb, weight]) =>
            `(${asmeB1647BId}, '${pc}', 'BL', ${nb}, ${weight})`,
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
    const asmeB1647AId = await this.flangeStandardId(
      queryRunner,
      'ASME B16.47 Series A',
    );
    const asmeB1647BId = await this.flangeStandardId(
      queryRunner,
      'ASME B16.47 Series B',
    );
    await queryRunner.query(
      `DELETE FROM flange_type_weights WHERE flange_standard_id IN (${asmeB1647AId}, ${asmeB1647BId})`,
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

  private asmeB1647AWeldNeckWeights(): Record<string, Record<number, number>> {
    return {
      '150': {
        650: 159.1,
        700: 181.8,
        750: 204.5,
        800: 236.4,
        850: 268.2,
        900: 304.5,
        1000: 386.4,
        1050: 427.3,
        1200: 545.5,
        1350: 686.4,
        1500: 854.5,
      },
      '300': {
        650: 313.6,
        700: 363.6,
        750: 418.2,
        800: 481.8,
        850: 545.5,
        900: 618.2,
        1000: 790.9,
        1050: 881.8,
        1200: 1136.4,
        1350: 1436.4,
        1500: 1795.5,
      },
      '400': {
        650: 400.0,
        700: 463.6,
        750: 531.8,
        800: 613.6,
        850: 695.5,
        900: 790.9,
        1000: 1009.1,
        1050: 1127.3,
        1200: 1454.5,
        1350: 1840.9,
        1500: 2304.5,
      },
      '600': {
        650: 513.6,
        700: 595.5,
        750: 686.4,
        800: 790.9,
        850: 895.5,
        900: 1018.2,
        1000: 1300.0,
        1050: 1454.5,
        1200: 1881.8,
        1350: 2381.8,
        1500: 2986.4,
      },
      '900': {
        650: 754.5,
        700: 877.3,
        750: 1013.6,
        800: 1172.7,
        850: 1331.8,
        900: 1518.2,
        1000: 1950.0,
        1050: 2186.4,
        1200: 2845.5,
      },
    };
  }

  private asmeB1647ABlindWeights(): Record<string, Record<number, number>> {
    return {
      '150': {
        650: 177.3,
        700: 204.5,
        750: 231.8,
        800: 268.2,
        850: 304.5,
        900: 345.5,
        1000: 440.9,
        1050: 490.9,
        1200: 631.8,
        1350: 800.0,
        1500: 1000.0,
      },
      '300': {
        650: 350.0,
        700: 409.1,
        750: 472.7,
        800: 545.5,
        850: 618.2,
        900: 700.0,
        1000: 900.0,
        1050: 1004.5,
        1200: 1300.0,
        1350: 1654.5,
        1500: 2077.3,
      },
      '400': {
        650: 445.5,
        700: 518.2,
        750: 600.0,
        800: 695.5,
        850: 790.9,
        900: 900.0,
        1000: 1154.5,
        1050: 1295.5,
        1200: 1681.8,
        1350: 2136.4,
        1500: 2686.4,
      },
      '600': {
        650: 572.7,
        700: 668.2,
        750: 772.7,
        800: 895.5,
        900: 1154.5,
        1000: 1486.4,
        1050: 1668.2,
        1200: 2168.2,
        1350: 2754.5,
        1500: 3468.2,
      },
      '900': {
        650: 840.9,
        700: 986.4,
        750: 1145.5,
        800: 1331.8,
        850: 1518.2,
        900: 1731.8,
        1000: 2236.4,
        1050: 2513.6,
        1200: 3281.8,
      },
    };
  }

  private asmeB1647BWeldNeckWeights(): Record<string, Record<number, number>> {
    return {
      '75': {
        650: 95.5,
        700: 109.1,
        750: 122.7,
        800: 140.9,
        850: 159.1,
        900: 181.8,
        1000: 231.8,
        1050: 259.1,
        1200: 336.4,
        1350: 427.3,
        1500: 536.4,
      },
      '150': {
        650: 131.8,
        700: 150.0,
        750: 168.2,
        800: 195.5,
        850: 222.7,
        900: 254.5,
        1000: 327.3,
        1050: 363.6,
        1200: 468.2,
        1350: 590.9,
        1500: 740.9,
      },
      '300': {
        650: 254.5,
        700: 295.5,
        750: 340.9,
        800: 395.5,
        850: 450.0,
        900: 513.6,
        1000: 659.1,
        1050: 740.9,
        1200: 963.6,
        1350: 1227.3,
        1500: 1540.9,
      },
    };
  }

  private asmeB1647BBlindWeights(): Record<string, Record<number, number>> {
    return {
      '75': {
        650: 106.4,
        700: 122.7,
        750: 140.9,
        800: 163.6,
        850: 186.4,
        900: 213.6,
        1000: 277.3,
        1050: 313.6,
        1200: 413.6,
        1350: 531.8,
        1500: 677.3,
      },
      '150': {
        650: 150.0,
        700: 172.7,
        750: 195.5,
        800: 227.3,
        850: 259.1,
        900: 295.5,
        1000: 381.8,
        1050: 427.3,
        1200: 554.5,
        1350: 704.5,
        1500: 886.4,
      },
      '300': {
        650: 286.4,
        700: 336.4,
        750: 390.9,
        800: 454.5,
        850: 518.2,
        900: 590.9,
        1000: 763.6,
        1050: 859.1,
        1200: 1122.7,
        1350: 1436.4,
        1500: 1813.6,
      },
    };
  }
}
