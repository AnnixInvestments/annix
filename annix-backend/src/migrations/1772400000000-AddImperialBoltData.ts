import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImperialBoltData1772400000000 implements MigrationInterface {
  name = 'AddImperialBoltData1772400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding imperial bolt data...');

    const imperialBolts = [
      { designation: '1/2" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 1.954 },
      { designation: '5/8" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 2.309 },
      { designation: '3/4" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 2.540 },
      { designation: '7/8" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 2.822 },
      { designation: '1" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 3.175 },
      { designation: '1-1/8" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 3.629 },
      { designation: '1-1/4" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 3.629 },
      { designation: '1-3/8" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 4.233 },
      { designation: '1-1/2" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 4.233 },
      { designation: '1-5/8" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 5.080 },
      { designation: '1-3/4" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 5.080 },
      { designation: '2" UNC', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'coarse', threadPitchMm: 5.644 },
    ];

    const studBolts = [
      { designation: '1/2" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 1.954 },
      { designation: '5/8" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 2.309 },
      { designation: '3/4" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 2.540 },
      { designation: '7/8" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 2.822 },
      { designation: '1" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 3.175 },
      { designation: '1-1/8" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 3.629 },
      { designation: '1-1/4" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 3.629 },
      { designation: '1-3/8" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 4.233 },
      { designation: '1-1/2" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 4.233 },
      { designation: '1-5/8" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 5.080 },
      { designation: '1-3/4" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 5.080 },
      { designation: '2" B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'coarse', threadPitchMm: 5.644 },
    ];

    const allBolts = [...imperialBolts, ...studBolts];

    for (const bolt of allBolts) {
      await queryRunner.query(`
        INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (designation) DO UPDATE SET
          grade = COALESCE(EXCLUDED.grade, bolts.grade),
          material = COALESCE(EXCLUDED.material, bolts.material),
          head_style = COALESCE(EXCLUDED.head_style, bolts.head_style),
          thread_type = COALESCE(EXCLUDED.thread_type, bolts.thread_type),
          thread_pitch_mm = COALESCE(EXCLUDED.thread_pitch_mm, bolts.thread_pitch_mm)
      `, [bolt.designation, bolt.grade, bolt.material, bolt.headStyle, bolt.threadType, bolt.threadPitchMm]);
    }

    const boltMassData: Record<string, Record<number, number>> = {
      '1/2" UNC': { 50: 0.045, 65: 0.055, 75: 0.063, 90: 0.073, 100: 0.082, 115: 0.092, 125: 0.100, 140: 0.112 },
      '5/8" UNC': { 65: 0.091, 75: 0.103, 90: 0.120, 100: 0.132, 115: 0.150, 125: 0.163, 140: 0.181, 150: 0.195 },
      '3/4" UNC': { 75: 0.155, 90: 0.181, 100: 0.200, 115: 0.227, 125: 0.245, 140: 0.273, 150: 0.295, 165: 0.322 },
      '7/8" UNC': { 90: 0.255, 100: 0.282, 115: 0.318, 125: 0.345, 140: 0.382, 150: 0.409, 165: 0.445, 175: 0.473 },
      '1" UNC': { 100: 0.382, 115: 0.427, 125: 0.463, 140: 0.509, 150: 0.545, 165: 0.591, 175: 0.627, 190: 0.682 },
      '1-1/8" UNC': { 115: 0.555, 125: 0.600, 140: 0.655, 150: 0.700, 165: 0.755, 175: 0.800, 190: 0.864, 200: 0.909 },
      '1-1/4" UNC': { 125: 0.755, 140: 0.818, 150: 0.873, 165: 0.936, 175: 0.991, 190: 1.064, 200: 1.118, 215: 1.182 },
      '1-3/8" UNC': { 140: 1.009, 150: 1.073, 165: 1.145, 175: 1.209, 190: 1.291, 200: 1.355, 215: 1.436, 225: 1.500 },
      '1-1/2" UNC': { 150: 1.300, 165: 1.382, 175: 1.455, 190: 1.545, 200: 1.618, 215: 1.709, 225: 1.782, 240: 1.882 },
      '1-5/8" UNC': { 165: 1.645, 175: 1.727, 190: 1.827, 200: 1.909, 215: 2.009, 225: 2.091, 240: 2.200, 250: 2.282 },
      '1-3/4" UNC': { 175: 2.036, 190: 2.145, 200: 2.236, 215: 2.345, 225: 2.436, 240: 2.555, 250: 2.645, 265: 2.764 },
      '2" UNC': { 190: 2.755, 200: 2.864, 215: 2.991, 225: 3.100, 240: 3.236, 250: 3.345, 265: 3.482, 280: 3.627 },
    };

    const studMassData: Record<string, Record<number, number>> = {
      '1/2" B7 Stud': { 65: 0.050, 75: 0.057, 90: 0.066, 100: 0.074, 115: 0.083, 125: 0.091 },
      '5/8" B7 Stud': { 75: 0.091, 90: 0.106, 100: 0.118, 115: 0.133, 125: 0.145, 140: 0.161 },
      '3/4" B7 Stud': { 90: 0.163, 100: 0.180, 115: 0.204, 125: 0.221, 140: 0.245, 150: 0.265 },
      '7/8" B7 Stud': { 100: 0.255, 115: 0.286, 125: 0.311, 140: 0.345, 150: 0.370, 165: 0.402 },
      '1" B7 Stud': { 115: 0.389, 125: 0.421, 140: 0.461, 150: 0.493, 165: 0.534, 175: 0.566 },
      '1-1/8" B7 Stud': { 125: 0.550, 140: 0.598, 150: 0.638, 165: 0.686, 175: 0.725, 190: 0.782 },
      '1-1/4" B7 Stud': { 140: 0.752, 150: 0.800, 165: 0.856, 175: 0.904, 190: 0.968, 200: 1.016 },
      '1-3/8" B7 Stud': { 150: 0.982, 165: 1.047, 175: 1.103, 190: 1.175, 200: 1.230, 215: 1.303 },
      '1-1/2" B7 Stud': { 165: 1.270, 175: 1.334, 190: 1.414, 200: 1.478, 215: 1.558, 225: 1.622 },
      '1-5/8" B7 Stud': { 175: 1.586, 190: 1.675, 200: 1.748, 215: 1.837, 225: 1.910, 240: 2.007 },
      '1-3/4" B7 Stud': { 190: 1.970, 200: 2.052, 215: 2.150, 225: 2.232, 240: 2.339, 250: 2.421 },
      '2" B7 Stud': { 200: 2.630, 215: 2.745, 225: 2.843, 240: 2.966, 250: 3.064, 265: 3.195 },
    };

    for (const [designation, lengths] of Object.entries(boltMassData)) {
      const boltResult = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = $1`,
        [designation]
      );
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      for (const [lengthStr, massKg] of Object.entries(lengths)) {
        const lengthMm = parseInt(lengthStr, 10);
        await queryRunner.query(`
          INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [boltId, lengthMm, massKg]);
      }
    }

    for (const [designation, lengths] of Object.entries(studMassData)) {
      const boltResult = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = $1`,
        [designation]
      );
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      for (const [lengthStr, massKg] of Object.entries(lengths)) {
        const lengthMm = parseInt(lengthStr, 10);
        await queryRunner.query(`
          INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [boltId, lengthMm, massKg]);
      }
    }

    console.warn('Imperial bolt data added successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const designations = [
      '1/2" UNC', '5/8" UNC', '3/4" UNC', '7/8" UNC', '1" UNC',
      '1-1/8" UNC', '1-1/4" UNC', '1-3/8" UNC', '1-1/2" UNC',
      '1-5/8" UNC', '1-3/4" UNC', '2" UNC',
      '1/2" B7 Stud', '5/8" B7 Stud', '3/4" B7 Stud', '7/8" B7 Stud', '1" B7 Stud',
      '1-1/8" B7 Stud', '1-1/4" B7 Stud', '1-3/8" B7 Stud', '1-1/2" B7 Stud',
      '1-5/8" B7 Stud', '1-3/4" B7 Stud', '2" B7 Stud',
    ];

    for (const designation of designations) {
      await queryRunner.query(`DELETE FROM bolts WHERE designation = $1`, [designation]);
    }
  }
}
