import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCvCredentials1820100000092 implements MigrationInterface {
  name = "CreateCvCredentials1820100000092";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_credentials" (
        "id" SERIAL PRIMARY KEY,
        "candidate_id" int NOT NULL,
        "credential_type" varchar(50) NOT NULL,
        "issued_at" date NULL,
        "expires_at" date NULL,
        "issuing_authority" varchar(255) NULL,
        "document_path" varchar(500) NULL,
        "notes" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_credentials"
          ADD CONSTRAINT "fk_cv_credentials_candidate"
          FOREIGN KEY ("candidate_id")
          REFERENCES "cv_assistant_candidates"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cv_credentials_candidate_expires"
        ON "cv_assistant_credentials" ("candidate_id", "expires_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cv_credentials_expires_at"
        ON "cv_assistant_credentials" ("expires_at")
        WHERE "expires_at" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cv_credentials_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cv_credentials_candidate_expires"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_credentials"`);
  }
}
