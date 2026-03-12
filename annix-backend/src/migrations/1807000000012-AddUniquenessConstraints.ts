import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniquenessConstraints1807000000012
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_company_sku_unique
      ON stock_items(company_id, sku)
      WHERE sku IS NOT NULL AND sku != ''
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_requisitions_company_number_unique
      ON requisitions(company_id, requisition_number)
      WHERE requisition_number IS NOT NULL AND requisition_number != ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_stock_items_company_sku_unique",
    );
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_requisitions_company_number_unique",
    );
  }
}
