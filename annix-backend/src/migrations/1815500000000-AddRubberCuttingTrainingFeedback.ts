import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberCuttingTrainingFeedback1815500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_cutting_training
      ADD COLUMN IF NOT EXISTS times_suggested INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS times_applied INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS times_applied_modified INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS times_ignored INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS feedback_score NUMERIC(4,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_cutting_training
      DROP COLUMN IF EXISTS times_suggested,
      DROP COLUMN IF EXISTS times_applied,
      DROP COLUMN IF EXISTS times_applied_modified,
      DROP COLUMN IF EXISTS times_ignored,
      DROP COLUMN IF EXISTS feedback_score
    `);
  }
}
