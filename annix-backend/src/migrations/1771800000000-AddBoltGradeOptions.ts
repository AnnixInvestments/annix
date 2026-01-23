import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoltGradeOptions1771800000000 implements MigrationInterface {
  name = 'AddBoltGradeOptions1771800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding additional bolt grade options...');

    const ISO_COARSE_PITCHES: Record<number, number> = {
      10: 1.5, 12: 1.75, 14: 2.0, 16: 2.0, 18: 2.5, 20: 2.5, 22: 2.5,
      24: 3.0, 27: 3.0, 30: 3.5, 33: 3.5, 36: 4.0, 39: 4.0,
      42: 4.5, 45: 4.5, 48: 5.0, 52: 5.0, 56: 5.5, 64: 6.0,
    };

    const metricSizes = [10, 12, 14, 16, 20, 22, 24, 27, 30, 33, 36, 39, 42, 45, 48, 52, 56, 64];

    const gradeConfigs = [
      { grade: '10.9', material: 'Alloy Steel', headStyle: 'hex' },
      { grade: '12.9', material: 'Alloy Steel', headStyle: 'hex' },
      { grade: 'B7', material: 'ASTM A193 Alloy Steel', headStyle: 'hex' },
      { grade: 'B8M', material: 'ASTM A193 Stainless Steel 316', headStyle: 'hex' },
    ];

    for (const size of metricSizes) {
      const designation = `M${size}`;
      const threadPitch = ISO_COARSE_PITCHES[size] || 2.0;

      for (const config of gradeConfigs) {
        const fullDesignation = `${designation} ${config.grade}`;

        const existing = await queryRunner.query(
          `SELECT id FROM bolts WHERE designation = $1`,
          [fullDesignation]
        );

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm)
            VALUES ($1, $2, $3, $4, 'coarse', $5)
          `, [fullDesignation, config.grade, config.material, config.headStyle, threadPitch]);
        }
      }
    }
    console.warn('Added hex bolt grade options (10.9, 12.9, B7, B8M)');

    const studGrades = [
      { grade: 'B8', material: 'ASTM A193 Stainless Steel 304' },
      { grade: 'B8M', material: 'ASTM A193 Stainless Steel 316' },
      { grade: 'L7', material: 'ASTM A320 Low Temp Alloy Steel' },
    ];

    for (const size of metricSizes) {
      const threadPitch = ISO_COARSE_PITCHES[size] || 2.0;

      for (const config of studGrades) {
        const designation = `M${size} Stud ${config.grade}`;

        const existing = await queryRunner.query(
          `SELECT id FROM bolts WHERE designation = $1`,
          [designation]
        );

        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm)
            VALUES ($1, $2, $3, 'stud', 'coarse', $4)
          `, [designation, config.grade, config.material, threadPitch]);
        }
      }
    }
    console.warn('Added stud bolt grade options (B8, B8M, L7)');

    console.warn('Bolt grade options added successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Removing additional bolt grade options...');

    const gradesToRemove = ['10.9', '12.9', 'B7', 'B8M', 'B8', 'L7'];

    for (const grade of gradesToRemove) {
      await queryRunner.query(`
        DELETE FROM bolts WHERE grade = $1 AND designation LIKE 'M%'
      `, [grade]);
    }
  }
}
