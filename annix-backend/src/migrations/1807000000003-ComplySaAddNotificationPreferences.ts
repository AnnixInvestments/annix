import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaAddNotificationPreferences1807000000003 implements MigrationInterface {
  name = "ComplySaAddNotificationPreferences1807000000003";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        email_enabled BOOLEAN NOT NULL DEFAULT true,
        sms_enabled BOOLEAN NOT NULL DEFAULT false,
        whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
        in_app_enabled BOOLEAN NOT NULL DEFAULT true,
        weekly_digest BOOLEAN NOT NULL DEFAULT true,
        phone VARCHAR(20)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_notification_preferences");
  }
}
