import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInternationalStandardsAndProperties1774800000000 implements MigrationInterface {
  name = 'AddInternationalStandardsAndProperties1774800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Adding international pipe standards, mechanical properties, and cost data...',
    );

    // ============================================================
    // 1. Large Bore Pipe Schedules (>24") - Additional schedules
    // ============================================================
    console.warn(
      'Adding large bore pipe schedules (26"-48") with higher schedules...',
    );

    const largeBoreSchedules = [
      // NPS 26" (660.4mm OD)
      {
        nps: '26',
        nbMm: 650,
        odInch: 26.0,
        odMm: 660.4,
        schedule: '30',
        wallInch: 0.625,
        wallMm: 15.88,
      },
      {
        nps: '26',
        nbMm: 650,
        odInch: 26.0,
        odMm: 660.4,
        schedule: '40',
        wallInch: 0.75,
        wallMm: 19.05,
      },
      {
        nps: '26',
        nbMm: 650,
        odInch: 26.0,
        odMm: 660.4,
        schedule: '60',
        wallInch: 0.875,
        wallMm: 22.23,
      },
      {
        nps: '26',
        nbMm: 650,
        odInch: 26.0,
        odMm: 660.4,
        schedule: '80',
        wallInch: 1.0,
        wallMm: 25.4,
      },
      {
        nps: '26',
        nbMm: 650,
        odInch: 26.0,
        odMm: 660.4,
        schedule: '100',
        wallInch: 1.125,
        wallMm: 28.58,
      },
      {
        nps: '26',
        nbMm: 650,
        odInch: 26.0,
        odMm: 660.4,
        schedule: '120',
        wallInch: 1.25,
        wallMm: 31.75,
      },
      {
        nps: '26',
        nbMm: 650,
        odInch: 26.0,
        odMm: 660.4,
        schedule: '140',
        wallInch: 1.375,
        wallMm: 34.93,
      },
      {
        nps: '26',
        nbMm: 650,
        odInch: 26.0,
        odMm: 660.4,
        schedule: '160',
        wallInch: 1.5,
        wallMm: 38.1,
      },

      // NPS 28" (711.2mm OD)
      {
        nps: '28',
        nbMm: 700,
        odInch: 28.0,
        odMm: 711.2,
        schedule: '40',
        wallInch: 0.75,
        wallMm: 19.05,
      },
      {
        nps: '28',
        nbMm: 700,
        odInch: 28.0,
        odMm: 711.2,
        schedule: '60',
        wallInch: 0.938,
        wallMm: 23.83,
      },
      {
        nps: '28',
        nbMm: 700,
        odInch: 28.0,
        odMm: 711.2,
        schedule: '80',
        wallInch: 1.094,
        wallMm: 27.79,
      },
      {
        nps: '28',
        nbMm: 700,
        odInch: 28.0,
        odMm: 711.2,
        schedule: '100',
        wallInch: 1.25,
        wallMm: 31.75,
      },
      {
        nps: '28',
        nbMm: 700,
        odInch: 28.0,
        odMm: 711.2,
        schedule: '120',
        wallInch: 1.406,
        wallMm: 35.71,
      },
      {
        nps: '28',
        nbMm: 700,
        odInch: 28.0,
        odMm: 711.2,
        schedule: '140',
        wallInch: 1.562,
        wallMm: 39.67,
      },
      {
        nps: '28',
        nbMm: 700,
        odInch: 28.0,
        odMm: 711.2,
        schedule: '160',
        wallInch: 1.688,
        wallMm: 42.88,
      },

      // NPS 30" (762mm OD)
      {
        nps: '30',
        nbMm: 750,
        odInch: 30.0,
        odMm: 762.0,
        schedule: '40',
        wallInch: 0.75,
        wallMm: 19.05,
      },
      {
        nps: '30',
        nbMm: 750,
        odInch: 30.0,
        odMm: 762.0,
        schedule: '60',
        wallInch: 1.0,
        wallMm: 25.4,
      },
      {
        nps: '30',
        nbMm: 750,
        odInch: 30.0,
        odMm: 762.0,
        schedule: '80',
        wallInch: 1.188,
        wallMm: 30.18,
      },
      {
        nps: '30',
        nbMm: 750,
        odInch: 30.0,
        odMm: 762.0,
        schedule: '100',
        wallInch: 1.375,
        wallMm: 34.93,
      },
      {
        nps: '30',
        nbMm: 750,
        odInch: 30.0,
        odMm: 762.0,
        schedule: '120',
        wallInch: 1.562,
        wallMm: 39.67,
      },
      {
        nps: '30',
        nbMm: 750,
        odInch: 30.0,
        odMm: 762.0,
        schedule: '140',
        wallInch: 1.75,
        wallMm: 44.45,
      },
      {
        nps: '30',
        nbMm: 750,
        odInch: 30.0,
        odMm: 762.0,
        schedule: '160',
        wallInch: 1.875,
        wallMm: 47.63,
      },

      // NPS 32" (812.8mm OD)
      {
        nps: '32',
        nbMm: 800,
        odInch: 32.0,
        odMm: 812.8,
        schedule: '60',
        wallInch: 1.062,
        wallMm: 26.97,
      },
      {
        nps: '32',
        nbMm: 800,
        odInch: 32.0,
        odMm: 812.8,
        schedule: '80',
        wallInch: 1.25,
        wallMm: 31.75,
      },
      {
        nps: '32',
        nbMm: 800,
        odInch: 32.0,
        odMm: 812.8,
        schedule: '100',
        wallInch: 1.438,
        wallMm: 36.53,
      },
      {
        nps: '32',
        nbMm: 800,
        odInch: 32.0,
        odMm: 812.8,
        schedule: '120',
        wallInch: 1.625,
        wallMm: 41.28,
      },
      {
        nps: '32',
        nbMm: 800,
        odInch: 32.0,
        odMm: 812.8,
        schedule: '140',
        wallInch: 1.812,
        wallMm: 46.02,
      },
      {
        nps: '32',
        nbMm: 800,
        odInch: 32.0,
        odMm: 812.8,
        schedule: '160',
        wallInch: 2.0,
        wallMm: 50.8,
      },

      // NPS 34" (863.6mm OD)
      {
        nps: '34',
        nbMm: 850,
        odInch: 34.0,
        odMm: 863.6,
        schedule: '60',
        wallInch: 1.125,
        wallMm: 28.58,
      },
      {
        nps: '34',
        nbMm: 850,
        odInch: 34.0,
        odMm: 863.6,
        schedule: '80',
        wallInch: 1.312,
        wallMm: 33.32,
      },
      {
        nps: '34',
        nbMm: 850,
        odInch: 34.0,
        odMm: 863.6,
        schedule: '100',
        wallInch: 1.5,
        wallMm: 38.1,
      },
      {
        nps: '34',
        nbMm: 850,
        odInch: 34.0,
        odMm: 863.6,
        schedule: '120',
        wallInch: 1.688,
        wallMm: 42.88,
      },
      {
        nps: '34',
        nbMm: 850,
        odInch: 34.0,
        odMm: 863.6,
        schedule: '140',
        wallInch: 1.875,
        wallMm: 47.63,
      },
      {
        nps: '34',
        nbMm: 850,
        odInch: 34.0,
        odMm: 863.6,
        schedule: '160',
        wallInch: 2.062,
        wallMm: 52.37,
      },

      // NPS 36" (914.4mm OD)
      {
        nps: '36',
        nbMm: 900,
        odInch: 36.0,
        odMm: 914.4,
        schedule: '60',
        wallInch: 1.188,
        wallMm: 30.18,
      },
      {
        nps: '36',
        nbMm: 900,
        odInch: 36.0,
        odMm: 914.4,
        schedule: '80',
        wallInch: 1.375,
        wallMm: 34.93,
      },
      {
        nps: '36',
        nbMm: 900,
        odInch: 36.0,
        odMm: 914.4,
        schedule: '100',
        wallInch: 1.562,
        wallMm: 39.67,
      },
      {
        nps: '36',
        nbMm: 900,
        odInch: 36.0,
        odMm: 914.4,
        schedule: '120',
        wallInch: 1.75,
        wallMm: 44.45,
      },
      {
        nps: '36',
        nbMm: 900,
        odInch: 36.0,
        odMm: 914.4,
        schedule: '140',
        wallInch: 1.938,
        wallMm: 49.23,
      },
      {
        nps: '36',
        nbMm: 900,
        odInch: 36.0,
        odMm: 914.4,
        schedule: '160',
        wallInch: 2.125,
        wallMm: 53.98,
      },

      // NPS 42" (1066.8mm OD)
      {
        nps: '42',
        nbMm: 1050,
        odInch: 42.0,
        odMm: 1066.8,
        schedule: '60',
        wallInch: 1.375,
        wallMm: 34.93,
      },
      {
        nps: '42',
        nbMm: 1050,
        odInch: 42.0,
        odMm: 1066.8,
        schedule: '80',
        wallInch: 1.562,
        wallMm: 39.67,
      },
      {
        nps: '42',
        nbMm: 1050,
        odInch: 42.0,
        odMm: 1066.8,
        schedule: '100',
        wallInch: 1.75,
        wallMm: 44.45,
      },
      {
        nps: '42',
        nbMm: 1050,
        odInch: 42.0,
        odMm: 1066.8,
        schedule: '120',
        wallInch: 2.0,
        wallMm: 50.8,
      },

      // NPS 48" (1219.2mm OD)
      {
        nps: '48',
        nbMm: 1200,
        odInch: 48.0,
        odMm: 1219.2,
        schedule: '60',
        wallInch: 1.562,
        wallMm: 39.67,
      },
      {
        nps: '48',
        nbMm: 1200,
        odInch: 48.0,
        odMm: 1219.2,
        schedule: '80',
        wallInch: 1.75,
        wallMm: 44.45,
      },
      {
        nps: '48',
        nbMm: 1200,
        odInch: 48.0,
        odMm: 1219.2,
        schedule: '100',
        wallInch: 2.0,
        wallMm: 50.8,
      },
      {
        nps: '48',
        nbMm: 1200,
        odInch: 48.0,
        odMm: 1219.2,
        schedule: '120',
        wallInch: 2.25,
        wallMm: 57.15,
      },
    ];

    for (const pipe of largeBoreSchedules) {
      await queryRunner.query(
        `
        INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ASME B36.10')
        ON CONFLICT (nps, schedule) DO UPDATE SET
          wall_thickness_inch = EXCLUDED.wall_thickness_inch,
          wall_thickness_mm = EXCLUDED.wall_thickness_mm,
          outside_diameter_inch = EXCLUDED.outside_diameter_inch,
          outside_diameter_mm = EXCLUDED.outside_diameter_mm
      `,
        [
          pipe.nps,
          pipe.nbMm,
          pipe.schedule,
          pipe.wallInch,
          pipe.wallMm,
          pipe.odInch,
          pipe.odMm,
        ],
      );

      await queryRunner.query(
        `
        INSERT INTO pipe_schedule_walls (nps, schedule, wall_thickness_inch, wall_thickness_mm)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (nps, schedule) DO UPDATE SET
          wall_thickness_inch = EXCLUDED.wall_thickness_inch,
          wall_thickness_mm = EXCLUDED.wall_thickness_mm
      `,
        [pipe.nps, pipe.schedule, pipe.wallInch, pipe.wallMm],
      );
    }

    console.warn('Large bore pipe schedules added.');

    // ============================================================
    // 2. EN 10216/10217 European Seamless/Welded Steel Tubes
    // ============================================================
    console.warn('Adding EN 10216/10217 European pipe standards...');

    const enGrades = [
      {
        code: 'EN10216_P235GH',
        name: 'EN 10216-2 P235GH (Seamless, Elevated Temp)',
        category: 'EN_SEAMLESS',
        stressData: [
          { tempF: 68, ksi: 16.5 },
          { tempF: 212, ksi: 14.5 },
          { tempF: 392, ksi: 13.1 },
          { tempF: 572, ksi: 12.0 },
          { tempF: 752, ksi: 10.2 },
          { tempF: 842, ksi: 8.0 },
        ],
      },
      {
        code: 'EN10216_P265GH',
        name: 'EN 10216-2 P265GH (Seamless, Elevated Temp)',
        category: 'EN_SEAMLESS',
        stressData: [
          { tempF: 68, ksi: 18.5 },
          { tempF: 212, ksi: 16.4 },
          { tempF: 392, ksi: 14.8 },
          { tempF: 572, ksi: 13.5 },
          { tempF: 752, ksi: 11.5 },
          { tempF: 842, ksi: 9.0 },
        ],
      },
      {
        code: 'EN10216_P355GH',
        name: 'EN 10216-2 P355GH (Seamless, Elevated Temp)',
        category: 'EN_SEAMLESS',
        stressData: [
          { tempF: 68, ksi: 24.7 },
          { tempF: 212, ksi: 22.0 },
          { tempF: 392, ksi: 19.9 },
          { tempF: 572, ksi: 18.1 },
          { tempF: 752, ksi: 15.4 },
          { tempF: 842, ksi: 12.1 },
        ],
      },
      {
        code: 'EN10216_16Mo3',
        name: 'EN 10216-2 16Mo3 (Seamless, 0.3Mo)',
        category: 'EN_SEAMLESS_ALLOY',
        stressData: [
          { tempF: 68, ksi: 18.9 },
          { tempF: 212, ksi: 17.7 },
          { tempF: 392, ksi: 16.4 },
          { tempF: 572, ksi: 15.2 },
          { tempF: 752, ksi: 14.0 },
          { tempF: 932, ksi: 11.6 },
          { tempF: 1022, ksi: 8.7 },
        ],
      },
      {
        code: 'EN10216_13CrMo4_5',
        name: 'EN 10216-2 13CrMo4-5 (Seamless, 1Cr-0.5Mo)',
        category: 'EN_SEAMLESS_ALLOY',
        stressData: [
          { tempF: 68, ksi: 18.9 },
          { tempF: 212, ksi: 17.7 },
          { tempF: 392, ksi: 16.4 },
          { tempF: 572, ksi: 15.4 },
          { tempF: 752, ksi: 14.5 },
          { tempF: 932, ksi: 12.3 },
          { tempF: 1022, ksi: 9.4 },
          { tempF: 1112, ksi: 6.5 },
        ],
      },
      {
        code: 'EN10216_10CrMo9_10',
        name: 'EN 10216-2 10CrMo9-10 (Seamless, 2.25Cr-1Mo)',
        category: 'EN_SEAMLESS_ALLOY',
        stressData: [
          { tempF: 68, ksi: 18.9 },
          { tempF: 212, ksi: 17.7 },
          { tempF: 392, ksi: 16.4 },
          { tempF: 572, ksi: 15.4 },
          { tempF: 752, ksi: 14.5 },
          { tempF: 932, ksi: 12.6 },
          { tempF: 1022, ksi: 10.2 },
          { tempF: 1112, ksi: 7.3 },
        ],
      },
      {
        code: 'EN10217_P235GH',
        name: 'EN 10217-2 P235GH (Welded, Elevated Temp)',
        category: 'EN_WELDED',
        stressData: [
          { tempF: 68, ksi: 14.5 },
          { tempF: 212, ksi: 12.7 },
          { tempF: 392, ksi: 11.5 },
          { tempF: 572, ksi: 10.5 },
          { tempF: 752, ksi: 8.9 },
        ],
      },
      {
        code: 'EN10217_P265GH',
        name: 'EN 10217-2 P265GH (Welded, Elevated Temp)',
        category: 'EN_WELDED',
        stressData: [
          { tempF: 68, ksi: 16.2 },
          { tempF: 212, ksi: 14.4 },
          { tempF: 392, ksi: 13.0 },
          { tempF: 572, ksi: 11.8 },
          { tempF: 752, ksi: 10.1 },
        ],
      },
      {
        code: 'EN10216_X2CrNi19_11',
        name: 'EN 10216-5 X2CrNi19-11 (304L Equivalent)',
        category: 'EN_STAINLESS',
        stressData: [
          { tempF: 68, ksi: 14.2 },
          { tempF: 212, ksi: 12.3 },
          { tempF: 392, ksi: 10.9 },
          { tempF: 572, ksi: 10.0 },
          { tempF: 752, ksi: 9.3 },
          { tempF: 932, ksi: 8.8 },
          { tempF: 1112, ksi: 8.3 },
        ],
      },
      {
        code: 'EN10216_X2CrNiMo17_12_2',
        name: 'EN 10216-5 X2CrNiMo17-12-2 (316L Equivalent)',
        category: 'EN_STAINLESS',
        stressData: [
          { tempF: 68, ksi: 14.2 },
          { tempF: 212, ksi: 12.6 },
          { tempF: 392, ksi: 11.3 },
          { tempF: 572, ksi: 10.4 },
          { tempF: 752, ksi: 9.7 },
          { tempF: 932, ksi: 9.2 },
          { tempF: 1112, ksi: 8.7 },
        ],
      },
    ];

    for (const grade of enGrades) {
      const result = await queryRunner.query(
        `
        INSERT INTO pipe_steel_grades (code, name, category, equivalent_grade)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
        RETURNING id
      `,
        [grade.code, grade.name, grade.category],
      );

      const gradeId = result[0]?.id;
      if (gradeId) {
        for (const stress of grade.stressData) {
          await queryRunner.query(
            `
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `,
            [gradeId, stress.tempF, stress.ksi],
          );
        }
      }
    }

    console.warn('EN 10216/10217 grades added.');

    // ============================================================
    // 3. DIN 2448/2458 German Pipe Standards
    // ============================================================
    console.warn('Adding DIN 2448/2458 German pipe standards...');

    const dinGrades = [
      {
        code: 'DIN2448_St35_8',
        name: 'DIN 2448 St35.8 (Seamless, General Purpose)',
        category: 'DIN_SEAMLESS',
        stressData: [
          { tempF: 68, ksi: 15.2 },
          { tempF: 212, ksi: 14.5 },
          { tempF: 392, ksi: 13.1 },
          { tempF: 572, ksi: 11.6 },
          { tempF: 752, ksi: 8.7 },
        ],
      },
      {
        code: 'DIN2448_St45_8',
        name: 'DIN 2448 St45.8 (Seamless, Elevated Temp)',
        category: 'DIN_SEAMLESS',
        stressData: [
          { tempF: 68, ksi: 18.9 },
          { tempF: 212, ksi: 17.4 },
          { tempF: 392, ksi: 15.9 },
          { tempF: 572, ksi: 14.5 },
          { tempF: 752, ksi: 11.6 },
          { tempF: 842, ksi: 8.7 },
        ],
      },
      {
        code: 'DIN2448_15Mo3',
        name: 'DIN 2448 15Mo3 (Seamless, 0.3Mo Alloy)',
        category: 'DIN_SEAMLESS_ALLOY',
        stressData: [
          { tempF: 68, ksi: 17.4 },
          { tempF: 212, ksi: 16.7 },
          { tempF: 392, ksi: 15.9 },
          { tempF: 572, ksi: 14.5 },
          { tempF: 752, ksi: 13.1 },
          { tempF: 932, ksi: 10.9 },
          { tempF: 1022, ksi: 8.0 },
        ],
      },
      {
        code: 'DIN2458_St37_0',
        name: 'DIN 2458 St37.0 (Welded, General Purpose)',
        category: 'DIN_WELDED',
        stressData: [
          { tempF: 68, ksi: 13.1 },
          { tempF: 212, ksi: 12.3 },
          { tempF: 392, ksi: 11.6 },
          { tempF: 572, ksi: 10.2 },
        ],
      },
      {
        code: 'DIN2458_St52_0',
        name: 'DIN 2458 St52.0 (Welded, Higher Strength)',
        category: 'DIN_WELDED',
        stressData: [
          { tempF: 68, ksi: 18.1 },
          { tempF: 212, ksi: 17.0 },
          { tempF: 392, ksi: 15.9 },
          { tempF: 572, ksi: 14.2 },
        ],
      },
    ];

    for (const grade of dinGrades) {
      const result = await queryRunner.query(
        `
        INSERT INTO pipe_steel_grades (code, name, category, equivalent_grade)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
        RETURNING id
      `,
        [grade.code, grade.name, grade.category],
      );

      const gradeId = result[0]?.id;
      if (gradeId) {
        for (const stress of grade.stressData) {
          await queryRunner.query(
            `
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `,
            [gradeId, stress.tempF, stress.ksi],
          );
        }
      }
    }

    console.warn('DIN 2448/2458 grades added.');

    // ============================================================
    // 4. BS 1387 British Steel Tubes
    // ============================================================
    console.warn('Adding BS 1387 British steel tube standards...');

    const bsGrades = [
      {
        code: 'BS1387_LIGHT',
        name: 'BS 1387 Light Grade (Screwed/Socketed)',
        category: 'BS_TUBE',
        stressData: [
          { tempF: 68, ksi: 12.3 },
          { tempF: 212, ksi: 11.6 },
          { tempF: 392, ksi: 10.9 },
          { tempF: 500, ksi: 10.2 },
        ],
      },
      {
        code: 'BS1387_MEDIUM',
        name: 'BS 1387 Medium Grade (Screwed/Socketed)',
        category: 'BS_TUBE',
        stressData: [
          { tempF: 68, ksi: 13.8 },
          { tempF: 212, ksi: 13.1 },
          { tempF: 392, ksi: 12.3 },
          { tempF: 500, ksi: 11.6 },
        ],
      },
      {
        code: 'BS1387_HEAVY',
        name: 'BS 1387 Heavy Grade (Screwed/Socketed)',
        category: 'BS_TUBE',
        stressData: [
          { tempF: 68, ksi: 15.2 },
          { tempF: 212, ksi: 14.5 },
          { tempF: 392, ksi: 13.8 },
          { tempF: 500, ksi: 13.1 },
        ],
      },
    ];

    for (const grade of bsGrades) {
      const result = await queryRunner.query(
        `
        INSERT INTO pipe_steel_grades (code, name, category, equivalent_grade)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
        RETURNING id
      `,
        [grade.code, grade.name, grade.category],
      );

      const gradeId = result[0]?.id;
      if (gradeId) {
        for (const stress of grade.stressData) {
          await queryRunner.query(
            `
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `,
            [gradeId, stress.tempF, stress.ksi],
          );
        }
      }
    }

    console.warn('BS 1387 grades added.');

    // ============================================================
    // 5. Mechanical Properties Table Enhancement
    // ============================================================
    console.warn(
      'Adding mechanical properties (hardness, elongation, impact)...',
    );

    await queryRunner.query(`
      ALTER TABLE material_physical_properties
      ADD COLUMN IF NOT EXISTS hardness_brinell INTEGER,
      ADD COLUMN IF NOT EXISTS hardness_rockwell_b INTEGER,
      ADD COLUMN IF NOT EXISTS elongation_percent DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS reduction_of_area_percent DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS impact_charpy_joules DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS impact_temp_c INTEGER
    `);

    const mechanicalProperties = [
      {
        code: 'CARBON_STEEL',
        hardnessB: 131,
        hardnessRb: 71,
        elongation: 30,
        reduction: 50,
        impact: 27,
        impactTemp: -29,
      },
      {
        code: 'A106_GRB',
        hardnessB: 143,
        hardnessRb: 77,
        elongation: 30,
        reduction: 50,
        impact: 27,
        impactTemp: -29,
      },
      {
        code: 'A333_GR6',
        hardnessB: 143,
        hardnessRb: 77,
        elongation: 30,
        reduction: 50,
        impact: 18,
        impactTemp: -46,
      },
      {
        code: 'A335_P11',
        hardnessB: 163,
        hardnessRb: 85,
        elongation: 30,
        reduction: 50,
        impact: 27,
        impactTemp: 21,
      },
      {
        code: 'A335_P22',
        hardnessB: 163,
        hardnessRb: 85,
        elongation: 30,
        reduction: 50,
        impact: 27,
        impactTemp: 21,
      },
      {
        code: 'A335_P91',
        hardnessB: 248,
        hardnessRb: 99,
        elongation: 20,
        reduction: 45,
        impact: 27,
        impactTemp: 21,
      },
      {
        code: 'SS304',
        hardnessB: 201,
        hardnessRb: 92,
        elongation: 40,
        reduction: 60,
        impact: 100,
        impactTemp: -196,
      },
      {
        code: 'SS304L',
        hardnessB: 187,
        hardnessRb: 88,
        elongation: 40,
        reduction: 60,
        impact: 100,
        impactTemp: -196,
      },
      {
        code: 'SS316',
        hardnessB: 217,
        hardnessRb: 95,
        elongation: 40,
        reduction: 60,
        impact: 100,
        impactTemp: -196,
      },
      {
        code: 'SS316L',
        hardnessB: 187,
        hardnessRb: 88,
        elongation: 40,
        reduction: 60,
        impact: 100,
        impactTemp: -196,
      },
      {
        code: 'SS321',
        hardnessB: 217,
        hardnessRb: 95,
        elongation: 40,
        reduction: 55,
        impact: 100,
        impactTemp: -196,
      },
      {
        code: 'SS347',
        hardnessB: 217,
        hardnessRb: 95,
        elongation: 40,
        reduction: 55,
        impact: 100,
        impactTemp: -196,
      },
      {
        code: 'DUPLEX_2205',
        hardnessB: 293,
        hardnessRb: 100,
        elongation: 25,
        reduction: 45,
        impact: 45,
        impactTemp: -46,
      },
      {
        code: 'SUPER_DUPLEX_2507',
        hardnessB: 310,
        hardnessRb: 100,
        elongation: 25,
        reduction: 45,
        impact: 45,
        impactTemp: -46,
      },
      {
        code: 'INCONEL_625',
        hardnessB: 240,
        hardnessRb: 99,
        elongation: 30,
        reduction: 50,
        impact: 80,
        impactTemp: -196,
      },
      {
        code: 'MONEL_400',
        hardnessB: 140,
        hardnessRb: 75,
        elongation: 35,
        reduction: 60,
        impact: 120,
        impactTemp: -196,
      },
      {
        code: 'HASTELLOY_C276',
        hardnessB: 210,
        hardnessRb: 93,
        elongation: 40,
        reduction: 50,
        impact: 100,
        impactTemp: -196,
      },
      {
        code: 'SS409',
        hardnessB: 179,
        hardnessRb: 86,
        elongation: 25,
        reduction: 45,
        impact: 27,
        impactTemp: 21,
      },
      {
        code: 'SS410',
        hardnessB: 217,
        hardnessRb: 95,
        elongation: 20,
        reduction: 45,
        impact: 27,
        impactTemp: 21,
      },
      {
        code: 'SS430',
        hardnessB: 183,
        hardnessRb: 88,
        elongation: 22,
        reduction: 50,
        impact: 27,
        impactTemp: 21,
      },
      {
        code: 'A36_STRUCTURAL',
        hardnessB: 119,
        hardnessRb: 67,
        elongation: 23,
        reduction: 50,
        impact: 27,
        impactTemp: 21,
      },
      {
        code: 'A572_50',
        hardnessB: 143,
        hardnessRb: 77,
        elongation: 21,
        reduction: 50,
        impact: 27,
        impactTemp: 21,
      },
    ];

    for (const props of mechanicalProperties) {
      await queryRunner.query(
        `
        UPDATE material_physical_properties SET
          hardness_brinell = $2,
          hardness_rockwell_b = $3,
          elongation_percent = $4,
          reduction_of_area_percent = $5,
          impact_charpy_joules = $6,
          impact_temp_c = $7
        WHERE material_code = $1
      `,
        [
          props.code,
          props.hardnessB,
          props.hardnessRb,
          props.elongation,
          props.reduction,
          props.impact,
          props.impactTemp,
        ],
      );
    }

    console.warn('Mechanical properties added.');

    // ============================================================
    // 6. Material Cost Data Table
    // ============================================================
    console.warn('Adding material cost data table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS material_costs (
        id SERIAL PRIMARY KEY,
        material_code VARCHAR(100) NOT NULL,
        material_category VARCHAR(100),
        cost_per_kg_usd DECIMAL(10,2),
        cost_per_kg_zar DECIMAL(10,2),
        cost_multiplier DECIMAL(6,3) DEFAULT 1.000,
        effective_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(material_code, effective_date)
      )
    `);

    const costData = [
      {
        code: 'CARBON_STEEL',
        category: 'Carbon Steel',
        usd: 0.8,
        zar: 15.0,
        multiplier: 1.0,
      },
      {
        code: 'A106_GRB',
        category: 'Carbon Steel',
        usd: 0.85,
        zar: 16.0,
        multiplier: 1.06,
      },
      {
        code: 'A333_GR6',
        category: 'Low Temp Carbon',
        usd: 1.2,
        zar: 22.5,
        multiplier: 1.5,
      },
      {
        code: 'A335_P11',
        category: 'Chrome-Moly',
        usd: 2.5,
        zar: 47.0,
        multiplier: 3.1,
      },
      {
        code: 'A335_P22',
        category: 'Chrome-Moly',
        usd: 3.0,
        zar: 56.0,
        multiplier: 3.8,
      },
      {
        code: 'A335_P91',
        category: 'Chrome-Moly',
        usd: 5.5,
        zar: 103.0,
        multiplier: 6.9,
      },
      {
        code: 'SS304',
        category: 'Stainless 300 Series',
        usd: 3.5,
        zar: 66.0,
        multiplier: 4.4,
      },
      {
        code: 'SS304L',
        category: 'Stainless 300 Series',
        usd: 3.6,
        zar: 68.0,
        multiplier: 4.5,
      },
      {
        code: 'SS316',
        category: 'Stainless 300 Series',
        usd: 4.5,
        zar: 84.0,
        multiplier: 5.6,
      },
      {
        code: 'SS316L',
        category: 'Stainless 300 Series',
        usd: 4.6,
        zar: 86.0,
        multiplier: 5.8,
      },
      {
        code: 'SS321',
        category: 'Stainless 300 Series',
        usd: 5.0,
        zar: 94.0,
        multiplier: 6.3,
      },
      {
        code: 'SS347',
        category: 'Stainless 300 Series',
        usd: 5.5,
        zar: 103.0,
        multiplier: 6.9,
      },
      {
        code: 'DUPLEX_2205',
        category: 'Duplex Stainless',
        usd: 7.5,
        zar: 141.0,
        multiplier: 9.4,
      },
      {
        code: 'SUPER_DUPLEX_2507',
        category: 'Super Duplex',
        usd: 12.0,
        zar: 225.0,
        multiplier: 15.0,
      },
      {
        code: 'INCONEL_625',
        category: 'Nickel Alloy',
        usd: 35.0,
        zar: 656.0,
        multiplier: 43.8,
      },
      {
        code: 'INCONEL_600',
        category: 'Nickel Alloy',
        usd: 28.0,
        zar: 525.0,
        multiplier: 35.0,
      },
      {
        code: 'MONEL_400',
        category: 'Nickel Alloy',
        usd: 22.0,
        zar: 413.0,
        multiplier: 27.5,
      },
      {
        code: 'HASTELLOY_C276',
        category: 'Nickel Alloy',
        usd: 45.0,
        zar: 844.0,
        multiplier: 56.3,
      },
      {
        code: 'INCOLOY_800H',
        category: 'Nickel Alloy',
        usd: 18.0,
        zar: 338.0,
        multiplier: 22.5,
      },
      {
        code: 'INCOLOY_825',
        category: 'Nickel Alloy',
        usd: 20.0,
        zar: 375.0,
        multiplier: 25.0,
      },
      {
        code: 'SS409',
        category: 'Ferritic Stainless',
        usd: 2.2,
        zar: 41.0,
        multiplier: 2.8,
      },
      {
        code: 'SS410',
        category: 'Martensitic Stainless',
        usd: 2.5,
        zar: 47.0,
        multiplier: 3.1,
      },
      {
        code: 'SS430',
        category: 'Ferritic Stainless',
        usd: 2.4,
        zar: 45.0,
        multiplier: 3.0,
      },
      {
        code: 'A36_STRUCTURAL',
        category: 'Structural Steel',
        usd: 0.75,
        zar: 14.0,
        multiplier: 0.94,
      },
      {
        code: 'API_5L_X52',
        category: 'Pipeline Steel',
        usd: 1.1,
        zar: 21.0,
        multiplier: 1.4,
      },
      {
        code: 'API_5L_X65',
        category: 'Pipeline Steel',
        usd: 1.3,
        zar: 24.0,
        multiplier: 1.6,
      },
      {
        code: 'API_5L_X70',
        category: 'Pipeline Steel',
        usd: 1.4,
        zar: 26.0,
        multiplier: 1.8,
      },
    ];

    for (const cost of costData) {
      await queryRunner.query(
        `
        INSERT INTO material_costs (material_code, material_category, cost_per_kg_usd, cost_per_kg_zar, cost_multiplier)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (material_code, effective_date) DO UPDATE SET
          material_category = EXCLUDED.material_category,
          cost_per_kg_usd = EXCLUDED.cost_per_kg_usd,
          cost_per_kg_zar = EXCLUDED.cost_per_kg_zar,
          cost_multiplier = EXCLUDED.cost_multiplier
      `,
        [cost.code, cost.category, cost.usd, cost.zar, cost.multiplier],
      );
    }

    console.warn('Material cost data added.');

    // ============================================================
    // 7. SABS 719 Pressure Ratings
    // ============================================================
    console.warn('Adding SABS 719 pressure ratings...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sabs719_pressure_ratings (
        id SERIAL PRIMARY KEY,
        nb_mm INTEGER NOT NULL,
        wall_thickness_mm DECIMAL(6,2) NOT NULL,
        test_pressure_bar DECIMAL(8,2),
        max_working_pressure_bar DECIMAL(8,2),
        notes TEXT,
        UNIQUE(nb_mm, wall_thickness_mm)
      )
    `);

    const sabs719Pressures = [
      { nb: 200, wall: 4.5, test: 50, working: 25 },
      { nb: 200, wall: 6.0, test: 67, working: 33 },
      { nb: 200, wall: 8.0, test: 89, working: 44 },
      { nb: 250, wall: 5.0, test: 44, working: 22 },
      { nb: 250, wall: 6.0, test: 53, working: 27 },
      { nb: 250, wall: 8.0, test: 71, working: 36 },
      { nb: 300, wall: 5.0, test: 37, working: 19 },
      { nb: 300, wall: 6.0, test: 44, working: 22 },
      { nb: 300, wall: 8.0, test: 59, working: 30 },
      { nb: 350, wall: 5.0, test: 32, working: 16 },
      { nb: 350, wall: 6.0, test: 38, working: 19 },
      { nb: 350, wall: 8.0, test: 51, working: 25 },
      { nb: 400, wall: 5.0, test: 28, working: 14 },
      { nb: 400, wall: 6.0, test: 33, working: 17 },
      { nb: 400, wall: 8.0, test: 44, working: 22 },
      { nb: 450, wall: 6.0, test: 30, working: 15 },
      { nb: 450, wall: 8.0, test: 39, working: 20 },
      { nb: 450, wall: 10.0, test: 49, working: 25 },
      { nb: 500, wall: 6.0, test: 27, working: 13 },
      { nb: 500, wall: 8.0, test: 35, working: 18 },
      { nb: 500, wall: 10.0, test: 44, working: 22 },
      { nb: 600, wall: 6.0, test: 22, working: 11 },
      { nb: 600, wall: 8.0, test: 30, working: 15 },
      { nb: 600, wall: 10.0, test: 37, working: 19 },
      { nb: 600, wall: 12.0, test: 44, working: 22 },
      { nb: 700, wall: 8.0, test: 25, working: 13 },
      { nb: 700, wall: 10.0, test: 32, working: 16 },
      { nb: 700, wall: 12.0, test: 38, working: 19 },
      { nb: 800, wall: 8.0, test: 22, working: 11 },
      { nb: 800, wall: 10.0, test: 28, working: 14 },
      { nb: 800, wall: 12.0, test: 33, working: 17 },
      { nb: 900, wall: 10.0, test: 25, working: 12 },
      { nb: 900, wall: 12.0, test: 30, working: 15 },
      { nb: 900, wall: 14.0, test: 34, working: 17 },
      { nb: 1000, wall: 10.0, test: 22, working: 11 },
      { nb: 1000, wall: 12.0, test: 27, working: 13 },
      { nb: 1000, wall: 14.0, test: 31, working: 15 },
      { nb: 1200, wall: 12.0, test: 22, working: 11 },
      { nb: 1200, wall: 14.0, test: 26, working: 13 },
      { nb: 1200, wall: 16.0, test: 30, working: 15 },
    ];

    for (const p of sabs719Pressures) {
      await queryRunner.query(
        `
        INSERT INTO sabs719_pressure_ratings (nb_mm, wall_thickness_mm, test_pressure_bar, max_working_pressure_bar)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (nb_mm, wall_thickness_mm) DO UPDATE SET
          test_pressure_bar = EXCLUDED.test_pressure_bar,
          max_working_pressure_bar = EXCLUDED.max_working_pressure_bar
      `,
        [p.nb, p.wall, p.test, p.working],
      );
    }

    console.warn('SABS 719 pressure ratings added.');

    // ============================================================
    // 8. SABS 657 Steel Tubes for Mechanical Purposes
    // ============================================================
    console.warn('Adding SABS 657 steel tubes...');

    const sabs657Grades = [
      {
        code: 'SABS657_CDS',
        name: 'SABS 657 CDS (Cold Drawn Seamless)',
        category: 'SABS_MECHANICAL',
        stressData: [
          { tempF: 68, ksi: 20.3 },
          { tempF: 212, ksi: 18.9 },
          { tempF: 392, ksi: 17.4 },
        ],
      },
      {
        code: 'SABS657_HFS',
        name: 'SABS 657 HFS (Hot Finished Seamless)',
        category: 'SABS_MECHANICAL',
        stressData: [
          { tempF: 68, ksi: 17.4 },
          { tempF: 212, ksi: 16.0 },
          { tempF: 392, ksi: 14.5 },
        ],
      },
      {
        code: 'SABS657_ERW',
        name: 'SABS 657 ERW (Electric Resistance Welded)',
        category: 'SABS_MECHANICAL',
        stressData: [
          { tempF: 68, ksi: 15.2 },
          { tempF: 212, ksi: 14.5 },
          { tempF: 392, ksi: 13.1 },
        ],
      },
    ];

    for (const grade of sabs657Grades) {
      const result = await queryRunner.query(
        `
        INSERT INTO pipe_steel_grades (code, name, category, equivalent_grade)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
        RETURNING id
      `,
        [grade.code, grade.name, grade.category],
      );

      const gradeId = result[0]?.id;
      if (gradeId) {
        for (const stress of grade.stressData) {
          await queryRunner.query(
            `
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `,
            [gradeId, stress.tempF, stress.ksi],
          );
        }
      }
    }

    console.warn('SABS 657 grades added.');

    console.warn('International standards and properties migration complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Rollback: Removing international standards and properties...',
    );

    await queryRunner.query(`DROP TABLE IF EXISTS material_costs`);
    await queryRunner.query(`DROP TABLE IF EXISTS sabs719_pressure_ratings`);

    await queryRunner.query(`
      ALTER TABLE material_physical_properties
      DROP COLUMN IF EXISTS hardness_brinell,
      DROP COLUMN IF EXISTS hardness_rockwell_b,
      DROP COLUMN IF EXISTS elongation_percent,
      DROP COLUMN IF EXISTS reduction_of_area_percent,
      DROP COLUMN IF EXISTS impact_charpy_joules,
      DROP COLUMN IF EXISTS impact_temp_c
    `);

    const gradesToRemove = [
      'EN10216_P235GH',
      'EN10216_P265GH',
      'EN10216_P355GH',
      'EN10216_16Mo3',
      'EN10216_13CrMo4_5',
      'EN10216_10CrMo9_10',
      'EN10217_P235GH',
      'EN10217_P265GH',
      'EN10216_X2CrNi19_11',
      'EN10216_X2CrNiMo17_12_2',
      'DIN2448_St35_8',
      'DIN2448_St45_8',
      'DIN2448_15Mo3',
      'DIN2458_St37_0',
      'DIN2458_St52_0',
      'BS1387_LIGHT',
      'BS1387_MEDIUM',
      'BS1387_HEAVY',
      'SABS657_CDS',
      'SABS657_HFS',
      'SABS657_ERW',
    ];

    for (const code of gradesToRemove) {
      await queryRunner.query(
        `DELETE FROM pipe_allowable_stresses WHERE grade_id IN (SELECT id FROM pipe_steel_grades WHERE code = $1)`,
        [code],
      );
      await queryRunner.query(`DELETE FROM pipe_steel_grades WHERE code = $1`, [
        code,
      ]);
    }

    console.warn('Rollback complete.');
  }
}
