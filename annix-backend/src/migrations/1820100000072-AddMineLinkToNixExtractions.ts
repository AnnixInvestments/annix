import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Issue #264 Phase 1 — auto-tag Nix extractions to a mine + cross-quote reuse.
 *
 * Adds a nullable FK from nix_extractions to sa_mines, plus columns for the
 * inference confidence/reason and the canonical document number+revision
 * extracted from the title block. The (mine_id, document_number) composite
 * index supports the cross-quote reuse lookup ('does this mine already have
 * extraction X?'); the standalone document_number index supports the global
 * 'has anyone extracted this doc number?' search.
 *
 * All columns nullable so existing rows continue to work — the inference
 * service backfills going forward and a Phase-2 backfill job can populate
 * historical rows.
 */
export class AddMineLinkToNixExtractions1820100000072 implements MigrationInterface {
  name = "AddMineLinkToNixExtractions1820100000072";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extractions"
        ADD COLUMN IF NOT EXISTS "mine_id" integer,
        ADD COLUMN IF NOT EXISTS "mine_inference_confidence" real,
        ADD COLUMN IF NOT EXISTS "mine_inference_reason" varchar(256),
        ADD COLUMN IF NOT EXISTS "document_number" varchar(128),
        ADD COLUMN IF NOT EXISTS "document_revision" varchar(32)
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "nix_extractions"
          ADD CONSTRAINT "FK_nix_extractions_mine"
          FOREIGN KEY ("mine_id") REFERENCES "sa_mines"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_extractions_mine_doc"
        ON "nix_extractions" ("mine_id", "document_number")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_extractions_doc_number"
        ON "nix_extractions" ("document_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_nix_extractions_doc_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_nix_extractions_mine_doc"`);
    await queryRunner.query(`
      ALTER TABLE "nix_extractions" DROP CONSTRAINT IF EXISTS "FK_nix_extractions_mine"
    `);
    await queryRunner.query(`
      ALTER TABLE "nix_extractions"
        DROP COLUMN IF EXISTS "document_revision",
        DROP COLUMN IF EXISTS "document_number",
        DROP COLUMN IF EXISTS "mine_inference_reason",
        DROP COLUMN IF EXISTS "mine_inference_confidence",
        DROP COLUMN IF EXISTS "mine_id"
    `);
  }
}
