import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkflowStepAssignments1799050000000 implements MigrationInterface {
  name = "CreateWorkflowStepAssignments1799050000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_step_assignments (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        workflow_step VARCHAR(50) NOT NULL,
        user_id INT NOT NULL REFERENCES stock_control_users(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, workflow_step, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_step_assignments_company_step
      ON workflow_step_assignments(company_id, workflow_step)
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_notifications
        ADD COLUMN IF NOT EXISTS sender_id INT REFERENCES stock_control_users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_notifications
        DROP COLUMN IF EXISTS sender_id,
        DROP COLUMN IF EXISTS sender_name
    `);

    await queryRunner.query("DROP INDEX IF EXISTS idx_workflow_step_assignments_company_step");
    await queryRunner.query("DROP TABLE IF EXISTS workflow_step_assignments");
  }
}
