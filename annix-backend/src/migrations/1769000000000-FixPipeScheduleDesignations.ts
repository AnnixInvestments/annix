import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPipeScheduleDesignations1769000000000
  implements MigrationInterface
{
  name = 'FixPipeScheduleDesignations1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Fixing pipe schedule designations...');

    // Fix Schedule 40 (Sch40 → STD with schedule_number 40)
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_designation = 'STD',
          schedule_number = 40
      WHERE schedule_designation = 'Sch40'
    `);

    // Fix Schedule 80 (Sch80 → XS with schedule_number 80)
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_designation = 'XS',
          schedule_number = 80
      WHERE schedule_designation = 'Sch80'
    `);

    // Fix Schedule 160 (Sch160 → XXS with schedule_number 160)
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_designation = 'XXS',
          schedule_number = 160
      WHERE schedule_designation = 'Sch160'
    `);

    // Fix Schedule 120 if it exists
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_number = 120
      WHERE schedule_designation = 'Sch120'
    `);

    // Fix Schedule 10 if it exists
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_number = 10
      WHERE schedule_designation = 'Sch10'
    `);

    // Fix Schedule 20 if it exists
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_number = 20
      WHERE schedule_designation = 'Sch20'
    `);

    // Fix Schedule 30 if it exists
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_number = 30
      WHERE schedule_designation = 'Sch30'
    `);

    // Fix Schedule 60 if it exists
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_number = 60
      WHERE schedule_designation = 'Sch60'
    `);

    // Fix Schedule 100 if it exists
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_number = 100
      WHERE schedule_designation = 'Sch100'
    `);

    // Fix Schedule 140 if it exists
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_number = 140
      WHERE schedule_designation = 'Sch140'
    `);

    console.log(
      '✅ Schedule designations fixed: STD (40), XS (80), XXS (160)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⏮️  Reverting schedule designation fixes...');

    // Revert Schedule 40
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_designation = 'Sch40',
          schedule_number = NULL
      WHERE schedule_designation = 'STD' AND schedule_number = 40
    `);

    // Revert Schedule 80
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_designation = 'Sch80',
          schedule_number = NULL
      WHERE schedule_designation = 'XS' AND schedule_number = 80
    `);

    // Revert Schedule 160
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_designation = 'Sch160',
          schedule_number = NULL
      WHERE schedule_designation = 'XXS' AND schedule_number = 160
    `);

    // Revert other schedules
    await queryRunner.query(`
      UPDATE pipe_dimensions
      SET schedule_designation = 'Sch' || schedule_number::text,
          schedule_number = NULL
      WHERE schedule_number IN (10, 20, 30, 60, 100, 120, 140)
    `);

    console.log('✅ Reverted to Sch40/Sch80/Sch160 format');
  }
}
