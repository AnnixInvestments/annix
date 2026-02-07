import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateSecureEntityFolders1780000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "secure_entity_folders",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "entity_type",
            type: "varchar",
            length: "20",
          },
          {
            name: "entity_id",
            type: "int",
          },
          {
            name: "folder_name",
            type: "varchar",
            length: "255",
          },
          {
            name: "secure_folder_path",
            type: "varchar",
            length: "500",
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "deleted_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "deletion_reason",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "secure_entity_folders",
      new TableIndex({
        name: "IDX_secure_entity_folders_entity",
        columnNames: ["entity_type", "entity_id"],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("secure_entity_folders", "IDX_secure_entity_folders_entity");
    await queryRunner.dropTable("secure_entity_folders");
  }
}
