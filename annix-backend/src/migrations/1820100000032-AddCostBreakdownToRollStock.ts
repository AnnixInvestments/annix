import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCostBreakdownToRollStock1820100000032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      ADD COLUMN IF NOT EXISTS toll_cost_r DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS compound_cost_r DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS total_cost_r DECIMAL(12, 2)
    `);
    await queryRunner.query(`
      UPDATE rubber_roll_stock
      SET toll_cost_r = cost_zar,
          total_cost_r = cost_zar
      WHERE toll_cost_r IS NULL
        AND cost_zar IS NOT NULL
    `);
  }

  public async down(): Promise<void> {}
}
