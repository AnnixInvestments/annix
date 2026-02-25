import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStaffMembersTable1798000000000 implements MigrationInterface {
  name = "CreateStaffMembersTable1798000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_staff_members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        employee_number VARCHAR(100),
        department VARCHAR(255),
        photo_url TEXT,
        qr_token UUID NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_staff_members_company_id ON stock_control_staff_members(company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_staff_members_qr_token ON stock_control_staff_members(qr_token)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_staff_members_employee_number_company
        ON stock_control_staff_members(employee_number, company_id)
        WHERE employee_number IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_allocations
        ADD COLUMN staff_member_id INTEGER
        REFERENCES stock_control_staff_members(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE stock_allocations DROP COLUMN IF EXISTS staff_member_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_members_employee_number_company`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_members_qr_token`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_members_company_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_control_staff_members`);
  }
}
