import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationEmails1802200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies
      ADD COLUMN IF NOT EXISTS notification_emails jsonb DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies
      DROP COLUMN IF EXISTS notification_emails
    `);
  }
}
