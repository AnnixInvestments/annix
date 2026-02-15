import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFieldFlowTables1772000000000 implements MigrationInterface {
  name = "CreateFieldFlowTables1772000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "fieldflow_prospect_status_enum" AS ENUM (
        'new', 'contacted', 'qualified', 'proposal', 'won', 'lost'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_prospect_priority_enum" AS ENUM (
        'low', 'medium', 'high', 'urgent'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_prospects" (
        "id" SERIAL NOT NULL,
        "owner_id" integer NOT NULL,
        "company_name" character varying(255) NOT NULL,
        "contact_name" character varying(255) NULL,
        "contact_email" character varying(255) NULL,
        "contact_phone" character varying(50) NULL,
        "contact_title" character varying(100) NULL,
        "street_address" character varying(500) NULL,
        "city" character varying(100) NULL,
        "province" character varying(100) NULL,
        "postal_code" character varying(20) NULL,
        "country" character varying(100) NOT NULL DEFAULT 'South Africa',
        "latitude" decimal(10,7) NULL,
        "longitude" decimal(10,7) NULL,
        "google_place_id" character varying(255) NULL,
        "status" "fieldflow_prospect_status_enum" NOT NULL DEFAULT 'new',
        "priority" "fieldflow_prospect_priority_enum" NOT NULL DEFAULT 'medium',
        "notes" text NULL,
        "tags" text NULL,
        "estimated_value" decimal(15,2) NULL,
        "crm_external_id" character varying(255) NULL,
        "crm_sync_status" character varying(50) NULL,
        "crm_last_synced_at" TIMESTAMP NULL,
        "last_contacted_at" TIMESTAMP NULL,
        "next_follow_up_at" TIMESTAMP NULL,
        "custom_fields" jsonb NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_prospects" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_prospects"
      ADD CONSTRAINT "FK_fieldflow_prospects_owner"
      FOREIGN KEY ("owner_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_prospects_owner" ON "fieldflow_prospects"("owner_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_prospects_status" ON "fieldflow_prospects"("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_prospects_location" ON "fieldflow_prospects"("latitude", "longitude")
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_visit_type_enum" AS ENUM (
        'cold_call', 'scheduled', 'follow_up', 'drop_in'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_visit_outcome_enum" AS ENUM (
        'successful', 'no_answer', 'rescheduled', 'not_interested', 'follow_up_required', 'converted'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_visits" (
        "id" SERIAL NOT NULL,
        "prospect_id" integer NOT NULL,
        "sales_rep_id" integer NOT NULL,
        "visit_type" "fieldflow_visit_type_enum" NOT NULL DEFAULT 'scheduled',
        "scheduled_at" TIMESTAMP NULL,
        "started_at" TIMESTAMP NULL,
        "ended_at" TIMESTAMP NULL,
        "check_in_latitude" decimal(10,7) NULL,
        "check_in_longitude" decimal(10,7) NULL,
        "check_out_latitude" decimal(10,7) NULL,
        "check_out_longitude" decimal(10,7) NULL,
        "outcome" "fieldflow_visit_outcome_enum" NULL,
        "notes" text NULL,
        "contact_met" character varying(255) NULL,
        "next_steps" text NULL,
        "follow_up_date" date NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_visits" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_visits"
      ADD CONSTRAINT "FK_fieldflow_visits_prospect"
      FOREIGN KEY ("prospect_id")
      REFERENCES "fieldflow_prospects"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_visits"
      ADD CONSTRAINT "FK_fieldflow_visits_sales_rep"
      FOREIGN KEY ("sales_rep_id")
      REFERENCES "user"("id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_visits_prospect" ON "fieldflow_visits"("prospect_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_visits_sales_rep" ON "fieldflow_visits"("sales_rep_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_visits_scheduled" ON "fieldflow_visits"("scheduled_at")
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_calendar_provider_enum" AS ENUM (
        'google', 'outlook', 'apple', 'caldav'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_calendar_sync_status_enum" AS ENUM (
        'active', 'paused', 'error', 'expired'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_calendar_connections" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "provider" "fieldflow_calendar_provider_enum" NOT NULL,
        "account_email" character varying(255) NOT NULL,
        "account_name" character varying(255) NULL,
        "access_token_encrypted" text NOT NULL,
        "refresh_token_encrypted" text NULL,
        "token_expires_at" TIMESTAMP NULL,
        "caldav_url" character varying(500) NULL,
        "sync_status" "fieldflow_calendar_sync_status_enum" NOT NULL DEFAULT 'active',
        "last_sync_at" TIMESTAMP NULL,
        "last_sync_error" text NULL,
        "sync_token" character varying(500) NULL,
        "selected_calendars" text NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_calendar_connections" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_calendar_connections"
      ADD CONSTRAINT "FK_fieldflow_calendar_connections_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_calendar_connections_user" ON "fieldflow_calendar_connections"("user_id")
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_calendar_event_status_enum" AS ENUM (
        'confirmed', 'tentative', 'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_calendar_events" (
        "id" SERIAL NOT NULL,
        "connection_id" integer NOT NULL,
        "external_id" character varying(500) NOT NULL,
        "calendar_id" character varying(255) NULL,
        "provider" "fieldflow_calendar_provider_enum" NOT NULL,
        "title" character varying(500) NOT NULL,
        "description" text NULL,
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NOT NULL,
        "is_all_day" boolean NOT NULL DEFAULT false,
        "timezone" character varying(100) NULL,
        "location" character varying(500) NULL,
        "status" "fieldflow_calendar_event_status_enum" NOT NULL DEFAULT 'confirmed',
        "attendees" text NULL,
        "organizer_email" character varying(255) NULL,
        "meeting_url" character varying(500) NULL,
        "is_recurring" boolean NOT NULL DEFAULT false,
        "recurrence_rule" character varying(500) NULL,
        "raw_data" jsonb NULL,
        "etag" character varying(255) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_calendar_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_calendar_events"
      ADD CONSTRAINT "FK_fieldflow_calendar_events_connection"
      FOREIGN KEY ("connection_id")
      REFERENCES "fieldflow_calendar_connections"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_calendar_events_connection" ON "fieldflow_calendar_events"("connection_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_calendar_events_external" ON "fieldflow_calendar_events"("external_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_calendar_events_time" ON "fieldflow_calendar_events"("start_time", "end_time")
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_meeting_status_enum" AS ENUM (
        'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_meeting_type_enum" AS ENUM (
        'in_person', 'phone', 'video'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_meetings" (
        "id" SERIAL NOT NULL,
        "prospect_id" integer NULL,
        "sales_rep_id" integer NOT NULL,
        "calendar_event_id" integer NULL,
        "title" character varying(255) NOT NULL,
        "description" text NULL,
        "meeting_type" "fieldflow_meeting_type_enum" NOT NULL DEFAULT 'in_person',
        "status" "fieldflow_meeting_status_enum" NOT NULL DEFAULT 'scheduled',
        "scheduled_start" TIMESTAMP NOT NULL,
        "scheduled_end" TIMESTAMP NOT NULL,
        "actual_start" TIMESTAMP NULL,
        "actual_end" TIMESTAMP NULL,
        "location" character varying(500) NULL,
        "latitude" decimal(10,7) NULL,
        "longitude" decimal(10,7) NULL,
        "attendees" text NULL,
        "agenda" text NULL,
        "notes" text NULL,
        "outcomes" text NULL,
        "action_items" jsonb NULL,
        "summary_sent" boolean NOT NULL DEFAULT false,
        "summary_sent_at" TIMESTAMP NULL,
        "crm_external_id" character varying(255) NULL,
        "crm_sync_status" character varying(50) NULL,
        "crm_last_synced_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_meetings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_meetings"
      ADD CONSTRAINT "FK_fieldflow_meetings_prospect"
      FOREIGN KEY ("prospect_id")
      REFERENCES "fieldflow_prospects"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_meetings"
      ADD CONSTRAINT "FK_fieldflow_meetings_sales_rep"
      FOREIGN KEY ("sales_rep_id")
      REFERENCES "user"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_meetings"
      ADD CONSTRAINT "FK_fieldflow_meetings_calendar_event"
      FOREIGN KEY ("calendar_event_id")
      REFERENCES "fieldflow_calendar_events"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_meetings_prospect" ON "fieldflow_meetings"("prospect_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_meetings_sales_rep" ON "fieldflow_meetings"("sales_rep_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_meetings_scheduled" ON "fieldflow_meetings"("scheduled_start")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_meetings_status" ON "fieldflow_meetings"("status")
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_recording_status_enum" AS ENUM (
        'pending', 'uploading', 'processing', 'transcribing', 'completed', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_meeting_recordings" (
        "id" SERIAL NOT NULL,
        "meeting_id" integer NOT NULL,
        "storage_path" character varying(500) NOT NULL,
        "storage_bucket" character varying(100) NOT NULL,
        "original_filename" character varying(255) NULL,
        "mime_type" character varying(100) NOT NULL,
        "file_size_bytes" bigint NOT NULL,
        "duration_seconds" integer NULL,
        "sample_rate" integer NOT NULL DEFAULT 16000,
        "channels" integer NOT NULL DEFAULT 1,
        "processing_status" "fieldflow_recording_status_enum" NOT NULL DEFAULT 'pending',
        "processing_error" text NULL,
        "speaker_segments" jsonb NULL,
        "detected_speakers_count" integer NULL,
        "speaker_labels" jsonb NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_meeting_recordings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fieldflow_meeting_recordings_meeting" UNIQUE ("meeting_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_meeting_recordings"
      ADD CONSTRAINT "FK_fieldflow_meeting_recordings_meeting"
      FOREIGN KEY ("meeting_id")
      REFERENCES "fieldflow_meetings"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_meeting_recordings_status" ON "fieldflow_meeting_recordings"("processing_status")
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_meeting_transcripts" (
        "id" SERIAL NOT NULL,
        "recording_id" integer NOT NULL,
        "full_text" text NOT NULL,
        "segments" jsonb NOT NULL,
        "word_count" integer NOT NULL,
        "analysis" jsonb NULL,
        "summary" text NULL,
        "whisper_model" character varying(50) NULL,
        "language" character varying(10) NOT NULL DEFAULT 'en',
        "processing_time_ms" integer NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_meeting_transcripts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fieldflow_meeting_transcripts_recording" UNIQUE ("recording_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_meeting_transcripts"
      ADD CONSTRAINT "FK_fieldflow_meeting_transcripts_recording"
      FOREIGN KEY ("recording_id")
      REFERENCES "fieldflow_meeting_recordings"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TYPE "fieldflow_crm_type_enum" AS ENUM (
        'webhook', 'csv_export', 'salesforce', 'hubspot', 'pipedrive', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_crm_configs" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "name" character varying(100) NOT NULL,
        "crm_type" "fieldflow_crm_type_enum" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "webhook_config" jsonb NULL,
        "api_key_encrypted" text NULL,
        "api_secret_encrypted" text NULL,
        "instance_url" character varying(500) NULL,
        "prospect_field_mappings" jsonb NULL,
        "meeting_field_mappings" jsonb NULL,
        "sync_prospects" boolean NOT NULL DEFAULT true,
        "sync_meetings" boolean NOT NULL DEFAULT true,
        "sync_on_create" boolean NOT NULL DEFAULT true,
        "sync_on_update" boolean NOT NULL DEFAULT true,
        "last_sync_at" TIMESTAMP NULL,
        "last_sync_error" text NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fieldflow_crm_configs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "fieldflow_crm_configs"
      ADD CONSTRAINT "FK_fieldflow_crm_configs_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_crm_configs_user" ON "fieldflow_crm_configs"("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_crm_configs_user"`);
    await queryRunner.query(
      `ALTER TABLE "fieldflow_crm_configs" DROP CONSTRAINT "FK_fieldflow_crm_configs_user"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_crm_configs"`);
    await queryRunner.query(`DROP TYPE "fieldflow_crm_type_enum"`);

    await queryRunner.query(
      `ALTER TABLE "fieldflow_meeting_transcripts" DROP CONSTRAINT "FK_fieldflow_meeting_transcripts_recording"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_meeting_transcripts"`);

    await queryRunner.query(`DROP INDEX "IDX_fieldflow_meeting_recordings_status"`);
    await queryRunner.query(
      `ALTER TABLE "fieldflow_meeting_recordings" DROP CONSTRAINT "FK_fieldflow_meeting_recordings_meeting"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_meeting_recordings"`);
    await queryRunner.query(`DROP TYPE "fieldflow_recording_status_enum"`);

    await queryRunner.query(`DROP INDEX "IDX_fieldflow_meetings_status"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_meetings_scheduled"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_meetings_sales_rep"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_meetings_prospect"`);
    await queryRunner.query(
      `ALTER TABLE "fieldflow_meetings" DROP CONSTRAINT "FK_fieldflow_meetings_calendar_event"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fieldflow_meetings" DROP CONSTRAINT "FK_fieldflow_meetings_sales_rep"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fieldflow_meetings" DROP CONSTRAINT "FK_fieldflow_meetings_prospect"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_meetings"`);
    await queryRunner.query(`DROP TYPE "fieldflow_meeting_type_enum"`);
    await queryRunner.query(`DROP TYPE "fieldflow_meeting_status_enum"`);

    await queryRunner.query(`DROP INDEX "IDX_fieldflow_calendar_events_time"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_calendar_events_external"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_calendar_events_connection"`);
    await queryRunner.query(
      `ALTER TABLE "fieldflow_calendar_events" DROP CONSTRAINT "FK_fieldflow_calendar_events_connection"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_calendar_events"`);
    await queryRunner.query(`DROP TYPE "fieldflow_calendar_event_status_enum"`);

    await queryRunner.query(`DROP INDEX "IDX_fieldflow_calendar_connections_user"`);
    await queryRunner.query(
      `ALTER TABLE "fieldflow_calendar_connections" DROP CONSTRAINT "FK_fieldflow_calendar_connections_user"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_calendar_connections"`);
    await queryRunner.query(`DROP TYPE "fieldflow_calendar_sync_status_enum"`);
    await queryRunner.query(`DROP TYPE "fieldflow_calendar_provider_enum"`);

    await queryRunner.query(`DROP INDEX "IDX_fieldflow_visits_scheduled"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_visits_sales_rep"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_visits_prospect"`);
    await queryRunner.query(
      `ALTER TABLE "fieldflow_visits" DROP CONSTRAINT "FK_fieldflow_visits_sales_rep"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fieldflow_visits" DROP CONSTRAINT "FK_fieldflow_visits_prospect"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_visits"`);
    await queryRunner.query(`DROP TYPE "fieldflow_visit_outcome_enum"`);
    await queryRunner.query(`DROP TYPE "fieldflow_visit_type_enum"`);

    await queryRunner.query(`DROP INDEX "IDX_fieldflow_prospects_location"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_prospects_status"`);
    await queryRunner.query(`DROP INDEX "IDX_fieldflow_prospects_owner"`);
    await queryRunner.query(
      `ALTER TABLE "fieldflow_prospects" DROP CONSTRAINT "FK_fieldflow_prospects_owner"`,
    );
    await queryRunner.query(`DROP TABLE "fieldflow_prospects"`);
    await queryRunner.query(`DROP TYPE "fieldflow_prospect_priority_enum"`);
    await queryRunner.query(`DROP TYPE "fieldflow_prospect_status_enum"`);
  }
}
