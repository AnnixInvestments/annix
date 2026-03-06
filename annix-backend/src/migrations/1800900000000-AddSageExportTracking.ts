import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSageExportTracking1800900000000 implements MigrationInterface {
  name = "AddSageExportTracking1800900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS exported_to_sage_at TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoices DROP COLUMN IF EXISTS exported_to_sage_at
    `);
  }
}
