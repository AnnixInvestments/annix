import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQcpApprovalWorkflow1815000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qcp_approval_tokens (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        control_plan_id integer NOT NULL,
        control_plan_version integer NOT NULL DEFAULT 1,
        party_role varchar(20) NOT NULL,
        recipient_email varchar(255) NOT NULL,
        recipient_name varchar(255),
        token varchar(100) NOT NULL UNIQUE,
        token_expires_at timestamp NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        activities_snapshot jsonb,
        submitted_activities jsonb,
        line_remarks jsonb,
        overall_comments text,
        signature_name varchar(255),
        signature_url text,
        signed_at timestamp,
        sent_by_party varchar(20),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qcp_approval_tokens_token
        ON qcp_approval_tokens (token)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qcp_approval_tokens_plan
        ON qcp_approval_tokens (control_plan_id, status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qcp_customer_preferences (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        customer_name varchar(255) NOT NULL,
        customer_email varchar(255),
        plan_type varchar(30) NOT NULL,
        intervention_defaults jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        UNIQUE (company_id, customer_name, plan_type)
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_control_plans ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_control_plans ADD COLUMN IF NOT EXISTS approval_status varchar(30) NOT NULL DEFAULT 'draft';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_control_plans ADD COLUMN IF NOT EXISTS client_email varchar(255);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_control_plans ADD COLUMN IF NOT EXISTS third_party_email varchar(255);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_control_plans ADD COLUMN IF NOT EXISTS active_parties jsonb;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE qc_control_plans DROP COLUMN IF EXISTS active_parties");
    await queryRunner.query("ALTER TABLE qc_control_plans DROP COLUMN IF EXISTS third_party_email");
    await queryRunner.query("ALTER TABLE qc_control_plans DROP COLUMN IF EXISTS client_email");
    await queryRunner.query("ALTER TABLE qc_control_plans DROP COLUMN IF EXISTS approval_status");
    await queryRunner.query("ALTER TABLE qc_control_plans DROP COLUMN IF EXISTS version");
    await queryRunner.query("DROP TABLE IF EXISTS qcp_customer_preferences");
    await queryRunner.query("DROP TABLE IF EXISTS qcp_approval_tokens");
  }
}
