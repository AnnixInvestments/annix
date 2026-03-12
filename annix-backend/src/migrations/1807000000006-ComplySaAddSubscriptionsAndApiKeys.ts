import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaAddSubscriptionsAndApiKeys1807000000006 implements MigrationInterface {
  name = "ComplySaAddSubscriptionsAndApiKeys1807000000006";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_subscriptions (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES comply_sa_companies(id) ON DELETE CASCADE,
        tier VARCHAR(20) NOT NULL DEFAULT 'free',
        status VARCHAR(20) NOT NULL DEFAULT 'trial',
        trial_ends_at VARCHAR(50),
        current_period_start VARCHAR(50),
        current_period_end VARCHAR(50),
        paystack_customer_id VARCHAR(100),
        paystack_subscription_code VARCHAR(100),
        cancelled_at VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(company_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_api_keys (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES comply_sa_companies(id) ON DELETE CASCADE,
        key_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        last_used_at VARCHAR(50),
        expires_at VARCHAR(50),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comply_sa_api_keys_key_hash ON comply_sa_api_keys (key_hash)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS comply_sa_api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS comply_sa_subscriptions`);
  }
}
