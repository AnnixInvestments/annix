import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Persist Nix-uploaded source documents to S3 (existing IStorageService /
 * S3StorageService) so users can audit what Nix read.
 *
 * Today, /nix/upload uses Multer disk storage at os.tmpdir() — files are
 * processed and then garbage-collected. The user has no way to compare
 * Nix's extraction against the actual source PDF.
 *
 * After this migration:
 *   - storage_path holds the S3 key under the configured StorageArea
 *     (e.g. "stock-control/quotes/{sourceId}/{role}/{filename}")
 *   - storage_area records which top-level bucket area the doc lives in,
 *     so retrieval/deletion code can resolve the right path conventions.
 *
 * The legacy document_path column is preserved (it still receives the temp
 * path during processing), but storage_path is the durable reference and
 * what new code should read.
 *
 * Followup to #251 — see #253 task E.
 */
export class AddS3KeyToNixExtractions1820100000070 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nix_extractions
      ADD COLUMN IF NOT EXISTS storage_path VARCHAR(512) NULL,
      ADD COLUMN IF NOT EXISTS storage_area VARCHAR(64) NULL,
      ADD COLUMN IF NOT EXISTS storage_size_bytes BIGINT NULL,
      ADD COLUMN IF NOT EXISTS storage_mime_type VARCHAR(128) NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nix_extractions_storage_path
        ON nix_extractions (storage_path);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_nix_extractions_storage_path;");
    await queryRunner.query(`
      ALTER TABLE nix_extractions
      DROP COLUMN IF EXISTS storage_mime_type,
      DROP COLUMN IF EXISTS storage_size_bytes,
      DROP COLUMN IF EXISTS storage_area,
      DROP COLUMN IF EXISTS storage_path;
    `);
  }
}
