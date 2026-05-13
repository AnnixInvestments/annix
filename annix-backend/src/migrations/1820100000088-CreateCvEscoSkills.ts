import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvEscoSkills1820100000088 implements MigrationInterface {
  name = "CreateCvEscoSkills1820100000088";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_esco_skills" (
        "id" SERIAL PRIMARY KEY,
        "esco_uri" varchar(500) NOT NULL,
        "preferred_label" varchar(500) NOT NULL,
        "alt_labels" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "description" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_esco_skills_uri"
        ON "cv_assistant_esco_skills" ("esco_uri")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_esco_skills_preferred_lower"
        ON "cv_assistant_esco_skills" (LOWER("preferred_label") text_pattern_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_esco_skills_alt_labels"
        ON "cv_assistant_esco_skills" USING GIN ("alt_labels" jsonb_path_ops)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_esco_skills_alt_labels"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_esco_skills_preferred_lower"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ux_esco_skills_uri"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_esco_skills"`);
  }
}
