import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryNoteExtractedApprovedStatuses1807000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "delivery_note_status_enum" ADD VALUE IF NOT EXISTS 'EXTRACTED' AFTER 'PENDING';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "delivery_note_status_enum" ADD VALUE IF NOT EXISTS 'APPROVED' AFTER 'EXTRACTED';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "rubber_delivery_notes" SET "status" = 'PENDING'
      WHERE "status" IN ('EXTRACTED', 'APPROVED')
    `);
  }
}
