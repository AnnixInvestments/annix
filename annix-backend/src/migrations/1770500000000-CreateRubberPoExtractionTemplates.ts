import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateRubberPoExtractionTemplates1770500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "rubber_po_extraction_template",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "company_id",
            type: "int",
          },
          {
            name: "format_hash",
            type: "varchar",
            length: "64",
          },
          {
            name: "template_name",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
          },
          {
            name: "use_count",
            type: "int",
            default: 0,
          },
          {
            name: "success_count",
            type: "int",
            default: 0,
          },
          {
            name: "created_by_user_id",
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

    await queryRunner.createForeignKey(
      "rubber_po_extraction_template",
      new TableForeignKey({
        columnNames: ["company_id"],
        referencedTableName: "rubber_company",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
        name: "FK_rubber_po_extraction_template_company",
      }),
    );

    await queryRunner.createIndex(
      "rubber_po_extraction_template",
      new TableIndex({
        name: "IDX_rubber_po_extraction_template_company_format",
        columnNames: ["company_id", "format_hash"],
        isUnique: false,
      }),
    );

    await queryRunner.createIndex(
      "rubber_po_extraction_template",
      new TableIndex({
        name: "IDX_rubber_po_extraction_template_active",
        columnNames: ["is_active"],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "rubber_po_extraction_region",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "template_id",
            type: "int",
          },
          {
            name: "field_name",
            type: "varchar",
            length: "50",
          },
          {
            name: "region_coordinates",
            type: "jsonb",
          },
          {
            name: "label_coordinates",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "label_text",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "extraction_pattern",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "sample_value",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "confidence_threshold",
            type: "float",
            default: 0.7,
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

    await queryRunner.createForeignKey(
      "rubber_po_extraction_region",
      new TableForeignKey({
        columnNames: ["template_id"],
        referencedTableName: "rubber_po_extraction_template",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
        name: "FK_rubber_po_extraction_region_template",
      }),
    );

    await queryRunner.createIndex(
      "rubber_po_extraction_region",
      new TableIndex({
        name: "IDX_rubber_po_extraction_region_template_field",
        columnNames: ["template_id", "field_name"],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      "rubber_po_extraction_region",
      "IDX_rubber_po_extraction_region_template_field",
    );
    await queryRunner.dropForeignKey(
      "rubber_po_extraction_region",
      "FK_rubber_po_extraction_region_template",
    );
    await queryRunner.dropTable("rubber_po_extraction_region");

    await queryRunner.dropIndex(
      "rubber_po_extraction_template",
      "IDX_rubber_po_extraction_template_active",
    );
    await queryRunner.dropIndex(
      "rubber_po_extraction_template",
      "IDX_rubber_po_extraction_template_company_format",
    );
    await queryRunner.dropForeignKey(
      "rubber_po_extraction_template",
      "FK_rubber_po_extraction_template_company",
    );
    await queryRunner.dropTable("rubber_po_extraction_template");
  }
}
