import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourceRollNumber1814000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS source_roll_number VARCHAR(100);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items DROP COLUMN IF EXISTS source_roll_number;
    `);
  }
}
