import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClearCpoP9911JCs1809000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const cpoRows = await queryRunner.query(
      `SELECT id FROM customer_purchase_orders WHERE cpo_number = 'CPO-P9911-JC025587' LIMIT 1`,
    );
    if (cpoRows.length === 0) return;

    const cpoId = cpoRows[0].id;

    const parentRows = await queryRunner.query(
      "SELECT id FROM job_cards WHERE cpo_id = $1 AND parent_job_card_id IS NULL LIMIT 1",
      [cpoId],
    );
    const parentId = parentRows.length > 0 ? parentRows[0].id : null;

    if (parentId) {
      await queryRunner.query("DELETE FROM job_cards WHERE parent_job_card_id = $1", [parentId]);

      await queryRunner.query("DELETE FROM job_cards WHERE id = $1", [parentId]);
    }

    await queryRunner.query("DELETE FROM job_cards WHERE cpo_id = $1", [cpoId]);

    await queryRunner.query("DELETE FROM customer_purchase_order_items WHERE cpo_id = $1", [cpoId]);

    await queryRunner.query("DELETE FROM cpo_calloff_records WHERE cpo_id = $1", [cpoId]);

    await queryRunner.query("DELETE FROM customer_purchase_orders WHERE id = $1", [cpoId]);
  }

  public async down(): Promise<void> {
    // Data cannot be restored — re-import via Sage JC Dump
  }
}
