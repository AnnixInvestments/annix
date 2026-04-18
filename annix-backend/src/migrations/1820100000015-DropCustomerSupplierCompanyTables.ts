import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropCustomerSupplierCompanyTables1820100000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS customer_companies CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS supplier_companies CASCADE");

    await queryRunner.query(`
      ALTER TABLE companies
        DROP COLUMN IF EXISTS legacy_customer_company_id,
        DROP COLUMN IF EXISTS legacy_supplier_company_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS legacy_customer_company_id INT,
        ADD COLUMN IF NOT EXISTS legacy_supplier_company_id INT
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_companies (
        id SERIAL PRIMARY KEY,
        legal_name VARCHAR(255) NOT NULL,
        trading_name VARCHAR(255),
        registration_number VARCHAR(50) UNIQUE,
        vat_number VARCHAR(50),
        industry VARCHAR(100),
        company_size VARCHAR(50),
        street_address TEXT,
        city VARCHAR(100),
        province_state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'South Africa',
        currency_code VARCHAR(3) DEFAULT 'ZAR',
        primary_phone VARCHAR(30),
        fax_number VARCHAR(30),
        general_email VARCHAR(255),
        website VARCHAR(255),
        bee_level INT,
        bee_certificate_expiry DATE,
        bee_verification_agency VARCHAR(255),
        is_exempt_micro_enterprise BOOLEAN DEFAULT false,
        bee_expiry_notification_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_companies (
        id SERIAL PRIMARY KEY,
        legal_name VARCHAR(255) NOT NULL,
        trading_name VARCHAR(255),
        registration_number VARCHAR(50) UNIQUE,
        tax_number VARCHAR(50),
        vat_number VARCHAR(50),
        street_address TEXT,
        address_line_2 TEXT,
        city VARCHAR(100),
        province_state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'South Africa',
        currency_code VARCHAR(3) DEFAULT 'ZAR',
        primary_contact_name VARCHAR(200),
        primary_contact_email VARCHAR(255),
        primary_contact_phone VARCHAR(30),
        primary_phone VARCHAR(30),
        fax_number VARCHAR(30),
        general_email VARCHAR(255),
        website VARCHAR(255),
        operational_regions JSONB DEFAULT '[]',
        industry_type VARCHAR(100),
        company_size VARCHAR(50),
        bee_level INT,
        bee_certificate_expiry DATE,
        bee_verification_agency VARCHAR(255),
        is_exempt_micro_enterprise BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }
}
