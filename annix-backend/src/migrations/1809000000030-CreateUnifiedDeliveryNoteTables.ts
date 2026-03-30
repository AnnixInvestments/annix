import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUnifiedDeliveryNoteTables1809000000030 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_delivery_notes (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        source_module VARCHAR(30) NOT NULL,
        delivery_number VARCHAR(100) NOT NULL,
        delivery_note_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        supplier_name VARCHAR(255),
        supplier_contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
        delivery_date DATE,
        customer_reference VARCHAR(200),
        notes TEXT,
        document_path VARCHAR(500),
        received_by VARCHAR(255),
        created_by VARCHAR(100),
        extraction_status VARCHAR(50),
        extracted_data JSONB,
        linked_coc_id INT,
        version INT NOT NULL DEFAULT 1,
        previous_version_id INT REFERENCES platform_delivery_notes(id),
        version_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        stock_category VARCHAR(100),
        pod_page_numbers JSONB,
        firebase_uid VARCHAR(100),
        legacy_sc_delivery_note_id INT,
        legacy_rubber_delivery_note_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_delivery_note_items (
        id SERIAL PRIMARY KEY,
        delivery_note_id INT NOT NULL REFERENCES platform_delivery_notes(id) ON DELETE CASCADE,
        description VARCHAR(500),
        quantity INT,
        quantity_received DECIMAL(12,2),
        stock_item_id INT,
        photo_url TEXT,
        roll_number VARCHAR(100),
        batch_number_start VARCHAR(100),
        batch_number_end VARCHAR(100),
        weight_kg DECIMAL(12,3),
        roll_weight_kg DECIMAL(12,3),
        width_mm DECIMAL(8,2),
        thickness_mm DECIMAL(6,2),
        length_m DECIMAL(10,2),
        compound_type VARCHAR(100),
        item_category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
        linked_batch_ids JSONB NOT NULL DEFAULT '[]',
        coc_batch_numbers JSONB,
        theoretical_weight_kg DECIMAL(12,3),
        weight_deviation_pct DECIMAL(6,2),
        firebase_uid VARCHAR(100),
        legacy_sc_item_id INT,
        legacy_rubber_item_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pdn_company ON platform_delivery_notes (company_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pdn_source_module ON platform_delivery_notes (source_module)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pdn_legacy_sc
        ON platform_delivery_notes (legacy_sc_delivery_note_id)
        WHERE legacy_sc_delivery_note_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pdn_legacy_rubber
        ON platform_delivery_notes (legacy_rubber_delivery_note_id)
        WHERE legacy_rubber_delivery_note_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pdni_delivery_note ON platform_delivery_note_items (delivery_note_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS platform_delivery_note_items");
    await queryRunner.query("DROP TABLE IF EXISTS platform_delivery_notes");
  }
}
