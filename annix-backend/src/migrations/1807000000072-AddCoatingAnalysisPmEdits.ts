import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoatingAnalysisPmEdits1807000000072 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE job_card_coating_analyses
      ADD COLUMN IF NOT EXISTS pm_edited_assessment JSONB NULL
    `);

    await queryRunner.query(`
      ALTER TABLE job_card_coating_analyses
      ADD COLUMN IF NOT EXISTS pm_edited_by VARCHAR(200) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE job_card_coating_analyses
      ADD COLUMN IF NOT EXISTS pm_edited_at TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE job_card_coating_analyses DROP COLUMN IF EXISTS pm_edited_at",
    );
    await queryRunner.query(
      "ALTER TABLE job_card_coating_analyses DROP COLUMN IF EXISTS pm_edited_by",
    );
    await queryRunner.query(
      "ALTER TABLE job_card_coating_analyses DROP COLUMN IF EXISTS pm_edited_assessment",
    );
  }
}
