import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringMeetingSupport1772000000000 implements MigrationInterface {
  name = "AddRecurringMeetingSupport1772000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE annix_rep_meetings
      ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
      ADD COLUMN recurrence_rule VARCHAR(500),
      ADD COLUMN recurring_parent_id INT REFERENCES annix_rep_meetings(id) ON DELETE SET NULL,
      ADD COLUMN recurrence_exception_dates TEXT
    `);

    await queryRunner.query(`
      CREATE INDEX idx_meetings_recurring_parent ON annix_rep_meetings(recurring_parent_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_meetings_is_recurring ON annix_rep_meetings(is_recurring) WHERE is_recurring = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_meetings_is_recurring");
    await queryRunner.query("DROP INDEX IF EXISTS idx_meetings_recurring_parent");
    await queryRunner.query(`
      ALTER TABLE annix_rep_meetings
      DROP COLUMN IF EXISTS recurrence_exception_dates,
      DROP COLUMN IF EXISTS recurring_parent_id,
      DROP COLUMN IF EXISTS recurrence_rule,
      DROP COLUMN IF EXISTS is_recurring
    `);
  }
}
