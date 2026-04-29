import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberPaginationIndexes1820100000038 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_tax_invoices_created_at
      ON rubber_tax_invoices (created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_tax_invoices_invoice_date
      ON rubber_tax_invoices (invoice_date DESC NULLS LAST)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_delivery_notes_created_at
      ON rubber_delivery_notes (created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_delivery_notes_delivery_date
      ON rubber_delivery_notes (delivery_date DESC NULLS LAST)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_tax_invoices_created_at");
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_tax_invoices_invoice_date");
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_delivery_notes_created_at");
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_delivery_notes_delivery_date");
  }
}
