import { MigrationInterface, QueryRunner } from "typeorm";

export class ReconcileDraftJobCardStatuses1809000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE job_cards
      SET status = 'active'
      WHERE status = 'draft'
        AND workflow_status != 'draft'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /* Cannot reliably revert — we don't know which cards were originally draft */
  }
}
