import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBeeFieldsToCustomerCompany1778001000000 implements MigrationInterface {
  name = "AddBeeFieldsToCustomerCompany1778001000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "customer_companies",
      new TableColumn({
        name: "bee_level",
        type: "int",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "customer_companies",
      new TableColumn({
        name: "bee_certificate_expiry",
        type: "date",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "customer_companies",
      new TableColumn({
        name: "bee_verification_agency",
        type: "varchar",
        length: "255",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "customer_companies",
      new TableColumn({
        name: "is_exempt_micro_enterprise",
        type: "boolean",
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("customer_companies", "is_exempt_micro_enterprise");
    await queryRunner.dropColumn("customer_companies", "bee_verification_agency");
    await queryRunner.dropColumn("customer_companies", "bee_certificate_expiry");
    await queryRunner.dropColumn("customer_companies", "bee_level");
  }
}
