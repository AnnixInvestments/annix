import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCompanyProfile1809000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_company_profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        legal_name VARCHAR(255) NOT NULL,
        trading_name VARCHAR(255) NOT NULL,
        registration_number VARCHAR(100) NOT NULL,
        vat_number VARCHAR(50) NULL,
        entity_type VARCHAR(100) NULL,
        street_address VARCHAR(500) NULL,
        city VARCHAR(100) NULL,
        province VARCHAR(100) NULL,
        postal_code VARCHAR(20) NULL,
        country VARCHAR(100) NOT NULL DEFAULT 'South Africa',
        phone VARCHAR(50) NULL,
        general_email VARCHAR(255) NULL,
        support_email VARCHAR(255) NULL,
        privacy_email VARCHAR(255) NULL,
        website_url VARCHAR(255) NULL,
        information_officer_name VARCHAR(255) NULL,
        information_officer_email VARCHAR(255) NULL,
        jurisdiction VARCHAR(255) NOT NULL DEFAULT 'South Africa',
        primary_domain VARCHAR(255) NULL,
        no_reply_email VARCHAR(255) NULL,
        mailer_name VARCHAR(255) NULL,
        directors JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_company_profile_singleton CHECK (id = 1)
      )
    `);

    await queryRunner.query(`
      INSERT INTO admin_company_profile (
        id,
        legal_name,
        trading_name,
        registration_number,
        vat_number,
        entity_type,
        street_address,
        city,
        province,
        postal_code,
        country,
        phone,
        general_email,
        support_email,
        privacy_email,
        website_url,
        information_officer_name,
        information_officer_email,
        jurisdiction,
        primary_domain,
        no_reply_email,
        mailer_name,
        directors
      ) VALUES (
        1,
        'Annix (Pty) Ltd',
        'Annix',
        '[TO BE CONFIRMED]',
        '[TO BE CONFIRMED]',
        'Private Company (Pty) Ltd',
        '[TO BE CONFIRMED]',
        '[TO BE CONFIRMED]',
        'Gauteng',
        '[TO BE CONFIRMED]',
        'South Africa',
        '[TO BE CONFIRMED]',
        'info@annix.co.za',
        'support@annix.co.za',
        'privacy@annix.co.za',
        'https://annix.co.za',
        '[TO BE CONFIRMED]',
        'privacy@annix.co.za',
        'South Africa',
        'annix.co.za',
        'noreply@annix.co.za',
        'Annix',
        '[]'
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS admin_company_profile");
  }
}
