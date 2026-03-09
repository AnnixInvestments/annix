import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDashboardPreferences1803000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dashboard_preferences (
        id SERIAL PRIMARY KEY,
        user_id integer NOT NULL REFERENCES stock_control_users(id) ON DELETE CASCADE,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        pinned_widgets jsonb NOT NULL DEFAULT '[]',
        hidden_widgets jsonb NOT NULL DEFAULT '[]',
        view_override varchar(50),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_dashboard_preferences_user_id UNIQUE (user_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_company_id
        ON dashboard_preferences (company_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_dashboard_preferences_company_id");
    await queryRunner.query("DROP TABLE IF EXISTS dashboard_preferences");
  }
}
