import { MigrationInterface, QueryRunner } from "typeorm";

export class UploadDocsNonBlocking1809000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET branch_type = 'connect',
          rejoin_at_step = 'job_file_review'
      WHERE key = 'upload_source_documents'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET branch_type = NULL,
          rejoin_at_step = NULL
      WHERE key = 'upload_source_documents'
    `);
  }
}
