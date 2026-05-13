import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvAssistantSeekerApplyClicks1820100000086 implements MigrationInterface {
  name = "CreateCvAssistantSeekerApplyClicks1820100000086";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_seeker_apply_clicks" (
        "id" SERIAL PRIMARY KEY,
        "candidate_id" int NOT NULL,
        "external_job_id" int NULL,
        "match_id" int NULL,
        "source_url" varchar(1000) NULL,
        "clicked_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_seeker_apply_clicks"
          ADD CONSTRAINT "fk_seeker_apply_clicks_candidate"
          FOREIGN KEY ("candidate_id")
          REFERENCES "cv_assistant_candidates"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_seeker_apply_clicks"
          ADD CONSTRAINT "fk_seeker_apply_clicks_external_job"
          FOREIGN KEY ("external_job_id")
          REFERENCES "cv_assistant_external_jobs"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_seeker_apply_clicks"
          ADD CONSTRAINT "fk_seeker_apply_clicks_match"
          FOREIGN KEY ("match_id")
          REFERENCES "cv_assistant_candidate_job_matches"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_seeker_apply_clicks_candidate_clicked_at"
        ON "cv_assistant_seeker_apply_clicks" ("candidate_id", "clicked_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_seeker_apply_clicks_external_job_clicked_at"
        ON "cv_assistant_seeker_apply_clicks" ("external_job_id", "clicked_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_seeker_apply_clicks_external_job_clicked_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_seeker_apply_clicks_candidate_clicked_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_seeker_apply_clicks"`);
  }
}
