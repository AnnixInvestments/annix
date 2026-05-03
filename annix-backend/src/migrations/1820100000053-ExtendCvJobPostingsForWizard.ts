import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendCvJobPostingsForWizard1820100000053 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'normalized_title'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN normalized_title TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'industry'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN industry TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'department'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN department TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'seniority_level'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN seniority_level TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'work_mode'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN work_mode TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'company_context'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN company_context TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'main_purpose'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN main_purpose TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'commission_structure'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN commission_structure TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'benefits'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN benefits JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'quality_score'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN quality_score INT DEFAULT 0;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'inclusivity_score'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN inclusivity_score INT DEFAULT 0;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_postings' AND column_name = 'nix_summary'
        ) THEN
          ALTER TABLE cv_assistant_job_postings ADD COLUMN nix_summary JSONB;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_job_postings_normalized_title
        ON cv_assistant_job_postings (normalized_title)
        WHERE normalized_title IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_cv_job_postings_normalized_title");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_job_postings
        DROP COLUMN IF EXISTS normalized_title,
        DROP COLUMN IF EXISTS industry,
        DROP COLUMN IF EXISTS department,
        DROP COLUMN IF EXISTS seniority_level,
        DROP COLUMN IF EXISTS work_mode,
        DROP COLUMN IF EXISTS company_context,
        DROP COLUMN IF EXISTS main_purpose,
        DROP COLUMN IF EXISTS commission_structure,
        DROP COLUMN IF EXISTS benefits,
        DROP COLUMN IF EXISTS quality_score,
        DROP COLUMN IF EXISTS inclusivity_score,
        DROP COLUMN IF EXISTS nix_summary
    `);
  }
}
