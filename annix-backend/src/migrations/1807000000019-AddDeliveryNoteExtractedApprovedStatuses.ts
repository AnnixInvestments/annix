import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryNoteExtractedApprovedStatuses1807000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    await queryRunner.query(
      `ALTER TYPE "delivery_note_status_enum" ADD VALUE IF NOT EXISTS 'EXTRACTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "delivery_note_status_enum" ADD VALUE IF NOT EXISTS 'APPROVED'`,
    );
    await queryRunner.startTransaction();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "rubber_delivery_notes" SET "status" = 'PENDING'
      WHERE "status" IN ('EXTRACTED', 'APPROVED')
    `);
  }
}
