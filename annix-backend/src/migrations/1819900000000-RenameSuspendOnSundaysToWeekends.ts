import { type MigrationInterface, type QueryRunner } from "typeorm";

export class RenameSuspendOnSundaysToWeekends1819900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'scheduled_jobs_global_settings'
            AND column_name = 'suspendOnSundaysAndHolidays'
        ) THEN
          ALTER TABLE scheduled_jobs_global_settings
          RENAME COLUMN "suspendOnSundaysAndHolidays" TO "suspendOnWeekendsAndHolidays";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'scheduled_jobs_global_settings'
            AND column_name = 'suspendOnWeekendsAndHolidays'
        ) THEN
          ALTER TABLE scheduled_jobs_global_settings
          RENAME COLUMN "suspendOnWeekendsAndHolidays" TO "suspendOnSundaysAndHolidays";
        END IF;
      END $$;
    `);
  }
}
