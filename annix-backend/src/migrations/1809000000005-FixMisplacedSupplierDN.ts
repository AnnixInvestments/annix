import type { MigrationInterface, QueryRunner } from "typeorm";

export class FixMisplacedSupplierDN1809000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE delivery_notes
      SET extracted_data = jsonb_set(
        extracted_data,
        '{documentType}',
        '"SUPPLIER_DELIVERY"'
      )
      WHERE delivery_number = '42544178'
        AND extracted_data->>'documentType' = 'CUSTOMER_DELIVERY'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE delivery_notes
      SET extracted_data = jsonb_set(
        extracted_data,
        '{documentType}',
        '"CUSTOMER_DELIVERY"'
      )
      WHERE delivery_number = '42544178'
        AND extracted_data->>'documentType' = 'SUPPLIER_DELIVERY'
    `);
  }
}
