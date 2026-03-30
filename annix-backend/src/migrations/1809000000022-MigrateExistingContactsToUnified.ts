import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateExistingContactsToUnified1809000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO contacts (
        company_id, name, contact_type,
        registration_number, vat_number, phone, email,
        contact_person, address_text,
        legacy_sc_supplier_id, created_at, updated_at
      )
      SELECT DISTINCT ON (sc_co.unified_company_id, scs.name)
        sc_co.unified_company_id,
        scs.name,
        'SUPPLIER',
        scs.registration_number,
        scs.vat_number,
        scs.phone,
        scs.email,
        scs.contact_person,
        scs.address,
        scs.id,
        scs.created_at,
        scs.updated_at
      FROM stock_control_supplier scs
      JOIN stock_control_companies sc_co ON sc_co.id = scs.company_id
      WHERE sc_co.unified_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM contacts c
          WHERE c.legacy_sc_supplier_id = scs.id
        )
      ORDER BY sc_co.unified_company_id, scs.name, scs.updated_at DESC
      ON CONFLICT (company_id, name, contact_type) DO UPDATE
        SET legacy_sc_supplier_id = EXCLUDED.legacy_sc_supplier_id
    `);

    await queryRunner.query(`
      INSERT INTO contacts (
        company_id, name, contact_type, code,
        registration_number, vat_number, phone,
        contact_person, address_jsonb, notes, email_config,
        available_products, firebase_uid,
        pricing_tier_id, pricing_tier_firebase_uid,
        sage_contact_id, sage_contact_type,
        legacy_rubber_company_id, created_at, updated_at
      )
      SELECT DISTINCT ON (parent_co.id, rc.name, rc.company_type)
        parent_co.id,
        rc.name,
        rc.company_type,
        rc.code,
        rc.registration_number,
        rc.vat_number,
        rc.phone,
        rc.contact_person,
        rc.address,
        rc.notes,
        rc.email_config,
        rc.available_products,
        rc.firebase_uid,
        rc.pricing_tier_id,
        rc.pricing_tier_firebase_uid,
        rc.sage_contact_id,
        rc.sage_contact_type,
        rc.id,
        rc.created_at,
        rc.updated_at
      FROM rubber_company rc
      CROSS JOIN (
        SELECT id FROM companies
        WHERE legacy_rubber_company_id IS NOT NULL
        LIMIT 1
      ) parent_co
      WHERE rc.is_compound_owner = false
        AND NOT EXISTS (
          SELECT 1 FROM contacts c
          WHERE c.legacy_rubber_company_id = rc.id
        )
      ORDER BY parent_co.id, rc.name, rc.company_type, rc.updated_at DESC
      ON CONFLICT (company_id, name, contact_type) DO UPDATE
        SET legacy_rubber_company_id = EXCLUDED.legacy_rubber_company_id
    `);

    await queryRunner.query(`
      ALTER TABLE stock_control_supplier
        ADD COLUMN IF NOT EXISTS unified_contact_id INT REFERENCES contacts(id)
    `);

    await queryRunner.query(`
      UPDATE stock_control_supplier scs
      SET unified_contact_id = c.id
      FROM contacts c
      WHERE c.legacy_sc_supplier_id = scs.id
        AND scs.unified_contact_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_company
        ADD COLUMN IF NOT EXISTS unified_contact_id INT REFERENCES contacts(id)
    `);

    await queryRunner.query(`
      UPDATE rubber_company rc
      SET unified_contact_id = c.id
      FROM contacts c
      WHERE c.legacy_rubber_company_id = rc.id
        AND rc.unified_contact_id IS NULL
        AND rc.is_compound_owner = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_company DROP COLUMN IF EXISTS unified_contact_id
    `);

    await queryRunner.query(`
      ALTER TABLE stock_control_supplier DROP COLUMN IF EXISTS unified_contact_id
    `);

    await queryRunner.query(`
      DELETE FROM contacts
      WHERE legacy_sc_supplier_id IS NOT NULL OR legacy_rubber_company_id IS NOT NULL
    `);
  }
}
