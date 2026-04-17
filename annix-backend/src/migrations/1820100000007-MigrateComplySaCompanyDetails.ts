import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateComplySaCompanyDetails1820100000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO comply_sa_company_details (
        company_id, entity_type, employee_count, employee_count_range,
        annual_turnover, financial_year_end_month, municipality,
        sector_code, compliance_areas, profile_complete,
        subscription_tier, subscription_status,
        imports_exports, handles_personal_data, has_payroll,
        vat_registered, vat_submission_cycle, registration_date,
        business_address, id_number, passport_number, passport_country,
        sars_tax_reference, date_of_birth,
        trust_registration_number, masters_office, trustee_count,
        created_at, updated_at
      )
      SELECT
        c.id,
        csc.entity_type,
        csc.employee_count,
        csc.employee_count_range,
        csc.annual_turnover,
        csc.financial_year_end_month,
        csc.municipality,
        csc.sector_code,
        csc.compliance_areas,
        csc.profile_complete,
        csc.subscription_tier,
        csc.subscription_status,
        csc.imports_exports,
        csc.handles_personal_data,
        csc.has_payroll,
        csc.vat_registered,
        csc.vat_submission_cycle,
        csc.registration_date,
        csc.business_address,
        csc.id_number,
        csc.passport_number,
        csc.passport_country,
        csc.sars_tax_reference,
        csc.date_of_birth,
        csc.trust_registration_number,
        csc.masters_office,
        csc.trustee_count,
        csc.created_at,
        csc.updated_at
      FROM comply_sa_companies csc
      JOIN companies c ON c.legacy_comply_company_id = csc.id
      WHERE NOT EXISTS (
        SELECT 1 FROM comply_sa_company_details d WHERE d.company_id = c.id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM comply_sa_company_details
      WHERE company_id IN (
        SELECT id FROM companies WHERE legacy_comply_company_id IS NOT NULL
      )
    `);
  }
}
