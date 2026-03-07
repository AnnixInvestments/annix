import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoatingAnalysisAcceptance1801700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_coating_analyses
      ADD COLUMN IF NOT EXISTS accepted_by VARCHAR(200) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_coating_analyses
      DROP COLUMN IF EXISTS accepted_by,
      DROP COLUMN IF EXISTS accepted_at
    `);
  }
}
