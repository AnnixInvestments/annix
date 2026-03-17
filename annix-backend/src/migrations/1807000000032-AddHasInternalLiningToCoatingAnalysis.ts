import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHasInternalLiningToCoatingAnalysis1807000000032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_coating_analyses
      ADD COLUMN IF NOT EXISTS has_internal_lining BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_coating_analyses
      DROP COLUMN IF EXISTS has_internal_lining
    `);
  }
}
