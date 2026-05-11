import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the org-wide product data sheet library. Every data sheet uploaded
 * via the QuoteSpecsEditor (or any future product-pricing UI) lands here so
 * future quotes for the same manufacturer + product can reuse it without the
 * quoter having to re-upload.
 *
 * Revision tracking mirrors NixExtraction's pattern (#264 / migration 074):
 *   - The printed revision on the data sheet (`published_revision`) is the
 *     authoritative version. A higher revision uploaded for the same
 *     (manufacturer_slug, product_slug) flips the old row's is_latest = false
 *     and sets superseded_by_id.
 *   - The same revision uploaded twice = no-op (service reuses the existing
 *     row; no new S3 object is written).
 *   - Older revisions are kept indefinitely so the archive view can show full
 *     history.
 */
export class CreateProductDataSheets1820100000077 implements MigrationInterface {
  name = "CreateProductDataSheets1820100000077";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_data_sheets" (
        "id" SERIAL PRIMARY KEY,
        "manufacturer" varchar(128) NOT NULL,
        "manufacturer_slug" varchar(128) NOT NULL,
        "product_name" varchar(256) NOT NULL,
        "product_slug" varchar(256) NOT NULL,
        "kind" varchar(16) NOT NULL,
        "version" int NOT NULL DEFAULT 1,
        "published_revision" varchar(64) NULL,
        "published_date" date NULL,
        "storage_path" varchar(512) NOT NULL,
        "original_filename" varchar(256) NOT NULL,
        "size_bytes" bigint NOT NULL,
        "mime_type" varchar(128) NOT NULL,
        "extracted_brand" varchar(256) NULL,
        "extracted_description" text NULL,
        "uploaded_by_user_id" int NULL,
        "is_latest" boolean NOT NULL DEFAULT true,
        "superseded_by_id" int NULL,
        "superseded_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "product_data_sheets"
          ADD CONSTRAINT "FK_product_data_sheets_superseded_by"
          FOREIGN KEY ("superseded_by_id")
          REFERENCES "product_data_sheets"("id")
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Note: uploaded_by_user_id is a logical reference only — no DB-level FK
    // to the user table. This mirrors how NixExtraction.user_id is wired
    // (TypeORM relation without an FK constraint) and avoids cross-module
    // coupling concerns during migration rollbacks.

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_product_data_sheets_slugs_latest"
        ON "product_data_sheets" ("manufacturer_slug", "product_slug", "is_latest")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_product_data_sheets_slugs_revision"
        ON "product_data_sheets" ("manufacturer_slug", "product_slug", "published_revision")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_product_data_sheets_manufacturer"
        ON "product_data_sheets" ("manufacturer_slug")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_product_data_sheets_current_per_product"
        ON "product_data_sheets" ("manufacturer_slug", "product_slug")
        WHERE "is_latest" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_data_sheets_current_per_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_data_sheets_manufacturer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_data_sheets_slugs_revision"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_data_sheets_slugs_latest"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_data_sheets"`);
  }
}
