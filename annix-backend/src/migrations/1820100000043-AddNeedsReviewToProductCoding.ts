import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNeedsReviewToProductCoding1820100000043 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_product_coding
      ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_product_coding_needs_review
      ON rubber_product_coding (needs_review)
      WHERE needs_review = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_product_coding_needs_review");
    await queryRunner.query("ALTER TABLE rubber_product_coding DROP COLUMN IF EXISTS needs_review");
  }
}
