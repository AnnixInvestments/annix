import { MigrationInterface, QueryRunner } from "typeorm";

export class MoveInvoiceDeliveryNotes1801000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO supplier_invoices (
        company_id,
        invoice_number,
        supplier_name,
        invoice_date,
        scan_url,
        extraction_status,
        extracted_data,
        created_at,
        updated_at
      )
      SELECT
        dn.company_id,
        dn.delivery_number,
        dn.supplier_name,
        dn.received_date::date,
        dn.photo_url,
        'pending',
        dn.extracted_data,
        dn.created_at,
        NOW()
      FROM delivery_notes dn
      WHERE dn.delivery_number LIKE 'DN-%'
        AND NOT EXISTS (
          SELECT 1 FROM supplier_invoices si
          WHERE si.invoice_number = dn.delivery_number
            AND si.company_id = dn.company_id
        )
    `);

    await queryRunner.query(`
      DELETE FROM delivery_note_items
      WHERE delivery_note_id IN (
        SELECT id FROM delivery_notes WHERE delivery_number LIKE 'DN-%'
      )
    `);

    await queryRunner.query(`
      DELETE FROM delivery_notes
      WHERE delivery_number LIKE 'DN-%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO delivery_notes (
        company_id,
        delivery_number,
        supplier_name,
        received_date,
        photo_url,
        extraction_status,
        extracted_data,
        created_at
      )
      SELECT
        si.company_id,
        si.invoice_number,
        si.supplier_name,
        si.invoice_date,
        si.scan_url,
        'completed',
        si.extracted_data,
        si.created_at
      FROM supplier_invoices si
      WHERE si.invoice_number LIKE 'DN-%'
        AND NOT EXISTS (
          SELECT 1 FROM delivery_notes dn
          WHERE dn.delivery_number = si.invoice_number
            AND dn.company_id = si.company_id
        )
    `);

    await queryRunner.query(`
      DELETE FROM supplier_invoices
      WHERE invoice_number LIKE 'DN-%'
        AND delivery_note_id IS NULL
    `);
  }
}
