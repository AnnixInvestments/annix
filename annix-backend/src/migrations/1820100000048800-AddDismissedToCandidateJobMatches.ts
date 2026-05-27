import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDismissedToCandidateJobMatches1820100000048800 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_candidate_job_matches"
      ADD COLUMN IF NOT EXISTS "dismissed" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_candidate_job_matches"
      DROP COLUMN IF EXISTS "dismissed"
    `);
  }
}
