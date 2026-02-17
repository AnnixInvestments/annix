import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFieldFlowAuth1782000000000 implements MigrationInterface {
  name = "CreateFieldFlowAuth1782000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "fieldflow_session_invalidation_reason_enum" AS ENUM (
        'logout',
        'new_login',
        'expired',
        'security',
        'admin'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fieldflow_sessions" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "session_token" character varying(500) NOT NULL,
        "refresh_token" character varying(500),
        "ip_address" character varying(45) NOT NULL,
        "user_agent" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP NOT NULL,
        "last_activity" TIMESTAMP NOT NULL,
        "invalidated_at" TIMESTAMP,
        "invalidation_reason" "fieldflow_session_invalidation_reason_enum",
        CONSTRAINT "UQ_fieldflow_sessions_session_token" UNIQUE ("session_token"),
        CONSTRAINT "PK_fieldflow_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fieldflow_sessions_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_sessions_session_token" ON "fieldflow_sessions" ("session_token")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fieldflow_sessions_user_active" ON "fieldflow_sessions" ("user_id", "is_active")
    `);

    const existingRole = await queryRunner.query(`
      SELECT id FROM "user_role" WHERE "name" = 'fieldflow'
    `);

    if (existingRole.length === 0) {
      await queryRunner.query(`
        INSERT INTO "user_role" ("name") VALUES ('fieldflow')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fieldflow_sessions_user_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fieldflow_sessions_session_token"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fieldflow_sessions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "fieldflow_session_invalidation_reason_enum"`);
    await queryRunner.query(`DELETE FROM "user_role" WHERE "name" = 'fieldflow'`);
  }
}
