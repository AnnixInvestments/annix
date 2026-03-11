import { type MigrationInterface, type QueryRunner } from "typeorm";

export class DefaultQcEnabledTrue1805500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE stock_control_companies SET qc_enabled = true WHERE qc_enabled = false
    `);
    await queryRunner.query(`
      ALTER TABLE stock_control_companies ALTER COLUMN qc_enabled SET DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies ALTER COLUMN qc_enabled SET DEFAULT false
    `);
  }
}
