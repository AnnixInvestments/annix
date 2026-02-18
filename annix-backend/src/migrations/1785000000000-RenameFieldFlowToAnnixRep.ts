import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameFieldFlowToAnnixRep1785000000000 implements MigrationInterface {
  name = "RenameFieldFlowToAnnixRep1785000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename all fieldflow tables to annix_rep
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_sessions" RENAME TO "annix_rep_sessions"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_rep_profiles" RENAME TO "annix_rep_rep_profiles"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_prospects" RENAME TO "annix_rep_prospects"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_visits" RENAME TO "annix_rep_visits"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_meetings" RENAME TO "annix_rep_meetings"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_meeting_recordings" RENAME TO "annix_rep_meeting_recordings"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_meeting_transcripts" RENAME TO "annix_rep_meeting_transcripts"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_calendar_connections" RENAME TO "annix_rep_calendar_connections"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_calendar_events" RENAME TO "annix_rep_calendar_events"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_crm_configs" RENAME TO "annix_rep_crm_configs"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "fieldflow_sales_goals" RENAME TO "annix_rep_sales_goals"`,
    );

    // Rename the session invalidation reason enum (only if it exists)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fieldflow_session_invalidation_reason_enum') THEN
          ALTER TYPE "fieldflow_session_invalidation_reason_enum" RENAME TO "annix_rep_session_invalidation_reason_enum";
        END IF;
      END $$;
    `);

    // Rename the user role from fieldflow to annixRep
    await queryRunner.query(
      `UPDATE "user_role" SET "name" = 'annixRep' WHERE "name" = 'fieldflow'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rename user role back
    await queryRunner.query(
      `UPDATE "user_role" SET "name" = 'fieldflow' WHERE "name" = 'annixRep'`,
    );

    // Rename enum back (only if it exists)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annix_rep_session_invalidation_reason_enum') THEN
          ALTER TYPE "annix_rep_session_invalidation_reason_enum" RENAME TO "fieldflow_session_invalidation_reason_enum";
        END IF;
      END $$;
    `);

    // Rename all tables back to fieldflow
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_sales_goals" RENAME TO "fieldflow_sales_goals"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_crm_configs" RENAME TO "fieldflow_crm_configs"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_calendar_events" RENAME TO "fieldflow_calendar_events"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_calendar_connections" RENAME TO "fieldflow_calendar_connections"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_meeting_transcripts" RENAME TO "fieldflow_meeting_transcripts"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_meeting_recordings" RENAME TO "fieldflow_meeting_recordings"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_meetings" RENAME TO "fieldflow_meetings"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_visits" RENAME TO "fieldflow_visits"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_prospects" RENAME TO "fieldflow_prospects"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_rep_profiles" RENAME TO "fieldflow_rep_profiles"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "annix_rep_sessions" RENAME TO "fieldflow_sessions"`,
    );
  }
}
