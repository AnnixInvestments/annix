import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserNotificationPreferences1811300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_users
      ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE stock_control_users
      ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_users
      DROP COLUMN IF EXISTS push_notifications_enabled
    `);
    await queryRunner.query(`
      ALTER TABLE stock_control_users
      DROP COLUMN IF EXISTS email_notifications_enabled
    `);
  }
}
