import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedbackResolutionFields1811800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_feedback
      ADD COLUMN IF NOT EXISTS resolution_status varchar(30) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS test_criteria text DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS verified_at timestamptz DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_feedback
      DROP COLUMN IF EXISTS resolution_status,
      DROP COLUMN IF EXISTS test_criteria,
      DROP COLUMN IF EXISTS verified_at
    `);
  }
}
