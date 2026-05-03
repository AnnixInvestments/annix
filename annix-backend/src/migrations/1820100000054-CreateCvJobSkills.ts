import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvJobSkills1820100000054 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_job_skills (
        id SERIAL PRIMARY KEY,
        job_posting_id INT NOT NULL REFERENCES cv_assistant_job_postings(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        importance VARCHAR(16) NOT NULL DEFAULT 'required',
        proficiency VARCHAR(16) NOT NULL DEFAULT 'intermediate',
        years_experience INT,
        evidence_required TEXT,
        weight INT NOT NULL DEFAULT 5,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_job_skills_job_posting_id
        ON cv_assistant_job_skills (job_posting_id)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE constraint_name = 'cv_assistant_job_skills_importance_check'
        ) THEN
          ALTER TABLE cv_assistant_job_skills
            ADD CONSTRAINT cv_assistant_job_skills_importance_check
            CHECK (importance IN ('required', 'preferred'));
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE constraint_name = 'cv_assistant_job_skills_proficiency_check'
        ) THEN
          ALTER TABLE cv_assistant_job_skills
            ADD CONSTRAINT cv_assistant_job_skills_proficiency_check
            CHECK (proficiency IN ('basic', 'intermediate', 'advanced', 'expert'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_job_skills");
  }
}
