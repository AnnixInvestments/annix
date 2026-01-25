import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateWasherTable1772700000000 implements MigrationInterface {
  name = 'CreateWasherTable1772700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Creating washers table...');

    const tableExists = await queryRunner.hasTable('washers');
    if (tableExists) {
      const columns = await queryRunner.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'washers' AND column_name = 'bolt_id'`,
      );
      if (columns.length > 0) {
        console.warn(
          'Washers table already exists with correct schema, skipping creation.',
        );
        return;
      }
      console.warn(
        'Washers table exists with incorrect schema, dropping and recreating...',
      );
      await queryRunner.dropTable('washers');
    }

    await queryRunner.createTable(
      new Table({
        name: 'washers',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'bolt_id',
            type: 'int',
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'material',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'massKg',
            type: 'float',
          },
          {
            name: 'od_mm',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'id_mm',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'thickness_mm',
            type: 'float',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'washers',
      new TableForeignKey({
        columnNames: ['bolt_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bolts',
        onDelete: 'CASCADE',
      }),
    );

    console.warn('Washers table created successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('washers');
  }
}
