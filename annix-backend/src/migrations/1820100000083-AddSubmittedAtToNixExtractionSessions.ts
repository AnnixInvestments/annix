import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds submitted_at timestamp to nix_extraction_sessions. Set when the
 * quoter clicks "Submit Quote" on the working quote page. Records the
 * moment of submission for display on the Quotations hub
 * ("Submitted YYYY/MM/DD") without changing the session status — the
 * quote stays in the 'promoted' state and remains editable via auto-save.
 */
export class AddSubmittedAtToNixExtractionSessions1820100000083 implements MigrationInterface {
  name = "AddSubmittedAtToNixExtractionSessions1820100000083";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        ADD COLUMN IF NOT EXISTS "submitted_at" timestamp NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        DROP COLUMN IF EXISTS "submitted_at"
    `);
  }
}
