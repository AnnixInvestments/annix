import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRubberCocSystem1799600000000 implements MigrationInterface {
  name = "CreateRubberCocSystem1799600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "supplier_coc_type_enum" AS ENUM ('COMPOUNDER', 'CALENDARER')
    `);

    await queryRunner.query(`
      CREATE TYPE "coc_processing_status_enum" AS ENUM ('PENDING', 'EXTRACTED', 'NEEDS_REVIEW', 'APPROVED')
    `);

    await queryRunner.query(`
      CREATE TYPE "batch_pass_fail_status_enum" AS ENUM ('PASS', 'FAIL')
    `);

    await queryRunner.query(`
      CREATE TYPE "delivery_note_type_enum" AS ENUM ('COMPOUND', 'ROLL')
    `);

    await queryRunner.query(`
      CREATE TYPE "delivery_note_status_enum" AS ENUM ('PENDING', 'LINKED', 'STOCK_CREATED')
    `);

    await queryRunner.query(`
      CREATE TYPE "roll_stock_status_enum" AS ENUM ('IN_STOCK', 'RESERVED', 'SOLD', 'SCRAPPED')
    `);

    await queryRunner.query(`
      CREATE TYPE "au_coc_status_enum" AS ENUM ('DRAFT', 'GENERATED', 'SENT')
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_supplier_cocs" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "coc_type" "supplier_coc_type_enum" NOT NULL,
        "supplier_company_id" integer NOT NULL,
        "document_path" character varying(500) NOT NULL,
        "graph_pdf_path" character varying(500),
        "coc_number" character varying(100),
        "production_date" date,
        "compound_code" character varying(100),
        "order_number" character varying(100),
        "ticket_number" character varying(100),
        "processing_status" "coc_processing_status_enum" NOT NULL DEFAULT 'PENDING',
        "extracted_data" jsonb,
        "created_by" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_supplier_cocs_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "PK_rubber_supplier_cocs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_supplier_cocs_company" FOREIGN KEY ("supplier_company_id") REFERENCES "rubber_company"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_compound_batches" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "supplier_coc_id" integer NOT NULL,
        "batch_number" character varying(100) NOT NULL,
        "compound_stock_id" integer,
        "shore_a_hardness" decimal(5,1),
        "specific_gravity" decimal(5,3),
        "rebound_percent" decimal(5,1),
        "tear_strength_kn_m" decimal(6,1),
        "tensile_strength_mpa" decimal(6,2),
        "elongation_percent" decimal(6,1),
        "rheometer_s_min" decimal(6,2),
        "rheometer_s_max" decimal(6,2),
        "rheometer_ts2" decimal(6,2),
        "rheometer_tc90" decimal(6,2),
        "pass_fail_status" "batch_pass_fail_status_enum",
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_compound_batches_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "PK_rubber_compound_batches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_compound_batches_coc" FOREIGN KEY ("supplier_coc_id") REFERENCES "rubber_supplier_cocs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rubber_compound_batches_stock" FOREIGN KEY ("compound_stock_id") REFERENCES "rubber_compound_stock"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_delivery_notes" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "delivery_note_type" "delivery_note_type_enum" NOT NULL,
        "delivery_note_number" character varying(100) NOT NULL,
        "delivery_date" date,
        "supplier_company_id" integer NOT NULL,
        "document_path" character varying(500),
        "status" "delivery_note_status_enum" NOT NULL DEFAULT 'PENDING',
        "linked_coc_id" integer,
        "extracted_data" jsonb,
        "created_by" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_delivery_notes_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "PK_rubber_delivery_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_delivery_notes_company" FOREIGN KEY ("supplier_company_id") REFERENCES "rubber_company"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_rubber_delivery_notes_coc" FOREIGN KEY ("linked_coc_id") REFERENCES "rubber_supplier_cocs"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_delivery_note_items" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "delivery_note_id" integer NOT NULL,
        "batch_number_start" character varying(100),
        "batch_number_end" character varying(100),
        "weight_kg" decimal(12,3),
        "roll_number" character varying(100),
        "roll_weight_kg" decimal(12,3),
        "width_mm" decimal(8,2),
        "thickness_mm" decimal(6,2),
        "length_m" decimal(10,2),
        "linked_batch_ids" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_delivery_note_items_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "PK_rubber_delivery_note_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_delivery_note_items_dn" FOREIGN KEY ("delivery_note_id") REFERENCES "rubber_delivery_notes"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_roll_stock" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "roll_number" character varying(100) NOT NULL,
        "compound_coding_id" integer,
        "weight_kg" decimal(12,3) NOT NULL,
        "width_mm" decimal(8,2),
        "thickness_mm" decimal(6,2),
        "length_m" decimal(10,2),
        "status" "roll_stock_status_enum" NOT NULL DEFAULT 'IN_STOCK',
        "linked_batch_ids" jsonb NOT NULL DEFAULT '[]',
        "delivery_note_item_id" integer,
        "sold_to_company_id" integer,
        "au_coc_id" integer,
        "reserved_by" character varying(100),
        "reserved_at" TIMESTAMP,
        "sold_at" TIMESTAMP,
        "location" character varying(100),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_roll_stock_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "UQ_rubber_roll_stock_roll_number" UNIQUE ("roll_number"),
        CONSTRAINT "PK_rubber_roll_stock" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_roll_stock_coding" FOREIGN KEY ("compound_coding_id") REFERENCES "rubber_product_coding"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_rubber_roll_stock_sold_to" FOREIGN KEY ("sold_to_company_id") REFERENCES "rubber_company"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_au_cocs" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "coc_number" character varying(100) NOT NULL,
        "customer_company_id" integer NOT NULL,
        "po_number" character varying(100),
        "delivery_note_ref" character varying(100),
        "status" "au_coc_status_enum" NOT NULL DEFAULT 'DRAFT',
        "generated_pdf_path" character varying(500),
        "sent_to_email" character varying(200),
        "sent_at" TIMESTAMP,
        "created_by" character varying(100),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_au_cocs_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "UQ_rubber_au_cocs_coc_number" UNIQUE ("coc_number"),
        CONSTRAINT "PK_rubber_au_cocs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_au_cocs_customer" FOREIGN KEY ("customer_company_id") REFERENCES "rubber_company"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_au_coc_items" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(100) NOT NULL,
        "au_coc_id" integer NOT NULL,
        "roll_stock_id" integer NOT NULL,
        "test_data_summary" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_au_coc_items_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "PK_rubber_au_coc_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_au_coc_items_coc" FOREIGN KEY ("au_coc_id") REFERENCES "rubber_au_cocs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rubber_au_coc_items_roll" FOREIGN KEY ("roll_stock_id") REFERENCES "rubber_roll_stock"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "rubber_roll_stock"
      ADD CONSTRAINT "FK_rubber_roll_stock_au_coc"
      FOREIGN KEY ("au_coc_id") REFERENCES "rubber_au_cocs"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TYPE "rubber_compound_movement_reference_type_enum" ADD VALUE IF NOT EXISTS 'COC_RECEIPT'
    `);

    await queryRunner.query(`
      ALTER TYPE "rubber_compound_movement_reference_type_enum" ADD VALUE IF NOT EXISTS 'CALENDARING'
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_supplier_cocs_company" ON "rubber_supplier_cocs" ("supplier_company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_supplier_cocs_status" ON "rubber_supplier_cocs" ("processing_status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_compound_batches_coc" ON "rubber_compound_batches" ("supplier_coc_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_compound_batches_batch" ON "rubber_compound_batches" ("batch_number")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_delivery_notes_company" ON "rubber_delivery_notes" ("supplier_company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_delivery_notes_status" ON "rubber_delivery_notes" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_roll_stock_status" ON "rubber_roll_stock" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_roll_stock_coding" ON "rubber_roll_stock" ("compound_coding_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_au_cocs_customer" ON "rubber_au_cocs" ("customer_company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_au_cocs_status" ON "rubber_au_cocs" ("status")
    `);

    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS "rubber_au_coc_number_seq" START 1
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_stock_locations" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" text,
        "display_order" integer NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_stock_locations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "rubber_compound_stock" ADD COLUMN IF NOT EXISTS "location_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "rubber_compound_stock"
      ADD CONSTRAINT "FK_rubber_compound_stock_location"
      FOREIGN KEY ("location_id") REFERENCES "rubber_stock_locations"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "rubber_roll_stock" ADD COLUMN IF NOT EXISTS "location_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "rubber_roll_stock"
      ADD CONSTRAINT "FK_rubber_roll_stock_location"
      FOREIGN KEY ("location_id") REFERENCES "rubber_stock_locations"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TYPE "requisition_status_enum" AS ENUM ('PENDING', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TYPE "requisition_source_type_enum" AS ENUM ('LOW_STOCK', 'MANUAL', 'EXTERNAL_PO')
    `);

    await queryRunner.query(`
      CREATE TYPE "requisition_item_type_enum" AS ENUM ('COMPOUND', 'ROLL')
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_purchase_requisitions" (
        "id" SERIAL NOT NULL,
        "firebase_uid" character varying(36) NOT NULL,
        "requisition_number" character varying(50) NOT NULL,
        "source_type" "requisition_source_type_enum" NOT NULL DEFAULT 'MANUAL',
        "status" "requisition_status_enum" NOT NULL DEFAULT 'PENDING',
        "supplier_company_id" integer,
        "external_po_number" character varying(100),
        "external_po_document_path" text,
        "expected_delivery_date" date,
        "notes" text,
        "created_by" character varying(255),
        "approved_by" character varying(255),
        "approved_at" TIMESTAMP,
        "rejection_reason" text,
        "rejected_by" character varying(255),
        "rejected_at" TIMESTAMP,
        "ordered_at" TIMESTAMP,
        "received_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rubber_purchase_requisitions_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "UQ_rubber_purchase_requisitions_number" UNIQUE ("requisition_number"),
        CONSTRAINT "PK_rubber_purchase_requisitions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_purchase_requisitions_supplier" FOREIGN KEY ("supplier_company_id") REFERENCES "rubber_company"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rubber_purchase_requisition_items" (
        "id" SERIAL NOT NULL,
        "requisition_id" integer NOT NULL,
        "item_type" "requisition_item_type_enum" NOT NULL,
        "compound_stock_id" integer,
        "compound_coding_id" integer,
        "compound_name" character varying(255),
        "quantity_kg" decimal(10,2) NOT NULL,
        "quantity_received_kg" decimal(10,2) NOT NULL DEFAULT 0,
        "unit_price" decimal(10,2),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubber_purchase_requisition_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rubber_purchase_requisition_items_req" FOREIGN KEY ("requisition_id") REFERENCES "rubber_purchase_requisitions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_purchase_requisitions_status" ON "rubber_purchase_requisitions" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_purchase_requisitions_source" ON "rubber_purchase_requisitions" ("source_type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rubber_stock_locations_active" ON "rubber_stock_locations" ("active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_stock_locations_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_purchase_requisitions_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_purchase_requisitions_status"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_purchase_requisition_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_purchase_requisitions"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "requisition_item_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "requisition_source_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "requisition_status_enum"`);

    await queryRunner.query(
      `ALTER TABLE "rubber_roll_stock" DROP CONSTRAINT IF EXISTS "FK_rubber_roll_stock_location"`,
    );
    await queryRunner.query(`ALTER TABLE "rubber_roll_stock" DROP COLUMN IF EXISTS "location_id"`);

    await queryRunner.query(
      `ALTER TABLE "rubber_compound_stock" DROP CONSTRAINT IF EXISTS "FK_rubber_compound_stock_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rubber_compound_stock" DROP COLUMN IF EXISTS "location_id"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_stock_locations"`);

    await queryRunner.query(`DROP SEQUENCE IF EXISTS "rubber_au_coc_number_seq"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_au_cocs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_au_cocs_customer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_roll_stock_coding"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_roll_stock_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_delivery_notes_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_delivery_notes_company"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_batches_batch"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_batches_coc"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_supplier_cocs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_supplier_cocs_company"`);

    await queryRunner.query(
      `ALTER TABLE "rubber_roll_stock" DROP CONSTRAINT IF EXISTS "FK_rubber_roll_stock_au_coc"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_au_coc_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_au_cocs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_roll_stock"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_delivery_note_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_delivery_notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_compound_batches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_supplier_cocs"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "au_coc_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "roll_stock_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_note_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_note_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "batch_pass_fail_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "coc_processing_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "supplier_coc_type_enum"`);
  }
}
