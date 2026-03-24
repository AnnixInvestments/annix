import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockItemPackAndComponentFields1807000000069 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS pack_size_litres DECIMAL(10,2) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS component_group VARCHAR(100) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS component_role VARCHAR(50) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS mix_ratio VARCHAR(20) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS is_leftover BOOLEAN DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS source_job_card_id INTEGER NULL
      REFERENCES job_cards(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_items_component_group
      ON stock_items (company_id, component_group)
      WHERE component_group IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_items_leftover
      ON stock_items (company_id, is_leftover)
      WHERE is_leftover = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_stock_items_leftover");
    await queryRunner.query("DROP INDEX IF EXISTS idx_stock_items_component_group");
    await queryRunner.query("ALTER TABLE stock_items DROP COLUMN IF EXISTS source_job_card_id");
    await queryRunner.query("ALTER TABLE stock_items DROP COLUMN IF EXISTS is_leftover");
    await queryRunner.query("ALTER TABLE stock_items DROP COLUMN IF EXISTS mix_ratio");
    await queryRunner.query("ALTER TABLE stock_items DROP COLUMN IF EXISTS component_role");
    await queryRunner.query("ALTER TABLE stock_items DROP COLUMN IF EXISTS component_group");
    await queryRunner.query("ALTER TABLE stock_items DROP COLUMN IF EXISTS pack_size_litres");
  }
}
