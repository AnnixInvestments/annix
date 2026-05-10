import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds last_invoice_reminder_at column to cpo_calloff_records so the daily
 * "stock-control:uninvoiced-arrivals" cron can re-notify managers/admins/accounts
 * about an overdue CPO at most once every 7 days, instead of every single morning
 * until invoiced.
 *
 * Idempotent — uses IF NOT EXISTS so re-running is safe.
 */
export class AddLastInvoiceReminderAtToCpoCalloffRecords1820100000073
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cpo_calloff_records
        ADD COLUMN IF NOT EXISTS last_invoice_reminder_at TIMESTAMP NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cpo_calloff_records DROP COLUMN IF EXISTS last_invoice_reminder_at;
    `);
  }
}
