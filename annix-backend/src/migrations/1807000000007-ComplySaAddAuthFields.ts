import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaAddAuthFields1807000000007 implements MigrationInterface {
  name = "ComplySaAddAuthFields1807000000007";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'comply_sa_users' AND column_name = 'email_verified'
        ) THEN
          ALTER TABLE comply_sa_users
            ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'comply_sa_users' AND column_name = 'email_verification_token'
        ) THEN
          ALTER TABLE comply_sa_users
            ADD COLUMN email_verification_token VARCHAR(100) NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'comply_sa_users' AND column_name = 'password_reset_token'
        ) THEN
          ALTER TABLE comply_sa_users
            ADD COLUMN password_reset_token VARCHAR(100) NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'comply_sa_users' AND column_name = 'password_reset_expires_at'
        ) THEN
          ALTER TABLE comply_sa_users
            ADD COLUMN password_reset_expires_at VARCHAR(50) NULL;
        END IF;
      END $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE comply_sa_users
        DROP COLUMN IF EXISTS email_verified,
        DROP COLUMN IF EXISTS email_verification_token,
        DROP COLUMN IF EXISTS password_reset_token,
        DROP COLUMN IF EXISTS password_reset_expires_at
    `);
  }
}
