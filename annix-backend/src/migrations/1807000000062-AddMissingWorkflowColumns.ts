import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingWorkflowColumns1807000000062 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS action_label VARCHAR(100)
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS branch_color VARCHAR(20)
    `);

    await queryRunner.query(`
      ALTER TABLE job_card_background_completions
      ADD COLUMN IF NOT EXISTS completion_type VARCHAR(20) DEFAULT 'manual'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workflow_step_configs DROP COLUMN IF EXISTS action_label`);
    await queryRunner.query(`ALTER TABLE workflow_step_configs DROP COLUMN IF EXISTS branch_color`);
    await queryRunner.query(`ALTER TABLE job_card_background_completions DROP COLUMN IF EXISTS completion_type`);
  }
}
