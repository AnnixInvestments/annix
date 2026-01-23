import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsmeB1647AlloyPTRatings1772300000000 implements MigrationInterface {
  name = 'AddAsmeB1647AlloyPTRatings1772300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding ASME B16.47 alloy material P-T ratings...');

    const b1647aResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47A'`
    );
    const b1647bResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47B'`
    );

    const f11Data: Record<string, Record<number, number>> = {
      '150': { '-29': 19.6, '38': 19.6, '93': 17.7, '149': 15.8, '204': 15.8, '260': 15.8, '316': 14.9, '343': 14.6, '371': 13.7, '399': 11.2, '427': 8.4, '454': 5.6, '482': 3.4 },
      '300': { '-29': 51.1, '38': 51.1, '93': 48.5, '149': 46.4, '204': 44.7, '260': 43.2, '316': 41.6, '343': 40.9, '371': 38.4, '399': 31.7, '427': 23.7, '454': 15.8, '482': 9.5 },
      '400': { '-29': 68.1, '38': 68.1, '93': 64.7, '149': 61.9, '204': 59.6, '260': 57.6, '316': 55.5, '343': 54.5, '371': 51.2, '399': 42.3, '427': 31.6, '454': 21.1, '482': 12.6 },
      '600': { '-29': 102.1, '38': 102.1, '93': 97.0, '149': 92.8, '204': 89.4, '260': 86.3, '316': 83.2, '343': 81.8, '371': 76.8, '399': 63.4, '427': 47.4, '454': 31.6, '482': 19.0 },
      '900': { '-29': 153.2, '38': 153.2, '93': 145.5, '149': 139.2, '204': 134.1, '260': 129.5, '316': 124.8, '343': 122.7, '371': 115.2, '399': 95.1, '427': 71.1, '454': 47.4, '482': 28.4 },
    };

    const f22Data: Record<string, Record<number, number>> = {
      '150': { '-29': 19.6, '38': 19.6, '93': 18.3, '149': 17.2, '204': 17.2, '260': 17.2, '316': 16.4, '343': 16.0, '371': 15.3, '399': 13.7, '427': 11.5, '454': 9.0, '482': 6.3, '510': 4.2, '538': 2.6 },
      '300': { '-29': 51.1, '38': 51.1, '93': 49.4, '149': 47.8, '204': 46.4, '260': 45.2, '316': 44.0, '343': 43.2, '371': 41.3, '399': 37.1, '427': 31.1, '454': 24.3, '482': 17.0, '510': 11.3, '538': 7.0 },
      '400': { '-29': 68.1, '38': 68.1, '93': 65.9, '149': 63.7, '204': 61.9, '260': 60.2, '316': 58.6, '343': 57.6, '371': 55.1, '399': 49.4, '427': 41.5, '454': 32.4, '482': 22.7, '510': 15.1, '538': 9.4 },
      '600': { '-29': 102.1, '38': 102.1, '93': 98.8, '149': 95.6, '204': 92.8, '260': 90.4, '316': 87.9, '343': 86.4, '371': 82.6, '399': 74.1, '427': 62.2, '454': 48.6, '482': 34.0, '510': 22.7, '538': 14.0 },
      '900': { '-29': 153.2, '38': 153.2, '93': 148.2, '149': 143.3, '204': 139.2, '260': 135.5, '316': 131.9, '343': 129.6, '371': 123.9, '399': 111.2, '427': 93.3, '454': 72.9, '482': 51.0, '510': 34.0, '538': 21.0 },
    };

    const duplexF51Data: Record<string, Record<number, number>> = {
      '150': { '-29': 19.6, '38': 19.6, '93': 18.9, '149': 18.1, '204': 17.2, '260': 15.8 },
      '300': { '-29': 51.1, '38': 51.1, '93': 49.8, '149': 48.3, '204': 46.4, '260': 43.2 },
      '400': { '-29': 68.1, '38': 68.1, '93': 66.4, '149': 64.4, '204': 61.9, '260': 57.6 },
      '600': { '-29': 102.1, '38': 102.1, '93': 99.6, '149': 96.6, '204': 92.8, '260': 86.3 },
      '900': { '-29': 153.2, '38': 153.2, '93': 149.4, '149': 144.9, '204': 139.2, '260': 129.5 },
    };

    const superDuplexF55Data: Record<string, Record<number, number>> = {
      '150': { '-29': 19.6, '38': 19.6, '93': 19.2, '149': 18.6, '204': 17.9, '260': 16.8 },
      '300': { '-29': 51.1, '38': 51.1, '93': 50.4, '149': 49.3, '204': 47.8, '260': 45.2 },
      '400': { '-29': 68.1, '38': 68.1, '93': 67.2, '149': 65.7, '204': 63.7, '260': 60.2 },
      '600': { '-29': 102.1, '38': 102.1, '93': 100.8, '149': 98.5, '204': 95.6, '260': 90.4 },
      '900': { '-29': 153.2, '38': 153.2, '93': 151.2, '149': 147.8, '204': 143.3, '260': 135.5 },
    };

    const inconel625Data: Record<string, Record<number, number>> = {
      '150': { '-29': 19.6, '38': 19.6, '93': 18.9, '149': 18.1, '204': 17.2, '260': 16.4, '316': 15.5, '371': 14.6, '427': 13.4, '482': 11.9, '538': 10.1, '593': 8.1, '649': 6.1 },
      '300': { '-29': 51.1, '38': 51.1, '93': 49.8, '149': 48.3, '204': 46.4, '260': 44.5, '316': 42.5, '371': 40.2, '427': 37.1, '482': 32.9, '538': 28.1, '593': 22.5, '649': 17.0 },
      '400': { '-29': 68.1, '38': 68.1, '93': 66.4, '149': 64.4, '204': 61.9, '260': 59.3, '316': 56.7, '371': 53.6, '427': 49.4, '482': 43.9, '538': 37.5, '593': 30.0, '649': 22.7 },
      '600': { '-29': 102.1, '38': 102.1, '93': 99.6, '149': 96.6, '204': 92.8, '260': 89.0, '316': 85.0, '371': 80.4, '427': 74.1, '482': 65.8, '538': 56.2, '593': 45.0, '649': 34.0 },
      '900': { '-29': 153.2, '38': 153.2, '93': 149.4, '149': 144.9, '204': 139.2, '260': 133.5, '316': 127.5, '371': 120.6, '427': 111.2, '482': 98.7, '538': 84.3, '593': 67.5, '649': 51.0 },
    };

    const monel400Data: Record<string, Record<number, number>> = {
      '150': { '-29': 19.6, '38': 19.6, '93': 17.9, '149': 16.4, '204': 15.5, '260': 14.6, '316': 13.4, '371': 11.5 },
      '300': { '-29': 51.1, '38': 51.1, '93': 47.8, '149': 44.5, '204': 42.3, '260': 40.0, '316': 36.8, '371': 31.9 },
      '400': { '-29': 68.1, '38': 68.1, '93': 63.7, '149': 59.3, '204': 56.4, '260': 53.3, '316': 49.0, '371': 42.5 },
      '600': { '-29': 102.1, '38': 102.1, '93': 95.6, '149': 89.0, '204': 84.6, '260': 80.0, '316': 73.5, '371': 63.8 },
      '900': { '-29': 153.2, '38': 153.2, '93': 143.3, '149': 133.5, '204': 126.9, '260': 120.0, '316': 110.2, '371': 95.6 },
    };

    const hastelloyC276Data: Record<string, Record<number, number>> = {
      '150': { '-29': 19.6, '38': 19.6, '93': 19.2, '149': 18.6, '204': 17.9, '260': 17.0, '316': 16.0, '371': 14.9, '427': 13.4, '482': 11.5, '538': 9.3, '593': 7.0, '649': 5.0, '704': 3.3 },
      '300': { '-29': 51.1, '38': 51.1, '93': 50.4, '149': 49.3, '204': 47.8, '260': 45.8, '316': 43.4, '371': 40.5, '427': 36.8, '482': 31.9, '538': 25.8, '593': 19.4, '649': 13.9, '704': 9.2 },
      '400': { '-29': 68.1, '38': 68.1, '93': 67.2, '149': 65.7, '204': 63.7, '260': 61.1, '316': 57.9, '371': 54.0, '427': 49.0, '482': 42.5, '538': 34.4, '593': 25.9, '649': 18.5, '704': 12.3 },
      '600': { '-29': 102.1, '38': 102.1, '93': 100.8, '149': 98.5, '204': 95.6, '260': 91.7, '316': 86.9, '371': 81.0, '427': 73.5, '482': 63.8, '538': 51.6, '593': 38.9, '649': 27.7, '704': 18.4 },
      '900': { '-29': 153.2, '38': 153.2, '93': 151.2, '149': 147.8, '204': 143.3, '260': 137.5, '316': 130.3, '371': 121.5, '427': 110.2, '482': 95.6, '538': 77.4, '593': 58.3, '649': 41.6, '704': 27.6 },
    };

    const materials = [
      { name: 'Alloy Steel A182 F11 (Group 2.3)', data: f11Data },
      { name: 'Alloy Steel A182 F22 (Group 2.4)', data: f22Data },
      { name: 'Duplex Stainless Steel F51 (Group 3.2)', data: duplexF51Data },
      { name: 'Super Duplex Stainless Steel F55 (Group 3.3)', data: superDuplexF55Data },
      { name: 'Inconel 625 (Group 4.1)', data: inconel625Data },
      { name: 'Monel 400 (Group 4.2)', data: monel400Data },
      { name: 'Hastelloy C276 (Group 4.3)', data: hastelloyC276Data },
    ];

    if (b1647aResult.length > 0) {
      const standardIdA = b1647aResult[0].id;
      const pressureClassesA = await queryRunner.query(`
        SELECT id, designation FROM flange_pressure_classes
        WHERE "standardId" = ${standardIdA}
      `);
      const classMapA: Record<string, number> = {};
      for (const pc of pressureClassesA) {
        classMapA[pc.designation] = pc.id;
      }

      for (const { name, data } of materials) {
        await this.insertPTRatings(queryRunner, classMapA, name, data);
      }
      console.warn('Added ASME B16.47A alloy P-T ratings');
    }

    if (b1647bResult.length > 0) {
      const standardIdB = b1647bResult[0].id;
      const pressureClassesB = await queryRunner.query(`
        SELECT id, designation FROM flange_pressure_classes
        WHERE "standardId" = ${standardIdB}
      `);
      const classMapB: Record<string, number> = {};
      for (const pc of pressureClassesB) {
        classMapB[pc.designation] = pc.id;
      }

      for (const { name, data } of materials) {
        await this.insertPTRatings(queryRunner, classMapB, name, data);
      }
      console.warn('Added ASME B16.47B alloy P-T ratings');
    }

    console.warn('ASME B16.47 alloy P-T ratings added successfully.');
  }

  private async insertPTRatings(
    queryRunner: QueryRunner,
    classMap: Record<string, number>,
    materialGroup: string,
    data: Record<string, Record<number, number>>
  ): Promise<void> {
    for (const [designation, temps] of Object.entries(data)) {
      const classId = classMap[designation];
      if (!classId) continue;

      for (const [tempStr, pressureBar] of Object.entries(temps)) {
        const temp = parseFloat(tempStr);
        await queryRunner.query(`
          INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
          DO UPDATE SET max_pressure_bar = $4
        `, [classId, materialGroup, temp, pressureBar]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const materials = [
      'Alloy Steel A182 F11 (Group 2.3)',
      'Alloy Steel A182 F22 (Group 2.4)',
      'Duplex Stainless Steel F51 (Group 3.2)',
      'Super Duplex Stainless Steel F55 (Group 3.3)',
      'Inconel 625 (Group 4.1)',
      'Monel 400 (Group 4.2)',
      'Hastelloy C276 (Group 4.3)',
    ];

    const b1647aResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47A'`
    );
    const b1647bResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47B'`
    );

    if (b1647aResult.length > 0) {
      const standardId = b1647aResult[0].id;
      for (const material of materials) {
        await queryRunner.query(`
          DELETE FROM flange_pt_ratings
          WHERE pressure_class_id IN (SELECT id FROM flange_pressure_classes WHERE "standardId" = $1)
          AND material_group = $2
        `, [standardId, material]);
      }
    }

    if (b1647bResult.length > 0) {
      const standardId = b1647bResult[0].id;
      for (const material of materials) {
        await queryRunner.query(`
          DELETE FROM flange_pt_ratings
          WHERE pressure_class_id IN (SELECT id FROM flange_pressure_classes WHERE "standardId" = $1)
          AND material_group = $2
        `, [standardId, material]);
      }
    }
  }
}
