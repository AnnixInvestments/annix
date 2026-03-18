import { MigrationInterface, QueryRunner } from "typeorm";

export class FixDocUploadBackgroundFlag1807000000054 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET is_background = true,
          trigger_after_step = NULL
      WHERE key = 'document_upload'
        AND is_background = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workflow_step_configs
      SET is_background = false,
          trigger_after_step = NULL
      WHERE key = 'document_upload'
        AND is_background = true
        AND trigger_after_step IS NULL
    `);
  }
}
