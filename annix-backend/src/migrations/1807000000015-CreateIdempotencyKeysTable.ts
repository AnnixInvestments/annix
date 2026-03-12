import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIdempotencyKeysTable1807000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL,
        request_method VARCHAR(10) NOT NULL,
        request_path VARCHAR(500) NOT NULL,
        response_status INTEGER NOT NULL,
        response_body JSONB NOT NULL,
        company_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_keys_key
      ON idempotency_keys(key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
      ON idempotency_keys(expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS idempotency_keys");
  }
}
