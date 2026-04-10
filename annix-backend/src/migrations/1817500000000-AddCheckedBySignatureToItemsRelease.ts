import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCheckedBySignatureToItemsRelease1817500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_items_releases
      ADD COLUMN IF NOT EXISTS checked_by_signature TEXT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_items_releases
      DROP COLUMN IF EXISTS checked_by_signature
    `);
  }
}
