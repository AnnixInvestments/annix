import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNeedsQrPrintField1772200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS needs_qr_print BOOLEAN DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items
      DROP COLUMN IF EXISTS needs_qr_print
    `);
  }
}
