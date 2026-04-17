import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthColumnsToUser1820100000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(500),
        ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        DROP COLUMN IF EXISTS reset_password_expires,
        DROP COLUMN IF EXISTS reset_password_token,
        DROP COLUMN IF EXISTS email_verification_expires,
        DROP COLUMN IF EXISTS email_verification_token,
        DROP COLUMN IF EXISTS email_verified,
        DROP COLUMN IF EXISTS password_hash
    `);
  }
}
