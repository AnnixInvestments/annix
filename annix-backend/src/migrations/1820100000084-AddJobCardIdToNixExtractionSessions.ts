import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds job_card_id to nix_extraction_sessions. Populated by the
 * 'Convert to Job Card' action on the quote page — once set, the quote
 * page hides the convert button and shows 'View Job Card' instead, so a
 * single quote can only spawn one JC (preventing duplicates from
 * accidental double-clicks). Nullable; pre-existing sessions stay null
 * until/unless they're converted.
 */
export class AddJobCardIdToNixExtractionSessions1820100000084 implements MigrationInterface {
  name = "AddJobCardIdToNixExtractionSessions1820100000084";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        ADD COLUMN IF NOT EXISTS "job_card_id" int NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_sessions_job_card"
        ON "nix_extraction_sessions" ("job_card_id")
        WHERE "job_card_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_nix_sessions_job_card"
    `);
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        DROP COLUMN IF EXISTS "job_card_id"
    `);
  }
}
