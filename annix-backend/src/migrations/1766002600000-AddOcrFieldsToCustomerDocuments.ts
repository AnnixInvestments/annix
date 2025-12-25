import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOcrFieldsToCustomerDocuments1766002600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add ocr_extracted_data column (JSONB to store extracted OCR data)
    await queryRunner.addColumn(
      'customer_documents',
      new TableColumn({
        name: 'ocr_extracted_data',
        type: 'jsonb',
        isNullable: true,
        comment: 'Extracted data from OCR processing (VAT number, registration number, company name, etc.)',
      }),
    );

    // Add ocr_processed_at column (timestamp when OCR was run)
    await queryRunner.addColumn(
      'customer_documents',
      new TableColumn({
        name: 'ocr_processed_at',
        type: 'timestamp',
        isNullable: true,
        comment: 'Timestamp when OCR processing was performed',
      }),
    );

    // Add ocr_failed column (boolean flag for OCR failure)
    await queryRunner.addColumn(
      'customer_documents',
      new TableColumn({
        name: 'ocr_failed',
        type: 'boolean',
        default: false,
        isNullable: false,
        comment: 'Whether OCR processing failed',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns in reverse order
    await queryRunner.dropColumn('customer_documents', 'ocr_failed');
    await queryRunner.dropColumn('customer_documents', 'ocr_processed_at');
    await queryRunner.dropColumn('customer_documents', 'ocr_extracted_data');
  }
}
