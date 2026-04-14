import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRollNumbersToSupplierInvoiceItems1819500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoice_items
      ADD COLUMN IF NOT EXISTS roll_numbers jsonb DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoice_items
      DROP COLUMN IF EXISTS roll_numbers
    `);
  }
}
