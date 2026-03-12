import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockControlCompanyRoles1805910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_company_roles (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        key VARCHAR(30) NOT NULL,
        label VARCHAR(50) NOT NULL,
        is_system BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(company_id, key)
      )
    `);

    await queryRunner.query(`
      INSERT INTO stock_control_company_roles (company_id, key, label, is_system, sort_order)
      SELECT c.id, r.key, r.label, true, r.sort_order
      FROM stock_control_companies c
      CROSS JOIN (VALUES
        ('viewer',   'Viewer',   0),
        ('storeman', 'Storeman', 1),
        ('accounts', 'Accounts', 2),
        ('manager',  'Manager',  3),
        ('admin',    'Admin',    4)
      ) AS r(key, label, sort_order)
      ON CONFLICT (company_id, key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stock_control_company_roles`);
  }
}
