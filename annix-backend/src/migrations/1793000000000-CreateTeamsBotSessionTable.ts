import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTeamsBotSessionTable1793000000000 implements MigrationInterface {
  name = "CreateTeamsBotSessionTable1793000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "fieldflow_teams_bot_session_status_enum" AS ENUM (
        'joining', 'active', 'leaving', 'ended', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_teams_bot_sessions" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "meeting_id" integer NULL,
        "session_id" character varying(100) NOT NULL,
        "call_id" character varying(255) NULL,
        "meeting_url" text NOT NULL,
        "meeting_thread_id" character varying(255) NULL,
        "meeting_organizer_id" character varying(255) NULL,
        "status" "fieldflow_teams_bot_session_status_enum" NOT NULL DEFAULT 'joining',
        "bot_display_name" character varying(255) NOT NULL DEFAULT 'Annix AI Meeting Assistant',
        "error_message" text NULL,
        "participants" jsonb NULL,
        "participant_count" integer NOT NULL DEFAULT 0,
        "transcript_entries" jsonb NOT NULL DEFAULT '[]',
        "transcript_entry_count" integer NOT NULL DEFAULT 0,
        "started_at" TIMESTAMP NULL,
        "ended_at" TIMESTAMP NULL,
        "last_activity_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annix_rep_teams_bot_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_annix_rep_teams_bot_sessions_session_id" UNIQUE ("session_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_teams_bot_sessions"
      ADD CONSTRAINT "FK_annix_rep_teams_bot_sessions_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_teams_bot_sessions"
      ADD CONSTRAINT "FK_annix_rep_teams_bot_sessions_meeting"
      FOREIGN KEY ("meeting_id")
      REFERENCES "annix_rep_meetings"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_teams_bot_sessions_user" ON "annix_rep_teams_bot_sessions"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_teams_bot_sessions_meeting" ON "annix_rep_teams_bot_sessions"("meeting_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_teams_bot_sessions_status" ON "annix_rep_teams_bot_sessions"("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_teams_bot_sessions_call_id" ON "annix_rep_teams_bot_sessions"("call_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_teams_bot_sessions_call_id"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_teams_bot_sessions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_teams_bot_sessions_meeting"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_teams_bot_sessions_user"`);
    await queryRunner.query(
      `ALTER TABLE "annix_rep_teams_bot_sessions" DROP CONSTRAINT "FK_annix_rep_teams_bot_sessions_meeting"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_teams_bot_sessions" DROP CONSTRAINT "FK_annix_rep_teams_bot_sessions_user"`,
    );
    await queryRunner.query(`DROP TABLE "annix_rep_teams_bot_sessions"`);
    await queryRunner.query(`DROP TYPE "fieldflow_teams_bot_session_status_enum"`);
  }
}
