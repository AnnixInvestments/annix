import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWidgetOrderToPreferences1809000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dashboard_preferences
      ADD COLUMN IF NOT EXISTS widget_order jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dashboard_preferences
      DROP COLUMN IF EXISTS widget_order
    `);
  }
}
