import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvSalaryBenchmarks1820100000057 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_salary_benchmarks (
        id SERIAL PRIMARY KEY,
        normalized_title TEXT NOT NULL,
        industry TEXT,
        city TEXT,
        province TEXT,
        seniority_level TEXT,
        min_salary NUMERIC(12, 2),
        median_salary NUMERIC(12, 2),
        max_salary NUMERIC(12, 2),
        sample_size INT NOT NULL DEFAULT 0,
        source VARCHAR(32) NOT NULL,
        confidence NUMERIC(3, 2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cv_salary_benchmarks_unique
        ON cv_assistant_salary_benchmarks (
          normalized_title,
          COALESCE(industry, ''),
          COALESCE(province, ''),
          COALESCE(seniority_level, '')
        )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_salary_benchmarks_lookup
        ON cv_assistant_salary_benchmarks (normalized_title, province)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE constraint_name = 'cv_assistant_salary_benchmarks_source_check'
        ) THEN
          ALTER TABLE cv_assistant_salary_benchmarks
            ADD CONSTRAINT cv_assistant_salary_benchmarks_source_check
            CHECK (source IN ('adzuna', 'internal', 'gemini_grounded'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_salary_benchmarks");
  }
}
