import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCandidateJobMatches1803400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_candidate_job_matches" (
        "id" SERIAL PRIMARY KEY,
        "candidate_id" INT NOT NULL REFERENCES "cv_assistant_candidates"("id") ON DELETE CASCADE,
        "external_job_id" INT NOT NULL REFERENCES "cv_assistant_external_jobs"("id") ON DELETE CASCADE,
        "similarity_score" DECIMAL(5, 4) NOT NULL DEFAULT 0,
        "structured_score" DECIMAL(5, 4) NOT NULL DEFAULT 0,
        "overall_score" DECIMAL(5, 4) NOT NULL DEFAULT 0,
        "match_details" JSONB,
        "dismissed" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE("candidate_id", "external_job_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_candidate_job_match_candidate"
      ON "cv_assistant_candidate_job_matches" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_candidate_job_match_job"
      ON "cv_assistant_candidate_job_matches" ("external_job_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_candidate_job_match_score"
      ON "cv_assistant_candidate_job_matches" ("overall_score")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_candidate_job_matches"`);
  }
}
