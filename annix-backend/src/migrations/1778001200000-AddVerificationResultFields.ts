import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddVerificationResultFields1778001200000 implements MigrationInterface {
  name = "AddVerificationResultFields1778001200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const verificationColumns = [
      new TableColumn({
        name: "verification_confidence",
        type: "decimal",
        precision: 5,
        scale: 4,
        isNullable: true,
      }),
      new TableColumn({
        name: "all_fields_match",
        type: "boolean",
        isNullable: true,
      }),
      new TableColumn({
        name: "field_results",
        type: "jsonb",
        isNullable: true,
      }),
    ];

    for (const column of verificationColumns) {
      await queryRunner.addColumn("customer_documents", column.clone());
      await queryRunner.addColumn("supplier_documents", column.clone());
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnNames = ["field_results", "all_fields_match", "verification_confidence"];

    for (const columnName of columnNames) {
      await queryRunner.dropColumn("customer_documents", columnName);
      await queryRunner.dropColumn("supplier_documents", columnName);
    }
  }
}
