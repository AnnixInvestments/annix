import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoatingLossFactors1801900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies
      ADD COLUMN IF NOT EXISTS piping_loss_factor_pct integer NOT NULL DEFAULT 45,
      ADD COLUMN IF NOT EXISTS flat_plate_loss_factor_pct integer NOT NULL DEFAULT 20,
      ADD COLUMN IF NOT EXISTS structural_steel_loss_factor_pct integer NOT NULL DEFAULT 30
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies
      DROP COLUMN IF EXISTS piping_loss_factor_pct,
      DROP COLUMN IF EXISTS flat_plate_loss_factor_pct,
      DROP COLUMN IF EXISTS structural_steel_loss_factor_pct
    `);
  }
}
