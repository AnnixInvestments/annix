import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationFields1803600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cv_assistant_users
      ADD COLUMN IF NOT EXISTS match_alert_threshold integer NOT NULL DEFAULT 80,
      ADD COLUMN IF NOT EXISTS digest_enabled boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE cv_assistant_candidates
      ADD COLUMN IF NOT EXISTS job_alerts_opt_in boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id integer NOT NULL REFERENCES cv_assistant_users(id) ON DELETE CASCADE,
        company_id integer NOT NULL REFERENCES cv_assistant_companies(id) ON DELETE CASCADE,
        endpoint text NOT NULL UNIQUE,
        key_p256dh text NOT NULL,
        key_auth text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_push_subs_user
      ON cv_assistant_push_subscriptions (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_push_subscriptions");
    await queryRunner.query(`
      ALTER TABLE cv_assistant_candidates
      DROP COLUMN IF EXISTS job_alerts_opt_in
    `);
    await queryRunner.query(`
      ALTER TABLE cv_assistant_users
      DROP COLUMN IF EXISTS match_alert_threshold,
      DROP COLUMN IF EXISTS digest_enabled,
      DROP COLUMN IF EXISTS push_enabled
    `);
  }
}
