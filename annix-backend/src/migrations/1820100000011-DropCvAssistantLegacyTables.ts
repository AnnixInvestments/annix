import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropCvAssistantLegacyTables1820100000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_push_subscriptions CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_external_jobs CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_job_market_sources CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_candidate_job_matches CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_candidate_references CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_candidates CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_job_postings CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_users CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS cv_assistant_companies CASCADE");

    await queryRunner.query(`
      COMMENT ON TABLE comply_sa_users IS 'DEPRECATED: Auth migrated to unified user table. Will be dropped after FK migration.'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE comply_sa_companies IS 'DEPRECATED: Migrated to unified companies table. Retained for comply_sa module FK references.'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE stock_control_users IS 'DEPRECATED: Auth migrated to unified user + stock_control_profiles. Retained for 30+ FK references from SC entities.'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE stock_control_companies IS 'DEPRECATED: Migrated to unified companies table. Retained for 80+ FK references from SC entities.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email_from_address VARCHAR(255),
        unified_company_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cv_assistant_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'recruiter',
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMPTZ,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMPTZ,
        company_id INT NOT NULL REFERENCES cv_assistant_companies(id),
        match_alert_threshold INT NOT NULL DEFAULT 80,
        digest_enabled BOOLEAN NOT NULL DEFAULT true,
        push_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      COMMENT ON TABLE comply_sa_users IS NULL
    `);
    await queryRunner.query(`
      COMMENT ON TABLE comply_sa_companies IS NULL
    `);
    await queryRunner.query(`
      COMMENT ON TABLE stock_control_users IS NULL
    `);
    await queryRunner.query(`
      COMMENT ON TABLE stock_control_companies IS NULL
    `);
  }
}
