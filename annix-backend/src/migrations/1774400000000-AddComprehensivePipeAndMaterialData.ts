import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComprehensivePipeAndMaterialData1774400000000 implements MigrationInterface {
  name = 'AddComprehensivePipeAndMaterialData1774400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding comprehensive pipe schedule and material data...');

    // ============================================================
    // PART 1: MISSING SMALL BORE PIPE SCHEDULES (NPS 1/8, 1/4, 3/8)
    // ============================================================
    console.warn('Adding small bore pipe schedules...');

    const smallBoreData = [
      // NPS 1/8" (DN 6) - OD 0.405" / 10.29mm
      {
        nps: '1/8',
        odInch: 0.405,
        odMm: 10.29,
        nbMm: 6,
        schedules: {
          '5S': 0.035,
          '10S': 0.049,
          '40': 0.068,
          '40S': 0.068,
          '80': 0.095,
          '80S': 0.095,
        },
      },
      // NPS 1/4" (DN 8) - OD 0.540" / 13.72mm
      {
        nps: '1/4',
        odInch: 0.54,
        odMm: 13.72,
        nbMm: 8,
        schedules: {
          '5S': 0.049,
          '10S': 0.065,
          '40': 0.088,
          '40S': 0.088,
          '80': 0.119,
          '80S': 0.119,
        },
      },
      // NPS 3/8" (DN 10) - OD 0.675" / 17.15mm
      {
        nps: '3/8',
        odInch: 0.675,
        odMm: 17.15,
        nbMm: 10,
        schedules: {
          '5S': 0.049,
          '10S': 0.065,
          '40': 0.091,
          '40S': 0.091,
          '80': 0.126,
          '80S': 0.126,
        },
      },
    ];

    for (const pipe of smallBoreData) {
      for (const [schedule, wallInch] of Object.entries(pipe.schedules)) {
        const wallMm = Math.round(wallInch * 25.4 * 100) / 100;
        await queryRunner.query(
          `
          INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'ASME B36.10')
          ON CONFLICT (nps, schedule) DO UPDATE SET
            wall_thickness_inch = $4, wall_thickness_mm = $5,
            outside_diameter_inch = $6, outside_diameter_mm = $7
        `,
          [
            pipe.nps,
            pipe.nbMm,
            schedule,
            wallInch,
            wallMm,
            pipe.odInch,
            pipe.odMm,
          ],
        );
      }
    }

    // ============================================================
    // PART 2: MISSING MEDIUM/LARGE BORE SCHEDULES (Sch 10, 20, 30, 60, 100, 120, 140)
    // ============================================================
    console.warn('Adding additional schedules for medium/large bore...');

    const additionalSchedules: {
      [nps: string]: {
        od: number;
        odMm: number;
        nbMm: number;
        schedules: { [sch: string]: number };
      };
    } = {
      '4': {
        od: 4.5,
        odMm: 114.3,
        nbMm: 100,
        schedules: {
          '10': 0.12,
          '20': 0.188,
          '30': 0.237,
          '60': 0.337,
          '100': 0.438,
          '120': 0.531,
          '140': 0.674,
        },
      },
      '5': {
        od: 5.563,
        odMm: 141.3,
        nbMm: 125,
        schedules: {
          '10': 0.134,
          '20': 0.188,
          '30': 0.258,
          '60': 0.375,
          '100': 0.5,
          '120': 0.625,
          '140': 0.75,
        },
      },
      '6': {
        od: 6.625,
        odMm: 168.28,
        nbMm: 150,
        schedules: {
          '10': 0.134,
          '20': 0.188,
          '30': 0.28,
          '60': 0.432,
          '100': 0.562,
          '120': 0.719,
          '140': 0.864,
        },
      },
      '8': {
        od: 8.625,
        odMm: 219.08,
        nbMm: 200,
        schedules: {
          '10': 0.148,
          '20': 0.25,
          '30': 0.277,
          '60': 0.406,
          '100': 0.594,
          '120': 0.719,
          '140': 0.812,
        },
      },
      '10': {
        od: 10.75,
        odMm: 273.05,
        nbMm: 250,
        schedules: {
          '10': 0.165,
          '20': 0.25,
          '30': 0.307,
          '60': 0.5,
          '100': 0.719,
          '120': 0.844,
          '140': 1.0,
        },
      },
      '12': {
        od: 12.75,
        odMm: 323.85,
        nbMm: 300,
        schedules: {
          '10': 0.18,
          '20': 0.25,
          '30': 0.33,
          '60': 0.562,
          '100': 0.844,
          '120': 1.0,
          '140': 1.125,
        },
      },
      '14': {
        od: 14.0,
        odMm: 355.6,
        nbMm: 350,
        schedules: {
          '10': 0.188,
          '20': 0.312,
          '30': 0.375,
          '60': 0.594,
          '100': 0.938,
          '120': 1.094,
          '140': 1.25,
        },
      },
      '16': {
        od: 16.0,
        odMm: 406.4,
        nbMm: 400,
        schedules: {
          '10': 0.188,
          '20': 0.312,
          '30': 0.375,
          '60': 0.656,
          '100': 1.031,
          '120': 1.219,
          '140': 1.438,
        },
      },
      '18': {
        od: 18.0,
        odMm: 457.2,
        nbMm: 450,
        schedules: {
          '10': 0.188,
          '20': 0.312,
          '30': 0.438,
          '60': 0.75,
          '100': 1.156,
          '120': 1.375,
          '140': 1.562,
        },
      },
      '20': {
        od: 20.0,
        odMm: 508.0,
        nbMm: 500,
        schedules: {
          '10': 0.218,
          '20': 0.375,
          '30': 0.5,
          '60': 0.812,
          '100': 1.281,
          '120': 1.5,
          '140': 1.75,
        },
      },
      '24': {
        od: 24.0,
        odMm: 609.6,
        nbMm: 600,
        schedules: {
          '10': 0.25,
          '20': 0.375,
          '30': 0.562,
          '60': 0.969,
          '100': 1.531,
          '120': 1.812,
          '140': 2.062,
        },
      },
      '26': {
        od: 26.0,
        odMm: 660.4,
        nbMm: 650,
        schedules: { '10': 0.312, '20': 0.5, STD: 0.375, XS: 0.5 },
      },
      '28': {
        od: 28.0,
        odMm: 711.2,
        nbMm: 700,
        schedules: { '10': 0.312, '20': 0.5, '30': 0.625, STD: 0.375, XS: 0.5 },
      },
      '30': {
        od: 30.0,
        odMm: 762.0,
        nbMm: 750,
        schedules: { '10': 0.312, '20': 0.5, '30': 0.625, STD: 0.375, XS: 0.5 },
      },
      '32': {
        od: 32.0,
        odMm: 812.8,
        nbMm: 800,
        schedules: {
          '10': 0.312,
          '20': 0.5,
          '30': 0.625,
          '40': 0.688,
          STD: 0.375,
          XS: 0.5,
        },
      },
      '34': {
        od: 34.0,
        odMm: 863.6,
        nbMm: 850,
        schedules: {
          '10': 0.312,
          '20': 0.5,
          '30': 0.625,
          '40': 0.688,
          STD: 0.375,
          XS: 0.5,
        },
      },
      '36': {
        od: 36.0,
        odMm: 914.4,
        nbMm: 900,
        schedules: {
          '10': 0.312,
          '20': 0.5,
          '30': 0.625,
          '40': 0.75,
          STD: 0.375,
          XS: 0.5,
        },
      },
      '42': {
        od: 42.0,
        odMm: 1066.8,
        nbMm: 1050,
        schedules: { '20': 0.5, '30': 0.625, '40': 0.75, STD: 0.375, XS: 0.5 },
      },
      '48': {
        od: 48.0,
        odMm: 1219.2,
        nbMm: 1200,
        schedules: { '20': 0.5, '30': 0.625, '40': 0.75, STD: 0.375, XS: 0.5 },
      },
    };

    for (const [nps, data] of Object.entries(additionalSchedules)) {
      for (const [schedule, wallInch] of Object.entries(data.schedules)) {
        const wallMm = Math.round(wallInch * 25.4 * 100) / 100;
        await queryRunner.query(
          `
          INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'ASME B36.10')
          ON CONFLICT (nps, schedule) DO UPDATE SET
            wall_thickness_inch = $4, wall_thickness_mm = $5
        `,
          [nps, data.nbMm, schedule, wallInch, wallMm, data.od, data.odMm],
        );
      }
    }

    // ============================================================
    // PART 3: LOW TEMPERATURE CARBON STEEL GRADES (A333)
    // ============================================================
    console.warn('Adding low temperature carbon steel grades...');

    const a333Grades = [
      // A333 Grade 1 - Carbon-Manganese, min temp -46°C
      {
        code: 'A333_GR1',
        name: 'ASTM A333 Grade 1 (Carbon-Manganese, -46°C)',
        stressData: [
          { tempC: -46, tempF: -50, ksi: 17.1, mpa: 117.9 },
          { tempC: -29, tempF: -20, ksi: 17.1, mpa: 117.9 },
          { tempC: 38, tempF: 100, ksi: 17.1, mpa: 117.9 },
          { tempC: 93, tempF: 200, ksi: 17.1, mpa: 117.9 },
          { tempC: 149, tempF: 300, ksi: 15.7, mpa: 108.2 },
          { tempC: 204, tempF: 400, ksi: 15.0, mpa: 103.4 },
          { tempC: 260, tempF: 500, ksi: 14.4, mpa: 99.3 },
          { tempC: 316, tempF: 600, ksi: 13.8, mpa: 95.1 },
          { tempC: 343, tempF: 650, ksi: 12.1, mpa: 83.4 },
        ],
      },
      // A333 Grade 6 - Carbon-Manganese-Silicon, min temp -46°C
      {
        code: 'A333_GR6',
        name: 'ASTM A333 Grade 6 (Carbon-Mn-Si, -46°C)',
        stressData: [
          { tempC: -46, tempF: -50, ksi: 20.0, mpa: 137.9 },
          { tempC: -29, tempF: -20, ksi: 20.0, mpa: 137.9 },
          { tempC: 38, tempF: 100, ksi: 20.0, mpa: 137.9 },
          { tempC: 93, tempF: 200, ksi: 20.0, mpa: 137.9 },
          { tempC: 149, tempF: 300, ksi: 18.6, mpa: 128.2 },
          { tempC: 204, tempF: 400, ksi: 17.7, mpa: 122.0 },
          { tempC: 260, tempF: 500, ksi: 16.8, mpa: 115.8 },
          { tempC: 316, tempF: 600, ksi: 15.4, mpa: 106.2 },
          { tempC: 343, tempF: 650, ksi: 13.3, mpa: 91.7 },
        ],
      },
      // A333 Grade 3 - 3.5% Nickel, min temp -101°C
      {
        code: 'A333_GR3',
        name: 'ASTM A333 Grade 3 (3.5Ni, -101°C)',
        stressData: [
          { tempC: -101, tempF: -150, ksi: 21.7, mpa: 149.6 },
          { tempC: -73, tempF: -100, ksi: 21.7, mpa: 149.6 },
          { tempC: -46, tempF: -50, ksi: 21.7, mpa: 149.6 },
          { tempC: -29, tempF: -20, ksi: 21.7, mpa: 149.6 },
          { tempC: 38, tempF: 100, ksi: 21.7, mpa: 149.6 },
          { tempC: 93, tempF: 200, ksi: 21.7, mpa: 149.6 },
          { tempC: 149, tempF: 300, ksi: 20.3, mpa: 139.9 },
          { tempC: 204, tempF: 400, ksi: 19.0, mpa: 131.0 },
        ],
      },
      // A333 Grade 8 - 9% Nickel, min temp -196°C (cryogenic)
      {
        code: 'A333_GR8',
        name: 'ASTM A333 Grade 8 (9Ni Cryogenic, -196°C)',
        stressData: [
          { tempC: -196, tempF: -320, ksi: 23.3, mpa: 160.6 },
          { tempC: -162, tempF: -260, ksi: 23.3, mpa: 160.6 },
          { tempC: -129, tempF: -200, ksi: 23.3, mpa: 160.6 },
          { tempC: -101, tempF: -150, ksi: 23.3, mpa: 160.6 },
          { tempC: -73, tempF: -100, ksi: 23.3, mpa: 160.6 },
          { tempC: -29, tempF: -20, ksi: 23.3, mpa: 160.6 },
          { tempC: 38, tempF: 100, ksi: 23.3, mpa: 160.6 },
          { tempC: 93, tempF: 200, ksi: 23.3, mpa: 160.6 },
        ],
      },
    ];

    for (const grade of a333Grades) {
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
    // PART 4: API 5L HIGH STRENGTH PIPELINE GRADES
    // ============================================================
    console.warn('Adding API 5L high strength grades...');

    const api5lGrades = [
      {
        code: 'API5L_X42',
        name: 'API 5L X42 (42 ksi SMYS)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 21.0, mpa: 144.8 },
          { tempC: 38, tempF: 100, ksi: 21.0, mpa: 144.8 },
          { tempC: 93, tempF: 200, ksi: 21.0, mpa: 144.8 },
          { tempC: 149, tempF: 300, ksi: 19.5, mpa: 134.4 },
          { tempC: 204, tempF: 400, ksi: 18.5, mpa: 127.5 },
          { tempC: 260, tempF: 500, ksi: 17.5, mpa: 120.6 },
          { tempC: 316, tempF: 600, ksi: 16.0, mpa: 110.3 },
        ],
      },
      {
        code: 'API5L_X52',
        name: 'API 5L X52 (52 ksi SMYS)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 26.0, mpa: 179.3 },
          { tempC: 38, tempF: 100, ksi: 26.0, mpa: 179.3 },
          { tempC: 93, tempF: 200, ksi: 26.0, mpa: 179.3 },
          { tempC: 149, tempF: 300, ksi: 24.2, mpa: 166.8 },
          { tempC: 204, tempF: 400, ksi: 23.0, mpa: 158.6 },
          { tempC: 260, tempF: 500, ksi: 21.7, mpa: 149.6 },
          { tempC: 316, tempF: 600, ksi: 19.8, mpa: 136.5 },
        ],
      },
      {
        code: 'API5L_X60',
        name: 'API 5L X60 (60 ksi SMYS)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 30.0, mpa: 206.8 },
          { tempC: 38, tempF: 100, ksi: 30.0, mpa: 206.8 },
          { tempC: 93, tempF: 200, ksi: 30.0, mpa: 206.8 },
          { tempC: 149, tempF: 300, ksi: 27.9, mpa: 192.4 },
          { tempC: 204, tempF: 400, ksi: 26.5, mpa: 182.7 },
          { tempC: 260, tempF: 500, ksi: 25.0, mpa: 172.4 },
          { tempC: 316, tempF: 600, ksi: 22.8, mpa: 157.2 },
        ],
      },
      {
        code: 'API5L_X65',
        name: 'API 5L X65 (65 ksi SMYS)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 32.5, mpa: 224.1 },
          { tempC: 38, tempF: 100, ksi: 32.5, mpa: 224.1 },
          { tempC: 93, tempF: 200, ksi: 32.5, mpa: 224.1 },
          { tempC: 149, tempF: 300, ksi: 30.2, mpa: 208.2 },
          { tempC: 204, tempF: 400, ksi: 28.7, mpa: 197.9 },
          { tempC: 260, tempF: 500, ksi: 27.1, mpa: 186.8 },
        ],
      },
      {
        code: 'API5L_X70',
        name: 'API 5L X70 (70 ksi SMYS)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 35.0, mpa: 241.3 },
          { tempC: 38, tempF: 100, ksi: 35.0, mpa: 241.3 },
          { tempC: 93, tempF: 200, ksi: 35.0, mpa: 241.3 },
          { tempC: 149, tempF: 300, ksi: 32.6, mpa: 224.8 },
          { tempC: 204, tempF: 400, ksi: 30.9, mpa: 213.1 },
          { tempC: 260, tempF: 500, ksi: 29.2, mpa: 201.3 },
        ],
      },
    ];

    for (const grade of api5lGrades) {
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
    // PART 5: CHROME-MOLY ALLOY STEEL GRADES (A335)
    // ============================================================
    console.warn('Adding chrome-moly alloy steel grades...');

    const chromeMolyGrades = [
      // A335 P1 - 0.5Mo
      {
        code: 'A335_P1',
        name: 'ASTM A335 P1 (0.5Mo)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 16.6, mpa: 114.4 },
          { tempC: 38, tempF: 100, ksi: 16.6, mpa: 114.4 },
          { tempC: 93, tempF: 200, ksi: 16.6, mpa: 114.4 },
          { tempC: 149, tempF: 300, ksi: 16.6, mpa: 114.4 },
          { tempC: 204, tempF: 400, ksi: 16.6, mpa: 114.4 },
          { tempC: 260, tempF: 500, ksi: 16.6, mpa: 114.4 },
          { tempC: 316, tempF: 600, ksi: 16.6, mpa: 114.4 },
          { tempC: 343, tempF: 650, ksi: 16.6, mpa: 114.4 },
          { tempC: 371, tempF: 700, ksi: 16.6, mpa: 114.4 },
          { tempC: 399, tempF: 750, ksi: 16.4, mpa: 113.1 },
          { tempC: 427, tempF: 800, ksi: 15.5, mpa: 106.9 },
          { tempC: 454, tempF: 850, ksi: 13.9, mpa: 95.8 },
          { tempC: 482, tempF: 900, ksi: 10.8, mpa: 74.5 },
          { tempC: 510, tempF: 950, ksi: 7.8, mpa: 53.8 },
          { tempC: 538, tempF: 1000, ksi: 5.5, mpa: 37.9 },
        ],
      },
      // A335 P5 - 5Cr-0.5Mo
      {
        code: 'A335_P5',
        name: 'ASTM A335 P5 (5Cr-0.5Mo)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 20.0, mpa: 137.9 },
          { tempC: 38, tempF: 100, ksi: 20.0, mpa: 137.9 },
          { tempC: 93, tempF: 200, ksi: 20.0, mpa: 137.9 },
          { tempC: 149, tempF: 300, ksi: 20.0, mpa: 137.9 },
          { tempC: 204, tempF: 400, ksi: 20.0, mpa: 137.9 },
          { tempC: 260, tempF: 500, ksi: 20.0, mpa: 137.9 },
          { tempC: 316, tempF: 600, ksi: 20.0, mpa: 137.9 },
          { tempC: 343, tempF: 650, ksi: 20.0, mpa: 137.9 },
          { tempC: 371, tempF: 700, ksi: 19.8, mpa: 136.5 },
          { tempC: 399, tempF: 750, ksi: 19.0, mpa: 131.0 },
          { tempC: 427, tempF: 800, ksi: 17.5, mpa: 120.7 },
          { tempC: 454, tempF: 850, ksi: 15.2, mpa: 104.8 },
          { tempC: 482, tempF: 900, ksi: 12.0, mpa: 82.7 },
          { tempC: 510, tempF: 950, ksi: 8.5, mpa: 58.6 },
          { tempC: 538, tempF: 1000, ksi: 5.9, mpa: 40.7 },
          { tempC: 566, tempF: 1050, ksi: 4.0, mpa: 27.6 },
          { tempC: 593, tempF: 1100, ksi: 2.6, mpa: 17.9 },
        ],
      },
      // A335 P9 - 9Cr-1Mo
      {
        code: 'A335_P9',
        name: 'ASTM A335 P9 (9Cr-1Mo)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 20.0, mpa: 137.9 },
          { tempC: 38, tempF: 100, ksi: 20.0, mpa: 137.9 },
          { tempC: 93, tempF: 200, ksi: 20.0, mpa: 137.9 },
          { tempC: 149, tempF: 300, ksi: 20.0, mpa: 137.9 },
          { tempC: 204, tempF: 400, ksi: 20.0, mpa: 137.9 },
          { tempC: 260, tempF: 500, ksi: 20.0, mpa: 137.9 },
          { tempC: 316, tempF: 600, ksi: 20.0, mpa: 137.9 },
          { tempC: 343, tempF: 650, ksi: 20.0, mpa: 137.9 },
          { tempC: 371, tempF: 700, ksi: 20.0, mpa: 137.9 },
          { tempC: 399, tempF: 750, ksi: 19.4, mpa: 133.8 },
          { tempC: 427, tempF: 800, ksi: 18.0, mpa: 124.1 },
          { tempC: 454, tempF: 850, ksi: 15.8, mpa: 108.9 },
          { tempC: 482, tempF: 900, ksi: 12.8, mpa: 88.3 },
          { tempC: 510, tempF: 950, ksi: 9.4, mpa: 64.8 },
          { tempC: 538, tempF: 1000, ksi: 6.5, mpa: 44.8 },
          { tempC: 566, tempF: 1050, ksi: 4.4, mpa: 30.3 },
          { tempC: 593, tempF: 1100, ksi: 2.9, mpa: 20.0 },
        ],
      },
      // A335 P12 - 1Cr-0.5Mo
      {
        code: 'A335_P12',
        name: 'ASTM A335 P12 (1Cr-0.5Mo)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 20.0, mpa: 137.9 },
          { tempC: 38, tempF: 100, ksi: 20.0, mpa: 137.9 },
          { tempC: 93, tempF: 200, ksi: 20.0, mpa: 137.9 },
          { tempC: 149, tempF: 300, ksi: 20.0, mpa: 137.9 },
          { tempC: 204, tempF: 400, ksi: 20.0, mpa: 137.9 },
          { tempC: 260, tempF: 500, ksi: 20.0, mpa: 137.9 },
          { tempC: 316, tempF: 600, ksi: 20.0, mpa: 137.9 },
          { tempC: 343, tempF: 650, ksi: 19.8, mpa: 136.5 },
          { tempC: 371, tempF: 700, ksi: 19.2, mpa: 132.4 },
          { tempC: 399, tempF: 750, ksi: 18.2, mpa: 125.5 },
          { tempC: 427, tempF: 800, ksi: 16.6, mpa: 114.4 },
          { tempC: 454, tempF: 850, ksi: 14.3, mpa: 98.6 },
          { tempC: 482, tempF: 900, ksi: 11.2, mpa: 77.2 },
          { tempC: 510, tempF: 950, ksi: 8.0, mpa: 55.2 },
          { tempC: 538, tempF: 1000, ksi: 5.5, mpa: 37.9 },
          { tempC: 566, tempF: 1050, ksi: 3.7, mpa: 25.5 },
          { tempC: 593, tempF: 1100, ksi: 2.4, mpa: 16.5 },
        ],
      },
      // A335 P91 - 9Cr-1Mo-V (Advanced)
      {
        code: 'A335_P91',
        name: 'ASTM A335 P91 (9Cr-1Mo-V Advanced)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 24.3, mpa: 167.5 },
          { tempC: 38, tempF: 100, ksi: 24.3, mpa: 167.5 },
          { tempC: 93, tempF: 200, ksi: 24.3, mpa: 167.5 },
          { tempC: 149, tempF: 300, ksi: 24.3, mpa: 167.5 },
          { tempC: 204, tempF: 400, ksi: 24.3, mpa: 167.5 },
          { tempC: 260, tempF: 500, ksi: 24.3, mpa: 167.5 },
          { tempC: 316, tempF: 600, ksi: 24.3, mpa: 167.5 },
          { tempC: 343, tempF: 650, ksi: 24.3, mpa: 167.5 },
          { tempC: 371, tempF: 700, ksi: 24.3, mpa: 167.5 },
          { tempC: 399, tempF: 750, ksi: 24.1, mpa: 166.2 },
          { tempC: 427, tempF: 800, ksi: 23.4, mpa: 161.3 },
          { tempC: 454, tempF: 850, ksi: 22.1, mpa: 152.4 },
          { tempC: 482, tempF: 900, ksi: 20.0, mpa: 137.9 },
          { tempC: 510, tempF: 950, ksi: 17.0, mpa: 117.2 },
          { tempC: 538, tempF: 1000, ksi: 13.4, mpa: 92.4 },
          { tempC: 566, tempF: 1050, ksi: 9.8, mpa: 67.6 },
          { tempC: 593, tempF: 1100, ksi: 6.8, mpa: 46.9 },
          { tempC: 621, tempF: 1150, ksi: 4.5, mpa: 31.0 },
          { tempC: 649, tempF: 1200, ksi: 2.8, mpa: 19.3 },
        ],
      },
      // A335 P92 - 9Cr-2W (Advanced)
      {
        code: 'A335_P92',
        name: 'ASTM A335 P92 (9Cr-2W Advanced)',
        stressData: [
          { tempC: -29, tempF: -20, ksi: 25.7, mpa: 177.2 },
          { tempC: 38, tempF: 100, ksi: 25.7, mpa: 177.2 },
          { tempC: 93, tempF: 200, ksi: 25.7, mpa: 177.2 },
          { tempC: 149, tempF: 300, ksi: 25.7, mpa: 177.2 },
          { tempC: 204, tempF: 400, ksi: 25.7, mpa: 177.2 },
          { tempC: 260, tempF: 500, ksi: 25.7, mpa: 177.2 },
          { tempC: 316, tempF: 600, ksi: 25.7, mpa: 177.2 },
          { tempC: 343, tempF: 650, ksi: 25.7, mpa: 177.2 },
          { tempC: 371, tempF: 700, ksi: 25.7, mpa: 177.2 },
          { tempC: 399, tempF: 750, ksi: 25.5, mpa: 175.8 },
          { tempC: 427, tempF: 800, ksi: 24.8, mpa: 171.0 },
          { tempC: 454, tempF: 850, ksi: 23.6, mpa: 162.7 },
          { tempC: 482, tempF: 900, ksi: 21.6, mpa: 148.9 },
          { tempC: 510, tempF: 950, ksi: 18.8, mpa: 129.6 },
          { tempC: 538, tempF: 1000, ksi: 15.2, mpa: 104.8 },
          { tempC: 566, tempF: 1050, ksi: 11.4, mpa: 78.6 },
          { tempC: 593, tempF: 1100, ksi: 8.0, mpa: 55.2 },
          { tempC: 621, tempF: 1150, ksi: 5.4, mpa: 37.2 },
          { tempC: 649, tempF: 1200, ksi: 3.5, mpa: 24.1 },
        ],
      },
    ];

    for (const grade of chromeMolyGrades) {
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

    console.warn('Comprehensive pipe and material data migration complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Rollback not implemented for comprehensive data migration');
  }
}
