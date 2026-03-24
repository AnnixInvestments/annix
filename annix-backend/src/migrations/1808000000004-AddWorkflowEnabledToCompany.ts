import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkflowEnabledToCompany1808000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'stock_control_companies'
          AND column_name = 'workflow_enabled'
        ) THEN
          ALTER TABLE stock_control_companies
          ADD COLUMN workflow_enabled BOOLEAN NOT NULL DEFAULT true;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies DROP COLUMN IF EXISTS workflow_enabled
    `);
  }
}
