import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockControlRbacConfig1800400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_rbac_config (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        nav_key VARCHAR(50) NOT NULL,
        role VARCHAR(30) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (company_id, nav_key, role)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_control_rbac_config_company
      ON stock_control_rbac_config (company_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS stock_control_rbac_config");
  }
}
