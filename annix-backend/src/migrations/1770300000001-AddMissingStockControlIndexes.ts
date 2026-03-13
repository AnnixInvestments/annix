import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingStockControlIndexes1770300000001 implements MigrationInterface {
  name = "AddMissingStockControlIndexes1770300000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_delivery_note_items_company_id" ON "delivery_note_items" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_supplier_invoices_supplier_id" ON "supplier_invoices" ("supplier_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_supplier_invoices_supplier_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delivery_note_items_company_id"`);
  }
}
