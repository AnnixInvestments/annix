import { MigrationInterface, QueryRunner } from "typeorm";

export class SetBatchCertsBranchColor1807000000064 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET branch_color = '#3b82f6'
      WHERE key = 'qc_batch_certs'
        AND branch_color IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET branch_color = NULL
      WHERE key = 'qc_batch_certs'
    `);
  }
}
