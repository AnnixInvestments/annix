import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateDeliveryNotesToUnified1809000000031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO platform_delivery_notes (
        company_id, source_module, delivery_number, delivery_note_type, status,
        supplier_name, delivery_date, notes, document_path, received_by,
        extraction_status, extracted_data,
        legacy_sc_delivery_note_id, created_at, updated_at
      )
      SELECT
        sc_co.unified_company_id,
        'stock-control',
        dn.delivery_number,
        'GENERAL',
        CASE
          WHEN dn.extraction_status = 'completed' THEN 'EXTRACTED'
          ELSE 'PENDING'
        END,
        dn.supplier_name,
        dn.received_date,
        dn.notes,
        dn.photo_url,
        dn.received_by,
        dn.extraction_status,
        dn.extracted_data,
        dn.id,
        dn.created_at,
        dn.created_at
      FROM delivery_notes dn
      JOIN stock_control_companies sc_co ON sc_co.id = dn.company_id
      WHERE sc_co.unified_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM platform_delivery_notes pdn
          WHERE pdn.legacy_sc_delivery_note_id = dn.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO platform_delivery_note_items (
        delivery_note_id, description, quantity_received, stock_item_id, photo_url,
        item_category, legacy_sc_item_id, created_at, updated_at
      )
      SELECT
        pdn.id,
        si.name,
        dni.quantity_received,
        dni.stock_item_id,
        dni.photo_url,
        'GENERAL',
        dni.id,
        pdn.created_at,
        pdn.created_at
      FROM delivery_note_items dni
      JOIN platform_delivery_notes pdn ON pdn.legacy_sc_delivery_note_id = dni.delivery_note_id
      LEFT JOIN stock_items si ON si.id = dni.stock_item_id
      WHERE NOT EXISTS (
        SELECT 1 FROM platform_delivery_note_items pdni
        WHERE pdni.legacy_sc_item_id = dni.id
      )
    `);

    await queryRunner.query(`
      INSERT INTO platform_delivery_notes (
        company_id, source_module, delivery_number, delivery_note_type, status,
        supplier_name, supplier_contact_id, delivery_date, customer_reference,
        document_path, created_by, extraction_status, extracted_data,
        linked_coc_id, version, previous_version_id, version_status,
        stock_category, pod_page_numbers, firebase_uid,
        legacy_rubber_delivery_note_id, created_at, updated_at
      )
      SELECT
        parent_co.id,
        'au-rubber',
        rdn.delivery_note_number,
        rdn.delivery_note_type,
        rdn.status,
        rc.name,
        ct.id,
        rdn.delivery_date,
        rdn.customer_reference,
        rdn.document_path,
        rdn.created_by,
        CASE rdn.status
          WHEN 'EXTRACTED' THEN 'completed'
          WHEN 'APPROVED' THEN 'completed'
          WHEN 'LINKED' THEN 'completed'
          WHEN 'STOCK_CREATED' THEN 'completed'
          ELSE NULL
        END,
        rdn.extracted_data,
        rdn.linked_coc_id,
        rdn.version,
        NULL,
        rdn.version_status,
        rdn.stock_category,
        rdn.pod_page_numbers,
        rdn.firebase_uid,
        rdn.id,
        rdn.created_at,
        rdn.updated_at
      FROM rubber_delivery_notes rdn
      LEFT JOIN rubber_company rc ON rc.id = rdn.supplier_company_id
      LEFT JOIN contacts ct ON ct.legacy_rubber_company_id = rc.id
      CROSS JOIN (
        SELECT id FROM companies WHERE legacy_rubber_company_id IS NOT NULL LIMIT 1
      ) parent_co
      WHERE NOT EXISTS (
        SELECT 1 FROM platform_delivery_notes pdn
        WHERE pdn.legacy_rubber_delivery_note_id = rdn.id
      )
    `);

    await queryRunner.query(`
      UPDATE platform_delivery_notes pdn
      SET previous_version_id = prev_pdn.id
      FROM rubber_delivery_notes rdn
      JOIN platform_delivery_notes prev_pdn
        ON prev_pdn.legacy_rubber_delivery_note_id = rdn.previous_version_id
      WHERE pdn.legacy_rubber_delivery_note_id = rdn.id
        AND rdn.previous_version_id IS NOT NULL
        AND pdn.previous_version_id IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO platform_delivery_note_items (
        delivery_note_id, description, quantity, roll_number,
        batch_number_start, batch_number_end, weight_kg, roll_weight_kg,
        width_mm, thickness_mm, length_m, compound_type, item_category,
        linked_batch_ids, coc_batch_numbers, theoretical_weight_kg,
        weight_deviation_pct, firebase_uid,
        legacy_rubber_item_id, created_at, updated_at
      )
      SELECT
        pdn.id,
        rdni.description,
        rdni.quantity,
        rdni.roll_number,
        rdni.batch_number_start,
        rdni.batch_number_end,
        rdni.weight_kg,
        rdni.roll_weight_kg,
        rdni.width_mm,
        rdni.thickness_mm,
        rdni.length_m,
        rdni.compound_type,
        rdni.item_category,
        rdni.linked_batch_ids,
        rdni.coc_batch_numbers,
        rdni.theoretical_weight_kg,
        rdni.weight_deviation_pct,
        rdni.firebase_uid,
        rdni.id,
        rdni.created_at,
        rdni.updated_at
      FROM rubber_delivery_note_items rdni
      JOIN platform_delivery_notes pdn ON pdn.legacy_rubber_delivery_note_id = rdni.delivery_note_id
      WHERE NOT EXISTS (
        SELECT 1 FROM platform_delivery_note_items pdni
        WHERE pdni.legacy_rubber_item_id = rdni.id
      )
    `);

    await queryRunner.query(`
      ALTER TABLE delivery_notes
        ADD COLUMN IF NOT EXISTS unified_delivery_note_id INT REFERENCES platform_delivery_notes(id)
    `);
    await queryRunner.query(`
      UPDATE delivery_notes dn
      SET unified_delivery_note_id = pdn.id
      FROM platform_delivery_notes pdn
      WHERE pdn.legacy_sc_delivery_note_id = dn.id
        AND dn.unified_delivery_note_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
        ADD COLUMN IF NOT EXISTS unified_delivery_note_id INT REFERENCES platform_delivery_notes(id)
    `);
    await queryRunner.query(`
      UPDATE rubber_delivery_notes rdn
      SET unified_delivery_note_id = pdn.id
      FROM platform_delivery_notes pdn
      WHERE pdn.legacy_rubber_delivery_note_id = rdn.id
        AND rdn.unified_delivery_note_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes DROP COLUMN IF EXISTS unified_delivery_note_id
    `);
    await queryRunner.query(`
      ALTER TABLE delivery_notes DROP COLUMN IF EXISTS unified_delivery_note_id
    `);
    await queryRunner.query(`
      DELETE FROM platform_delivery_note_items
      WHERE legacy_sc_item_id IS NOT NULL OR legacy_rubber_item_id IS NOT NULL
    `);
    await queryRunner.query(`
      DELETE FROM platform_delivery_notes
      WHERE legacy_sc_delivery_note_id IS NOT NULL OR legacy_rubber_delivery_note_id IS NOT NULL
    `);
  }
}
