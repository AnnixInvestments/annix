import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOcrFieldsToSupplierDocuments1778001100000 implements MigrationInterface {
  name = 'AddOcrFieldsToSupplierDocuments1778001100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'supplier_documents',
      new TableColumn({
        name: 'ocr_extracted_data',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'supplier_documents',
      new TableColumn({
        name: 'ocr_processed_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'supplier_documents',
      new TableColumn({
        name: 'ocr_failed',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('supplier_documents', 'ocr_failed');
    await queryRunner.dropColumn('supplier_documents', 'ocr_processed_at');
    await queryRunner.dropColumn('supplier_documents', 'ocr_extracted_data');
  }
}
