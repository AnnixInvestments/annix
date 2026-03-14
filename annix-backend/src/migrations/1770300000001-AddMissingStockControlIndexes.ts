import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingStockControlIndexes1770300000001 implements MigrationInterface {
  name = "AddMissingStockControlIndexes1770300000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_delivery_note_items_company_id" ON "delivery_note_items" ("company_id")`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'supplier_invoices' AND column_name = 'supplier_id'
        ) THEN
          CREATE INDEX IF NOT EXISTS "IDX_supplier_invoices_supplier_id" ON "supplier_invoices" ("supplier_id");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_supplier_invoices_supplier_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delivery_note_items_company_id"`);
  }
}
