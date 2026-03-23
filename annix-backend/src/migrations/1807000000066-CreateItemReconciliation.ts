import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateItemReconciliation1807000000066 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reconciliation_documents" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "job_card_id" integer NOT NULL,
        "document_category" varchar(50) NOT NULL,
        "file_path" text NOT NULL,
        "original_filename" varchar(255) NOT NULL,
        "mime_type" varchar(100),
        "file_size_bytes" integer,
        "uploaded_by_id" integer,
        "uploaded_by_name" varchar(255),
        "extraction_status" varchar(20) NOT NULL DEFAULT 'pending',
        "extracted_items" jsonb,
        "extraction_error" text,
        "extracted_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_recon_doc_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_recon_docs_job_card"
        ON "reconciliation_documents" ("job_card_id", "company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reconciliation_items" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "job_card_id" integer NOT NULL,
        "item_description" text NOT NULL,
        "item_code" varchar(500),
        "source_document_id" integer,
        "source_type" varchar(20) NOT NULL,
        "quantity_ordered" numeric(12,2) NOT NULL,
        "quantity_released" numeric(12,2) NOT NULL DEFAULT 0,
        "quantity_shipped" numeric(12,2) NOT NULL DEFAULT 0,
        "quantity_mps" numeric(12,2) NOT NULL DEFAULT 0,
        "reconciliation_status" varchar(20) NOT NULL DEFAULT 'pending',
        "notes" text,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_recon_item_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_recon_item_doc" FOREIGN KEY ("source_document_id")
          REFERENCES "reconciliation_documents"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_recon_items_job_card"
        ON "reconciliation_items" ("job_card_id", "company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reconciliation_events" (
        "id" SERIAL PRIMARY KEY,
        "reconciliation_item_id" integer NOT NULL,
        "company_id" integer NOT NULL,
        "event_type" varchar(30) NOT NULL,
        "quantity" numeric(12,2) NOT NULL,
        "reference_number" varchar(255),
        "performed_by_name" varchar(255) NOT NULL,
        "performed_by_id" integer,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_recon_event_item" FOREIGN KEY ("reconciliation_item_id")
          REFERENCES "reconciliation_items"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "workflow_step_configs" ("company_id", "key", "label", "sort_order", "is_system", "is_background", "trigger_after_step", "action_label", "branch_color")
      SELECT c.id, 'upload_source_documents', 'Upload Docs', 4, true, true, 'admin_approval', 'Docs Uploaded', null
      FROM "stock_control_companies" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "workflow_step_configs" wsc
        WHERE wsc.company_id = c.id AND wsc.key = 'upload_source_documents'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "workflow_step_configs" WHERE "key" = 'upload_source_documents'`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "reconciliation_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reconciliation_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reconciliation_documents"`);
  }
}
