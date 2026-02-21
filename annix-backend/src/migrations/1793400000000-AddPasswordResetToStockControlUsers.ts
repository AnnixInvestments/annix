import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetToStockControlUsers1793400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_control_users" ADD COLUMN IF NOT EXISTS "reset_password_token" VARCHAR(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_control_users" ADD COLUMN IF NOT EXISTS "reset_password_expires" TIMESTAMPTZ`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_control_users" DROP COLUMN IF EXISTS "reset_password_expires"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_control_users" DROP COLUMN IF EXISTS "reset_password_token"`,
    );
  }
}
