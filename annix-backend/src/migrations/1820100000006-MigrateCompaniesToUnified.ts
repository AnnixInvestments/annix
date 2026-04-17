import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateCompaniesToUnified1820100000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO companies (
        name, legal_name, trading_name, company_type,
        registration_number, vat_number, phone, email,
        street_address, city, province, postal_code,
        country, currency_code, industry, company_size,
        bee_level, bee_certificate_expiry, bee_verification_agency,
        is_exempt_micro_enterprise, bee_expiry_notification_sent_at,
        website_url, legacy_customer_company_id,
        created_at, updated_at
      )
      SELECT
        cc.legal_name,
        cc.legal_name,
        cc.trading_name,
        'CUSTOMER',
        cc.registration_number,
        cc.vat_number,
        cc.primary_phone,
        cc.general_email,
        cc.street_address,
        cc.city,
        cc.province_state,
        cc.postal_code,
        cc.country,
        cc.currency_code,
        cc.industry,
        cc.company_size,
        cc.bee_level,
        cc.bee_certificate_expiry,
        cc.bee_verification_agency,
        cc.is_exempt_micro_enterprise,
        cc.bee_expiry_notification_sent_at,
        cc.website,
        cc.id,
        cc.created_at,
        cc.updated_at
      FROM customer_companies cc
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c WHERE c.legacy_customer_company_id = cc.id
      )
    `);

    await queryRunner.query(`
      ALTER TABLE customer_companies
        ADD COLUMN IF NOT EXISTS unified_company_id INT REFERENCES companies(id)
    `);

    await queryRunner.query(`
      UPDATE customer_companies cc
      SET unified_company_id = c.id
      FROM companies c
      WHERE c.legacy_customer_company_id = cc.id
        AND cc.unified_company_id IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO companies (
        name, legal_name, trading_name, company_type,
        registration_number, vat_number, phone, email,
        street_address, city, province, postal_code,
        country, currency_code, industry,
        company_size, bee_level, bee_certificate_expiry,
        bee_verification_agency, is_exempt_micro_enterprise,
        website_url, legacy_supplier_company_id,
        created_at, updated_at
      )
      SELECT
        sc.legal_name,
        sc.legal_name,
        sc.trading_name,
        'SUPPLIER',
        sc.registration_number,
        sc.vat_number,
        sc.primary_phone,
        sc.general_email,
        sc.street_address,
        sc.city,
        sc.province_state,
        sc.postal_code,
        sc.country,
        sc.currency_code,
        sc.industry_type,
        sc.company_size,
        sc.bee_level,
        sc.bee_certificate_expiry,
        sc.bee_verification_agency,
        sc.is_exempt_micro_enterprise,
        sc.website,
        sc.id,
        sc.created_at,
        sc.updated_at
      FROM supplier_companies sc
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c WHERE c.legacy_supplier_company_id = sc.id
      )
    `);

    await queryRunner.query(`
      ALTER TABLE supplier_companies
        ADD COLUMN IF NOT EXISTS unified_company_id INT REFERENCES companies(id)
    `);

    await queryRunner.query(`
      UPDATE supplier_companies sc
      SET unified_company_id = c.id
      FROM companies c
      WHERE c.legacy_supplier_company_id = sc.id
        AND sc.unified_company_id IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO companies (
        name, company_type, registration_number, vat_number,
        phone, province, industry,
        legacy_comply_company_id,
        created_at, updated_at
      )
      SELECT
        csc.name,
        'CUSTOMER',
        csc.registration_number,
        CASE WHEN csc.vat_registered THEN csc.vat_number ELSE NULL END,
        csc.phone,
        csc.province,
        csc.industry,
        csc.id,
        csc.created_at,
        csc.updated_at
      FROM comply_sa_companies csc
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c WHERE c.legacy_comply_company_id = csc.id
      )
    `);

    await queryRunner.query(`
      ALTER TABLE comply_sa_companies
        ADD COLUMN IF NOT EXISTS unified_company_id INT REFERENCES companies(id)
    `);

    await queryRunner.query(`
      UPDATE comply_sa_companies csc
      SET unified_company_id = c.id
      FROM companies c
      WHERE c.legacy_comply_company_id = csc.id
        AND csc.unified_company_id IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO companies (
        name, company_type,
        legacy_cv_company_id,
        created_at, updated_at
      )
      SELECT
        cvc.name,
        'CUSTOMER',
        cvc.id,
        cvc.created_at,
        cvc.updated_at
      FROM cv_assistant_companies cvc
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c WHERE c.legacy_cv_company_id = cvc.id
      )
    `);

    await queryRunner.query(`
      ALTER TABLE cv_assistant_companies
        ADD COLUMN IF NOT EXISTS unified_company_id INT REFERENCES companies(id)
    `);

    await queryRunner.query(`
      UPDATE cv_assistant_companies cvc
      SET unified_company_id = c.id
      FROM companies c
      WHERE c.legacy_cv_company_id = cvc.id
        AND cvc.unified_company_id IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO companies (
        name, company_type, registration_number, vat_number,
        phone, contact_person, notes,
        firebase_uid,
        legacy_rubber_company_id,
        created_at, updated_at
      )
      SELECT
        rc.name,
        CASE rc.company_type
          WHEN 'CUSTOMER' THEN 'CUSTOMER'
          WHEN 'SUPPLIER' THEN 'SUPPLIER'
          ELSE 'CUSTOMER'
        END,
        rc.registration_number,
        rc.vat_number,
        rc.phone,
        rc.contact_person,
        rc.notes,
        rc.firebase_uid,
        rc.id,
        rc.created_at,
        rc.updated_at
      FROM rubber_company rc
      WHERE rc.unified_company_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM companies c WHERE c.legacy_rubber_company_id = rc.id
        )
    `);

    await queryRunner.query(`
      UPDATE rubber_company rc
      SET unified_company_id = c.id
      FROM companies c
      WHERE c.legacy_rubber_company_id = rc.id
        AND rc.unified_company_id IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO company_module_subscriptions (company_id, module_code, enabled_at)
      SELECT c.id, 'comply-sa', NOW()
      FROM companies c
      WHERE c.legacy_comply_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM company_module_subscriptions cms
          WHERE cms.company_id = c.id AND cms.module_code = 'comply-sa'
        )
    `);

    await queryRunner.query(`
      INSERT INTO company_module_subscriptions (company_id, module_code, enabled_at)
      SELECT c.id, 'cv-assistant', NOW()
      FROM companies c
      WHERE c.legacy_cv_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM company_module_subscriptions cms
          WHERE cms.company_id = c.id AND cms.module_code = 'cv-assistant'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM company_module_subscriptions
      WHERE module_code IN ('comply-sa', 'cv-assistant')
    `);

    await queryRunner.query(`
      UPDATE rubber_company rc
      SET unified_company_id = NULL
      FROM companies c
      WHERE c.legacy_rubber_company_id = rc.id
        AND c.legacy_sc_company_id IS NULL
    `);

    await queryRunner.query("DELETE FROM companies WHERE legacy_cv_company_id IS NOT NULL");
    await queryRunner.query("DELETE FROM companies WHERE legacy_comply_company_id IS NOT NULL");
    await queryRunner.query("DELETE FROM companies WHERE legacy_supplier_company_id IS NOT NULL");
    await queryRunner.query("DELETE FROM companies WHERE legacy_customer_company_id IS NOT NULL");

    await queryRunner.query(
      "ALTER TABLE cv_assistant_companies DROP COLUMN IF EXISTS unified_company_id",
    );
    await queryRunner.query(
      "ALTER TABLE comply_sa_companies DROP COLUMN IF EXISTS unified_company_id",
    );
    await queryRunner.query(
      "ALTER TABLE supplier_companies DROP COLUMN IF EXISTS unified_company_id",
    );
    await queryRunner.query(
      "ALTER TABLE customer_companies DROP COLUMN IF EXISTS unified_company_id",
    );
  }
}
