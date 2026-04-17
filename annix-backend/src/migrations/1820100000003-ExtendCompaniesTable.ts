import type { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendCompaniesTable1820100000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS trading_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
        ADD COLUMN IF NOT EXISTS company_size VARCHAR(50),
        ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'South Africa',
        ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'ZAR',
        ADD COLUMN IF NOT EXISTS bee_level INT,
        ADD COLUMN IF NOT EXISTS bee_certificate_expiry DATE,
        ADD COLUMN IF NOT EXISTS bee_verification_agency VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_exempt_micro_enterprise BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS bee_expiry_notification_sent_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS legacy_customer_company_id INT,
        ADD COLUMN IF NOT EXISTS legacy_supplier_company_id INT,
        ADD COLUMN IF NOT EXISTS legacy_comply_company_id INT,
        ADD COLUMN IF NOT EXISTS legacy_cv_company_id INT
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_legacy_customer
        ON companies (legacy_customer_company_id)
        WHERE legacy_customer_company_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_legacy_supplier
        ON companies (legacy_supplier_company_id)
        WHERE legacy_supplier_company_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_legacy_comply
        ON companies (legacy_comply_company_id)
        WHERE legacy_comply_company_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_legacy_cv
        ON companies (legacy_cv_company_id)
        WHERE legacy_cv_company_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_companies_legacy_cv");
    await queryRunner.query("DROP INDEX IF EXISTS idx_companies_legacy_comply");
    await queryRunner.query("DROP INDEX IF EXISTS idx_companies_legacy_supplier");
    await queryRunner.query("DROP INDEX IF EXISTS idx_companies_legacy_customer");

    await queryRunner.query(`
      ALTER TABLE companies
        DROP COLUMN IF EXISTS legacy_cv_company_id,
        DROP COLUMN IF EXISTS legacy_comply_company_id,
        DROP COLUMN IF EXISTS legacy_supplier_company_id,
        DROP COLUMN IF EXISTS legacy_customer_company_id,
        DROP COLUMN IF EXISTS bee_expiry_notification_sent_at,
        DROP COLUMN IF EXISTS is_exempt_micro_enterprise,
        DROP COLUMN IF EXISTS bee_verification_agency,
        DROP COLUMN IF EXISTS bee_certificate_expiry,
        DROP COLUMN IF EXISTS bee_level,
        DROP COLUMN IF EXISTS currency_code,
        DROP COLUMN IF EXISTS country,
        DROP COLUMN IF EXISTS company_size,
        DROP COLUMN IF EXISTS industry,
        DROP COLUMN IF EXISTS legal_name,
        DROP COLUMN IF EXISTS trading_name
    `);
  }
}
