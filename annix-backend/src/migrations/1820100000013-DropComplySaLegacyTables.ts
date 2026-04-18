import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropComplySaLegacyTables1820100000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_audit_logs CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_advisor_clients CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_notification_preferences CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_regulatory_updates CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_government_documents CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_users CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_companies CASCADE");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        registration_number VARCHAR(50),
        trading_name VARCHAR(255),
        industry VARCHAR(100),
        sector_code VARCHAR(20),
        employee_count INT NOT NULL DEFAULT 0,
        annual_turnover DECIMAL(14,2),
        vat_registered BOOLEAN NOT NULL DEFAULT false,
        vat_number VARCHAR(20),
        province VARCHAR(100),
        entity_type VARCHAR(20) NOT NULL DEFAULT 'company',
        phone VARCHAR(20),
        profile_complete BOOLEAN NOT NULL DEFAULT false,
        subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
        subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial',
        unified_company_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'owner',
        company_id INT REFERENCES comply_sa_companies(id) ON DELETE CASCADE,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verification_token VARCHAR(100),
        password_reset_token VARCHAR(100),
        password_reset_expires_at TIMESTAMPTZ,
        terms_accepted_at TIMESTAMPTZ,
        terms_version VARCHAR(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }
}
