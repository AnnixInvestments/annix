import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePushSubscriptions1801600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES stock_control_users(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        key_p256dh TEXT NOT NULL,
        key_auth TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
      ON push_subscriptions (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS push_subscriptions");
  }
}
