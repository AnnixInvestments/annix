import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBranchTypeAndRejoinToWorkflowStepConfigs1808000000006
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS branch_type varchar(20) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS rejoin_at_step varchar(50) DEFAULT NULL
    `);

    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET branch_type = 'loop'
      WHERE branch_color IS NOT NULL
        AND branch_type IS NULL
        AND trigger_after_step IN (
          SELECT DISTINCT trigger_after_step FROM workflow_step_configs
          WHERE branch_color IS NULL AND is_background = true
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      DROP COLUMN IF EXISTS rejoin_at_step
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      DROP COLUMN IF EXISTS branch_type
    `);
  }
}
