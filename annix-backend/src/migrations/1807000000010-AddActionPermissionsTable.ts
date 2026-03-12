import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActionPermissionsTable1807000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_action_permissions (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL,
        action_key VARCHAR(60) NOT NULL,
        role VARCHAR(30) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, action_key, role)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sc_action_perms_company
      ON stock_control_action_permissions(company_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS stock_control_action_permissions");
  }
}
