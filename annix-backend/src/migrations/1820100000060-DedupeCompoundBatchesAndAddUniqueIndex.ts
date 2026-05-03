import { type MigrationInterface, type QueryRunner } from "typeorm";

export class DedupeCompoundBatchesAndAddUniqueIndex1820100000060 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM rubber_compound_batches
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM rubber_compound_batches
        GROUP BY supplier_coc_id, batch_number
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_rubber_compound_batches_coc_batch
        ON rubber_compound_batches (supplier_coc_id, batch_number)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS uq_rubber_compound_batches_coc_batch");
  }
}
