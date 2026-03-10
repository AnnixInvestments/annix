import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSageOAuthTokenColumns1805000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE sage_connections ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA;
        ALTER TABLE sage_connections ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA;
        ALTER TABLE sage_connections ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;
        ALTER TABLE sage_connections ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sage_connections DROP COLUMN IF EXISTS access_token_encrypted;
      ALTER TABLE sage_connections DROP COLUMN IF EXISTS refresh_token_encrypted;
      ALTER TABLE sage_connections DROP COLUMN IF EXISTS token_expires_at;
      ALTER TABLE sage_connections DROP COLUMN IF EXISTS refresh_token_expires_at;
    `);
  }
}
