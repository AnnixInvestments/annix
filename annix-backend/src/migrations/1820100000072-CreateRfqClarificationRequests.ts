import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds rfq_clarification_requests — one row per pre-quote clarification
 * email sent. Tracks the customer's response status (still pending /
 * submitted via the public form) so info@annix.co.za has visibility on
 * which quotes are blocked on missing info.
 *
 * Token is the unique URL-safe key for the public form
 * (/customer/clarifications/:token). Persisted requirements snapshot
 * keeps the form aligned with what we asked, even if the BOQ has
 * changed since.
 *
 * Idempotent (IF NOT EXISTS / IF EXISTS, DO blocks for FK creation).
 */
export class CreateRfqClarificationRequests1820100000072 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rfq_clarification_requests (
        id SERIAL PRIMARY KEY,
        token VARCHAR(64) NOT NULL UNIQUE,
        rfq_draft_id INTEGER NULL,
        customer_email VARCHAR(256) NULL,
        project_name VARCHAR(256) NULL,
        rfq_reference VARCHAR(128) NULL,
        requirements JSONB NOT NULL,
        responses JSONB NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rfq_clar_token
        ON rfq_clarification_requests (token);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rfq_clar_draft
        ON rfq_clarification_requests (rfq_draft_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rfq_clar_email
        ON rfq_clarification_requests (customer_email);
    `);

    // Soft FK to rfq_drafts — when a draft gets deleted (or
    // converted to an RFQ) the clarification record stays so we
    // retain audit trail. ON DELETE SET NULL drops the linkage but
    // keeps the row. Wrapped in DO block for idempotency.
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE rfq_clarification_requests
          ADD CONSTRAINT fk_rfq_clar_draft
          FOREIGN KEY (rfq_draft_id) REFERENCES rfq_drafts(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE rfq_clarification_requests DROP CONSTRAINT fk_rfq_clar_draft;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$;
    `);
    await queryRunner.query("DROP INDEX IF EXISTS idx_rfq_clar_email;");
    await queryRunner.query("DROP INDEX IF EXISTS idx_rfq_clar_draft;");
    await queryRunner.query("DROP INDEX IF EXISTS idx_rfq_clar_token;");
    await queryRunner.query("DROP TABLE IF EXISTS rfq_clarification_requests;");
  }
}
