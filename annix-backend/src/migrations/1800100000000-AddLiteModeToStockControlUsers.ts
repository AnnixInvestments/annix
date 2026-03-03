import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLiteModeToStockControlUsers1800100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_users
      ADD COLUMN IF NOT EXISTS lite_mode BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await queryRunner.query(`
      ALTER TABLE stock_control_invitations
      ADD COLUMN IF NOT EXISTS lite_mode BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_invitations
      DROP COLUMN IF EXISTS lite_mode
    `);

    await queryRunner.query(`
      ALTER TABLE stock_control_users
      DROP COLUMN IF EXISTS lite_mode
    `);
  }
}
