import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockReturns1807000000071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_returns (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        allocation_id INTEGER NOT NULL REFERENCES stock_allocations(id) ON DELETE CASCADE,
        original_stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
        leftover_stock_item_id INTEGER NULL REFERENCES stock_items(id) ON DELETE SET NULL,
        litres_returned DECIMAL(10,2) NOT NULL,
        cost_reduction DECIMAL(12,2) NOT NULL,
        returned_by_name VARCHAR(255) NULL,
        returned_by_staff_id INTEGER NULL REFERENCES staff_members(id) ON DELETE SET NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_returns_job_card
      ON stock_returns (company_id, job_card_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_stock_returns_job_card");
    await queryRunner.query("DROP TABLE IF EXISTS stock_returns");
  }
}
