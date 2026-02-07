import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateCustomFieldValuesTable1778004000000 implements MigrationInterface {
  name = "CreateCustomFieldValuesTable1778004000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "custom_field_values",
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
            name: "field_name",
            type: "varchar",
            length: "100",
          },
          {
            name: "field_value",
            type: "text",
            isNullable: true,
          },
          {
            name: "document_category",
            type: "varchar",
            length: "50",
          },
          {
            name: "extracted_from_document_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "confidence",
            type: "decimal",
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: "is_verified",
            type: "boolean",
            default: false,
          },
          {
            name: "verified_by_user_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "custom_field_values",
      new TableIndex({
        name: "IDX_custom_field_values_entity",
        columnNames: ["entity_type", "entity_id"],
      }),
    );

    await queryRunner.createIndex(
      "custom_field_values",
      new TableIndex({
        name: "IDX_custom_field_values_field_name",
        columnNames: ["field_name"],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE nix_extraction_regions
      ADD COLUMN IF NOT EXISTS is_custom_field BOOLEAN DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE nix_extraction_regions
      DROP COLUMN IF EXISTS is_custom_field
    `);

    await queryRunner.dropIndex("custom_field_values", "IDX_custom_field_values_field_name");
    await queryRunner.dropIndex("custom_field_values", "IDX_custom_field_values_entity");
    await queryRunner.dropTable("custom_field_values");
  }
}
