import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTestModeToCvJobPostings1820100000058 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'test_mode'
        ) THEN
          ALTER TABLE cv_assistant_job_postings
            ADD COLUMN test_mode BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_candidates' AND column_name = 'is_test_fixture'
        ) THEN
          ALTER TABLE cv_assistant_candidates
            ADD COLUMN is_test_fixture BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE cv_assistant_job_postings DROP COLUMN IF EXISTS test_mode",
    );
    await queryRunner.query(
      "ALTER TABLE cv_assistant_candidates DROP COLUMN IF EXISTS is_test_fixture",
    );
  }
}
