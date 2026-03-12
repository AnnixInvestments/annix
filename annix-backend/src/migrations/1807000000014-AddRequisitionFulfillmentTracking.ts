import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequisitionFulfillmentTracking1807000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE requisition_items
      ADD COLUMN IF NOT EXISTS quantity_received INTEGER NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE requisition_items
      ADD COLUMN IF NOT EXISTS linked_delivery_note_id INTEGER NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE requisition_items DROP COLUMN IF EXISTS linked_delivery_note_id");
    await queryRunner.query("ALTER TABLE requisition_items DROP COLUMN IF EXISTS quantity_received");
  }
}
