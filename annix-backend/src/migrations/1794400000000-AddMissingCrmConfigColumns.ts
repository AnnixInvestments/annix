import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingCrmConfigColumns1794400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "annix_rep_conflict_resolution_enum"
        AS ENUM ('local_wins', 'remote_wins', 'newest_wins', 'manual');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_crm_configs"
        ADD COLUMN IF NOT EXISTS "webhook_config" JSON,
        ADD COLUMN IF NOT EXISTS "refresh_token_encrypted" TEXT,
        ADD COLUMN IF NOT EXISTS "token_expires_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "crm_user_id" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "crm_organization_id" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "prospect_field_mappings" JSON,
        ADD COLUMN IF NOT EXISTS "meeting_field_mappings" JSON,
        ADD COLUMN IF NOT EXISTS "conflict_resolution" "annix_rep_conflict_resolution_enum" NOT NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS "last_pull_sync_token" TEXT
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "annix_rep_sync_direction_enum" AS ENUM ('push', 'pull');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "annix_rep_sync_status_enum" AS ENUM ('in_progress', 'completed', 'failed', 'partial');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "annix_rep_crm_sync_logs" (
        "id" SERIAL PRIMARY KEY,
        "config_id" INTEGER NOT NULL REFERENCES "annix_rep_crm_configs"("id") ON DELETE CASCADE,
        "direction" "annix_rep_sync_direction_enum" NOT NULL,
        "status" "annix_rep_sync_status_enum" NOT NULL DEFAULT 'in_progress',
        "records_processed" INTEGER NOT NULL DEFAULT 0,
        "records_succeeded" INTEGER NOT NULL DEFAULT 0,
        "records_failed" INTEGER NOT NULL DEFAULT 0,
        "error_details" JSON,
        "sync_token" TEXT,
        "started_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "annix_rep_booking_links" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "slug" UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "meeting_duration_minutes" INTEGER NOT NULL DEFAULT 30,
        "buffer_before_minutes" INTEGER NOT NULL DEFAULT 0,
        "buffer_after_minutes" INTEGER NOT NULL DEFAULT 0,
        "available_days" VARCHAR(255) NOT NULL DEFAULT '1,2,3,4,5',
        "available_start_hour" INTEGER NOT NULL DEFAULT 8,
        "available_end_hour" INTEGER NOT NULL DEFAULT 17,
        "max_days_ahead" INTEGER NOT NULL DEFAULT 30,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "custom_questions" JSONB,
        "meeting_type" VARCHAR(20) NOT NULL DEFAULT 'video',
        "location" VARCHAR(500),
        "description" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_meetings"
        ADD COLUMN IF NOT EXISTS "is_recurring" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "recurrence_rule" VARCHAR(500),
        ADD COLUMN IF NOT EXISTS "recurring_parent_id" INTEGER REFERENCES "annix_rep_meetings"("id") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "recurrence_exception_dates" TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospect_activities"
        ADD COLUMN IF NOT EXISTS "metadata" JSONB
    `);

    const existingValues = await queryRunner.query(`
      SELECT unnest(enum_range(NULL::annix_rep_prospect_activity_type_enum))::text AS val
    `);
    const vals = existingValues.map((r: { val: string }) => r.val);

    const toAdd = ["follow_up_snoozed", "ownership_changed"].filter((v) => !vals.includes(v));

    for (const val of toAdd) {
      await queryRunner.query(
        `ALTER TYPE "annix_rep_prospect_activity_type_enum" ADD VALUE IF NOT EXISTS '${val}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospect_activities"
        DROP COLUMN IF EXISTS "metadata"
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_meetings"
        DROP COLUMN IF EXISTS "recurrence_exception_dates",
        DROP COLUMN IF EXISTS "recurring_parent_id",
        DROP COLUMN IF EXISTS "recurrence_rule",
        DROP COLUMN IF EXISTS "is_recurring"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "annix_rep_booking_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "annix_rep_crm_sync_logs"`);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_crm_configs"
        DROP COLUMN IF EXISTS "last_pull_sync_token",
        DROP COLUMN IF EXISTS "conflict_resolution",
        DROP COLUMN IF EXISTS "meeting_field_mappings",
        DROP COLUMN IF EXISTS "prospect_field_mappings",
        DROP COLUMN IF EXISTS "crm_organization_id",
        DROP COLUMN IF EXISTS "crm_user_id",
        DROP COLUMN IF EXISTS "token_expires_at",
        DROP COLUMN IF EXISTS "refresh_token_encrypted",
        DROP COLUMN IF EXISTS "webhook_config"
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS "annix_rep_sync_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "annix_rep_sync_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "annix_rep_conflict_resolution_enum"`);
  }
}
