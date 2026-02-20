import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerificationToStockControlUsers1793100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_control_users"
      ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false,
      ADD COLUMN "email_verification_token" varchar(255),
      ADD COLUMN "email_verification_expires" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_control_users"
      DROP COLUMN "email_verification_expires",
      DROP COLUMN "email_verification_token",
      DROP COLUMN "email_verified"
    `);
  }
}
