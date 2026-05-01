import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAliasesToProductCodingAndDedupeBatches1820100000042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_product_coding
      ADD COLUMN IF NOT EXISTS aliases jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      DELETE FROM rubber_compound_batches a
      USING rubber_compound_batches b
      WHERE a.id > b.id
        AND a.supplier_coc_id = b.supplier_coc_id
        AND a.batch_number = b.batch_number
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_rubber_compound_batches_supplier_coc_batch
      ON rubber_compound_batches (supplier_coc_id, batch_number)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS uq_rubber_compound_batches_supplier_coc_batch");
    await queryRunner.query("ALTER TABLE rubber_product_coding DROP COLUMN IF EXISTS aliases");
  }
}
