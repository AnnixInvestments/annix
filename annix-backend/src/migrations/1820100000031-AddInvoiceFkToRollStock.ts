import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceFkToRollStock1820100000031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      ADD COLUMN IF NOT EXISTS supplier_tax_invoice_id INT,
      ADD COLUMN IF NOT EXISTS supplier_tax_invoice_line_idx INT,
      ADD COLUMN IF NOT EXISTS customer_tax_invoice_id INT
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE rubber_roll_stock
          ADD CONSTRAINT rubber_roll_stock_supplier_tax_invoice_fk
          FOREIGN KEY (supplier_tax_invoice_id) REFERENCES rubber_tax_invoices(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE rubber_roll_stock
          ADD CONSTRAINT rubber_roll_stock_customer_tax_invoice_fk
          FOREIGN KEY (customer_tax_invoice_id) REFERENCES rubber_tax_invoices(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_roll_stock_supplier_invoice
        ON rubber_roll_stock (supplier_tax_invoice_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_roll_stock_customer_invoice
        ON rubber_roll_stock (customer_tax_invoice_id)
    `);
  }

  public async down(): Promise<void> {}
}
