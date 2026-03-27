import type { MigrationInterface, QueryRunner } from "typeorm";

export class PopulateJcNumbers1809000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE job_cards jc
      SET jc_number = (
        SELECT SUBSTRING(cpo.cpo_number FROM '-(JC\\d+)$')
        FROM customer_purchase_orders cpo
        WHERE cpo.id = jc.cpo_id
      )
      WHERE jc.jc_number IS NULL
        AND jc.cpo_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM customer_purchase_orders cpo
          WHERE cpo.id = jc.cpo_id
            AND cpo.cpo_number ~ '-(JC\\d+)$'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /* no-op: cannot determine which jc_numbers were set by this migration */
  }
}
