import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIssuanceSessions1817600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "issuance_sessions" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "cpo_id" integer,
        "issuer_staff_id" integer NOT NULL,
        "recipient_staff_id" integer NOT NULL,
        "scope" varchar(30) NOT NULL DEFAULT 'single_jc',
        "status" varchar(30) NOT NULL DEFAULT 'active',
        "job_card_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "notes" text,
        "issued_by_user_id" integer,
        "issued_by_name" varchar(255),
        "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "approved_by_manager_id" integer,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "rejected_at" TIMESTAMP WITH TIME ZONE,
        "rejection_reason" text,
        "undone_at" TIMESTAMP WITH TIME ZONE,
        "undone_by_name" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_issuance_sessions_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_issuance_sessions_cpo" FOREIGN KEY ("cpo_id")
          REFERENCES "customer_purchase_orders"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_issuance_sessions_issuer" FOREIGN KEY ("issuer_staff_id")
          REFERENCES "stock_control_staff_members"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_issuance_sessions_recipient" FOREIGN KEY ("recipient_staff_id")
          REFERENCES "stock_control_staff_members"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_issuance_sessions_user" FOREIGN KEY ("issued_by_user_id")
          REFERENCES "stock_control_users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_issuance_sessions_manager" FOREIGN KEY ("approved_by_manager_id")
          REFERENCES "stock_control_staff_members"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_issuance_sessions_company_id" ON "issuance_sessions"("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_issuance_sessions_cpo_id" ON "issuance_sessions"("cpo_id") WHERE "cpo_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_issuance_sessions_issued_at" ON "issuance_sessions"("issued_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_issuance_sessions_status" ON "issuance_sessions"("status")`,
    );

    await queryRunner.query(`
      ALTER TABLE "stock_issuances"
      ADD COLUMN IF NOT EXISTS "session_id" integer,
      ADD COLUMN IF NOT EXISTS "cpo_id" integer
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_stock_issuances_session' AND table_name = 'stock_issuances'
        ) THEN
          ALTER TABLE "stock_issuances"
            ADD CONSTRAINT "fk_stock_issuances_session" FOREIGN KEY ("session_id")
            REFERENCES "issuance_sessions"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_stock_issuances_cpo' AND table_name = 'stock_issuances'
        ) THEN
          ALTER TABLE "stock_issuances"
            ADD CONSTRAINT "fk_stock_issuances_cpo" FOREIGN KEY ("cpo_id")
            REFERENCES "customer_purchase_orders"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stock_issuances_session_id" ON "stock_issuances"("session_id") WHERE "session_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stock_issuances_cpo_id" ON "stock_issuances"("cpo_id") WHERE "cpo_id" IS NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "issuance_batch_records"
      ADD COLUMN IF NOT EXISTS "session_id" integer,
      ADD COLUMN IF NOT EXISTS "cpo_id" integer
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_issuance_batch_records_session' AND table_name = 'issuance_batch_records'
        ) THEN
          ALTER TABLE "issuance_batch_records"
            ADD CONSTRAINT "fk_issuance_batch_records_session" FOREIGN KEY ("session_id")
            REFERENCES "issuance_sessions"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_issuance_batch_records_cpo' AND table_name = 'issuance_batch_records'
        ) THEN
          ALTER TABLE "issuance_batch_records"
            ADD CONSTRAINT "fk_issuance_batch_records_cpo" FOREIGN KEY ("cpo_id")
            REFERENCES "customer_purchase_orders"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_issuance_batch_records_session_id" ON "issuance_batch_records"("session_id") WHERE "session_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_issuance_batch_records_cpo_id" ON "issuance_batch_records"("cpo_id") WHERE "cpo_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "issuance_batch_records" DROP CONSTRAINT IF EXISTS "fk_issuance_batch_records_cpo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issuance_batch_records" DROP CONSTRAINT IF EXISTS "fk_issuance_batch_records_session"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_issuance_batch_records_cpo_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_issuance_batch_records_session_id"`);
    await queryRunner.query(
      `ALTER TABLE "issuance_batch_records" DROP COLUMN IF EXISTS "cpo_id", DROP COLUMN IF EXISTS "session_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "stock_issuances" DROP CONSTRAINT IF EXISTS "fk_stock_issuances_cpo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_issuances" DROP CONSTRAINT IF EXISTS "fk_stock_issuances_session"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stock_issuances_cpo_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stock_issuances_session_id"`);
    await queryRunner.query(
      `ALTER TABLE "stock_issuances" DROP COLUMN IF EXISTS "cpo_id", DROP COLUMN IF EXISTS "session_id"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_issuance_sessions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_issuance_sessions_issued_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_issuance_sessions_cpo_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_issuance_sessions_company_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "issuance_sessions"`);
  }
}
