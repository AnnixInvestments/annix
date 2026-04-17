import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateComplySaCompanyDetails1820100000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comply_sa_company_details (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        entity_type VARCHAR(20) NOT NULL DEFAULT 'company',
        employee_count INT NOT NULL DEFAULT 0,
        employee_count_range VARCHAR(20),
        annual_turnover DECIMAL(14,2),
        financial_year_end_month INT,
        municipality VARCHAR(100),
        sector_code VARCHAR(20),
        compliance_areas JSONB,
        profile_complete BOOLEAN NOT NULL DEFAULT false,
        subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
        subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial',
        imports_exports BOOLEAN NOT NULL DEFAULT false,
        handles_personal_data BOOLEAN NOT NULL DEFAULT false,
        has_payroll BOOLEAN NOT NULL DEFAULT false,
        vat_registered BOOLEAN NOT NULL DEFAULT false,
        vat_submission_cycle VARCHAR(10),
        registration_date VARCHAR(50),
        business_address TEXT,
        id_number VARCHAR(255),
        passport_number VARCHAR(255),
        passport_country VARCHAR(100),
        sars_tax_reference VARCHAR(255),
        date_of_birth VARCHAR(255),
        trust_registration_number VARCHAR(50),
        masters_office VARCHAR(100),
        trustee_count INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_comply_details_company_id UNIQUE (company_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS comply_sa_company_details");
  }
}
