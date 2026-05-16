import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFailedRubberExtractionStatus1820100000107 implements MigrationInterface {
  name = "AddFailedRubberExtractionStatus1820100000107";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // FAILED lets a document whose auto-extraction errored or timed out leave the
    // PENDING state, so the UI shows a clear status and the frontend stops polling it.
    // rubber_tax_invoices.status is a varchar column and needs no enum change.
    await queryRunner.query(
      `ALTER TYPE "delivery_note_status_enum" ADD VALUE IF NOT EXISTS 'FAILED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "coc_processing_status_enum" ADD VALUE IF NOT EXISTS 'FAILED'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot drop a value from an enum type; 'FAILED' is left in place.
  }
}
