import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateExistingCompaniesToUnified1809000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO companies (
        name, company_type, registration_number, vat_number, phone, email,
        street_address, city, province, postal_code,
        website_url, branding_type, branding_authorized,
        primary_color, accent_color, logo_url, hero_image_url,
        smtp_host, smtp_port, smtp_user, smtp_pass_encrypted,
        smtp_from_name, smtp_from_email, notification_emails,
        piping_loss_factor_pct, flat_plate_loss_factor_pct, structural_steel_loss_factor_pct,
        qc_enabled, messaging_enabled, staff_leave_enabled, workflow_enabled,
        legacy_sc_company_id, created_at, updated_at
      )
      SELECT
        sc.name, 'MANUFACTURER', sc.registration_number, sc.vat_number, sc.phone, sc.email,
        sc.street_address, sc.city, sc.province, sc.postal_code,
        sc.website_url, sc.branding_type, sc.branding_authorized,
        sc.primary_color, sc.accent_color, sc.logo_url, sc.hero_image_url,
        sc.smtp_host, sc.smtp_port, sc.smtp_user, sc.smtp_pass_encrypted,
        sc.smtp_from_name, sc.smtp_from_email, sc.notification_emails,
        sc.piping_loss_factor_pct, sc.flat_plate_loss_factor_pct, sc.structural_steel_loss_factor_pct,
        sc.qc_enabled, sc.messaging_enabled, sc.staff_leave_enabled, sc.workflow_enabled,
        sc.id, sc.created_at, sc.updated_at
      FROM stock_control_companies sc
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c WHERE c.legacy_sc_company_id = sc.id
      )
    `);

    await queryRunner.query(`
      INSERT INTO company_module_subscriptions (company_id, module_code)
      SELECT c.id, 'stock-control'
      FROM companies c
      WHERE c.legacy_sc_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM company_module_subscriptions cms
          WHERE cms.company_id = c.id AND cms.module_code = 'stock-control'
        )
    `);

    await queryRunner.query(`
      INSERT INTO companies (
        name, company_type, registration_number, vat_number, phone,
        contact_person, address_jsonb, notes, email_config,
        firebase_uid, legacy_rubber_company_id, created_at, updated_at
      )
      SELECT
        rc.name, 'MANUFACTURER', rc.registration_number, rc.vat_number, rc.phone,
        rc.contact_person, rc.address, rc.notes, rc.email_config,
        rc.firebase_uid, rc.id, rc.created_at, rc.updated_at
      FROM rubber_company rc
      WHERE rc.is_compound_owner = true
        AND NOT EXISTS (
          SELECT 1 FROM companies c WHERE c.legacy_rubber_company_id = rc.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO company_module_subscriptions (company_id, module_code)
      SELECT c.id, 'au-rubber'
      FROM companies c
      WHERE c.legacy_rubber_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM company_module_subscriptions cms
          WHERE cms.company_id = c.id AND cms.module_code = 'au-rubber'
        )
    `);

    await queryRunner.query(`
      ALTER TABLE stock_control_companies
        ADD COLUMN IF NOT EXISTS unified_company_id INT REFERENCES companies(id)
    `);

    await queryRunner.query(`
      UPDATE stock_control_companies sc
      SET unified_company_id = c.id
      FROM companies c
      WHERE c.legacy_sc_company_id = sc.id
        AND sc.unified_company_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_company
        ADD COLUMN IF NOT EXISTS unified_company_id INT REFERENCES companies(id)
    `);

    await queryRunner.query(`
      UPDATE rubber_company rc
      SET unified_company_id = c.id
      FROM companies c
      WHERE c.legacy_rubber_company_id = rc.id
        AND rc.unified_company_id IS NULL
        AND rc.is_compound_owner = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_company DROP COLUMN IF EXISTS unified_company_id
    `);

    await queryRunner.query(`
      ALTER TABLE stock_control_companies DROP COLUMN IF EXISTS unified_company_id
    `);

    await queryRunner.query(`
      DELETE FROM company_module_subscriptions
      WHERE company_id IN (
        SELECT id FROM companies
        WHERE legacy_sc_company_id IS NOT NULL OR legacy_rubber_company_id IS NOT NULL
      )
    `);

    await queryRunner.query(`
      DELETE FROM companies
      WHERE legacy_sc_company_id IS NOT NULL OR legacy_rubber_company_id IS NOT NULL
    `);
  }
}
