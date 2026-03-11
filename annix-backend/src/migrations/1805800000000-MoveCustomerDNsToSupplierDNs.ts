import { MigrationInterface, QueryRunner } from "typeorm";

export class MoveCustomerDNsToSupplierDNs1805800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const deliveryNumbers = [
      "SDHC3000000029790",
      "SDHC3000000029664",
      "1306",
      "42378331",
      "D08505",
      "3090",
      "42372888",
      "42445465",
      "SDHC3000000029712",
      "SDHC3000000029740",
    ];

    const placeholders = deliveryNumbers.map((_dn, i) => `$${i + 1}`).join(", ");

    await queryRunner.query(
      `UPDATE delivery_notes
       SET extracted_data = jsonb_set(
         extracted_data,
         '{documentType}',
         '"SUPPLIER_DELIVERY"'
       )
       WHERE delivery_number IN (${placeholders})
         AND extracted_data->>'documentType' = 'CUSTOMER_DELIVERY'`,
      deliveryNumbers,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const deliveryNumbers = [
      "SDHC3000000029790",
      "SDHC3000000029664",
      "1306",
      "42378331",
      "D08505",
      "3090",
      "42372888",
      "42445465",
      "SDHC3000000029712",
      "SDHC3000000029740",
    ];

    const placeholders = deliveryNumbers.map((_dn, i) => `$${i + 1}`).join(", ");

    await queryRunner.query(
      `UPDATE delivery_notes
       SET extracted_data = jsonb_set(
         extracted_data,
         '{documentType}',
         '"CUSTOMER_DELIVERY"'
       )
       WHERE delivery_number IN (${placeholders})
         AND extracted_data->>'documentType' = 'SUPPLIER_DELIVERY'`,
      deliveryNumbers,
    );
  }
}
