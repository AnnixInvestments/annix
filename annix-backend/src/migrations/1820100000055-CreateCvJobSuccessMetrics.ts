import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvJobSuccessMetrics1820100000055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_job_success_metrics (
        id SERIAL PRIMARY KEY,
        job_posting_id INT NOT NULL REFERENCES cv_assistant_job_postings(id) ON DELETE CASCADE,
        timeframe VARCHAR(16) NOT NULL,
        metric TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_job_success_metrics_job_posting_id
        ON cv_assistant_job_success_metrics (job_posting_id)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE constraint_name = 'cv_assistant_job_success_metrics_timeframe_check'
        ) THEN
          ALTER TABLE cv_assistant_job_success_metrics
            ADD CONSTRAINT cv_assistant_job_success_metrics_timeframe_check
            CHECK (timeframe IN ('3_months', '12_months'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_job_success_metrics");
  }
}
