import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUnifiedCompanyTables1809000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company_type VARCHAR(20) NOT NULL DEFAULT 'MANUFACTURER',
        registration_number VARCHAR(50),
        vat_number VARCHAR(50),
        phone VARCHAR(30),
        email VARCHAR(255),
        contact_person VARCHAR(200),
        street_address VARCHAR(500),
        city VARCHAR(100),
        province VARCHAR(50),
        postal_code VARCHAR(10),
        address_jsonb JSONB,
        notes TEXT,
        website_url VARCHAR(500),
        branding_type VARCHAR(20) NOT NULL DEFAULT 'annix',
        branding_authorized BOOLEAN NOT NULL DEFAULT false,
        primary_color VARCHAR(20),
        accent_color VARCHAR(20),
        logo_url VARCHAR(500),
        hero_image_url VARCHAR(500),
        smtp_host VARCHAR(255),
        smtp_port INT,
        smtp_user VARCHAR(255),
        smtp_pass_encrypted BYTEA,
        smtp_from_name VARCHAR(255),
        smtp_from_email VARCHAR(255),
        notification_emails JSONB NOT NULL DEFAULT '[]',
        email_config JSONB,
        piping_loss_factor_pct INT NOT NULL DEFAULT 45,
        flat_plate_loss_factor_pct INT NOT NULL DEFAULT 20,
        structural_steel_loss_factor_pct INT NOT NULL DEFAULT 30,
        qc_enabled BOOLEAN NOT NULL DEFAULT true,
        messaging_enabled BOOLEAN NOT NULL DEFAULT false,
        staff_leave_enabled BOOLEAN NOT NULL DEFAULT false,
        workflow_enabled BOOLEAN NOT NULL DEFAULT true,
        firebase_uid VARCHAR(100),
        legacy_sc_company_id INT,
        legacy_rubber_company_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_module_subscriptions (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        module_code VARCHAR(50) NOT NULL,
        enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        disabled_at TIMESTAMPTZ,
        UNIQUE(company_id, module_code)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_legacy_sc
        ON companies (legacy_sc_company_id)
        WHERE legacy_sc_company_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_legacy_rubber
        ON companies (legacy_rubber_company_id)
        WHERE legacy_rubber_company_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_firebase_uid
        ON companies (firebase_uid)
        WHERE firebase_uid IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_company_module_subs_company
        ON company_module_subscriptions (company_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS company_module_subscriptions");
    await queryRunner.query("DROP TABLE IF EXISTS companies");
  }
}
