import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnonymousDraftsTable1780000000000 implements MigrationInterface {
  name = "CreateAnonymousDraftsTable1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "anonymous_drafts" (
        "id" SERIAL PRIMARY KEY,
        "recovery_token" VARCHAR(64) NOT NULL UNIQUE,
        "customer_email" VARCHAR(255),
        "project_name" VARCHAR(255),
        "current_step" INTEGER NOT NULL DEFAULT 1,
        "form_data" JSONB NOT NULL,
        "global_specs" JSONB,
        "required_products" JSONB,
        "entries" JSONB,
        "recovery_email_sent" BOOLEAN NOT NULL DEFAULT false,
        "recovery_email_sent_at" TIMESTAMP,
        "claimed_by_user_id" INTEGER,
        "is_claimed" BOOLEAN NOT NULL DEFAULT false,
        "browser_fingerprint" VARCHAR(255),
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anonymous_drafts_recovery_token" ON "anonymous_drafts" ("recovery_token")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anonymous_drafts_customer_email" ON "anonymous_drafts" ("customer_email")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anonymous_drafts_expires_at" ON "anonymous_drafts" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_anonymous_drafts_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_anonymous_drafts_customer_email"`);
    await queryRunner.query(`DROP INDEX "IDX_anonymous_drafts_recovery_token"`);
    await queryRunner.query(`DROP TABLE "anonymous_drafts"`);
  }
}
