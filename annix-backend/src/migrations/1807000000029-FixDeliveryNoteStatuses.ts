import { MigrationInterface, QueryRunner } from "typeorm";

export class FixDeliveryNoteStatuses1807000000029 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_delivery_notes
      SET status = 'LINKED'
      WHERE linked_coc_id IS NOT NULL
        AND status IN ('PENDING', 'EXTRACTED')
    `);

    await queryRunner.query(`
      UPDATE rubber_delivery_notes
      SET status = 'EXTRACTED'
      WHERE linked_coc_id IS NULL
        AND extracted_data IS NOT NULL
        AND status = 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_delivery_notes
      SET status = 'PENDING'
      WHERE status IN ('EXTRACTED', 'LINKED')
    `);
  }
}
