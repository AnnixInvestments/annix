import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockControlSupplier1801100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'stock_control_companies'
      ) AS "exists"
    `);

    if (!tableExists[0]?.exists) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_control_supplier" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "name" varchar(255) NOT NULL,
        "vat_number" varchar(50),
        "registration_number" varchar(50),
        "address" text,
        "contact_person" varchar(255),
        "phone" varchar(50),
        "email" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_stock_control_supplier_company"
          FOREIGN KEY ("company_id") REFERENCES "stock_control_companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_stock_control_supplier_company_name"
        ON "stock_control_supplier" ("company_id", LOWER("name"))
    `);

    const deliveryNotesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'delivery_notes'
      ) AS "exists"
    `);

    if (deliveryNotesExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE "delivery_notes"
          ADD COLUMN IF NOT EXISTS "supplier_id" integer
      `);

      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "delivery_notes"
            ADD CONSTRAINT "fk_delivery_notes_supplier"
            FOREIGN KEY ("supplier_id") REFERENCES "stock_control_supplier"("id") ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
    }

    const supplierInvoicesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'supplier_invoices'
      ) AS "exists"
    `);

    if (supplierInvoicesExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE "supplier_invoices"
          ADD COLUMN IF NOT EXISTS "supplier_id" integer
      `);

      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "supplier_invoices"
            ADD CONSTRAINT "fk_supplier_invoices_supplier"
            FOREIGN KEY ("supplier_id") REFERENCES "stock_control_supplier"("id") ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "supplier_invoices" DROP COLUMN IF EXISTS "supplier_id"`);
    await queryRunner.query(`ALTER TABLE "delivery_notes" DROP COLUMN IF EXISTS "supplier_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_control_supplier"`);
  }
}
