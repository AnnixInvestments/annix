import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPodPageNumbersToDeliveryNotes1807000000045 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_delivery_notes" ADD COLUMN IF NOT EXISTS "pod_page_numbers" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_delivery_notes" DROP COLUMN IF EXISTS "pod_page_numbers"
    `);
  }
}
