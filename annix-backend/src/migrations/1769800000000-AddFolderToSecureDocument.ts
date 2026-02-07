import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddFolderToSecureDocument1769800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "secure_document",
      new TableColumn({
        name: "folder",
        type: "varchar",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("secure_document", "folder");
  }
}
