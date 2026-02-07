import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentExpiryAndCompressionFields1770000000000 implements MigrationInterface {
  name = "AddDocumentExpiryAndCompressionFields1770000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."customer_documents_document_type_enum"
      ADD VALUE IF NOT EXISTS 'vat_cert'
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_documents"
      ADD COLUMN IF NOT EXISTS "expiry_warning_sent_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "expiry_notification_sent_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "is_expired" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "original_mime_type" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "original_file_size" INTEGER,
      ADD COLUMN IF NOT EXISTS "compressed_file_path" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "compression_ratio" FLOAT
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_documents"
      ADD COLUMN IF NOT EXISTS "expiry_warning_sent_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "expiry_notification_sent_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "is_expired" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "original_mime_type" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "original_file_size" INTEGER,
      ADD COLUMN IF NOT EXISTS "compressed_file_path" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "compression_ratio" FLOAT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "supplier_documents"
      DROP COLUMN IF EXISTS "compression_ratio",
      DROP COLUMN IF EXISTS "compressed_file_path",
      DROP COLUMN IF EXISTS "original_file_size",
      DROP COLUMN IF EXISTS "original_mime_type",
      DROP COLUMN IF EXISTS "is_expired",
      DROP COLUMN IF EXISTS "expiry_notification_sent_at",
      DROP COLUMN IF EXISTS "expiry_warning_sent_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_documents"
      DROP COLUMN IF EXISTS "compression_ratio",
      DROP COLUMN IF EXISTS "compressed_file_path",
      DROP COLUMN IF EXISTS "original_file_size",
      DROP COLUMN IF EXISTS "original_mime_type",
      DROP COLUMN IF EXISTS "is_expired",
      DROP COLUMN IF EXISTS "expiry_notification_sent_at",
      DROP COLUMN IF EXISTS "expiry_warning_sent_at"
    `);
  }
}
