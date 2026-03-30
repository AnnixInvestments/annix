import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateInvoicesToUnified1809000000033 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO platform_invoices (
        company_id, source_module, invoice_type, invoice_number, invoice_date,
        supplier_name, total_amount, vat_amount, document_path,
        extraction_status, status, extracted_data,
        approved_by, approved_at, exported_to_sage_at,
        linked_delivery_note_ids,
        legacy_sc_invoice_id, created_at, updated_at
      )
      SELECT
        sc_co.unified_company_id,
        'stock-control',
        'SUPPLIER',
        si.invoice_number,
        si.invoice_date,
        si.supplier_name,
        si.total_amount,
        si.vat_amount,
        si.scan_url,
        UPPER(COALESCE(si.extraction_status, 'PENDING')),
        CASE
          WHEN si.approved_by IS NOT NULL THEN 'APPROVED'
          WHEN si.extraction_status = 'completed' THEN 'EXTRACTED'
          ELSE 'PENDING'
        END,
        si.extracted_data,
        u.name,
        si.approved_at,
        si.exported_to_sage_at,
        si.linked_delivery_note_ids,
        si.id,
        si.created_at,
        si.updated_at
      FROM supplier_invoices si
      JOIN stock_control_companies sc_co ON sc_co.id = si.company_id
      LEFT JOIN stock_control_users u ON u.id = si.approved_by
      WHERE sc_co.unified_company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM platform_invoices pinv
          WHERE pinv.legacy_sc_invoice_id = si.id
        )
    `);

    await queryRunner.query(`
      INSERT INTO platform_invoices (
        company_id, source_module, invoice_type, invoice_number, invoice_date,
        supplier_name, supplier_contact_id, total_amount, vat_amount,
        document_path, extraction_status, status, extracted_data,
        exported_to_sage_at, sage_invoice_id, posted_to_sage_at,
        created_by, version, version_status, firebase_uid,
        legacy_rubber_invoice_id, created_at, updated_at
      )
      SELECT
        parent_co.id,
        'au-rubber',
        rti.invoice_type,
        rti.invoice_number,
        rti.invoice_date,
        rc.name,
        ct.id,
        rti.total_amount,
        rti.vat_amount,
        rti.document_path,
        CASE rti.status
          WHEN 'EXTRACTED' THEN 'COMPLETED'
          WHEN 'APPROVED' THEN 'COMPLETED'
          ELSE 'PENDING'
        END,
        rti.status,
        rti.extracted_data,
        rti.exported_to_sage_at,
        rti.sage_invoice_id,
        rti.posted_to_sage_at,
        rti.created_by,
        rti.version,
        rti.version_status,
        rti.firebase_uid,
        rti.id,
        rti.created_at,
        rti.updated_at
      FROM rubber_tax_invoices rti
      LEFT JOIN rubber_company rc ON rc.id = rti.company_id
      LEFT JOIN contacts ct ON ct.legacy_rubber_company_id = rc.id
      CROSS JOIN (
        SELECT id FROM companies WHERE legacy_rubber_company_id IS NOT NULL LIMIT 1
      ) parent_co
      WHERE NOT EXISTS (
        SELECT 1 FROM platform_invoices pinv
        WHERE pinv.legacy_rubber_invoice_id = rti.id
      )
    `);

    await queryRunner.query(`
      ALTER TABLE supplier_invoices
        ADD COLUMN IF NOT EXISTS unified_invoice_id INT REFERENCES platform_invoices(id)
    `);
    await queryRunner.query(`
      UPDATE supplier_invoices si
      SET unified_invoice_id = pinv.id
      FROM platform_invoices pinv
      WHERE pinv.legacy_sc_invoice_id = si.id
        AND si.unified_invoice_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
        ADD COLUMN IF NOT EXISTS unified_invoice_id INT REFERENCES platform_invoices(id)
    `);
    await queryRunner.query(`
      UPDATE rubber_tax_invoices rti
      SET unified_invoice_id = pinv.id
      FROM platform_invoices pinv
      WHERE pinv.legacy_rubber_invoice_id = rti.id
        AND rti.unified_invoice_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices DROP COLUMN IF EXISTS unified_invoice_id
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_invoices DROP COLUMN IF EXISTS unified_invoice_id
    `);
    await queryRunner.query(`
      DELETE FROM platform_invoices
      WHERE legacy_sc_invoice_id IS NOT NULL OR legacy_rubber_invoice_id IS NOT NULL
    `);
  }
}
