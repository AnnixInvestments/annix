import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExtendedJobCardFields1793700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_cards"
        ADD COLUMN "po_number" VARCHAR(100),
        ADD COLUMN "site_location" VARCHAR(255),
        ADD COLUMN "contact_person" VARCHAR(255),
        ADD COLUMN "due_date" VARCHAR(100),
        ADD COLUMN "notes" TEXT,
        ADD COLUMN "reference" VARCHAR(255),
        ADD COLUMN "custom_fields" JSONB
    `);

    await queryRunner.query(`
      CREATE TABLE "job_card_line_items" (
        "id" SERIAL PRIMARY KEY,
        "job_card_id" INTEGER NOT NULL,
        "item_code" VARCHAR(100),
        "item_description" TEXT,
        "item_no" VARCHAR(100),
        "quantity" NUMERIC(12,2),
        "jt_no" VARCHAR(100),
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "company_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_job_card_line_items_job_card" FOREIGN KEY ("job_card_id") REFERENCES "job_cards"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_job_card_line_items_company" FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_job_card_line_items_job_card_id" ON "job_card_line_items" ("job_card_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_job_card_line_items_company_id" ON "job_card_line_items" ("company_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "job_card_import_mappings"
        ADD COLUMN "mapping_config" JSONB
    `);

    await queryRunner.query(`
      UPDATE "job_card_import_mappings"
      SET "mapping_config" = jsonb_build_object(
        'jobNumber', jsonb_build_object('column', "job_number_column"::int, 'startRow', 1, 'endRow', 9999),
        'jobName', jsonb_build_object('column', "job_name_column"::int, 'startRow', 1, 'endRow', 9999),
        'customerName', CASE WHEN "customer_name_column" IS NOT NULL THEN jsonb_build_object('column', "customer_name_column"::int, 'startRow', 1, 'endRow', 9999) ELSE NULL END,
        'description', CASE WHEN "description_column" IS NOT NULL THEN jsonb_build_object('column', "description_column"::int, 'startRow', 1, 'endRow', 9999) ELSE NULL END,
        'poNumber', NULL::jsonb,
        'siteLocation', NULL::jsonb,
        'contactPerson', NULL::jsonb,
        'dueDate', NULL::jsonb,
        'notes', NULL::jsonb,
        'reference', NULL::jsonb,
        'customFields', '[]'::jsonb,
        'lineItems', jsonb_build_object(
          'itemCode', NULL::jsonb,
          'itemDescription', NULL::jsonb,
          'itemNo', NULL::jsonb,
          'quantity', NULL::jsonb,
          'jtNo', NULL::jsonb
        )
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "job_card_import_mappings" DROP COLUMN "job_number_column"`,
    );
    await queryRunner.query(`ALTER TABLE "job_card_import_mappings" DROP COLUMN "job_name_column"`);
    await queryRunner.query(
      `ALTER TABLE "job_card_import_mappings" DROP COLUMN "customer_name_column"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_card_import_mappings" DROP COLUMN "description_column"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_card_import_mappings"
        ADD COLUMN "job_number_column" VARCHAR(255),
        ADD COLUMN "job_name_column" VARCHAR(255),
        ADD COLUMN "customer_name_column" VARCHAR(255),
        ADD COLUMN "description_column" VARCHAR(255)
    `);

    await queryRunner.query(`
      UPDATE "job_card_import_mappings"
      SET
        "job_number_column" = ("mapping_config"->'jobNumber'->>'column'),
        "job_name_column" = ("mapping_config"->'jobName'->>'column'),
        "customer_name_column" = ("mapping_config"->'customerName'->>'column'),
        "description_column" = ("mapping_config"->'description'->>'column')
      WHERE "mapping_config" IS NOT NULL
    `);

    await queryRunner.query(`ALTER TABLE "job_card_import_mappings" DROP COLUMN "mapping_config"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_job_card_line_items_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_job_card_line_items_job_card_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_card_line_items"`);

    await queryRunner.query(`
      ALTER TABLE "job_cards"
        DROP COLUMN IF EXISTS "po_number",
        DROP COLUMN IF EXISTS "site_location",
        DROP COLUMN IF EXISTS "contact_person",
        DROP COLUMN IF EXISTS "due_date",
        DROP COLUMN IF EXISTS "notes",
        DROP COLUMN IF EXISTS "reference",
        DROP COLUMN IF EXISTS "custom_fields"
    `);
  }
}
