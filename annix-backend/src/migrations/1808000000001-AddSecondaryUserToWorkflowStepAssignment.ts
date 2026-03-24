import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSecondaryUserToWorkflowStepAssignment1808000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'workflow_step_assignments'
          AND column_name = 'secondary_user_id'
        ) THEN
          ALTER TABLE workflow_step_assignments
          ADD COLUMN secondary_user_id INT REFERENCES stock_control_users(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_assignments DROP COLUMN IF EXISTS secondary_user_id
    `);
  }
}
