import type { MigrationInterface, QueryRunner } from "typeorm";

export class FixUploadDocsRejoinKey1809000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs AS src
      SET rejoin_at_step = target.key
      FROM workflow_step_configs AS target
      WHERE src.key = 'upload_source_documents'
        AND src.company_id = target.company_id
        AND target.key LIKE '%job_file_review'
        AND src.rejoin_at_step IS DISTINCT FROM target.key
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET rejoin_at_step = 'job_file_review'
      WHERE key = 'upload_source_documents'
        AND rejoin_at_step LIKE '%job_file_review'
    `);
  }
}
