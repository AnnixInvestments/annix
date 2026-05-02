import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobPostingPhase2Fields1820100000049 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'reference_number'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN reference_number VARCHAR(20);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'response_timeline_days'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN response_timeline_days INT DEFAULT 14;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'location'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN location VARCHAR(255);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'province'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN province VARCHAR(50);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'employment_type'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN employment_type VARCHAR(30);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'salary_min'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN salary_min INT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'salary_max'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN salary_max INT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'salary_currency'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN salary_currency VARCHAR(3) DEFAULT 'ZAR';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'apply_by_email'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN apply_by_email VARCHAR(255);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'activated_at'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN activated_at TIMESTAMPTZ;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cv_assistant_job_postings_reference_number
      ON cv_assistant_job_postings (reference_number)
      WHERE reference_number IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_assistant_job_postings_reference_number");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_job_postings
        DROP COLUMN IF EXISTS reference_number,
        DROP COLUMN IF EXISTS response_timeline_days,
        DROP COLUMN IF EXISTS location,
        DROP COLUMN IF EXISTS province,
        DROP COLUMN IF EXISTS employment_type,
        DROP COLUMN IF EXISTS salary_min,
        DROP COLUMN IF EXISTS salary_max,
        DROP COLUMN IF EXISTS salary_currency,
        DROP COLUMN IF EXISTS apply_by_email,
        DROP COLUMN IF EXISTS activated_at
    `);
  }
}
