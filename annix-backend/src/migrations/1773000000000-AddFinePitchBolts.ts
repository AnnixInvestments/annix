import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinePitchBolts1773000000000 implements MigrationInterface {
  name = 'AddFinePitchBolts1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding fine pitch bolt options...');

    const finePitchBolts = [
      { designation: 'M10x1', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.0 },
      { designation: 'M12x1.25', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.25 },
      { designation: 'M12x1.5', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.5 },
      { designation: 'M14x1.5', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.5 },
      { designation: 'M16x1.5', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.5 },
      { designation: 'M18x1.5', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.5 },
      { designation: 'M20x1.5', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.5 },
      { designation: 'M20x2', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M22x1.5', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.5 },
      { designation: 'M24x2', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M27x2', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M30x2', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M33x2', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M36x3', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 3.0 },
      { designation: 'M39x3', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 3.0 },
      { designation: 'M42x3', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 3.0 },
      { designation: 'M48x3', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 3.0 },
    ];

    const fineStudBolts = [
      { designation: 'M20x1.5 B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'fine', threadPitchMm: 1.5 },
      { designation: 'M24x2 B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M27x2 B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M30x2 B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M33x2 B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'fine', threadPitchMm: 2.0 },
      { designation: 'M36x3 B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'fine', threadPitchMm: 3.0 },
      { designation: 'M42x3 B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'fine', threadPitchMm: 3.0 },
      { designation: 'M48x3 B7 Stud', grade: 'B7', material: 'Alloy Steel', headStyle: 'stud', threadType: 'fine', threadPitchMm: 3.0 },
    ];

    const imperialFineThreadBolts = [
      { designation: '1/2" UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.270 },
      { designation: '5/8" UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.411 },
      { designation: '3/4" UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.588 },
      { designation: '7/8" UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 1.814 },
      { designation: '1" UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.117 },
      { designation: '1-1/8" UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.117 },
      { designation: '1-1/4" UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.117 },
      { designation: '1-1/2" UNF', grade: '8.8', material: 'Carbon Steel', headStyle: 'hex', threadType: 'fine', threadPitchMm: 2.117 },
    ];

    const allBolts = [...finePitchBolts, ...fineStudBolts, ...imperialFineThreadBolts];

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

    const finePitchMassData: Record<string, Record<number, number>> = {
      'M10x1': { 30: 0.020, 40: 0.026, 50: 0.032, 60: 0.038, 70: 0.044, 80: 0.050 },
      'M12x1.25': { 35: 0.034, 40: 0.038, 50: 0.047, 60: 0.055, 70: 0.064, 80: 0.072, 90: 0.081, 100: 0.090 },
      'M12x1.5': { 35: 0.033, 40: 0.037, 50: 0.046, 60: 0.054, 70: 0.062, 80: 0.071, 90: 0.079, 100: 0.088 },
      'M14x1.5': { 40: 0.055, 50: 0.067, 60: 0.078, 70: 0.090, 80: 0.101, 90: 0.113, 100: 0.125 },
      'M16x1.5': { 45: 0.082, 50: 0.089, 60: 0.104, 70: 0.118, 80: 0.133, 90: 0.148, 100: 0.163, 110: 0.178 },
      'M18x1.5': { 50: 0.118, 60: 0.136, 70: 0.155, 80: 0.173, 90: 0.191, 100: 0.210, 110: 0.228 },
      'M20x1.5': { 55: 0.155, 60: 0.166, 70: 0.188, 80: 0.210, 90: 0.232, 100: 0.254, 110: 0.276, 120: 0.298 },
      'M20x2': { 55: 0.151, 60: 0.162, 70: 0.183, 80: 0.204, 90: 0.226, 100: 0.247, 110: 0.268, 120: 0.290 },
      'M22x1.5': { 60: 0.205, 70: 0.230, 80: 0.256, 90: 0.281, 100: 0.307, 110: 0.332, 120: 0.358 },
      'M24x2': { 65: 0.260, 75: 0.295, 85: 0.330, 95: 0.365, 105: 0.400, 115: 0.435, 125: 0.470 },
      'M27x2': { 75: 0.375, 85: 0.418, 95: 0.462, 105: 0.505, 115: 0.548, 125: 0.592, 135: 0.635 },
      'M30x2': { 80: 0.500, 90: 0.556, 100: 0.611, 110: 0.667, 120: 0.722, 130: 0.778, 140: 0.833 },
      'M33x2': { 90: 0.675, 100: 0.743, 110: 0.811, 120: 0.880, 130: 0.948, 140: 1.016, 150: 1.085 },
      'M36x3': { 100: 0.895, 110: 0.978, 120: 1.060, 130: 1.143, 140: 1.225, 150: 1.308, 160: 1.390 },
      'M42x3': { 110: 1.350, 120: 1.455, 130: 1.560, 140: 1.665, 150: 1.770, 160: 1.875, 175: 2.033 },
      'M48x3': { 120: 1.880, 130: 2.005, 140: 2.130, 150: 2.255, 160: 2.380, 175: 2.568, 190: 2.755 },
    };

    for (const [designation, lengths] of Object.entries(finePitchMassData)) {
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

    console.warn('Fine pitch bolt options added successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const designations = [
      'M10x1', 'M12x1.25', 'M12x1.5', 'M14x1.5', 'M16x1.5', 'M18x1.5',
      'M20x1.5', 'M20x2', 'M22x1.5', 'M24x2', 'M27x2', 'M30x2', 'M33x2',
      'M36x3', 'M39x3', 'M42x3', 'M48x3',
      'M20x1.5 B7 Stud', 'M24x2 B7 Stud', 'M27x2 B7 Stud', 'M30x2 B7 Stud',
      'M33x2 B7 Stud', 'M36x3 B7 Stud', 'M42x3 B7 Stud', 'M48x3 B7 Stud',
      '1/2" UNF', '5/8" UNF', '3/4" UNF', '7/8" UNF', '1" UNF',
      '1-1/8" UNF', '1-1/4" UNF', '1-1/2" UNF',
    ];

    for (const designation of designations) {
      await queryRunner.query(`DELETE FROM bolts WHERE designation = $1`, [designation]);
    }
  }
}
