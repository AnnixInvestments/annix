import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStainlessAndNickelAlloyData1774500000000 implements MigrationInterface {
  name = 'AddStainlessAndNickelAlloyData1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding stainless steel and nickel alloy data...');

    // ============================================================
    // PART 1: AUSTENITIC STAINLESS STEEL GRADES (A312)
    // ============================================================
    console.warn('Adding austenitic stainless steel grades...');

    const stainlessGrades = [
      // TP304H - High Carbon 304 (high temp service)
      {
        code: 'A312_TP304H',
        name: 'ASTM A312 TP304H (18Cr-8Ni High Carbon)',
        stressData: [
          { tempC: -196, tempF: -320, ksi: 18.8, mpa: 129.6 },
          { tempC: -129, tempF: -200, ksi: 18.8, mpa: 129.6 },
          { tempC: -29, tempF: -20, ksi: 18.8, mpa: 129.6 },
          { tempC: 38, tempF: 100, ksi: 18.8, mpa: 129.6 },
          { tempC: 93, tempF: 200, ksi: 16.7, mpa: 115.1 },
          { tempC: 149, tempF: 300, ksi: 15.0, mpa: 103.4 },
          { tempC: 204, tempF: 400, ksi: 13.8, mpa: 95.1 },
          { tempC: 260, tempF: 500, ksi: 12.9, mpa: 88.9 },
          { tempC: 316, tempF: 600, ksi: 12.3, mpa: 84.8 },
          { tempC: 343, tempF: 650, ksi: 12.0, mpa: 82.7 },
          { tempC: 371, tempF: 700, ksi: 11.7, mpa: 80.7 },
          { tempC: 399, tempF: 750, ksi: 11.5, mpa: 79.3 },
          { tempC: 427, tempF: 800, ksi: 11.2, mpa: 77.2 },
          { tempC: 454, tempF: 850, ksi: 11.0, mpa: 75.8 },
          { tempC: 482, tempF: 900, ksi: 10.8, mpa: 74.5 },
          { tempC: 510, tempF: 950, ksi: 10.4, mpa: 71.7 },
          { tempC: 538, tempF: 1000, ksi: 9.8, mpa: 67.6 },
          { tempC: 566, tempF: 1050, ksi: 8.8, mpa: 60.7 },
          { tempC: 593, tempF: 1100, ksi: 7.5, mpa: 51.7 },
          { tempC: 621, tempF: 1150, ksi: 6.1, mpa: 42.1 },
          { tempC: 649, tempF: 1200, ksi: 4.8, mpa: 33.1 },
          { tempC: 677, tempF: 1250, ksi: 3.7, mpa: 25.5 },
          { tempC: 704, tempF: 1300, ksi: 2.8, mpa: 19.3 },
          { tempC: 732, tempF: 1350, ksi: 2.1, mpa: 14.5 },
          { tempC: 760, tempF: 1400, ksi: 1.6, mpa: 11.0 },
          { tempC: 816, tempF: 1500, ksi: 0.9, mpa: 6.2 },
        ],
      },
      // TP316H - High Carbon 316 (high temp service)
      {
        code: 'A312_TP316H',
        name: 'ASTM A312 TP316H (16Cr-12Ni-2Mo High Carbon)',
        stressData: [
          { tempC: -196, tempF: -320, ksi: 18.8, mpa: 129.6 },
          { tempC: -129, tempF: -200, ksi: 18.8, mpa: 129.6 },
          { tempC: -29, tempF: -20, ksi: 18.8, mpa: 129.6 },
          { tempC: 38, tempF: 100, ksi: 18.8, mpa: 129.6 },
          { tempC: 93, tempF: 200, ksi: 16.9, mpa: 116.5 },
          { tempC: 149, tempF: 300, ksi: 15.3, mpa: 105.5 },
          { tempC: 204, tempF: 400, ksi: 14.2, mpa: 97.9 },
          { tempC: 260, tempF: 500, ksi: 13.3, mpa: 91.7 },
          { tempC: 316, tempF: 600, ksi: 12.7, mpa: 87.6 },
          { tempC: 343, tempF: 650, ksi: 12.4, mpa: 85.5 },
          { tempC: 371, tempF: 700, ksi: 12.2, mpa: 84.1 },
          { tempC: 399, tempF: 750, ksi: 12.0, mpa: 82.7 },
          { tempC: 427, tempF: 800, ksi: 11.8, mpa: 81.4 },
          { tempC: 454, tempF: 850, ksi: 11.6, mpa: 80.0 },
          { tempC: 482, tempF: 900, ksi: 11.4, mpa: 78.6 },
          { tempC: 510, tempF: 950, ksi: 11.1, mpa: 76.5 },
          { tempC: 538, tempF: 1000, ksi: 10.6, mpa: 73.1 },
          { tempC: 566, tempF: 1050, ksi: 9.6, mpa: 66.2 },
          { tempC: 593, tempF: 1100, ksi: 8.3, mpa: 57.2 },
          { tempC: 621, tempF: 1150, ksi: 6.9, mpa: 47.6 },
          { tempC: 649, tempF: 1200, ksi: 5.5, mpa: 37.9 },
          { tempC: 677, tempF: 1250, ksi: 4.3, mpa: 29.6 },
          { tempC: 704, tempF: 1300, ksi: 3.3, mpa: 22.8 },
          { tempC: 732, tempF: 1350, ksi: 2.5, mpa: 17.2 },
          { tempC: 760, tempF: 1400, ksi: 1.9, mpa: 13.1 },
          { tempC: 816, tempF: 1500, ksi: 1.1, mpa: 7.6 },
        ],
      },
      // TP321 - Titanium Stabilized
      {
        code: 'A312_TP321',
        name: 'ASTM A312 TP321 (18Cr-10Ni-Ti Stabilized)',
        stressData: [
          { tempC: -196, tempF: -320, ksi: 18.8, mpa: 129.6 },
          { tempC: -29, tempF: -20, ksi: 18.8, mpa: 129.6 },
          { tempC: 38, tempF: 100, ksi: 18.8, mpa: 129.6 },
          { tempC: 93, tempF: 200, ksi: 16.9, mpa: 116.5 },
          { tempC: 149, tempF: 300, ksi: 15.6, mpa: 107.6 },
          { tempC: 204, tempF: 400, ksi: 14.6, mpa: 100.7 },
          { tempC: 260, tempF: 500, ksi: 13.9, mpa: 95.8 },
          { tempC: 316, tempF: 600, ksi: 13.4, mpa: 92.4 },
          { tempC: 343, tempF: 650, ksi: 13.2, mpa: 91.0 },
          { tempC: 371, tempF: 700, ksi: 13.0, mpa: 89.6 },
          { tempC: 399, tempF: 750, ksi: 12.8, mpa: 88.3 },
          { tempC: 427, tempF: 800, ksi: 12.6, mpa: 86.9 },
          { tempC: 454, tempF: 850, ksi: 12.3, mpa: 84.8 },
          { tempC: 482, tempF: 900, ksi: 11.9, mpa: 82.0 },
          { tempC: 510, tempF: 950, ksi: 11.2, mpa: 77.2 },
          { tempC: 538, tempF: 1000, ksi: 10.2, mpa: 70.3 },
          { tempC: 566, tempF: 1050, ksi: 8.8, mpa: 60.7 },
          { tempC: 593, tempF: 1100, ksi: 7.2, mpa: 49.6 },
          { tempC: 621, tempF: 1150, ksi: 5.7, mpa: 39.3 },
          { tempC: 649, tempF: 1200, ksi: 4.4, mpa: 30.3 },
          { tempC: 677, tempF: 1250, ksi: 3.4, mpa: 23.4 },
          { tempC: 704, tempF: 1300, ksi: 2.5, mpa: 17.2 },
          { tempC: 732, tempF: 1350, ksi: 1.9, mpa: 13.1 },
          { tempC: 760, tempF: 1400, ksi: 1.4, mpa: 9.7 },
          { tempC: 816, tempF: 1500, ksi: 0.8, mpa: 5.5 },
        ],
      },
      // TP321H - High Carbon Titanium Stabilized
      {
        code: 'A312_TP321H',
        name: 'ASTM A312 TP321H (18Cr-10Ni-Ti High Carbon)',
        stressData: [
          { tempC: -196, tempF: -320, ksi: 18.8, mpa: 129.6 },
          { tempC: -29, tempF: -20, ksi: 18.8, mpa: 129.6 },
          { tempC: 38, tempF: 100, ksi: 18.8, mpa: 129.6 },
          { tempC: 93, tempF: 200, ksi: 16.9, mpa: 116.5 },
          { tempC: 149, tempF: 300, ksi: 15.6, mpa: 107.6 },
          { tempC: 204, tempF: 400, ksi: 14.6, mpa: 100.7 },
          { tempC: 260, tempF: 500, ksi: 13.9, mpa: 95.8 },
          { tempC: 316, tempF: 600, ksi: 13.4, mpa: 92.4 },
          { tempC: 371, tempF: 700, ksi: 13.0, mpa: 89.6 },
          { tempC: 427, tempF: 800, ksi: 12.6, mpa: 86.9 },
          { tempC: 482, tempF: 900, ksi: 12.0, mpa: 82.7 },
          { tempC: 538, tempF: 1000, ksi: 10.5, mpa: 72.4 },
          { tempC: 593, tempF: 1100, ksi: 7.8, mpa: 53.8 },
          { tempC: 649, tempF: 1200, ksi: 5.2, mpa: 35.9 },
          { tempC: 704, tempF: 1300, ksi: 3.2, mpa: 22.1 },
          { tempC: 760, tempF: 1400, ksi: 1.9, mpa: 13.1 },
          { tempC: 816, tempF: 1500, ksi: 1.1, mpa: 7.6 },
        ],
      },
      // TP347 - Niobium Stabilized
      {
        code: 'A312_TP347',
        name: 'ASTM A312 TP347 (18Cr-10Ni-Nb Stabilized)',
        stressData: [
          { tempC: -196, tempF: -320, ksi: 18.8, mpa: 129.6 },
          { tempC: -29, tempF: -20, ksi: 18.8, mpa: 129.6 },
          { tempC: 38, tempF: 100, ksi: 18.8, mpa: 129.6 },
          { tempC: 93, tempF: 200, ksi: 16.9, mpa: 116.5 },
          { tempC: 149, tempF: 300, ksi: 15.6, mpa: 107.6 },
          { tempC: 204, tempF: 400, ksi: 14.6, mpa: 100.7 },
          { tempC: 260, tempF: 500, ksi: 13.9, mpa: 95.8 },
          { tempC: 316, tempF: 600, ksi: 13.4, mpa: 92.4 },
          { tempC: 371, tempF: 700, ksi: 13.0, mpa: 89.6 },
          { tempC: 427, tempF: 800, ksi: 12.6, mpa: 86.9 },
          { tempC: 482, tempF: 900, ksi: 12.0, mpa: 82.7 },
          { tempC: 538, tempF: 1000, ksi: 10.8, mpa: 74.5 },
          { tempC: 593, tempF: 1100, ksi: 8.5, mpa: 58.6 },
          { tempC: 649, tempF: 1200, ksi: 6.0, mpa: 41.4 },
          { tempC: 704, tempF: 1300, ksi: 4.0, mpa: 27.6 },
          { tempC: 760, tempF: 1400, ksi: 2.5, mpa: 17.2 },
          { tempC: 816, tempF: 1500, ksi: 1.5, mpa: 10.3 },
        ],
      },
      // TP347H - High Carbon Niobium Stabilized
      {
        code: 'A312_TP347H',
        name: 'ASTM A312 TP347H (18Cr-10Ni-Nb High Carbon)',
        stressData: [
          { tempC: -196, tempF: -320, ksi: 18.8, mpa: 129.6 },
          { tempC: -29, tempF: -20, ksi: 18.8, mpa: 129.6 },
          { tempC: 38, tempF: 100, ksi: 18.8, mpa: 129.6 },
          { tempC: 93, tempF: 200, ksi: 16.9, mpa: 116.5 },
          { tempC: 149, tempF: 300, ksi: 15.6, mpa: 107.6 },
          { tempC: 204, tempF: 400, ksi: 14.6, mpa: 100.7 },
          { tempC: 260, tempF: 500, ksi: 13.9, mpa: 95.8 },
          { tempC: 316, tempF: 600, ksi: 13.4, mpa: 92.4 },
          { tempC: 371, tempF: 700, ksi: 13.0, mpa: 89.6 },
          { tempC: 427, tempF: 800, ksi: 12.6, mpa: 86.9 },
          { tempC: 482, tempF: 900, ksi: 12.2, mpa: 84.1 },
          { tempC: 538, tempF: 1000, ksi: 11.4, mpa: 78.6 },
          { tempC: 593, tempF: 1100, ksi: 9.5, mpa: 65.5 },
          { tempC: 649, tempF: 1200, ksi: 7.0, mpa: 48.3 },
          { tempC: 704, tempF: 1300, ksi: 4.8, mpa: 33.1 },
          { tempC: 760, tempF: 1400, ksi: 3.1, mpa: 21.4 },
          { tempC: 816, tempF: 1500, ksi: 1.9, mpa: 13.1 },
        ],
      },
      // TP309S - High Temperature
      {
        code: 'A312_TP309S',
        name: 'ASTM A312 TP309S (23Cr-12Ni High Temp)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 18.8, mpa: 129.6 },
          { tempC: 38, tempF: 100, ksi: 18.8, mpa: 129.6 },
          { tempC: 93, tempF: 200, ksi: 16.2, mpa: 111.7 },
          { tempC: 149, tempF: 300, ksi: 14.8, mpa: 102.0 },
          { tempC: 204, tempF: 400, ksi: 13.8, mpa: 95.1 },
          { tempC: 260, tempF: 500, ksi: 13.0, mpa: 89.6 },
          { tempC: 316, tempF: 600, ksi: 12.5, mpa: 86.2 },
          { tempC: 371, tempF: 700, ksi: 12.1, mpa: 83.4 },
          { tempC: 427, tempF: 800, ksi: 11.8, mpa: 81.4 },
          { tempC: 482, tempF: 900, ksi: 11.5, mpa: 79.3 },
          { tempC: 538, tempF: 1000, ksi: 11.2, mpa: 77.2 },
          { tempC: 593, tempF: 1100, ksi: 10.5, mpa: 72.4 },
          { tempC: 649, tempF: 1200, ksi: 9.0, mpa: 62.1 },
          { tempC: 704, tempF: 1300, ksi: 7.0, mpa: 48.3 },
          { tempC: 760, tempF: 1400, ksi: 5.0, mpa: 34.5 },
          { tempC: 816, tempF: 1500, ksi: 3.4, mpa: 23.4 },
          { tempC: 871, tempF: 1600, ksi: 2.2, mpa: 15.2 },
          { tempC: 927, tempF: 1700, ksi: 1.4, mpa: 9.7 },
          { tempC: 982, tempF: 1800, ksi: 0.9, mpa: 6.2 },
          { tempC: 1038, tempF: 1900, ksi: 0.6, mpa: 4.1 },
        ],
      },
      // TP310S - Highest Temperature Austenitic
      {
        code: 'A312_TP310S',
        name: 'ASTM A312 TP310S (25Cr-20Ni Highest Temp)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 18.8, mpa: 129.6 },
          { tempC: 38, tempF: 100, ksi: 18.8, mpa: 129.6 },
          { tempC: 93, tempF: 200, ksi: 16.2, mpa: 111.7 },
          { tempC: 149, tempF: 300, ksi: 14.8, mpa: 102.0 },
          { tempC: 204, tempF: 400, ksi: 13.8, mpa: 95.1 },
          { tempC: 260, tempF: 500, ksi: 13.0, mpa: 89.6 },
          { tempC: 316, tempF: 600, ksi: 12.5, mpa: 86.2 },
          { tempC: 371, tempF: 700, ksi: 12.1, mpa: 83.4 },
          { tempC: 427, tempF: 800, ksi: 11.8, mpa: 81.4 },
          { tempC: 482, tempF: 900, ksi: 11.5, mpa: 79.3 },
          { tempC: 538, tempF: 1000, ksi: 11.2, mpa: 77.2 },
          { tempC: 593, tempF: 1100, ksi: 10.8, mpa: 74.5 },
          { tempC: 649, tempF: 1200, ksi: 9.8, mpa: 67.6 },
          { tempC: 704, tempF: 1300, ksi: 8.0, mpa: 55.2 },
          { tempC: 760, tempF: 1400, ksi: 6.0, mpa: 41.4 },
          { tempC: 816, tempF: 1500, ksi: 4.2, mpa: 29.0 },
          { tempC: 871, tempF: 1600, ksi: 2.8, mpa: 19.3 },
          { tempC: 927, tempF: 1700, ksi: 1.9, mpa: 13.1 },
          { tempC: 982, tempF: 1800, ksi: 1.2, mpa: 8.3 },
          { tempC: 1038, tempF: 1900, ksi: 0.8, mpa: 5.5 },
          { tempC: 1093, tempF: 2000, ksi: 0.5, mpa: 3.4 },
        ],
      },
    ];

    for (const grade of stainlessGrades) {
      for (const stress of grade.stressData) {
        await queryRunner.query(
          `
          INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
          VALUES ($1, $2, $3, $4, $5, $6, 'ASME B31.3')
          ON CONFLICT (material_code, temperature_celsius) DO UPDATE SET
            allowable_stress_ksi = $5, allowable_stress_mpa = $6
        `,
          [
            grade.code,
            grade.name,
            stress.tempC,
            stress.tempF,
            stress.ksi,
            stress.mpa,
          ],
        );
      }
    }

    // ============================================================
    // PART 2: DUPLEX STAINLESS STEEL GRADES (A790)
    // ============================================================
    console.warn('Adding duplex stainless steel grades...');

    const duplexGrades = [
      // S31803 - Standard Duplex (2205)
      {
        code: 'A790_S31803',
        name: 'ASTM A790 S31803 Duplex (22Cr-5Ni-3Mo)',
        stressData: [
          { tempC: -46, tempF: -50, ksi: 25.0, mpa: 172.4 },
          { tempC: -29, tempF: -20, ksi: 25.0, mpa: 172.4 },
          { tempC: 38, tempF: 100, ksi: 25.0, mpa: 172.4 },
          { tempC: 93, tempF: 200, ksi: 22.5, mpa: 155.1 },
          { tempC: 149, tempF: 300, ksi: 20.8, mpa: 143.4 },
          { tempC: 204, tempF: 400, ksi: 19.5, mpa: 134.4 },
          { tempC: 260, tempF: 500, ksi: 18.5, mpa: 127.6 },
          { tempC: 316, tempF: 600, ksi: 17.8, mpa: 122.7 },
        ],
      },
      // S32205 - Duplex 2205
      {
        code: 'A790_S32205',
        name: 'ASTM A790 S32205 Duplex 2205',
        stressData: [
          { tempC: -46, tempF: -50, ksi: 28.9, mpa: 199.3 },
          { tempC: -29, tempF: -20, ksi: 28.9, mpa: 199.3 },
          { tempC: 38, tempF: 100, ksi: 28.9, mpa: 199.3 },
          { tempC: 93, tempF: 200, ksi: 26.0, mpa: 179.3 },
          { tempC: 149, tempF: 300, ksi: 24.0, mpa: 165.5 },
          { tempC: 204, tempF: 400, ksi: 22.5, mpa: 155.1 },
          { tempC: 260, tempF: 500, ksi: 21.4, mpa: 147.5 },
          { tempC: 316, tempF: 600, ksi: 20.5, mpa: 141.3 },
        ],
      },
      // S32750 - Super Duplex 2507
      {
        code: 'A790_S32750',
        name: 'ASTM A790 S32750 Super Duplex 2507',
        stressData: [
          { tempC: -46, tempF: -50, ksi: 36.4, mpa: 251.0 },
          { tempC: -29, tempF: -20, ksi: 36.4, mpa: 251.0 },
          { tempC: 38, tempF: 100, ksi: 36.4, mpa: 251.0 },
          { tempC: 93, tempF: 200, ksi: 32.8, mpa: 226.1 },
          { tempC: 149, tempF: 300, ksi: 30.3, mpa: 208.9 },
          { tempC: 204, tempF: 400, ksi: 28.4, mpa: 195.8 },
          { tempC: 260, tempF: 500, ksi: 27.0, mpa: 186.2 },
          { tempC: 316, tempF: 600, ksi: 25.9, mpa: 178.6 },
        ],
      },
      // S32760 - Super Duplex Zeron 100
      {
        code: 'A790_S32760',
        name: 'ASTM A790 S32760 Super Duplex Zeron 100',
        stressData: [
          { tempC: -46, tempF: -50, ksi: 36.4, mpa: 251.0 },
          { tempC: -29, tempF: -20, ksi: 36.4, mpa: 251.0 },
          { tempC: 38, tempF: 100, ksi: 36.4, mpa: 251.0 },
          { tempC: 93, tempF: 200, ksi: 32.8, mpa: 226.1 },
          { tempC: 149, tempF: 300, ksi: 30.3, mpa: 208.9 },
          { tempC: 204, tempF: 400, ksi: 28.4, mpa: 195.8 },
          { tempC: 260, tempF: 500, ksi: 27.0, mpa: 186.2 },
          { tempC: 316, tempF: 600, ksi: 25.9, mpa: 178.6 },
        ],
      },
    ];

    for (const grade of duplexGrades) {
      for (const stress of grade.stressData) {
        await queryRunner.query(
          `
          INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
          VALUES ($1, $2, $3, $4, $5, $6, 'ASME B31.3')
          ON CONFLICT (material_code, temperature_celsius) DO UPDATE SET
            allowable_stress_ksi = $5, allowable_stress_mpa = $6
        `,
          [
            grade.code,
            grade.name,
            stress.tempC,
            stress.tempF,
            stress.ksi,
            stress.mpa,
          ],
        );
      }
    }

    // ============================================================
    // PART 3: NICKEL ALLOY GRADES
    // ============================================================
    console.warn('Adding nickel alloy grades...');

    const nickelGrades = [
      // Monel 400
      {
        code: 'B165_MONEL400',
        name: 'ASTM B165 Monel 400 (Ni-Cu)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 18.5, mpa: 127.6 },
          { tempC: 38, tempF: 100, ksi: 18.5, mpa: 127.6 },
          { tempC: 93, tempF: 200, ksi: 17.2, mpa: 118.6 },
          { tempC: 149, tempF: 300, ksi: 16.5, mpa: 113.8 },
          { tempC: 204, tempF: 400, ksi: 16.0, mpa: 110.3 },
          { tempC: 260, tempF: 500, ksi: 15.3, mpa: 105.5 },
          { tempC: 316, tempF: 600, ksi: 14.5, mpa: 100.0 },
          { tempC: 371, tempF: 700, ksi: 13.5, mpa: 93.1 },
          { tempC: 427, tempF: 800, ksi: 12.2, mpa: 84.1 },
          { tempC: 482, tempF: 900, ksi: 10.5, mpa: 72.4 },
          { tempC: 538, tempF: 1000, ksi: 8.0, mpa: 55.2 },
        ],
      },
      // Inconel 600
      {
        code: 'B167_INCONEL600',
        name: 'ASTM B167 Inconel 600 (Ni-Cr-Fe)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 23.3, mpa: 160.6 },
          { tempC: 38, tempF: 100, ksi: 23.3, mpa: 160.6 },
          { tempC: 93, tempF: 200, ksi: 23.3, mpa: 160.6 },
          { tempC: 149, tempF: 300, ksi: 23.3, mpa: 160.6 },
          { tempC: 204, tempF: 400, ksi: 23.3, mpa: 160.6 },
          { tempC: 260, tempF: 500, ksi: 23.3, mpa: 160.6 },
          { tempC: 316, tempF: 600, ksi: 23.3, mpa: 160.6 },
          { tempC: 371, tempF: 700, ksi: 23.3, mpa: 160.6 },
          { tempC: 427, tempF: 800, ksi: 23.3, mpa: 160.6 },
          { tempC: 482, tempF: 900, ksi: 23.3, mpa: 160.6 },
          { tempC: 538, tempF: 1000, ksi: 23.0, mpa: 158.6 },
          { tempC: 593, tempF: 1100, ksi: 21.5, mpa: 148.2 },
          { tempC: 649, tempF: 1200, ksi: 18.5, mpa: 127.6 },
          { tempC: 704, tempF: 1300, ksi: 14.0, mpa: 96.5 },
          { tempC: 760, tempF: 1400, ksi: 9.5, mpa: 65.5 },
          { tempC: 816, tempF: 1500, ksi: 6.0, mpa: 41.4 },
          { tempC: 871, tempF: 1600, ksi: 3.5, mpa: 24.1 },
        ],
      },
      // Incoloy 800H
      {
        code: 'B407_INCOLOY800H',
        name: 'ASTM B407 Incoloy 800H (Ni-Fe-Cr)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 16.7, mpa: 115.1 },
          { tempC: 38, tempF: 100, ksi: 16.7, mpa: 115.1 },
          { tempC: 93, tempF: 200, ksi: 16.7, mpa: 115.1 },
          { tempC: 149, tempF: 300, ksi: 16.7, mpa: 115.1 },
          { tempC: 204, tempF: 400, ksi: 16.7, mpa: 115.1 },
          { tempC: 260, tempF: 500, ksi: 16.7, mpa: 115.1 },
          { tempC: 316, tempF: 600, ksi: 16.7, mpa: 115.1 },
          { tempC: 371, tempF: 700, ksi: 16.7, mpa: 115.1 },
          { tempC: 427, tempF: 800, ksi: 16.7, mpa: 115.1 },
          { tempC: 482, tempF: 900, ksi: 16.7, mpa: 115.1 },
          { tempC: 538, tempF: 1000, ksi: 16.7, mpa: 115.1 },
          { tempC: 593, tempF: 1100, ksi: 16.7, mpa: 115.1 },
          { tempC: 649, tempF: 1200, ksi: 16.0, mpa: 110.3 },
          { tempC: 704, tempF: 1300, ksi: 13.5, mpa: 93.1 },
          { tempC: 760, tempF: 1400, ksi: 10.0, mpa: 68.9 },
          { tempC: 816, tempF: 1500, ksi: 6.8, mpa: 46.9 },
          { tempC: 871, tempF: 1600, ksi: 4.4, mpa: 30.3 },
          { tempC: 927, tempF: 1700, ksi: 2.7, mpa: 18.6 },
          { tempC: 982, tempF: 1800, ksi: 1.6, mpa: 11.0 },
        ],
      },
      // Incoloy 825
      {
        code: 'B423_INCOLOY825',
        name: 'ASTM B423 Incoloy 825 (Ni-Fe-Cr-Mo-Cu)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 23.3, mpa: 160.6 },
          { tempC: 38, tempF: 100, ksi: 23.3, mpa: 160.6 },
          { tempC: 93, tempF: 200, ksi: 22.2, mpa: 153.1 },
          { tempC: 149, tempF: 300, ksi: 21.5, mpa: 148.2 },
          { tempC: 204, tempF: 400, ksi: 21.0, mpa: 144.8 },
          { tempC: 260, tempF: 500, ksi: 20.6, mpa: 142.0 },
          { tempC: 316, tempF: 600, ksi: 20.3, mpa: 139.9 },
          { tempC: 371, tempF: 700, ksi: 20.1, mpa: 138.6 },
          { tempC: 427, tempF: 800, ksi: 19.9, mpa: 137.2 },
          { tempC: 482, tempF: 900, ksi: 19.5, mpa: 134.4 },
          { tempC: 538, tempF: 1000, ksi: 18.8, mpa: 129.6 },
        ],
      },
      // Inconel 625
      {
        code: 'B444_INCONEL625',
        name: 'ASTM B444 Inconel 625 (Ni-Cr-Mo-Nb)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 40.0, mpa: 275.8 },
          { tempC: 38, tempF: 100, ksi: 40.0, mpa: 275.8 },
          { tempC: 93, tempF: 200, ksi: 40.0, mpa: 275.8 },
          { tempC: 149, tempF: 300, ksi: 40.0, mpa: 275.8 },
          { tempC: 204, tempF: 400, ksi: 40.0, mpa: 275.8 },
          { tempC: 260, tempF: 500, ksi: 39.5, mpa: 272.4 },
          { tempC: 316, tempF: 600, ksi: 38.8, mpa: 267.5 },
          { tempC: 371, tempF: 700, ksi: 38.0, mpa: 262.0 },
          { tempC: 427, tempF: 800, ksi: 37.0, mpa: 255.1 },
          { tempC: 482, tempF: 900, ksi: 35.8, mpa: 246.8 },
          { tempC: 538, tempF: 1000, ksi: 34.2, mpa: 235.8 },
          { tempC: 593, tempF: 1100, ksi: 32.0, mpa: 220.6 },
          { tempC: 649, tempF: 1200, ksi: 28.5, mpa: 196.5 },
          { tempC: 704, tempF: 1300, ksi: 23.5, mpa: 162.0 },
          { tempC: 760, tempF: 1400, ksi: 17.5, mpa: 120.7 },
          { tempC: 816, tempF: 1500, ksi: 12.0, mpa: 82.7 },
          { tempC: 871, tempF: 1600, ksi: 7.5, mpa: 51.7 },
        ],
      },
      // Hastelloy C-276
      {
        code: 'B619_HASTELLOYC276',
        name: 'ASTM B619 Hastelloy C-276 (Ni-Mo-Cr)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 28.6, mpa: 197.2 },
          { tempC: 38, tempF: 100, ksi: 28.6, mpa: 197.2 },
          { tempC: 93, tempF: 200, ksi: 27.0, mpa: 186.2 },
          { tempC: 149, tempF: 300, ksi: 25.8, mpa: 177.9 },
          { tempC: 204, tempF: 400, ksi: 24.9, mpa: 171.7 },
          { tempC: 260, tempF: 500, ksi: 24.2, mpa: 166.9 },
          { tempC: 316, tempF: 600, ksi: 23.7, mpa: 163.4 },
          { tempC: 371, tempF: 700, ksi: 23.3, mpa: 160.6 },
          { tempC: 427, tempF: 800, ksi: 23.0, mpa: 158.6 },
          { tempC: 482, tempF: 900, ksi: 22.6, mpa: 155.8 },
          { tempC: 538, tempF: 1000, ksi: 22.0, mpa: 151.7 },
          { tempC: 593, tempF: 1100, ksi: 20.5, mpa: 141.3 },
          { tempC: 649, tempF: 1200, ksi: 17.5, mpa: 120.7 },
          { tempC: 704, tempF: 1300, ksi: 13.5, mpa: 93.1 },
          { tempC: 760, tempF: 1400, ksi: 9.5, mpa: 65.5 },
        ],
      },
    ];

    for (const grade of nickelGrades) {
      for (const stress of grade.stressData) {
        await queryRunner.query(
          `
          INSERT INTO material_allowable_stresses (material_code, material_name, temperature_celsius, temperature_fahrenheit, allowable_stress_ksi, allowable_stress_mpa, source_standard)
          VALUES ($1, $2, $3, $4, $5, $6, 'ASME B31.3')
          ON CONFLICT (material_code, temperature_celsius) DO UPDATE SET
            allowable_stress_ksi = $5, allowable_stress_mpa = $6
        `,
          [
            grade.code,
            grade.name,
            stress.tempC,
            stress.tempF,
            stress.ksi,
            stress.mpa,
          ],
        );
      }
    }

    console.warn('Stainless steel and nickel alloy data migration complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Rollback not implemented for stainless and nickel data');
  }
}
