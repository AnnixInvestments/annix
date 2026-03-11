import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVersionSnapshotFields1805700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_versions ADD COLUMN IF NOT EXISTS workflow_status varchar(50);
      ALTER TABLE job_card_versions ADD COLUMN IF NOT EXISTS approvals_snapshot jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE job_card_versions DROP COLUMN IF EXISTS approvals_snapshot`);
    await queryRunner.query(`ALTER TABLE job_card_versions DROP COLUMN IF EXISTS workflow_status`);
  }
}
