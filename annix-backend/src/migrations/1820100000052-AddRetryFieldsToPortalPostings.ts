import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRetryFieldsToPortalPostings1820100000052 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_posting_portal_postings'
            AND column_name = 'retry_count'
        ) THEN
          ALTER TABLE cv_assistant_job_posting_portal_postings
            ADD COLUMN retry_count INT NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cv_assistant_job_posting_portal_postings'
            AND column_name = 'next_retry_at'
        ) THEN
          ALTER TABLE cv_assistant_job_posting_portal_postings
            ADD COLUMN next_retry_at TIMESTAMPTZ;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jp_portal_postings_retry_due
      ON cv_assistant_job_posting_portal_postings (next_retry_at)
      WHERE status = 'failed' AND next_retry_at IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_jp_portal_postings_retry_due");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_job_posting_portal_postings
        DROP COLUMN IF EXISTS retry_count,
        DROP COLUMN IF EXISTS next_retry_at
    `);
  }
}
