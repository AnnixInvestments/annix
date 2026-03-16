import { MigrationInterface, QueryRunner } from "typeorm";

export class ClearWorkflowCeilingOnChildJobCards1807000000046 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE stock_control_job_cards
      SET workflow_ceiling = NULL
      WHERE workflow_ceiling IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE stock_control_job_cards
      SET workflow_ceiling = 'requisition_sent'
      WHERE parent_job_card_id IS NOT NULL
    `);
  }
}
