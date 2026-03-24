import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStaffLeaveRecords1808000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS staff_leave_records (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES stock_control_users(id) ON DELETE CASCADE,
        leave_type VARCHAR(20) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        sick_note_url TEXT,
        sick_note_original_filename VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_leave_company_user_start
      ON staff_leave_records (company_id, user_id, start_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_leave_company_dates
      ON staff_leave_records (company_id, start_date, end_date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS staff_leave_records");
  }
}
