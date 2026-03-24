import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhaseActionLabelsToWorkflowStepConfigs1808000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'workflow_step_configs'
          AND column_name = 'phase_action_labels'
        ) THEN
          ALTER TABLE workflow_step_configs
          ADD COLUMN phase_action_labels jsonb DEFAULT NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET phase_action_labels = '{"1": "Quality Check", "2": "Quality Release"}'::jsonb
      WHERE key = 'quality_check'
      AND phase_action_labels IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_configs DROP COLUMN IF EXISTS phase_action_labels
    `);
  }
}
