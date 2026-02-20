import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMeetingPlatformTables1792000000000 implements MigrationInterface {
  name = "CreateMeetingPlatformTables1792000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "fieldflow_meeting_platform_enum" AS ENUM (
        'zoom', 'teams', 'google_meet'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_platform_connection_status_enum" AS ENUM (
        'active', 'error', 'disconnected', 'token_expired'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_platform_recording_status_enum" AS ENUM (
        'pending', 'downloading', 'downloaded', 'processing', 'transcribing', 'completed', 'failed', 'no_recording'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_meeting_platform_connections" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "platform" "fieldflow_meeting_platform_enum" NOT NULL,
        "account_email" character varying(255) NOT NULL,
        "account_name" character varying(255) NULL,
        "account_id" character varying(255) NULL,
        "access_token_encrypted" text NOT NULL,
        "refresh_token_encrypted" text NULL,
        "token_expires_at" TIMESTAMP NULL,
        "token_scope" character varying(1000) NULL,
        "webhook_subscription_id" character varying(255) NULL,
        "webhook_expiry" TIMESTAMP NULL,
        "connection_status" "fieldflow_platform_connection_status_enum" NOT NULL DEFAULT 'active',
        "last_error" text NULL,
        "last_error_at" TIMESTAMP NULL,
        "auto_fetch_recordings" boolean NOT NULL DEFAULT true,
        "auto_transcribe" boolean NOT NULL DEFAULT true,
        "auto_send_summary" boolean NOT NULL DEFAULT true,
        "last_recording_sync_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annix_rep_meeting_platform_connections" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_annix_rep_meeting_platform_connections_user_platform" UNIQUE ("user_id", "platform")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_meeting_platform_connections"
      ADD CONSTRAINT "FK_annix_rep_meeting_platform_connections_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_meeting_platform_connections_user" ON "annix_rep_meeting_platform_connections"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_meeting_platform_connections_status" ON "annix_rep_meeting_platform_connections"("connection_status")
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_platform_meeting_records" (
        "id" SERIAL NOT NULL,
        "connection_id" integer NOT NULL,
        "meeting_id" integer NULL,
        "platform_meeting_id" character varying(255) NOT NULL,
        "platform_recording_id" character varying(255) NULL,
        "title" character varying(500) NOT NULL,
        "topic" character varying(500) NULL,
        "host_email" character varying(255) NULL,
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NULL,
        "duration_seconds" integer NULL,
        "recording_url" text NULL,
        "recording_password" character varying(100) NULL,
        "recording_file_type" character varying(50) NULL,
        "recording_file_size_bytes" bigint NULL,
        "s3_storage_path" character varying(500) NULL,
        "s3_storage_bucket" character varying(100) NULL,
        "recording_status" "fieldflow_platform_recording_status_enum" NOT NULL DEFAULT 'pending',
        "recording_error" text NULL,
        "participants" text[] NULL,
        "participant_count" integer NULL,
        "join_url" character varying(500) NULL,
        "raw_meeting_data" jsonb NULL,
        "raw_recording_data" jsonb NULL,
        "fetched_at" TIMESTAMP NULL,
        "downloaded_at" TIMESTAMP NULL,
        "processed_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annix_rep_platform_meeting_records" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_platform_meeting_records"
      ADD CONSTRAINT "FK_annix_rep_platform_meeting_records_connection"
      FOREIGN KEY ("connection_id")
      REFERENCES "annix_rep_meeting_platform_connections"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_platform_meeting_records"
      ADD CONSTRAINT "FK_annix_rep_platform_meeting_records_meeting"
      FOREIGN KEY ("meeting_id")
      REFERENCES "annix_rep_meetings"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_platform_meeting_records_connection" ON "annix_rep_platform_meeting_records"("connection_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_platform_meeting_records_meeting" ON "annix_rep_platform_meeting_records"("meeting_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_platform_meeting_records_platform_meeting" ON "annix_rep_platform_meeting_records"("platform_meeting_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_platform_meeting_records_status" ON "annix_rep_platform_meeting_records"("recording_status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_platform_meeting_records_start_time" ON "annix_rep_platform_meeting_records"("start_time")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_annix_rep_platform_meeting_records_platform_id"
      ON "annix_rep_platform_meeting_records"("connection_id", "platform_meeting_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_annix_rep_platform_meeting_records_platform_id"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_platform_meeting_records_start_time"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_platform_meeting_records_status"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_platform_meeting_records_platform_meeting"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_platform_meeting_records_meeting"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_platform_meeting_records_connection"`);
    await queryRunner.query(
      `ALTER TABLE "annix_rep_platform_meeting_records" DROP CONSTRAINT "FK_annix_rep_platform_meeting_records_meeting"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_platform_meeting_records" DROP CONSTRAINT "FK_annix_rep_platform_meeting_records_connection"`,
    );
    await queryRunner.query(`DROP TABLE "annix_rep_platform_meeting_records"`);

    await queryRunner.query(`DROP INDEX "IDX_annix_rep_meeting_platform_connections_status"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_meeting_platform_connections_user"`);
    await queryRunner.query(
      `ALTER TABLE "annix_rep_meeting_platform_connections" DROP CONSTRAINT "FK_annix_rep_meeting_platform_connections_user"`,
    );
    await queryRunner.query(`DROP TABLE "annix_rep_meeting_platform_connections"`);

    await queryRunner.query(`DROP TYPE "fieldflow_platform_recording_status_enum"`);
    await queryRunner.query(`DROP TYPE "fieldflow_platform_connection_status_enum"`);
    await queryRunner.query(`DROP TYPE "fieldflow_meeting_platform_enum"`);
  }
}
