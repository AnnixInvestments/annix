import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateSupplierCapabilitiesTable1766732000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'supplier_capabilities',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'supplier_profile_id',
            type: 'int',
          },
          {
            name: 'product_category',
            type: 'enum',
            enum: [
              'straight_pipe',
              'bends',
              'flanges',
              'fittings',
              'valves',
              'structural_steel',
              'hdpe',
              'fabrication',
              'coating',
              'inspection',
              'other',
            ],
          },
          {
            name: 'material_specializations',
            type: 'text',
            isArray: true,
            default: '\'{}\'',
          },
          {
            name: 'monthly_capacity_tons',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'size_range_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'pressure_ratings',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'operational_regions',
            type: 'text',
            isArray: true,
            default: '\'{}\'',
          },
          {
            name: 'nationwide_coverage',
            type: 'boolean',
            default: false,
          },
          {
            name: 'international_supply',
            type: 'boolean',
            default: false,
          },
          {
            name: 'certifications',
            type: 'text',
            isArray: true,
            default: '\'{}\'',
          },
          {
            name: 'certification_expiry_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'standard_lead_time_days',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'expedited_lead_time_days',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'minimum_order_value',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'minimum_order_quantity',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'mill_test_certificates',
            type: 'boolean',
            default: false,
          },
          {
            name: 'third_party_inspection',
            type: 'boolean',
            default: false,
          },
          {
            name: 'quality_documentation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'capability_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'last_verified_at',
            type: 'timestamp',
            isNullable: true,
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

    // Add foreign key
    await queryRunner.createForeignKey(
      'supplier_capabilities',
      new TableForeignKey({
        columnNames: ['supplier_profile_id'],
        referencedTableName: 'supplier_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add index for common queries
    await queryRunner.query(`
      CREATE INDEX idx_supplier_capabilities_profile_id
      ON supplier_capabilities(supplier_profile_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_supplier_capabilities_category
      ON supplier_capabilities(product_category)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('supplier_capabilities');
  }
}
