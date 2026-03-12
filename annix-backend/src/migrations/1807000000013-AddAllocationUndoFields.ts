import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAllocationUndoFields1807000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS undone BOOLEAN NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS undone_at TIMESTAMP NULL
    `);
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS undone_by_name VARCHAR NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS undone_by_name");
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS undone_at");
    await queryRunner.query("ALTER TABLE stock_allocations DROP COLUMN IF EXISTS undone");
  }
}
