import type { MigrationInterface, QueryRunner } from "typeorm";

export class SetUploadDocsRejoinAtStep1809000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET rejoin_at_step = 'job_file_review',
          branch_type = 'connect'
      WHERE key = 'upload_source_documents'
        AND (rejoin_at_step IS NULL OR branch_type IS NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET rejoin_at_step = NULL,
          branch_type = NULL
      WHERE key = 'upload_source_documents'
    `);
  }
}
