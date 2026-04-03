import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRubberAccountingTables1811700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rubber_monthly_accounts" (
        "id" SERIAL PRIMARY KEY,
        "firebase_uid" varchar(100) NOT NULL UNIQUE,
        "period_year" integer NOT NULL,
        "period_month" integer NOT NULL,
        "account_type" varchar(20) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "pdf_path" varchar(500),
        "generated_at" TIMESTAMP,
        "generated_by" varchar(100),
        "snapshot_data" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rubber_monthly_accounts_period"
        ON "rubber_monthly_accounts" ("period_year", "period_month")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rubber_monthly_accounts_type"
        ON "rubber_monthly_accounts" ("account_type")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rubber_account_sign_offs" (
        "id" SERIAL PRIMARY KEY,
        "monthly_account_id" integer NOT NULL,
        "director_name" varchar(200) NOT NULL,
        "director_email" varchar(200) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "signed_at" TIMESTAMP,
        "sign_off_token" varchar(100) NOT NULL UNIQUE,
        "token_expires_at" TIMESTAMP NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sign_off_monthly_account" FOREIGN KEY ("monthly_account_id")
          REFERENCES "rubber_monthly_accounts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rubber_sign_offs_token"
        ON "rubber_account_sign_offs" ("sign_off_token")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rubber_statement_reconciliations" (
        "id" SERIAL PRIMARY KEY,
        "firebase_uid" varchar(100) NOT NULL UNIQUE,
        "company_id" integer NOT NULL,
        "period_year" integer NOT NULL,
        "period_month" integer NOT NULL,
        "statement_path" varchar(500) NOT NULL,
        "original_filename" varchar(300) NOT NULL,
        "extracted_data" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "match_summary" jsonb,
        "resolved_by" varchar(100),
        "resolved_at" TIMESTAMP,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_reconciliation_company" FOREIGN KEY ("company_id")
          REFERENCES "rubber_company"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rubber_reconciliations_company_period"
        ON "rubber_statement_reconciliations" ("company_id", "period_year", "period_month")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rubber_company_directors" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(200) NOT NULL,
        "title" varchar(100) NOT NULL,
        "email" varchar(200) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "rubber_company"
          ADD COLUMN "discount_percent" decimal(5,2) DEFAULT 0.00;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_account_sign_offs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_monthly_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_statement_reconciliations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rubber_company_directors"`);
    await queryRunner.query(`
      ALTER TABLE "rubber_company" DROP COLUMN IF EXISTS "discount_percent"
    `);
  }
}
