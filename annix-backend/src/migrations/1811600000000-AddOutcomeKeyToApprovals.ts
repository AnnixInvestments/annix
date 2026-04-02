import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutcomeKeyToApprovals1811600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_approvals
      ADD COLUMN IF NOT EXISTS outcome_key VARCHAR(50) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_approvals
      DROP COLUMN IF EXISTS outcome_key
    `);
  }
}
