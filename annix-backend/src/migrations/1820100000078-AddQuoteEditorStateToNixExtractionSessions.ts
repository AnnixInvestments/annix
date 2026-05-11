import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds quote_editor_state JSONB to nix_extraction_sessions so the
 * QuoteSpecsEditor on the promoted-quote page (#253 follow-up) can persist
 * the quoter's edits across reloads.
 *
 * The shape is owned by the frontend ({ overrides, rates, attachments }) and
 * not introspected by the backend — we store it as opaque JSONB. Null means
 * "the user hasn't touched the editor yet", which is the same as the
 * default-derived view.
 */
export class AddQuoteEditorStateToNixExtractionSessions1820100000078 implements MigrationInterface {
  name = "AddQuoteEditorStateToNixExtractionSessions1820100000078";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        ADD COLUMN IF NOT EXISTS "quote_editor_state" jsonb NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        DROP COLUMN IF EXISTS "quote_editor_state"
    `);
  }
}
