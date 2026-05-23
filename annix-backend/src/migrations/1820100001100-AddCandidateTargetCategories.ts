import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCandidateTargetCategories1820100001100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cv_assistant_candidates
        ADD COLUMN IF NOT EXISTS target_categories JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE cv_assistant_candidates DROP COLUMN IF EXISTS target_categories",
    );
  }
}
