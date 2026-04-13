import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeAllocationQuantityToNumeric1819300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ALTER COLUMN quantity_used TYPE numeric(12, 2)
      USING quantity_used::numeric(12, 2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ALTER COLUMN quantity_used TYPE integer
      USING quantity_used::integer
    `);
  }
}
