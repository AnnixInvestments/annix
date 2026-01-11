import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuoteColumnsToBoqSupplierAccess1768200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "boq_supplier_access"
      ADD COLUMN IF NOT EXISTS "quote_data" jsonb,
      ADD COLUMN IF NOT EXISTS "quote_saved_at" timestamp,
      ADD COLUMN IF NOT EXISTS "quote_submitted_at" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "boq_supplier_access"
      DROP COLUMN IF EXISTS "quote_data",
      DROP COLUMN IF EXISTS "quote_saved_at",
      DROP COLUMN IF EXISTS "quote_submitted_at"
    `);
  }
}
