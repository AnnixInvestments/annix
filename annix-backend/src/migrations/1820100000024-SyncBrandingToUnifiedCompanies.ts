import type { MigrationInterface, QueryRunner } from "typeorm";

export class SyncBrandingToUnifiedCompanies1820100000024 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The original MigrateCompaniesToUnified (migration 006) never copied branding
    // fields from stock_control_companies to the unified companies table. The auth
    // service's currentUser() reads branding from the unified table, so custom
    // branding (logo, colors, etc.) was invisible to logged-in users.
    //
    // Copy branding fields from stock_control_companies → companies for any
    // company that has custom branding or branding data.

    const scTableExists = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'stock_control_companies'`,
    );
    if (Number(scTableExists[0]?.cnt) === 0) {
      return;
    }

    await queryRunner.query(`
      UPDATE companies c
      SET
        branding_type = COALESCE(sc.branding_type, c.branding_type),
        branding_authorized = COALESCE(sc.branding_authorized, c.branding_authorized),
        primary_color = COALESCE(sc.primary_color, c.primary_color),
        accent_color = COALESCE(sc.accent_color, c.accent_color),
        logo_url = COALESCE(sc.logo_url, c.logo_url),
        hero_image_url = COALESCE(sc.hero_image_url, c.hero_image_url),
        website_url = COALESCE(sc.website_url, c.website_url),
        smtp_host = COALESCE(sc.smtp_host, c.smtp_host),
        smtp_port = COALESCE(sc.smtp_port, c.smtp_port),
        smtp_user = COALESCE(sc.smtp_user, c.smtp_user),
        smtp_pass_encrypted = COALESCE(sc.smtp_pass_encrypted, c.smtp_pass_encrypted),
        smtp_from_name = COALESCE(sc.smtp_from_name, c.smtp_from_name),
        smtp_from_email = COALESCE(sc.smtp_from_email, c.smtp_from_email),
        notification_emails = CASE
          WHEN sc.notification_emails IS NOT NULL AND sc.notification_emails != '[]'::jsonb
          THEN sc.notification_emails
          ELSE c.notification_emails
        END,
        qc_enabled = sc.qc_enabled,
        workflow_enabled = sc.workflow_enabled,
        registration_number = COALESCE(sc.registration_number, c.registration_number),
        vat_number = COALESCE(sc.vat_number, c.vat_number),
        street_address = COALESCE(sc.street_address, c.street_address),
        city = COALESCE(sc.city, c.city),
        province = COALESCE(sc.province, c.province),
        postal_code = COALESCE(sc.postal_code, c.postal_code),
        phone = COALESCE(sc.phone, c.phone),
        email = COALESCE(sc.email, c.email),
        updated_at = NOW()
      FROM stock_control_companies sc
      WHERE sc.unified_company_id = c.id
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No rollback — branding data is additive, not destructive
  }
}
