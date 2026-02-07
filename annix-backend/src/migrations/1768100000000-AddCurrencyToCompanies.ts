import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCurrencyToCompanies1768100000000 implements MigrationInterface {
  name = "AddCurrencyToCompanies1768100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "customer_companies",
      new TableColumn({
        name: "currency_code",
        type: "varchar",
        length: "3",
        default: "'ZAR'",
      }),
    );

    await queryRunner.addColumn(
      "supplier_companies",
      new TableColumn({
        name: "currency_code",
        type: "varchar",
        length: "3",
        default: "'ZAR'",
      }),
    );

    await queryRunner.query(`
      UPDATE customer_companies SET currency_code = 'ZAR' WHERE currency_code IS NULL;
    `);

    await queryRunner.query(`
      UPDATE supplier_companies SET currency_code = 'ZAR' WHERE currency_code IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("supplier_companies", "currency_code");
    await queryRunner.dropColumn("customer_companies", "currency_code");
  }
}
