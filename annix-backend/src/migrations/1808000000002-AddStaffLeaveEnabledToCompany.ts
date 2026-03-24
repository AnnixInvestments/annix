import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStaffLeaveEnabledToCompany1808000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_control_companies'
          AND column_name = 'staff_leave_enabled'
        ) THEN
          ALTER TABLE stock_control_companies
          ADD COLUMN staff_leave_enabled BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies DROP COLUMN IF EXISTS staff_leave_enabled
    `);
  }
}
