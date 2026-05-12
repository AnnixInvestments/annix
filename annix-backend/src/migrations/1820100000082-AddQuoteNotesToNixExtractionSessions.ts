import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds quote_notes JSONB to nix_extraction_sessions for the free-text
 * notes blocks shown on the customer-facing PDF. Shape (owned by the
 * frontend, opaque to backend):
 *
 *   {
 *     perPool: { [poolKey: string]: string },
 *     generalAfterItems: string
 *   }
 *
 * perPool entries render at the end of the matching pool section
 * (banding instructions, special-spool callouts). generalAfterItems
 * renders at the very bottom of the items list before the totals.
 */
export class AddQuoteNotesToNixExtractionSessions1820100000082 implements MigrationInterface {
  name = "AddQuoteNotesToNixExtractionSessions1820100000082";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        ADD COLUMN IF NOT EXISTS "quote_notes" jsonb NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        DROP COLUMN IF EXISTS "quote_notes"
    `);
  }
}
