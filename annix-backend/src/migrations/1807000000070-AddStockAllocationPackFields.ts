import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockAllocationPackFields1807000000070 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS pack_count INTEGER NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS litres_per_pack DECIMAL(10,2) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS total_litres DECIMAL(10,2) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS allocation_type VARCHAR(20) DEFAULT 'allocation'
    `);

    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS issued_by_name VARCHAR(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS source_leftover_item_id INTEGER NULL
      REFERENCES stock_items(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE stock_allocations DROP COLUMN IF EXISTS source_leftover_item_id",
    );
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS issued_by_name");
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS issued_at");
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS allocation_type");
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS total_litres");
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS litres_per_pack");
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS pack_count");
  }
}
