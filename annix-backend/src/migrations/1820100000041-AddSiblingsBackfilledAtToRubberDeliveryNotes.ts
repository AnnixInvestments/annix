import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSiblingsBackfilledAtToRubberDeliveryNotes1820100000041
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
      ADD COLUMN IF NOT EXISTS siblings_backfilled_at timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
      DROP COLUMN IF EXISTS siblings_backfilled_at
    `);
  }
}
