import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvAssistantSeekerMutes1820100000087 implements MigrationInterface {
  name = "CreateCvAssistantSeekerMutes1820100000087";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_seeker_mutes" (
        "id" SERIAL PRIMARY KEY,
        "candidate_id" int NOT NULL,
        "company_name" varchar(500) NULL,
        "category" varchar(255) NULL,
        "muted_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_seeker_mute_one_of"
          CHECK (
            (company_name IS NOT NULL AND category IS NULL)
            OR (company_name IS NULL AND category IS NOT NULL)
          )
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_seeker_mutes"
          ADD CONSTRAINT "fk_seeker_mutes_candidate"
          FOREIGN KEY ("candidate_id")
          REFERENCES "cv_assistant_candidates"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_seeker_mutes_candidate"
        ON "cv_assistant_seeker_mutes" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_seeker_mutes_candidate_company"
        ON "cv_assistant_seeker_mutes" ("candidate_id", LOWER("company_name"))
        WHERE "company_name" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_seeker_mutes_candidate_category"
        ON "cv_assistant_seeker_mutes" ("candidate_id", LOWER("category"))
        WHERE "category" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ux_seeker_mutes_candidate_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ux_seeker_mutes_candidate_company"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_seeker_mutes_candidate"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_seeker_mutes"`);
  }
}
