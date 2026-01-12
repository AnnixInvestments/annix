import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedBnwAndStainlessSteelData1767700000000 implements MigrationInterface {
  name = 'SeedBnwAndStainlessSteelData1767700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================================================
    // PART 1: Seed Bolts, Nuts & Washers (BNW) Data
    // Data extracted from Piping Design_V2.0.xlsm
    // Tab: "Bolts, Nuts & Washers"
    // =====================================================

    // Insert bolt designations (M12 - M64)
    const boltDesignations = [
      'M12',
      'M14',
      'M16',
      'M18',
      'M20',
      'M22',
      'M24',
      'M27',
      'M30',
      'M33',
      'M36',
      'M39',
      'M42',
      'M45',
      'M48',
      'M52',
      'M56',
      'M60',
      'M64',
    ];

    for (const designation of boltDesignations) {
      await queryRunner.query(
        `
        INSERT INTO bolts (designation)
        VALUES ($1)
        ON CONFLICT (designation) DO NOTHING
      `,
        [designation],
      );
    }

    // Bolt mass data by size and length (in kg)
    // Format: { designation: { length_mm: mass_kg } }
    const boltMassData: Record<string, Record<number, number>> = {
      M12: {
        50: 0.052,
        55: 0.056,
        60: 0.061,
        65: 0.065,
        70: 0.07,
        75: 0.074,
        80: 0.078,
        85: 0.083,
        90: 0.087,
        95: 0.092,
        100: 0.096,
        110: 0.105,
        120: 0.114,
        130: 0.122,
        140: 0.131,
        150: 0.14,
        160: 0.149,
        170: 0.157,
        180: 0.166,
        190: 0.175,
        200: 0.183,
        220: 0.201,
        240: 0.218,
        260: 0.236,
        280: 0.253,
        300: 0.27,
      },
      M14: {
        50: 0.077,
        55: 0.083,
        60: 0.089,
        65: 0.095,
        70: 0.101,
        75: 0.107,
        80: 0.113,
        85: 0.119,
        90: 0.125,
        95: 0.131,
        100: 0.137,
        110: 0.149,
        120: 0.161,
        130: 0.173,
        140: 0.185,
        150: 0.197,
        160: 0.209,
        170: 0.221,
        180: 0.233,
        190: 0.245,
        200: 0.257,
        220: 0.281,
        240: 0.305,
        260: 0.329,
        280: 0.353,
        300: 0.377,
      },
      M16: {
        50: 0.098,
        55: 0.106,
        60: 0.114,
        65: 0.122,
        70: 0.13,
        75: 0.138,
        80: 0.146,
        85: 0.154,
        90: 0.162,
        95: 0.17,
        100: 0.178,
        110: 0.194,
        120: 0.21,
        130: 0.226,
        140: 0.242,
        150: 0.258,
        160: 0.274,
        170: 0.29,
        180: 0.306,
        190: 0.322,
        200: 0.338,
        220: 0.37,
        240: 0.402,
        260: 0.434,
        280: 0.466,
        300: 0.498,
      },
      M18: {
        60: 0.162,
        65: 0.173,
        70: 0.184,
        75: 0.195,
        80: 0.206,
        85: 0.217,
        90: 0.228,
        95: 0.239,
        100: 0.25,
        110: 0.272,
        120: 0.294,
        130: 0.316,
        140: 0.338,
        150: 0.36,
        160: 0.382,
        170: 0.404,
        180: 0.426,
        190: 0.448,
        200: 0.47,
        220: 0.514,
        240: 0.558,
        260: 0.602,
        280: 0.646,
        300: 0.69,
      },
      M20: {
        60: 0.186,
        65: 0.199,
        70: 0.212,
        75: 0.225,
        80: 0.238,
        85: 0.251,
        90: 0.264,
        95: 0.277,
        100: 0.29,
        110: 0.316,
        120: 0.342,
        130: 0.368,
        140: 0.394,
        150: 0.42,
        160: 0.446,
        170: 0.472,
        180: 0.498,
        190: 0.524,
        200: 0.55,
        220: 0.602,
        240: 0.654,
        260: 0.706,
        280: 0.758,
        300: 0.81,
        320: 0.862,
        340: 0.914,
        360: 0.966,
        380: 1.018,
        400: 1.07,
      },
      M22: {
        65: 0.257,
        70: 0.274,
        75: 0.291,
        80: 0.308,
        85: 0.325,
        90: 0.342,
        95: 0.359,
        100: 0.376,
        110: 0.41,
        120: 0.444,
        130: 0.478,
        140: 0.512,
        150: 0.546,
        160: 0.58,
        170: 0.614,
        180: 0.648,
        190: 0.682,
        200: 0.716,
        220: 0.784,
        240: 0.852,
        260: 0.92,
        280: 0.988,
        300: 1.056,
        320: 1.124,
        340: 1.192,
        360: 1.26,
        380: 1.328,
        400: 1.396,
      },
      M24: {
        70: 0.327,
        75: 0.347,
        80: 0.367,
        85: 0.387,
        90: 0.407,
        95: 0.427,
        100: 0.447,
        110: 0.487,
        120: 0.527,
        130: 0.567,
        140: 0.607,
        150: 0.647,
        160: 0.687,
        170: 0.727,
        180: 0.767,
        190: 0.807,
        200: 0.847,
        220: 0.927,
        240: 1.007,
        260: 1.087,
        280: 1.167,
        300: 1.247,
        320: 1.327,
        340: 1.407,
        360: 1.487,
        380: 1.567,
        400: 1.647,
        450: 1.847,
        500: 2.047,
      },
      M27: {
        80: 0.498,
        85: 0.525,
        90: 0.552,
        95: 0.579,
        100: 0.606,
        110: 0.66,
        120: 0.714,
        130: 0.768,
        140: 0.822,
        150: 0.876,
        160: 0.93,
        170: 0.984,
        180: 1.038,
        190: 1.092,
        200: 1.146,
        220: 1.254,
        240: 1.362,
        260: 1.47,
        280: 1.578,
        300: 1.686,
        320: 1.794,
        340: 1.902,
        360: 2.01,
        380: 2.118,
        400: 2.226,
        450: 2.496,
        500: 2.766,
        550: 3.036,
        600: 3.306,
      },
      M30: {
        80: 0.587,
        85: 0.619,
        90: 0.651,
        95: 0.683,
        100: 0.715,
        110: 0.779,
        120: 0.843,
        130: 0.907,
        140: 0.971,
        150: 1.035,
        160: 1.099,
        170: 1.163,
        180: 1.227,
        190: 1.291,
        200: 1.355,
        220: 1.483,
        240: 1.611,
        260: 1.739,
        280: 1.867,
        300: 1.995,
        320: 2.123,
        340: 2.251,
        360: 2.379,
        380: 2.507,
        400: 2.635,
        450: 2.955,
        500: 3.275,
        550: 3.595,
        600: 3.915,
      },
      M33: {
        90: 0.841,
        95: 0.882,
        100: 0.923,
        110: 1.005,
        120: 1.087,
        130: 1.169,
        140: 1.251,
        150: 1.333,
        160: 1.415,
        170: 1.497,
        180: 1.579,
        190: 1.661,
        200: 1.743,
        220: 1.907,
        240: 2.071,
        260: 2.235,
        280: 2.399,
        300: 2.563,
        320: 2.727,
        340: 2.891,
        360: 3.055,
        380: 3.219,
        400: 3.383,
        450: 3.793,
        500: 4.203,
        550: 4.613,
        600: 5.023,
      },
      M36: {
        100: 1.13,
        110: 1.23,
        120: 1.33,
        130: 1.43,
        140: 1.53,
        150: 1.63,
        160: 1.73,
        170: 1.83,
        180: 1.93,
        190: 2.03,
        200: 2.13,
        220: 2.33,
        240: 2.53,
        260: 2.73,
        280: 2.93,
        300: 3.13,
        320: 3.33,
        340: 3.53,
        360: 3.73,
        380: 3.93,
        400: 4.13,
        450: 4.63,
        500: 5.13,
        550: 5.63,
        600: 6.13,
        650: 6.63,
        700: 7.13,
        750: 7.63,
        800: 8.13,
      },
      M39: {
        110: 1.469,
        120: 1.59,
        130: 1.711,
        140: 1.832,
        150: 1.953,
        160: 2.074,
        170: 2.195,
        180: 2.316,
        190: 2.437,
        200: 2.558,
        220: 2.8,
        240: 3.042,
        260: 3.284,
        280: 3.526,
        300: 3.768,
        320: 4.01,
        340: 4.252,
        360: 4.494,
        380: 4.736,
        400: 4.978,
        450: 5.583,
        500: 6.188,
        550: 6.793,
        600: 7.398,
        650: 8.003,
        700: 8.608,
        750: 9.213,
        800: 9.818,
      },
      M42: {
        110: 1.708,
        120: 1.848,
        130: 1.988,
        140: 2.128,
        150: 2.268,
        160: 2.408,
        170: 2.548,
        180: 2.688,
        190: 2.828,
        200: 2.968,
        220: 3.248,
        240: 3.528,
        260: 3.808,
        280: 4.088,
        300: 4.368,
        320: 4.648,
        340: 4.928,
        360: 5.208,
        380: 5.488,
        400: 5.768,
        450: 6.468,
        500: 7.168,
        550: 7.868,
        600: 8.568,
        650: 9.268,
        700: 9.968,
        750: 10.668,
        800: 11.368,
      },
      M45: {
        120: 2.14,
        130: 2.302,
        140: 2.464,
        150: 2.626,
        160: 2.788,
        170: 2.95,
        180: 3.112,
        190: 3.274,
        200: 3.436,
        220: 3.76,
        240: 4.084,
        260: 4.408,
        280: 4.732,
        300: 5.056,
        320: 5.38,
        340: 5.704,
        360: 6.028,
        380: 6.352,
        400: 6.676,
        450: 7.486,
        500: 8.296,
        550: 9.106,
        600: 9.916,
        650: 10.726,
        700: 11.536,
        750: 12.346,
        800: 13.156,
      },
      M48: {
        130: 2.65,
        140: 2.834,
        150: 3.018,
        160: 3.202,
        170: 3.386,
        180: 3.57,
        190: 3.754,
        200: 3.938,
        220: 4.306,
        240: 4.674,
        260: 5.042,
        280: 5.41,
        300: 5.778,
        320: 6.146,
        340: 6.514,
        360: 6.882,
        380: 7.25,
        400: 7.618,
        450: 8.538,
        500: 9.458,
        550: 10.378,
        600: 11.298,
        650: 12.218,
        700: 13.138,
        750: 14.058,
        800: 14.978,
      },
      M52: {
        140: 3.404,
        150: 3.618,
        160: 3.832,
        170: 4.046,
        180: 4.26,
        190: 4.474,
        200: 4.688,
        220: 5.116,
        240: 5.544,
        260: 5.972,
        280: 6.4,
        300: 6.828,
        320: 7.256,
        340: 7.684,
        360: 8.112,
        380: 8.54,
        400: 8.968,
        450: 10.038,
        500: 11.108,
        550: 12.178,
        600: 13.248,
        650: 14.318,
        700: 15.388,
        750: 16.458,
        800: 17.528,
      },
      M56: {
        150: 4.27,
        160: 4.518,
        170: 4.766,
        180: 5.014,
        190: 5.262,
        200: 5.51,
        220: 6.006,
        240: 6.502,
        260: 6.998,
        280: 7.494,
        300: 7.99,
        320: 8.486,
        340: 8.982,
        360: 9.478,
        380: 9.974,
        400: 10.47,
        450: 11.71,
        500: 12.95,
        550: 14.19,
        600: 15.43,
        650: 16.67,
        700: 17.91,
        750: 19.15,
        800: 20.39,
      },
      M60: {
        160: 5.292,
        170: 5.58,
        180: 5.868,
        190: 6.156,
        200: 6.444,
        220: 7.02,
        240: 7.596,
        260: 8.172,
        280: 8.748,
        300: 9.324,
        320: 9.9,
        340: 10.476,
        360: 11.052,
        380: 11.628,
        400: 12.204,
        450: 13.644,
        500: 15.084,
        550: 16.524,
        600: 17.964,
        650: 19.404,
        700: 20.844,
        750: 22.284,
        800: 23.724,
      },
      M64: {
        170: 6.468,
        180: 6.796,
        190: 7.124,
        200: 7.452,
        220: 8.108,
        240: 8.764,
        260: 9.42,
        280: 10.076,
        300: 10.732,
        320: 11.388,
        340: 12.044,
        360: 12.7,
        380: 13.356,
        400: 14.012,
        450: 15.652,
        500: 17.292,
        550: 18.932,
        600: 20.572,
        650: 22.212,
        700: 23.852,
        750: 25.492,
        800: 27.132,
      },
    };

    // Insert bolt mass data
    // Note: bolt_masses uses "boltId" (camelCase) column
    for (const [designation, lengths] of Object.entries(boltMassData)) {
      const boltResult = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = $1`,
        [designation],
      );

      if (boltResult.length > 0) {
        const boltId = boltResult[0].id;

        for (const [length, mass] of Object.entries(lengths)) {
          await queryRunner.query(
            `
            INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
          `,
            [boltId, parseInt(length), mass],
          );
        }
      }
    }

    // Nut mass data (kg per nut)
    const nutMassData: Record<string, number> = {
      M12: 0.017,
      M14: 0.027,
      M16: 0.038,
      M18: 0.05,
      M20: 0.065,
      M22: 0.083,
      M24: 0.106,
      M27: 0.148,
      M30: 0.19,
      M33: 0.248,
      M36: 0.319,
      M39: 0.398,
      M42: 0.488,
      M45: 0.587,
      M48: 0.7,
      M52: 0.89,
      M56: 1.1,
      M60: 1.34,
      M64: 1.62,
    };

    // Insert nut mass data
    for (const [designation, mass] of Object.entries(nutMassData)) {
      const boltResult = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = $1`,
        [designation],
      );

      if (boltResult.length > 0) {
        const boltId = boltResult[0].id;

        await queryRunner.query(
          `
          INSERT INTO nut_masses (bolt_id, mass_kg)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
          [boltId, mass],
        );
      }
    }

    // =====================================================
    // PART 2: Seed Stainless Steel Specification and Pipe Dimensions
    // Data extracted from Piping Design_V2.0.xlsm
    // Tab: "NB,SCH&THICK Stainless Steel"
    // =====================================================

    // First, insert the stainless steel specification if it doesn't exist
    await queryRunner.query(`
      INSERT INTO steel_specifications (steel_spec_name)
      VALUES ('ASTM A312 TP304/316')
      ON CONFLICT (steel_spec_name) DO NOTHING
    `);

    // Get the stainless steel specification ID
    const ssSpecResult = await queryRunner.query(`
      SELECT id FROM steel_specifications WHERE steel_spec_name = 'ASTM A312 TP304/316'
    `);

    if (ssSpecResult.length === 0) {
      console.warn(
        'Stainless steel specification not found, skipping pipe dimensions',
      );
      return;
    }

    const ssSpecId = ssSpecResult[0].id;

    // Stainless Steel pipe dimensions data
    // Format: { nominalBore: { schedule: wallThickness } }
    // Wall thickness in mm
    const stainlessSteelData: Record<number, Record<string, number>> = {
      15: {
        Sch5S: 1.24,
        Sch10S: 1.65,
        Sch40S: 2.77,
        Sch80S: 3.73,
        STD: 2.77,
        XS: 3.73,
      },
      20: {
        Sch5S: 1.65,
        Sch10S: 2.11,
        Sch40S: 2.87,
        Sch80S: 3.91,
        STD: 2.87,
        XS: 3.91,
      },
      25: {
        Sch5S: 1.65,
        Sch10S: 2.11,
        Sch40S: 3.38,
        Sch80S: 4.55,
        STD: 3.38,
        XS: 4.55,
      },
      32: {
        Sch5S: 1.65,
        Sch10S: 2.11,
        Sch40S: 3.56,
        Sch80S: 4.85,
        STD: 3.56,
        XS: 4.85,
      },
      40: {
        Sch5S: 1.65,
        Sch10S: 2.77,
        Sch40S: 3.68,
        Sch80S: 5.08,
        STD: 3.68,
        XS: 5.08,
      },
      50: {
        Sch5S: 1.65,
        Sch10S: 2.77,
        Sch40S: 3.91,
        Sch80S: 5.54,
        STD: 3.91,
        XS: 5.54,
      },
      65: {
        Sch5S: 2.11,
        Sch10S: 2.77,
        Sch40S: 5.16,
        Sch80S: 7.01,
        STD: 5.16,
        XS: 7.01,
      },
      80: {
        Sch5S: 2.11,
        Sch10S: 3.05,
        Sch40S: 5.49,
        Sch80S: 7.62,
        STD: 5.49,
        XS: 7.62,
      },
      100: {
        Sch5S: 2.11,
        Sch10S: 3.05,
        Sch40S: 6.02,
        Sch80S: 8.56,
        STD: 6.02,
        XS: 8.56,
      },
      125: {
        Sch5S: 2.77,
        Sch10S: 3.4,
        Sch40S: 6.55,
        Sch80S: 9.53,
        STD: 6.55,
        XS: 9.53,
      },
      150: {
        Sch5S: 2.77,
        Sch10S: 3.4,
        Sch40S: 7.11,
        Sch80S: 10.97,
        STD: 7.11,
        XS: 10.97,
      },
      200: {
        Sch5S: 2.77,
        Sch10S: 3.76,
        Sch20: 6.35,
        Sch30: 7.04,
        Sch40: 8.18,
        Sch60: 10.31,
        Sch80: 12.7,
        Sch100: 15.09,
        Sch120: 18.26,
        Sch140: 21.44,
        Sch160: 23.01,
        STD: 8.18,
        XS: 12.7,
        XXS: 22.23,
      },
      250: {
        Sch5S: 3.4,
        Sch10S: 4.19,
        Sch20: 6.35,
        Sch30: 7.8,
        Sch40: 9.27,
        Sch60: 12.7,
        Sch80: 15.09,
        Sch100: 18.26,
        Sch120: 21.44,
        Sch140: 25.4,
        Sch160: 28.58,
        STD: 9.27,
        XS: 12.7,
        XXS: 25.4,
      },
      300: {
        Sch5S: 3.96,
        Sch10S: 4.57,
        Sch20: 6.35,
        Sch30: 8.38,
        Sch40: 10.31,
        Sch60: 14.27,
        Sch80: 17.48,
        Sch100: 21.44,
        Sch120: 25.4,
        Sch140: 28.58,
        Sch160: 33.32,
        STD: 9.53,
        XS: 12.7,
        XXS: 25.4,
      },
      350: {
        Sch5S: 3.96,
        Sch10S: 4.78,
        Sch10: 6.35,
        Sch20: 7.92,
        Sch30: 9.53,
        Sch40: 11.13,
        Sch60: 15.09,
        Sch80: 19.05,
        Sch100: 23.83,
        Sch120: 27.79,
        Sch140: 31.75,
        Sch160: 35.71,
        STD: 9.53,
        XS: 12.7,
      },
      400: {
        Sch5S: 4.19,
        Sch10S: 4.78,
        Sch10: 6.35,
        Sch20: 7.92,
        Sch30: 9.53,
        Sch40: 12.7,
        Sch60: 16.66,
        Sch80: 21.44,
        Sch100: 26.19,
        Sch120: 30.96,
        Sch140: 36.53,
        Sch160: 40.49,
        STD: 9.53,
        XS: 12.7,
      },
      450: {
        Sch5S: 4.19,
        Sch10S: 4.78,
        Sch10: 6.35,
        Sch20: 7.92,
        Sch30: 11.13,
        Sch40: 14.27,
        Sch60: 19.05,
        Sch80: 23.83,
        Sch100: 29.36,
        Sch120: 34.93,
        Sch140: 39.67,
        Sch160: 45.24,
        STD: 9.53,
        XS: 12.7,
      },
      500: {
        Sch5S: 4.78,
        Sch10S: 5.54,
        Sch10: 6.35,
        Sch20: 9.53,
        Sch30: 12.7,
        Sch40: 15.09,
        Sch60: 20.62,
        Sch80: 26.19,
        Sch100: 32.54,
        Sch120: 38.1,
        Sch140: 44.45,
        Sch160: 50.01,
        STD: 9.53,
        XS: 12.7,
      },
      600: {
        Sch5S: 4.78,
        Sch10S: 5.54,
        Sch10: 6.35,
        Sch20: 9.53,
        Sch30: 14.27,
        Sch40: 17.48,
        Sch60: 24.61,
        Sch80: 30.96,
        Sch100: 38.89,
        Sch120: 46.02,
        Sch140: 52.37,
        Sch160: 59.51,
        STD: 9.53,
        XS: 12.7,
      },
    };

    // Outside diameters for stainless steel (same as carbon steel per ASME B36.19M)
    const outsideDiameters: Record<number, number> = {
      15: 21.3,
      20: 26.7,
      25: 33.4,
      32: 42.2,
      40: 48.3,
      50: 60.3,
      65: 73.0,
      80: 88.9,
      100: 114.3,
      125: 141.3,
      150: 168.3,
      200: 219.1,
      250: 273.1,
      300: 323.9,
      350: 355.6,
      400: 406.4,
      450: 457.2,
      500: 508.0,
      600: 610.0,
    };

    // Insert stainless steel pipe dimensions
    for (const [nominalBore, schedules] of Object.entries(stainlessSteelData)) {
      const nb = parseInt(nominalBore);
      const od = outsideDiameters[nb];

      if (!od) continue;

      // Get or create nominal outside diameter entry
      const nominalResult = await queryRunner.query(
        `
        SELECT id FROM nominal_outside_diameters WHERE nominal_diameter_mm = $1
      `,
        [nb],
      );

      if (nominalResult.length === 0) continue;

      const nominalId = nominalResult[0].id;

      for (const [schedule, wallThickness] of Object.entries(schedules)) {
        const wt = wallThickness;
        const id_mm = od - 2 * wt;
        // Mass calculation: π * (OD² - ID²) / 4 * density * 1m / 1000000 (convert mm² to m²)
        // Simplified: π * (OD - wt) * wt * density / 1000000
        const mass_kgm = (Math.PI * (od - wt) * wt * 8000) / 1000000;

        // Extract schedule number if applicable
        const scheduleDesignation = schedule;
        let scheduleNumber: number | null = null;

        const schMatch = schedule.match(/Sch(\d+)/);
        if (schMatch) {
          scheduleNumber = parseInt(schMatch[1]);
        }

        await queryRunner.query(
          `
          INSERT INTO pipe_dimensions (
            wall_thickness_mm,
            internal_diameter_mm,
            mass_kgm,
            schedule_designation,
            schedule_number,
            nominal_outside_diameter_id,
            steel_specification_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `,
          [
            wt,
            id_mm,
            parseFloat(mass_kgm.toFixed(3)),
            scheduleDesignation,
            scheduleNumber,
            nominalId,
            ssSpecId,
          ],
        );
      }
    }

    console.warn('BNW and Stainless Steel data seeded successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove stainless steel pipe dimensions
    await queryRunner.query(`
      DELETE FROM pipe_dimensions
      WHERE steel_specification_id IN (
        SELECT id FROM steel_specifications WHERE steel_spec_name = 'ASTM A312 TP304/316'
      )
    `);

    // Remove stainless steel specification
    await queryRunner.query(`
      DELETE FROM steel_specifications WHERE steel_spec_name = 'ASTM A312 TP304/316'
    `);

    // Remove bolt masses for M12-M64
    // Note: bolt_masses uses "boltId" (camelCase) column
    await queryRunner.query(`
      DELETE FROM bolt_masses WHERE "boltId" IN (
        SELECT id FROM bolts WHERE designation IN ('M12', 'M14', 'M16', 'M18', 'M20', 'M22', 'M24', 'M27', 'M30', 'M33', 'M36', 'M39', 'M42', 'M45', 'M48', 'M52', 'M56', 'M60', 'M64')
      )
    `);

    // Remove nut masses for M12-M64
    await queryRunner.query(`
      DELETE FROM nut_masses WHERE bolt_id IN (
        SELECT id FROM bolts WHERE designation IN ('M12', 'M14', 'M16', 'M18', 'M20', 'M22', 'M24', 'M27', 'M30', 'M33', 'M36', 'M39', 'M42', 'M45', 'M48', 'M52', 'M56', 'M60', 'M64')
      )
    `);

    // Remove bolts M12-M64
    await queryRunner.query(`
      DELETE FROM bolts WHERE designation IN ('M12', 'M14', 'M16', 'M18', 'M20', 'M22', 'M24', 'M27', 'M30', 'M33', 'M36', 'M39', 'M42', 'M45', 'M48', 'M52', 'M56', 'M60', 'M64')
    `);
  }
}
