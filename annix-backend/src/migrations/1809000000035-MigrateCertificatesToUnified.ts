import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateCertificatesToUnified1809000000035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO platform_certificates (
        company_id, source_module, certificate_category,
        batch_number, supplier_name,
        file_path, original_filename, file_size_bytes, mime_type,
        description, expiry_date, uploaded_by_name,
        processing_status, stock_item_id, job_card_id,
        legacy_sc_certificate_id, created_at, updated_at
      )
      SELECT
        sc_co.unified_company_id,
        'stock-control',
        sc.certificate_type,
        sc.batch_number,
        ss.name,
        sc.file_path,
        sc.original_filename,
        sc.file_size_bytes,
        sc.mime_type,
        sc.description,
        sc.expiry_date,
        sc.uploaded_by_name,
        'APPROVED',
        sc.stock_item_id,
        sc.job_card_id,
        sc.id,
        sc.created_at,
        sc.updated_at
      FROM supplier_certificates sc
      JOIN stock_control_companies sc_co ON sc_co.id = sc.company_id
      LEFT JOIN stock_control_supplier ss ON ss.id = sc.supplier_id
      WHERE sc_co.unified_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM platform_certificates pc
          WHERE pc.legacy_sc_certificate_id = sc.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO platform_certificates (
        company_id, source_module, certificate_category,
        file_path, original_filename, file_size_bytes, mime_type,
        description, expiry_date, uploaded_by_name,
        certificate_number, processing_status,
        legacy_sc_calibration_id, created_at, updated_at
      )
      SELECT
        sc_co.unified_company_id,
        'stock-control',
        'CALIBRATION',
        cc.file_path,
        cc.original_filename,
        cc.file_size_bytes,
        cc.mime_type,
        cc.description,
        cc.expiry_date,
        cc.uploaded_by_name,
        cc.certificate_number,
        CASE WHEN cc.is_active THEN 'APPROVED' ELSE 'PENDING' END,
        cc.id,
        cc.created_at,
        cc.updated_at
      FROM calibration_certificates cc
      JOIN stock_control_companies sc_co ON sc_co.id = cc.company_id
      WHERE sc_co.unified_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM platform_certificates pc
          WHERE pc.legacy_sc_calibration_id = cc.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO platform_certificates (
        company_id, source_module, certificate_category,
        certificate_number, supplier_name, supplier_contact_id,
        file_path, graph_pdf_path, compound_code,
        production_date, processing_status, extracted_data,
        review_notes, approved_by, approved_at,
        linked_delivery_note_id, linked_calender_roll_coc_id,
        exported_to_sage_at, order_number, ticket_number,
        version, version_status, firebase_uid,
        legacy_rubber_coc_id, created_at, updated_at
      )
      SELECT
        parent_co.id,
        'au-rubber',
        rsc.coc_type,
        rsc.coc_number,
        rc.name,
        ct.id,
        rsc.document_path,
        rsc.graph_pdf_path,
        rsc.compound_code,
        rsc.production_date,
        rsc.processing_status,
        rsc.extracted_data,
        rsc.review_notes,
        rsc.approved_by,
        rsc.approved_at,
        rsc.linked_delivery_note_id,
        rsc.linked_calender_roll_coc_id,
        rsc.exported_to_sage_at,
        rsc.order_number,
        rsc.ticket_number,
        rsc.version,
        rsc.version_status,
        rsc.firebase_uid,
        rsc.id,
        rsc.created_at,
        rsc.updated_at
      FROM rubber_supplier_cocs rsc
      LEFT JOIN rubber_company rc ON rc.id = rsc.supplier_company_id
      LEFT JOIN contacts ct ON ct.legacy_rubber_company_id = rc.id
      CROSS JOIN (
        SELECT id FROM companies WHERE legacy_rubber_company_id IS NOT NULL LIMIT 1
      ) parent_co
      WHERE NOT EXISTS (
        SELECT 1 FROM platform_certificates pc
        WHERE pc.legacy_rubber_coc_id = rsc.id
      )
    `);

    await queryRunner.query(`
      ALTER TABLE supplier_certificates
        ADD COLUMN IF NOT EXISTS unified_certificate_id INT REFERENCES platform_certificates(id)
    `);
    await queryRunner.query(`
      UPDATE supplier_certificates sc
      SET unified_certificate_id = pc.id
      FROM platform_certificates pc
      WHERE pc.legacy_sc_certificate_id = sc.id
        AND sc.unified_certificate_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_supplier_cocs
        ADD COLUMN IF NOT EXISTS unified_certificate_id INT REFERENCES platform_certificates(id)
    `);
    await queryRunner.query(`
      UPDATE rubber_supplier_cocs rsc
      SET unified_certificate_id = pc.id
      FROM platform_certificates pc
      WHERE pc.legacy_rubber_coc_id = rsc.id
        AND rsc.unified_certificate_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_supplier_cocs DROP COLUMN IF EXISTS unified_certificate_id
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_certificates DROP COLUMN IF EXISTS unified_certificate_id
    `);
    await queryRunner.query(`
      DELETE FROM platform_certificates
      WHERE legacy_sc_certificate_id IS NOT NULL
        OR legacy_sc_calibration_id IS NOT NULL
        OR legacy_rubber_coc_id IS NOT NULL
    `);
  }
}
