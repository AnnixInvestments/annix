import type { MigrationInterface, QueryRunner } from "typeorm";

const DELIVERY_NUMBERS = [
  "IN177257",
  "IN177262",
  "IND60265",
  "IN177278",
  "SDHC3000000029796",
  "SDHC3000000029783",
];

export class FixCustomerDeliveryNoteTypes1807000000048 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const placeholders = DELIVERY_NUMBERS.map((_, i) => `$${i + 1}`).join(", ");
    await queryRunner.query(
      `UPDATE delivery_notes
       SET extracted_data = jsonb_set(
         COALESCE(extracted_data, '{}'::jsonb),
         '{documentType}',
         '"SUPPLIER_DELIVERY"'
       )
       WHERE delivery_number IN (${placeholders})
         AND (extracted_data->>'documentType' = 'CUSTOMER_DELIVERY'
              OR extracted_data->>'documentType' IS NULL)`,
      DELIVERY_NUMBERS,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const placeholders = DELIVERY_NUMBERS.map((_, i) => `$${i + 1}`).join(", ");
    await queryRunner.query(
      `UPDATE delivery_notes
       SET extracted_data = jsonb_set(
         COALESCE(extracted_data, '{}'::jsonb),
         '{documentType}',
         '"CUSTOMER_DELIVERY"'
       )
       WHERE delivery_number IN (${placeholders})`,
      DELIVERY_NUMBERS,
    );
  }
}
