import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAllocationApprovalFields1772178882591 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS allowed_litres DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS approved_by_manager_id INTEGER,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      DROP COLUMN IF EXISTS pending_approval,
      DROP COLUMN IF EXISTS allowed_litres,
      DROP COLUMN IF EXISTS approved_by_manager_id,
      DROP COLUMN IF EXISTS approved_at,
      DROP COLUMN IF EXISTS rejected_at,
      DROP COLUMN IF EXISTS rejection_reason
    `);
  }
}
