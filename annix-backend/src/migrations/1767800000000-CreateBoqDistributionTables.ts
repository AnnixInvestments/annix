import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateBoqDistributionTables1767800000000 implements MigrationInterface {
  name = 'CreateBoqDistributionTables1767800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create supplier_boq_status enum
    await queryRunner.query(`
      CREATE TYPE "supplier_boq_status_enum" AS ENUM (
        'pending',
        'viewed',
        'quoted',
        'declined',
        'expired'
      )
    `);

    // Create boq_sections table
    await queryRunner.createTable(
      new Table({
        name: 'boq_sections',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'boq_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'section_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'capability_key',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'section_title',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'items',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'total_weight_kg',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'item_count',
            type: 'int',
            default: 0,
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

    // Create indexes for boq_sections
    await queryRunner.createIndex(
      'boq_sections',
      new TableIndex({
        name: 'IDX_boq_sections_boq_id',
        columnNames: ['boq_id'],
      }),
    );

    await queryRunner.createIndex(
      'boq_sections',
      new TableIndex({
        name: 'IDX_boq_sections_capability_key',
        columnNames: ['capability_key'],
      }),
    );

    // Create foreign key for boq_sections -> boqs
    await queryRunner.createForeignKey(
      'boq_sections',
      new TableForeignKey({
        name: 'FK_boq_sections_boq',
        columnNames: ['boq_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'boqs',
        onDelete: 'CASCADE',
      }),
    );

    // Create boq_supplier_access table
    await queryRunner.createTable(
      new Table({
        name: 'boq_supplier_access',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'boq_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'supplier_profile_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'allowed_sections',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'supplier_boq_status_enum',
            default: "'pending'",
          },
          {
            name: 'viewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'responded_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'notification_sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'decline_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'customer_info',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'project_info',
            type: 'jsonb',
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

    // Create indexes for boq_supplier_access
    await queryRunner.createIndex(
      'boq_supplier_access',
      new TableIndex({
        name: 'IDX_boq_supplier_access_boq_id',
        columnNames: ['boq_id'],
      }),
    );

    await queryRunner.createIndex(
      'boq_supplier_access',
      new TableIndex({
        name: 'IDX_boq_supplier_access_supplier_profile_id',
        columnNames: ['supplier_profile_id'],
      }),
    );

    await queryRunner.createIndex(
      'boq_supplier_access',
      new TableIndex({
        name: 'IDX_boq_supplier_access_status',
        columnNames: ['status'],
      }),
    );

    // Create unique constraint (one access record per supplier per BOQ)
    await queryRunner.createIndex(
      'boq_supplier_access',
      new TableIndex({
        name: 'UQ_boq_supplier_access_boq_supplier',
        columnNames: ['boq_id', 'supplier_profile_id'],
        isUnique: true,
      }),
    );

    // Create foreign keys for boq_supplier_access
    await queryRunner.createForeignKey(
      'boq_supplier_access',
      new TableForeignKey({
        name: 'FK_boq_supplier_access_boq',
        columnNames: ['boq_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'boqs',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'boq_supplier_access',
      new TableForeignKey({
        name: 'FK_boq_supplier_access_supplier_profile',
        columnNames: ['supplier_profile_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'supplier_profiles',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('boq_supplier_access', 'FK_boq_supplier_access_supplier_profile');
    await queryRunner.dropForeignKey('boq_supplier_access', 'FK_boq_supplier_access_boq');
    await queryRunner.dropForeignKey('boq_sections', 'FK_boq_sections_boq');

    // Drop tables
    await queryRunner.dropTable('boq_supplier_access');
    await queryRunner.dropTable('boq_sections');

    // Drop enum
    await queryRunner.query(`DROP TYPE "supplier_boq_status_enum"`);
  }
}
