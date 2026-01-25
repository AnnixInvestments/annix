import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNixExtractionRegionsTable1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'nix_extraction_regions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'document_category',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'field_name',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'region_coordinates',
            type: 'jsonb',
          },
          {
            name: 'extraction_pattern',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'sample_value',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'confidence_threshold',
            type: 'float',
            default: 0.7,
          },
          {
            name: 'use_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'success_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'created_by_user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'nix_extraction_regions',
      new TableIndex({
        name: 'IDX_nix_extraction_regions_category_field',
        columnNames: ['document_category', 'field_name'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'nix_extraction_regions',
      'IDX_nix_extraction_regions_category_field',
    );
    await queryRunner.dropTable('nix_extraction_regions');
  }
}
