import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePvcTables1766004000000 implements MigrationInterface {
  name = 'CreatePvcTables1766004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create pvc_standards table
    await queryRunner.createTable(
      new Table({
        name: 'pvc_standards',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'code', type: 'varchar', length: '50', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'pvc_type', type: 'varchar', length: '20' },
          { name: 'region', type: 'varchar', length: '100', isNullable: true },
          { name: 'application', type: 'varchar', length: '200', isNullable: true },
          { name: 'display_order', type: 'int', default: 0 },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Create pvc_pipe_specifications table
    await queryRunner.createTable(
      new Table({
        name: 'pvc_pipe_specifications',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'nominal_diameter', type: 'int' },
          { name: 'outer_diameter', type: 'decimal', precision: 8, scale: 2 },
          { name: 'pressure_rating', type: 'decimal', precision: 6, scale: 2 },
          { name: 'wall_thickness', type: 'decimal', precision: 8, scale: 3 },
          { name: 'inner_diameter', type: 'decimal', precision: 8, scale: 3 },
          { name: 'weight_kg_per_m', type: 'decimal', precision: 10, scale: 4 },
          { name: 'pvc_type', type: 'varchar', length: '20', default: "'PVC-U'" },
          { name: 'standard', type: 'varchar', length: '50', default: "'EN_1452'" },
          { name: 'display_order', type: 'int', default: 0 },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        uniques: [
          { columnNames: ['nominal_diameter', 'pressure_rating', 'pvc_type'] },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'pvc_pipe_specifications',
      new TableIndex({ name: 'IDX_pvc_pipe_specs_dn', columnNames: ['nominal_diameter'] }),
    );
    await queryRunner.createIndex(
      'pvc_pipe_specifications',
      new TableIndex({ name: 'IDX_pvc_pipe_specs_pn', columnNames: ['pressure_rating'] }),
    );

    // Create pvc_fitting_types table
    await queryRunner.createTable(
      new Table({
        name: 'pvc_fitting_types',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'code', type: 'varchar', length: '50', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'num_joints', type: 'int', default: 0 },
          { name: 'is_socket', type: 'boolean', default: true },
          { name: 'is_flanged', type: 'boolean', default: false },
          { name: 'is_threaded', type: 'boolean', default: false },
          { name: 'category', type: 'varchar', length: '50', isNullable: true },
          { name: 'angle_degrees', type: 'int', isNullable: true },
          { name: 'display_order', type: 'int', default: 0 },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Create pvc_fitting_weights table
    await queryRunner.createTable(
      new Table({
        name: 'pvc_fitting_weights',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'fitting_type_id', type: 'int' },
          { name: 'nominal_diameter', type: 'int' },
          { name: 'pressure_rating', type: 'decimal', precision: 6, scale: 2, default: 10 },
          { name: 'weight_kg', type: 'decimal', precision: 10, scale: 4 },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        uniques: [
          { columnNames: ['fitting_type_id', 'nominal_diameter', 'pressure_rating'] },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'pvc_fitting_weights',
      new TableForeignKey({
        name: 'FK_pvc_fitting_weights_type',
        columnNames: ['fitting_type_id'],
        referencedTableName: 'pvc_fitting_types',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create pvc_cement_prices table
    await queryRunner.createTable(
      new Table({
        name: 'pvc_cement_prices',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'nominal_diameter', type: 'int', isUnique: true },
          { name: 'price_per_joint', type: 'decimal', precision: 10, scale: 2 },
          { name: 'cement_volume_ml', type: 'decimal', precision: 8, scale: 2, isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pvc_cement_prices');
    await queryRunner.dropTable('pvc_fitting_weights');
    await queryRunner.dropTable('pvc_fitting_types');
    await queryRunner.dropTable('pvc_pipe_specifications');
    await queryRunner.dropTable('pvc_standards');
  }
}
