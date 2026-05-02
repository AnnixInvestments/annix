import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateJobPostingPortalPostings1820100000050 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_job_posting_portal_postings (
        id SERIAL PRIMARY KEY,
        job_posting_id INT NOT NULL REFERENCES cv_assistant_job_postings(id) ON DELETE CASCADE,
        portal_code VARCHAR(50) NOT NULL,
        portal_job_id VARCHAR(255),
        portal_url VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        posted_at TIMESTAMPTZ,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uniq_jp_portal_posting_job_portal UNIQUE (job_posting_id, portal_code)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jp_portal_postings_job
      ON cv_assistant_job_posting_portal_postings (job_posting_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_jp_portal_postings_job");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_job_posting_portal_postings");
  }
}
