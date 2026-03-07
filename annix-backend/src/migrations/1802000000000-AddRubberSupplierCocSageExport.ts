import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberSupplierCocSageExport1802000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_supplier_cocs
      ADD COLUMN IF NOT EXISTS exported_to_sage_at TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_supplier_cocs
      DROP COLUMN IF EXISTS exported_to_sage_at
    `);
  }
}
