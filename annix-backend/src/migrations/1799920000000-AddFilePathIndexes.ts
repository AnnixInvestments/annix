import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFilePathIndexes1799920000000 implements MigrationInterface {
  name = "AddFilePathIndexes1799920000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_documents_file_path"
      ON "customer_documents" ("file_path")
      WHERE "file_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_supplier_documents_file_path"
      ON "supplier_documents" ("file_path")
      WHERE "file_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rfq_documents_file_path"
      ON "rfq_documents" ("file_path")
      WHERE "file_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_drawings_file_path"
      ON "drawings" ("file_path")
      WHERE "file_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_drawing_versions_file_path"
      ON "drawing_versions" ("file_path")
      WHERE "file_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_meeting_recordings_storage_path"
      ON "meeting_recordings" ("storage_path")
      WHERE "storage_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_candidates_cv_file_path"
      ON "candidates" ("cv_file_path")
      WHERE "cv_file_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rubber_supplier_cocs_document_path"
      ON "rubber_supplier_cocs" ("document_path")
      WHERE "document_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rubber_delivery_notes_document_path"
      ON "rubber_delivery_notes" ("document_path")
      WHERE "document_path" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_secure_documents_file_path"
      ON "secure_documents" ("file_path")
      WHERE "file_path" IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sc_job_card_documents') THEN
          CREATE INDEX IF NOT EXISTS "IDX_sc_job_card_documents_file_path"
          ON "sc_job_card_documents" ("file_path")
          WHERE "file_path" IS NOT NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sc_invoices') THEN
          CREATE INDEX IF NOT EXISTS "IDX_sc_invoices_file_path"
          ON "sc_invoices" ("file_path")
          WHERE "file_path" IS NOT NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sc_delivery_documents') THEN
          CREATE INDEX IF NOT EXISTS "IDX_sc_delivery_documents_file_path"
          ON "sc_delivery_documents" ("file_path")
          WHERE "file_path" IS NOT NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sc_inventory_items') THEN
          CREATE INDEX IF NOT EXISTS "IDX_sc_inventory_items_image_path"
          ON "sc_inventory_items" ("image_path")
          WHERE "image_path" IS NOT NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sc_signatures') THEN
          CREATE INDEX IF NOT EXISTS "IDX_sc_signatures_file_path"
          ON "sc_signatures" ("file_path")
          WHERE "file_path" IS NOT NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sc_staff') THEN
          CREATE INDEX IF NOT EXISTS "IDX_sc_staff_photo_path"
          ON "sc_staff" ("photo_path")
          WHERE "photo_path" IS NOT NULL;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_documents_file_path"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_supplier_documents_file_path"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfq_documents_file_path"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_drawings_file_path"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_drawing_versions_file_path"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_meeting_recordings_storage_path"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_candidates_cv_file_path"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rubber_supplier_cocs_document_path"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rubber_delivery_notes_document_path"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_secure_documents_file_path"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_sc_job_card_documents_file_path"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sc_invoices_file_path"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_sc_delivery_documents_file_path"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_sc_inventory_items_image_path"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sc_signatures_file_path"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sc_staff_photo_path"`);
  }
}
