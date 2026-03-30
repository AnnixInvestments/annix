import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUnifiedContactTable1809000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        contact_type VARCHAR(20) NOT NULL DEFAULT 'SUPPLIER',
        code VARCHAR(20),
        registration_number VARCHAR(50),
        vat_number VARCHAR(50),
        phone VARCHAR(50),
        email VARCHAR(255),
        contact_person VARCHAR(255),
        address_text TEXT,
        address_jsonb JSONB,
        notes TEXT,
        email_config JSONB,
        available_products JSONB NOT NULL DEFAULT '[]',
        firebase_uid VARCHAR(100),
        pricing_tier_id INT,
        pricing_tier_firebase_uid VARCHAR(100),
        sage_contact_id INT,
        sage_contact_type VARCHAR(20),
        legacy_sc_supplier_id INT,
        legacy_rubber_company_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(company_id, name, contact_type)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_company
        ON contacts (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_legacy_sc_supplier
        ON contacts (legacy_sc_supplier_id)
        WHERE legacy_sc_supplier_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_legacy_rubber
        ON contacts (legacy_rubber_company_id)
        WHERE legacy_rubber_company_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_firebase_uid
        ON contacts (firebase_uid)
        WHERE firebase_uid IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_contact_type
        ON contacts (company_id, contact_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS contacts");
  }
}
