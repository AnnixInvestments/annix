import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRfqSequencesTable1769400000000 implements MigrationInterface {
  name = 'CreateRfqSequencesTable1769400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'rfq_sequences',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'year',
            type: 'int',
            isUnique: true,
          },
          {
            name: 'last_sequence',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'rfq_sequences',
      new TableIndex({
        name: 'IDX_rfq_sequences_year',
        columnNames: ['year'],
        isUnique: true,
      }),
    );

    const currentYear = new Date().getFullYear();
    const existingRfqCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM rfqs WHERE rfq_number LIKE 'RFQ-${currentYear}-%'`,
    );
    const count = parseInt(existingRfqCount[0].count, 10) || 0;

    if (count > 0) {
      await queryRunner.query(
        `INSERT INTO rfq_sequences (year, last_sequence) VALUES (${currentYear}, ${count})`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('rfq_sequences', 'IDX_rfq_sequences_year');
    await queryRunner.dropTable('rfq_sequences');
  }
}
