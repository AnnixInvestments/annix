import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberEntityIndexes1807000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_supplier_cocs_supplier_company_id" ON "rubber_supplier_cocs" ("supplier_company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_supplier_cocs_coc_type" ON "rubber_supplier_cocs" ("coc_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_supplier_cocs_processing_status" ON "rubber_supplier_cocs" ("processing_status")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_delivery_notes_supplier_company_id" ON "rubber_delivery_notes" ("supplier_company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_delivery_notes_delivery_note_type" ON "rubber_delivery_notes" ("delivery_note_type")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_compound_batches_supplier_coc_id" ON "rubber_compound_batches" ("supplier_coc_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_compound_stock_compound_coding_id" ON "rubber_compound_stock" ("compound_coding_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_purchase_requisitions_supplier_company_id" ON "rubber_purchase_requisitions" ("supplier_company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_purchase_requisitions_status" ON "rubber_purchase_requisitions" ("status")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_tax_invoices_company_id" ON "rubber_tax_invoices" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_tax_invoices_invoice_type" ON "rubber_tax_invoices" ("invoice_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rubber_tax_invoices_status" ON "rubber_tax_invoices" ("status")`,
    );

    const tableExists = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rubber_other_stock')`,
    );
    if (tableExists[0]?.exists) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_rubber_other_stock_location_id" ON "rubber_other_stock" ("location_id")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_supplier_cocs_supplier_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_supplier_cocs_coc_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_supplier_cocs_processing_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_delivery_notes_supplier_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_delivery_notes_delivery_note_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_batches_supplier_coc_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_compound_stock_compound_coding_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rubber_purchase_requisitions_supplier_company_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_purchase_requisitions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_tax_invoices_company_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_tax_invoices_invoice_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_tax_invoices_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rubber_other_stock_location_id"`);
  }
}
