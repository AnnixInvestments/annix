import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemainingPipeAndMaterialGaps1774700000000 implements MigrationInterface {
  name = 'AddRemainingPipeAndMaterialGaps1774700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding remaining pipe and material data gaps...');

    // ============================================================
    // 1. XXS (Double Extra Strong) Pipe Schedule Data for larger sizes
    // ============================================================
    console.warn('Adding XXS pipe schedule data for sizes > 300mm...');

    const xxsPipeData = [
      { nps: '14', nbMm: 350, odInch: 14.0, odMm: 355.6, wallInch: 0.750, wallMm: 19.05 },
      { nps: '16', nbMm: 400, odInch: 16.0, odMm: 406.4, wallInch: 0.844, wallMm: 21.44 },
      { nps: '18', nbMm: 450, odInch: 18.0, odMm: 457.2, wallInch: 0.938, wallMm: 23.83 },
      { nps: '20', nbMm: 500, odInch: 20.0, odMm: 508.0, wallInch: 1.031, wallMm: 26.19 },
      { nps: '24', nbMm: 600, odInch: 24.0, odMm: 609.6, wallInch: 1.219, wallMm: 30.96 },
    ];

    for (const pipe of xxsPipeData) {
      await queryRunner.query(`
        INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
        VALUES ($1, $2, 'XXS', $3, $4, $5, $6, 'ASME B36.10')
        ON CONFLICT (nps, schedule) DO UPDATE SET
          wall_thickness_inch = EXCLUDED.wall_thickness_inch,
          wall_thickness_mm = EXCLUDED.wall_thickness_mm,
          outside_diameter_inch = EXCLUDED.outside_diameter_inch,
          outside_diameter_mm = EXCLUDED.outside_diameter_mm
      `, [pipe.nps, pipe.nbMm, pipe.wallInch, pipe.wallMm, pipe.odInch, pipe.odMm]);
    }

    // Also add to pipe_schedule_walls table
    for (const pipe of xxsPipeData) {
      await queryRunner.query(`
        INSERT INTO pipe_schedule_walls (nps, schedule, wall_thickness_inch, wall_thickness_mm)
        VALUES ($1, 'XXS', $2, $3)
        ON CONFLICT (nps, schedule) DO UPDATE SET
          wall_thickness_inch = EXCLUDED.wall_thickness_inch,
          wall_thickness_mm = EXCLUDED.wall_thickness_mm
      `, [pipe.nps, pipe.wallInch, pipe.wallMm]);
    }

    console.warn('XXS pipe schedule data added.');

    // ============================================================
    // 2. ASTM A268 Ferritic/Martensitic Stainless Steel Grades
    // ============================================================
    console.warn('Adding ASTM A268 ferritic/martensitic stainless grades...');

    const a268Grades = [
      {
        code: 'ASTM_A268_TP409',
        name: 'ASTM A268 TP409 (11Cr Ferritic)',
        category: 'ASTM_FERRITIC_SS',
        stressData: [
          { tempF: -20, ksi: 15.0 },
          { tempF: 100, ksi: 15.0 },
          { tempF: 200, ksi: 14.6 },
          { tempF: 300, ksi: 14.0 },
          { tempF: 400, ksi: 13.5 },
          { tempF: 500, ksi: 13.1 },
          { tempF: 600, ksi: 12.6 },
          { tempF: 700, ksi: 12.0 },
          { tempF: 800, ksi: 11.3 },
          { tempF: 900, ksi: 10.2 },
          { tempF: 1000, ksi: 7.8 },
          { tempF: 1100, ksi: 5.2 },
          { tempF: 1200, ksi: 3.2 },
        ],
      },
      {
        code: 'ASTM_A268_TP410',
        name: 'ASTM A268 TP410 (12Cr Martensitic)',
        category: 'ASTM_MARTENSITIC_SS',
        stressData: [
          { tempF: -20, ksi: 17.1 },
          { tempF: 100, ksi: 17.1 },
          { tempF: 200, ksi: 17.1 },
          { tempF: 300, ksi: 16.6 },
          { tempF: 400, ksi: 16.1 },
          { tempF: 500, ksi: 15.6 },
          { tempF: 600, ksi: 15.0 },
          { tempF: 700, ksi: 14.2 },
          { tempF: 800, ksi: 13.0 },
          { tempF: 900, ksi: 11.0 },
          { tempF: 1000, ksi: 8.0 },
          { tempF: 1100, ksi: 5.0 },
          { tempF: 1200, ksi: 3.0 },
        ],
      },
      {
        code: 'ASTM_A268_TP430',
        name: 'ASTM A268 TP430 (17Cr Ferritic)',
        category: 'ASTM_FERRITIC_SS',
        stressData: [
          { tempF: -20, ksi: 15.0 },
          { tempF: 100, ksi: 15.0 },
          { tempF: 200, ksi: 14.8 },
          { tempF: 300, ksi: 14.4 },
          { tempF: 400, ksi: 14.0 },
          { tempF: 500, ksi: 13.6 },
          { tempF: 600, ksi: 13.2 },
          { tempF: 700, ksi: 12.6 },
          { tempF: 800, ksi: 11.8 },
          { tempF: 900, ksi: 10.5 },
          { tempF: 1000, ksi: 8.5 },
          { tempF: 1100, ksi: 6.0 },
          { tempF: 1200, ksi: 4.0 },
          { tempF: 1300, ksi: 2.5 },
          { tempF: 1400, ksi: 1.5 },
        ],
      },
    ];

    for (const grade of a268Grades) {
      const result = await queryRunner.query(`
        INSERT INTO pipe_steel_grades (code, name, category, equivalent_grade)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
        RETURNING id
      `, [grade.code, grade.name, grade.category]);

      const gradeId = result[0]?.id;
      if (gradeId) {
        for (const stress of grade.stressData) {
          await queryRunner.query(`
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `, [gradeId, stress.tempF, stress.ksi]);
        }
      }
    }

    console.warn('ASTM A268 grades added.');

    // ============================================================
    // 3. ASTM A671/A672 Welded Carbon Steel Pipe Grades
    // ============================================================
    console.warn('Adding ASTM A671/A672 welded carbon steel pipe grades...');

    const weldedCarbonGrades = [
      {
        code: 'ASTM_A671_CC60',
        name: 'ASTM A671 CC60 (Electric Fusion Welded, -50F)',
        category: 'ASTM_WELDED_CS',
        stressData: [
          { tempF: -50, ksi: 17.5 },
          { tempF: -20, ksi: 17.5 },
          { tempF: 100, ksi: 17.5 },
          { tempF: 200, ksi: 17.5 },
          { tempF: 300, ksi: 17.5 },
          { tempF: 400, ksi: 17.5 },
          { tempF: 500, ksi: 17.5 },
          { tempF: 600, ksi: 17.5 },
          { tempF: 650, ksi: 16.6 },
          { tempF: 700, ksi: 14.8 },
          { tempF: 750, ksi: 12.0 },
          { tempF: 800, ksi: 8.7 },
        ],
      },
      {
        code: 'ASTM_A671_CC65',
        name: 'ASTM A671 CC65 (Electric Fusion Welded, -50F)',
        category: 'ASTM_WELDED_CS',
        stressData: [
          { tempF: -50, ksi: 18.8 },
          { tempF: -20, ksi: 18.8 },
          { tempF: 100, ksi: 18.8 },
          { tempF: 200, ksi: 18.8 },
          { tempF: 300, ksi: 18.8 },
          { tempF: 400, ksi: 18.8 },
          { tempF: 500, ksi: 18.8 },
          { tempF: 600, ksi: 18.8 },
          { tempF: 650, ksi: 17.8 },
          { tempF: 700, ksi: 15.9 },
          { tempF: 750, ksi: 12.9 },
          { tempF: 800, ksi: 9.3 },
        ],
      },
      {
        code: 'ASTM_A671_CC70',
        name: 'ASTM A671 CC70 (Electric Fusion Welded, -50F)',
        category: 'ASTM_WELDED_CS',
        stressData: [
          { tempF: -50, ksi: 20.0 },
          { tempF: -20, ksi: 20.0 },
          { tempF: 100, ksi: 20.0 },
          { tempF: 200, ksi: 20.0 },
          { tempF: 300, ksi: 20.0 },
          { tempF: 400, ksi: 20.0 },
          { tempF: 500, ksi: 20.0 },
          { tempF: 600, ksi: 20.0 },
          { tempF: 650, ksi: 19.0 },
          { tempF: 700, ksi: 17.0 },
          { tempF: 750, ksi: 13.8 },
          { tempF: 800, ksi: 10.0 },
        ],
      },
      {
        code: 'ASTM_A672_C60',
        name: 'ASTM A672 C60 (Electric Fusion Welded)',
        category: 'ASTM_WELDED_CS',
        stressData: [
          { tempF: -20, ksi: 17.5 },
          { tempF: 100, ksi: 17.5 },
          { tempF: 200, ksi: 17.5 },
          { tempF: 300, ksi: 17.5 },
          { tempF: 400, ksi: 17.5 },
          { tempF: 500, ksi: 17.5 },
          { tempF: 600, ksi: 17.5 },
          { tempF: 650, ksi: 16.6 },
          { tempF: 700, ksi: 14.8 },
          { tempF: 750, ksi: 12.0 },
          { tempF: 800, ksi: 8.7 },
        ],
      },
      {
        code: 'ASTM_A672_C65',
        name: 'ASTM A672 C65 (Electric Fusion Welded)',
        category: 'ASTM_WELDED_CS',
        stressData: [
          { tempF: -20, ksi: 18.8 },
          { tempF: 100, ksi: 18.8 },
          { tempF: 200, ksi: 18.8 },
          { tempF: 300, ksi: 18.8 },
          { tempF: 400, ksi: 18.8 },
          { tempF: 500, ksi: 18.8 },
          { tempF: 600, ksi: 18.8 },
          { tempF: 650, ksi: 17.8 },
          { tempF: 700, ksi: 15.9 },
          { tempF: 750, ksi: 12.9 },
          { tempF: 800, ksi: 9.3 },
        ],
      },
      {
        code: 'ASTM_A672_C70',
        name: 'ASTM A672 C70 (Electric Fusion Welded)',
        category: 'ASTM_WELDED_CS',
        stressData: [
          { tempF: -20, ksi: 20.0 },
          { tempF: 100, ksi: 20.0 },
          { tempF: 200, ksi: 20.0 },
          { tempF: 300, ksi: 20.0 },
          { tempF: 400, ksi: 20.0 },
          { tempF: 500, ksi: 20.0 },
          { tempF: 600, ksi: 20.0 },
          { tempF: 650, ksi: 19.0 },
          { tempF: 700, ksi: 17.0 },
          { tempF: 750, ksi: 13.8 },
          { tempF: 800, ksi: 10.0 },
        ],
      },
    ];

    for (const grade of weldedCarbonGrades) {
      const result = await queryRunner.query(`
        INSERT INTO pipe_steel_grades (code, name, category, equivalent_grade)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
        RETURNING id
      `, [grade.code, grade.name, grade.category]);

      const gradeId = result[0]?.id;
      if (gradeId) {
        for (const stress of grade.stressData) {
          await queryRunner.query(`
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `, [gradeId, stress.tempF, stress.ksi]);
        }
      }
    }

    console.warn('ASTM A671/A672 grades added.');

    // ============================================================
    // 4. ASTM A691 Welded Cr-Mo Alloy Pipe Grades
    // ============================================================
    console.warn('Adding ASTM A691 welded Cr-Mo alloy pipe grades...');

    const a691Grades = [
      {
        code: 'ASTM_A691_1CR',
        name: 'ASTM A691 1CR (1Cr-0.5Mo Welded)',
        category: 'ASTM_WELDED_CRMO',
        stressData: [
          { tempF: -20, ksi: 15.0 },
          { tempF: 100, ksi: 15.0 },
          { tempF: 200, ksi: 15.0 },
          { tempF: 300, ksi: 15.0 },
          { tempF: 400, ksi: 15.0 },
          { tempF: 500, ksi: 15.0 },
          { tempF: 600, ksi: 15.0 },
          { tempF: 650, ksi: 14.4 },
          { tempF: 700, ksi: 13.8 },
          { tempF: 750, ksi: 13.0 },
          { tempF: 800, ksi: 11.5 },
          { tempF: 850, ksi: 9.2 },
          { tempF: 900, ksi: 6.8 },
          { tempF: 950, ksi: 4.5 },
          { tempF: 1000, ksi: 3.0 },
        ],
      },
      {
        code: 'ASTM_A691_1_25CR',
        name: 'ASTM A691 1-1/4CR (1.25Cr-0.5Mo Welded)',
        category: 'ASTM_WELDED_CRMO',
        stressData: [
          { tempF: -20, ksi: 15.0 },
          { tempF: 100, ksi: 15.0 },
          { tempF: 200, ksi: 15.0 },
          { tempF: 300, ksi: 15.0 },
          { tempF: 400, ksi: 15.0 },
          { tempF: 500, ksi: 15.0 },
          { tempF: 600, ksi: 15.0 },
          { tempF: 650, ksi: 14.4 },
          { tempF: 700, ksi: 13.8 },
          { tempF: 750, ksi: 13.0 },
          { tempF: 800, ksi: 11.5 },
          { tempF: 850, ksi: 9.2 },
          { tempF: 900, ksi: 6.8 },
          { tempF: 950, ksi: 4.5 },
          { tempF: 1000, ksi: 3.0 },
        ],
      },
      {
        code: 'ASTM_A691_2_25CR',
        name: 'ASTM A691 2-1/4CR (2.25Cr-1Mo Welded)',
        category: 'ASTM_WELDED_CRMO',
        stressData: [
          { tempF: -20, ksi: 15.0 },
          { tempF: 100, ksi: 15.0 },
          { tempF: 200, ksi: 15.0 },
          { tempF: 300, ksi: 15.0 },
          { tempF: 400, ksi: 15.0 },
          { tempF: 500, ksi: 15.0 },
          { tempF: 600, ksi: 15.0 },
          { tempF: 650, ksi: 14.4 },
          { tempF: 700, ksi: 13.8 },
          { tempF: 750, ksi: 13.0 },
          { tempF: 800, ksi: 12.0 },
          { tempF: 850, ksi: 10.0 },
          { tempF: 900, ksi: 7.8 },
          { tempF: 950, ksi: 5.5 },
          { tempF: 1000, ksi: 3.8 },
        ],
      },
      {
        code: 'ASTM_A691_5CR',
        name: 'ASTM A691 5CR (5Cr-0.5Mo Welded)',
        category: 'ASTM_WELDED_CRMO',
        stressData: [
          { tempF: -20, ksi: 15.0 },
          { tempF: 100, ksi: 15.0 },
          { tempF: 200, ksi: 15.0 },
          { tempF: 300, ksi: 15.0 },
          { tempF: 400, ksi: 15.0 },
          { tempF: 500, ksi: 15.0 },
          { tempF: 600, ksi: 15.0 },
          { tempF: 650, ksi: 14.4 },
          { tempF: 700, ksi: 13.8 },
          { tempF: 750, ksi: 12.8 },
          { tempF: 800, ksi: 11.0 },
          { tempF: 850, ksi: 8.5 },
          { tempF: 900, ksi: 6.1 },
          { tempF: 950, ksi: 4.0 },
          { tempF: 1000, ksi: 2.6 },
        ],
      },
      {
        code: 'ASTM_A691_9CR',
        name: 'ASTM A691 9CR (9Cr-1Mo Welded)',
        category: 'ASTM_WELDED_CRMO',
        stressData: [
          { tempF: -20, ksi: 15.0 },
          { tempF: 100, ksi: 15.0 },
          { tempF: 200, ksi: 15.0 },
          { tempF: 300, ksi: 15.0 },
          { tempF: 400, ksi: 15.0 },
          { tempF: 500, ksi: 15.0 },
          { tempF: 600, ksi: 15.0 },
          { tempF: 650, ksi: 14.4 },
          { tempF: 700, ksi: 13.8 },
          { tempF: 750, ksi: 12.8 },
          { tempF: 800, ksi: 11.0 },
          { tempF: 850, ksi: 8.5 },
          { tempF: 900, ksi: 6.1 },
          { tempF: 950, ksi: 4.0 },
          { tempF: 1000, ksi: 2.6 },
        ],
      },
      {
        code: 'ASTM_A691_91',
        name: 'ASTM A691 91 (9Cr-1Mo-V Welded)',
        category: 'ASTM_WELDED_CRMO',
        stressData: [
          { tempF: -20, ksi: 20.0 },
          { tempF: 100, ksi: 20.0 },
          { tempF: 200, ksi: 20.0 },
          { tempF: 300, ksi: 20.0 },
          { tempF: 400, ksi: 20.0 },
          { tempF: 500, ksi: 20.0 },
          { tempF: 600, ksi: 20.0 },
          { tempF: 650, ksi: 19.2 },
          { tempF: 700, ksi: 18.5 },
          { tempF: 750, ksi: 17.5 },
          { tempF: 800, ksi: 16.0 },
          { tempF: 850, ksi: 14.0 },
          { tempF: 900, ksi: 11.5 },
          { tempF: 950, ksi: 8.5 },
          { tempF: 1000, ksi: 6.0 },
          { tempF: 1050, ksi: 4.0 },
          { tempF: 1100, ksi: 2.5 },
        ],
      },
    ];

    for (const grade of a691Grades) {
      const result = await queryRunner.query(`
        INSERT INTO pipe_steel_grades (code, name, category, equivalent_grade)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
        RETURNING id
      `, [grade.code, grade.name, grade.category]);

      const gradeId = result[0]?.id;
      if (gradeId) {
        for (const stress of grade.stressData) {
          await queryRunner.query(`
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `, [gradeId, stress.tempF, stress.ksi]);
        }
      }
    }

    console.warn('ASTM A691 grades added.');

    // ============================================================
    // 5. Extended Temperature Data for Existing Grades
    // ============================================================
    console.warn('Adding extended temperature data for existing grades...');

    const extendedTempData = [
      {
        code: 'API_5L_Grade_B',
        extraTemps: [
          { tempF: 700, ksi: 15.4 },
          { tempF: 750, ksi: 12.6 },
          { tempF: 800, ksi: 9.1 },
        ],
      },
      {
        code: 'ASTM_A53_Grade_B',
        extraTemps: [
          { tempF: 750, ksi: 10.8 },
          { tempF: 800, ksi: 7.8 },
          { tempF: 850, ksi: 5.0 },
        ],
      },
    ];

    for (const grade of extendedTempData) {
      const result = await queryRunner.query(`
        SELECT id FROM pipe_steel_grades WHERE code = $1
      `, [grade.code]);

      if (result.length > 0) {
        const gradeId = result[0].id;
        for (const temp of grade.extraTemps) {
          await queryRunner.query(`
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `, [gradeId, temp.tempF, temp.ksi]);
        }
      }
    }

    console.warn('Extended temperature data added.');

    // ============================================================
    // 6. Additional ASTM A358 Welded Stainless Grades
    // ============================================================
    console.warn('Adding additional ASTM A358 welded stainless grades...');

    const a358Grades = [
      {
        code: 'ASTM_A358_TP321',
        name: 'ASTM A358 TP321 (Electric Fusion Welded)',
        category: 'ASTM_WELDED_SS',
        stressData: [
          { tempF: -20, ksi: 16.7 },
          { tempF: 100, ksi: 16.7 },
          { tempF: 200, ksi: 16.7 },
          { tempF: 300, ksi: 15.2 },
          { tempF: 400, ksi: 13.8 },
          { tempF: 500, ksi: 12.7 },
          { tempF: 600, ksi: 11.9 },
          { tempF: 650, ksi: 11.6 },
          { tempF: 700, ksi: 11.4 },
          { tempF: 750, ksi: 11.2 },
          { tempF: 800, ksi: 11.0 },
          { tempF: 850, ksi: 10.9 },
          { tempF: 900, ksi: 10.7 },
          { tempF: 950, ksi: 10.4 },
          { tempF: 1000, ksi: 9.6 },
          { tempF: 1050, ksi: 8.2 },
          { tempF: 1100, ksi: 6.5 },
          { tempF: 1150, ksi: 4.8 },
          { tempF: 1200, ksi: 3.5 },
        ],
      },
      {
        code: 'ASTM_A358_TP347',
        name: 'ASTM A358 TP347 (Electric Fusion Welded)',
        category: 'ASTM_WELDED_SS',
        stressData: [
          { tempF: -20, ksi: 16.7 },
          { tempF: 100, ksi: 16.7 },
          { tempF: 200, ksi: 16.7 },
          { tempF: 300, ksi: 15.5 },
          { tempF: 400, ksi: 14.0 },
          { tempF: 500, ksi: 12.9 },
          { tempF: 600, ksi: 12.1 },
          { tempF: 650, ksi: 11.8 },
          { tempF: 700, ksi: 11.5 },
          { tempF: 750, ksi: 11.3 },
          { tempF: 800, ksi: 11.1 },
          { tempF: 850, ksi: 11.0 },
          { tempF: 900, ksi: 10.8 },
          { tempF: 950, ksi: 10.5 },
          { tempF: 1000, ksi: 9.8 },
          { tempF: 1050, ksi: 8.5 },
          { tempF: 1100, ksi: 6.8 },
          { tempF: 1150, ksi: 5.1 },
          { tempF: 1200, ksi: 3.8 },
        ],
      },
      {
        code: 'ASTM_A358_S31803',
        name: 'ASTM A358 S31803 Duplex (Electric Fusion Welded)',
        category: 'ASTM_WELDED_DUPLEX',
        stressData: [
          { tempF: -20, ksi: 25.0 },
          { tempF: 100, ksi: 25.0 },
          { tempF: 200, ksi: 23.8 },
          { tempF: 300, ksi: 22.2 },
          { tempF: 400, ksi: 21.1 },
          { tempF: 500, ksi: 20.0 },
          { tempF: 550, ksi: 19.5 },
          { tempF: 600, ksi: 18.8 },
        ],
      },
    ];

    for (const grade of a358Grades) {
      const result = await queryRunner.query(`
        INSERT INTO pipe_steel_grades (code, name, category, equivalent_grade)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
        RETURNING id
      `, [grade.code, grade.name, grade.category]);

      const gradeId = result[0]?.id;
      if (gradeId) {
        for (const stress of grade.stressData) {
          await queryRunner.query(`
            INSERT INTO pipe_allowable_stresses (grade_id, temperature_f, allowable_stress_ksi)
            VALUES ($1, $2, $3)
            ON CONFLICT (grade_id, temperature_f) DO UPDATE SET allowable_stress_ksi = EXCLUDED.allowable_stress_ksi
          `, [gradeId, stress.tempF, stress.ksi]);
        }
      }
    }

    console.warn('ASTM A358 additional grades added.');

    // ============================================================
    // 7. Physical Properties for New Materials
    // ============================================================
    console.warn('Adding physical properties for new materials...');

    const newMaterialProps = [
      { code: 'SS409', name: 'Type 409 Ferritic Stainless', density: 7750, expansion: 11.7, conductivity: 24.9, heat: 460, modulus: 200 },
      { code: 'SS410', name: 'Type 410 Martensitic Stainless', density: 7750, expansion: 9.9, conductivity: 24.9, heat: 460, modulus: 200 },
      { code: 'SS430', name: 'Type 430 Ferritic Stainless', density: 7750, expansion: 10.4, conductivity: 26.1, heat: 460, modulus: 200 },
      { code: 'A671_WELDED', name: 'ASTM A671 Welded Carbon Steel', density: 7850, expansion: 11.7, conductivity: 51.9, heat: 486, modulus: 200 },
      { code: 'A672_WELDED', name: 'ASTM A672 Welded Carbon Steel', density: 7850, expansion: 11.7, conductivity: 51.9, heat: 486, modulus: 200 },
      { code: 'A691_WELDED', name: 'ASTM A691 Welded Cr-Mo Alloy', density: 7750, expansion: 12.1, conductivity: 42.3, heat: 473, modulus: 207 },
    ];

    for (const props of newMaterialProps) {
      await queryRunner.query(`
        INSERT INTO material_physical_properties (material_code, material_name, density_kg_m3, thermal_expansion_coeff, thermal_conductivity_w_mk, specific_heat_j_kgk, elastic_modulus_gpa)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (material_code) DO UPDATE SET
          material_name = EXCLUDED.material_name,
          density_kg_m3 = EXCLUDED.density_kg_m3,
          thermal_expansion_coeff = EXCLUDED.thermal_expansion_coeff,
          thermal_conductivity_w_mk = EXCLUDED.thermal_conductivity_w_mk,
          specific_heat_j_kgk = EXCLUDED.specific_heat_j_kgk,
          elastic_modulus_gpa = EXCLUDED.elastic_modulus_gpa
      `, [props.code, props.name, props.density, props.expansion, props.conductivity, props.heat, props.modulus]);
    }

    console.warn('Physical properties for new materials added.');
    console.warn('Remaining pipe and material data gaps migration complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Rollback: Removing added pipe and material data...');

    const gradesToRemove = [
      'ASTM_A268_TP409', 'ASTM_A268_TP410', 'ASTM_A268_TP430',
      'ASTM_A671_CC60', 'ASTM_A671_CC65', 'ASTM_A671_CC70',
      'ASTM_A672_C60', 'ASTM_A672_C65', 'ASTM_A672_C70',
      'ASTM_A691_1CR', 'ASTM_A691_1_25CR', 'ASTM_A691_2_25CR',
      'ASTM_A691_5CR', 'ASTM_A691_9CR', 'ASTM_A691_91',
      'ASTM_A358_TP321', 'ASTM_A358_TP347', 'ASTM_A358_S31803',
    ];

    for (const code of gradesToRemove) {
      await queryRunner.query(`
        DELETE FROM pipe_allowable_stresses WHERE grade_id IN (SELECT id FROM pipe_steel_grades WHERE code = $1)
      `, [code]);
      await queryRunner.query(`DELETE FROM pipe_steel_grades WHERE code = $1`, [code]);
    }

    await queryRunner.query(`DELETE FROM pipe_schedules WHERE schedule = 'XXS' AND nps IN ('14', '16', '18', '20', '24')`);
    await queryRunner.query(`DELETE FROM pipe_schedule_walls WHERE schedule = 'XXS' AND nps IN ('14', '16', '18', '20', '24')`);

    const materialCodesToRemove = ['SS409', 'SS410', 'SS430', 'A671_WELDED', 'A672_WELDED', 'A691_WELDED'];
    for (const code of materialCodesToRemove) {
      await queryRunner.query(`DELETE FROM material_physical_properties WHERE material_code = $1`, [code]);
    }

    console.warn('Rollback complete.');
  }
}
