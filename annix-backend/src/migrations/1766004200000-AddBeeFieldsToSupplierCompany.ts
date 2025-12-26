import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBeeFieldsToSupplierCompany1766004200000 implements MigrationInterface {
  name = 'AddBeeFieldsToSupplierCompany1766004200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add BEE fields to supplier_companies table
    await queryRunner.addColumn(
      'supplier_companies',
      new TableColumn({
        name: 'bee_level',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'supplier_companies',
      new TableColumn({
        name: 'bee_certificate_expiry',
        type: 'date',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'supplier_companies',
      new TableColumn({
        name: 'bee_verification_agency',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'supplier_companies',
      new TableColumn({
        name: 'is_exempt_micro_enterprise',
        type: 'boolean',
        default: false,
      }),
    );

    // Update supplier_documents enum to include VAT_CERT
    // Note: PostgreSQL requires special handling for enum alterations
    await queryRunner.query(`
      ALTER TYPE supplier_documents_document_type_enum RENAME TO supplier_documents_document_type_enum_old;
    `);

    await queryRunner.query(`
      CREATE TYPE supplier_documents_document_type_enum AS ENUM (
        'registration_cert',
        'vat_cert',
        'tax_clearance',
        'bee_cert',
        'iso_cert',
        'insurance',
        'other'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE supplier_documents
      ALTER COLUMN document_type TYPE supplier_documents_document_type_enum
      USING document_type::text::supplier_documents_document_type_enum;
    `);

    await queryRunner.query(`
      DROP TYPE supplier_documents_document_type_enum_old;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove BEE fields
    await queryRunner.dropColumn('supplier_companies', 'is_exempt_micro_enterprise');
    await queryRunner.dropColumn('supplier_companies', 'bee_verification_agency');
    await queryRunner.dropColumn('supplier_companies', 'bee_certificate_expiry');
    await queryRunner.dropColumn('supplier_companies', 'bee_level');

    // Revert enum
    await queryRunner.query(`
      ALTER TYPE supplier_documents_document_type_enum RENAME TO supplier_documents_document_type_enum_old;
    `);

    await queryRunner.query(`
      CREATE TYPE supplier_documents_document_type_enum AS ENUM (
        'registration_cert',
        'tax_clearance',
        'bee_cert',
        'iso_cert',
        'insurance',
        'other'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE supplier_documents
      ALTER COLUMN document_type TYPE supplier_documents_document_type_enum
      USING document_type::text::supplier_documents_document_type_enum;
    `);

    await queryRunner.query(`
      DROP TYPE supplier_documents_document_type_enum_old;
    `);
  }
}
