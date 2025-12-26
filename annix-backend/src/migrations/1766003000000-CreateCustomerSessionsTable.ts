import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerSessionsTable1766003000000
  implements MigrationInterface
{
  name = 'CreateCustomerSessionsTable1766003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create session_invalidation_reason enum
    await queryRunner.query(`
      CREATE TYPE "session_invalidation_reason_enum" AS ENUM (
        'logout',
        'new_login',
        'expired',
        'admin_reset',
        'device_reset',
        'account_suspended'
      )
    `);

    // Create customer_sessions table
    await queryRunner.query(`
      CREATE TABLE "customer_sessions" (
        "id" SERIAL NOT NULL,
        "customer_profile_id" integer NOT NULL,
        "session_token" character varying(500) NOT NULL,
        "refresh_token" character varying(500),
        "device_fingerprint" character varying(500) NOT NULL,
        "ip_address" character varying(45) NOT NULL,
        "user_agent" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP NOT NULL,
        "last_activity" TIMESTAMP NOT NULL,
        "invalidated_at" TIMESTAMP,
        "invalidation_reason" "session_invalidation_reason_enum",
        CONSTRAINT "PK_customer_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customer_sessions_session_token" UNIQUE ("session_token")
      )
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "customer_sessions"
      ADD CONSTRAINT "FK_customer_sessions_profile"
      FOREIGN KEY ("customer_profile_id")
      REFERENCES "customer_profiles"("id")
      ON DELETE CASCADE
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_customer_sessions_token" ON "customer_sessions" ("session_token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_sessions_profile_active" ON "customer_sessions" ("customer_profile_id", "is_active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_sessions_profile_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_sessions_token"`);

    // Drop foreign key
    await queryRunner.query(
      `ALTER TABLE "customer_sessions" DROP CONSTRAINT IF EXISTS "FK_customer_sessions_profile"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_sessions"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "session_invalidation_reason_enum"`);
  }
}
