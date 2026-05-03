import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvJobScreeningQuestions1820100000056 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_job_screening_questions (
        id SERIAL PRIMARY KEY,
        job_posting_id INT NOT NULL REFERENCES cv_assistant_job_postings(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        question_type VARCHAR(32) NOT NULL,
        options JSONB,
        disqualifying_answer TEXT,
        weight INT NOT NULL DEFAULT 5,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_job_screening_questions_job_posting_id
        ON cv_assistant_job_screening_questions (job_posting_id)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE constraint_name = 'cv_assistant_job_screening_questions_type_check'
        ) THEN
          ALTER TABLE cv_assistant_job_screening_questions
            ADD CONSTRAINT cv_assistant_job_screening_questions_type_check
            CHECK (question_type IN ('yes_no', 'short_text', 'multiple_choice', 'numeric'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_job_screening_questions");
  }
}
