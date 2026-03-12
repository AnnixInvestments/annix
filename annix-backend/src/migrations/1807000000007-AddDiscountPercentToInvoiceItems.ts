import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscountPercentToInvoiceItems1807000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "supplier_invoice_items"
      ADD COLUMN IF NOT EXISTS "discount_percent" numeric(5,2) DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "supplier_invoice_items"
      DROP COLUMN IF EXISTS "discount_percent"
    `);
  }
}
