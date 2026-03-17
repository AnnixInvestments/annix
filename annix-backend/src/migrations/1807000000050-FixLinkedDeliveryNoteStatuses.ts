import { MigrationInterface, QueryRunner } from "typeorm";

export class FixLinkedDeliveryNoteStatuses1807000000050 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`
      UPDATE rubber_delivery_notes
      SET status = 'LINKED'
      WHERE linked_coc_id IS NOT NULL
        AND status != 'LINKED'
        AND status != 'STOCK_CREATED'
    `);
    const count = Array.isArray(result) ? result.length : result?.rowCount || result?.[1] || 0;
    console.log(`[FixLinkedDeliveryNoteStatuses] Updated ${count} delivery notes to LINKED status`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot reliably reverse - we don't know the original statuses
  }
}
