import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeInvoiceItemQuantityToNumeric1807000000057 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoice_items
      ALTER COLUMN quantity TYPE numeric(12, 2) USING quantity::numeric(12, 2)
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_invoice_items
      ALTER COLUMN quantity SET DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoice_items
      ALTER COLUMN quantity TYPE integer USING ROUND(quantity)::integer
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_invoice_items
      ALTER COLUMN quantity SET DEFAULT 1
    `);
  }
}
