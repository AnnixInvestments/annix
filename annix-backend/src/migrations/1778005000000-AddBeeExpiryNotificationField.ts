import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBeeExpiryNotificationField1778005000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_companies
      ADD COLUMN IF NOT EXISTS bee_expiry_notification_sent_at TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_companies
      DROP COLUMN IF EXISTS bee_expiry_notification_sent_at
    `);
  }
}
