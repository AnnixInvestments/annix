import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStepOutcomesToWorkflowStepConfigs1808000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      ADD COLUMN IF NOT EXISTS step_outcomes jsonb DEFAULT NULL
    `);

    await queryRunner.query(
      `
      UPDATE workflow_step_configs
      SET step_outcomes = $1
      WHERE key = 'qa_review' AND step_outcomes IS NULL
    `,
      [
        JSON.stringify([
          {
            key: "accept",
            label: "QA Accepted",
            nextStepKey: null,
            notifyStepKey: null,
            style: "green",
          },
          {
            key: "reject",
            label: "QA Rejected",
            nextStepKey: "qc_repairs",
            notifyStepKey: "qc_repairs",
            style: "red",
          },
        ]),
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_step_configs
      DROP COLUMN IF EXISTS step_outcomes
    `);
  }
}
