import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration 023 recreated stock_control_companies but only copied the name
 * and feature flags — branding fields (branding_type, primary_color, etc.)
 * were left at their defaults, wiping custom branding for all companies.
 * This migration restores them from the unified companies table.
 */
export class RestoreSCBrandingFromUnified1820100000024 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE stock_control_companies sc
      SET
        branding_type = c.branding_type,
        website_url = c.website_url,
        branding_authorized = COALESCE(c.branding_authorized, false),
        primary_color = c.primary_color,
        accent_color = c.accent_color,
        logo_url = c.logo_url,
        hero_image_url = c.hero_image_url,
        registration_number = c.registration_number,
        vat_number = c.vat_number,
        street_address = c.street_address,
        city = c.city,
        province = c.province,
        postal_code = c.postal_code,
        phone = c.phone,
        email = c.email,
        smtp_host = c.smtp_host,
        smtp_port = c.smtp_port,
        smtp_user = c.smtp_user,
        smtp_pass_encrypted = c.smtp_pass_encrypted,
        smtp_from_name = c.smtp_from_name,
        smtp_from_email = c.smtp_from_email,
        notification_emails = COALESCE(c.notification_emails, '[]'::jsonb),
        updated_at = NOW()
      FROM companies c
      WHERE sc.unified_company_id = c.id
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No rollback — data restoration only
  }
}
