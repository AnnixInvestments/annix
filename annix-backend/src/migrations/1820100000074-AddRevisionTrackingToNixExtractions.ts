import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Issue #264 follow-up. Tracks revision supersession on Nix extractions so
 * the platform can detect when a customer uploads an older revision of a
 * doc we've already extracted (warn them) or a newer one (auto-archive
 * the old one as the canonical). Required for the mine-document library
 * to surface 'latest revision' correctly across quotes / RFQs / BOQs.
 *
 * Adds:
 *   is_latest_revision   denormalised flag — true unless a higher-rev
 *                        extraction exists in the library for the same
 *                        (mine_country, mine_id, document_number).
 *   superseded_by_extraction_id   when !is_latest_revision, points to
 *                                 the newer-rev extraction (so the UI can
 *                                 jump 'see latest →').
 */
export class AddRevisionTrackingToNixExtractions1820100000074 implements MigrationInterface {
  name = "AddRevisionTrackingToNixExtractions1820100000074";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extractions"
        ADD COLUMN IF NOT EXISTS "is_latest_revision" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "superseded_by_extraction_id" int NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "nix_extractions"
          ADD CONSTRAINT "FK_nix_extractions_superseded_by"
          FOREIGN KEY ("superseded_by_extraction_id")
          REFERENCES "nix_extractions"("id")
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_extractions_doc_latest"
        ON "nix_extractions" ("document_number", "is_latest_revision")
        WHERE "is_latest_revision" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_nix_extractions_doc_latest"`);
    await queryRunner.query(`
      ALTER TABLE "nix_extractions"
        DROP CONSTRAINT IF EXISTS "FK_nix_extractions_superseded_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "nix_extractions"
        DROP COLUMN IF EXISTS "superseded_by_extraction_id",
        DROP COLUMN IF EXISTS "is_latest_revision"
    `);
  }
}
