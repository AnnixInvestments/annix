import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDocumentStorageConsent1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'customer_profiles',
      new TableColumn({
        name: 'document_storage_accepted_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'supplier_profiles',
      new TableColumn({
        name: 'document_storage_accepted_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('customer_profiles', 'document_storage_accepted_at');
    await queryRunner.dropColumn('supplier_profiles', 'document_storage_accepted_at');
  }
}
