import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCandidateMatchTier1820100001200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cv_assistant_candidates
        ADD COLUMN IF NOT EXISTS match_tier VARCHAR(16) NOT NULL DEFAULT 'soft'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE cv_assistant_candidates DROP COLUMN IF EXISTS match_tier");
  }
}
