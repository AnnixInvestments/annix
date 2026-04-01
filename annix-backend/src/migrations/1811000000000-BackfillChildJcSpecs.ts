import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillChildJcSpecs1811000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Backfill CPO coatingSpecs from parent JC notes where CPO has no specs
    await queryRunner.query(`
      UPDATE customer_purchase_orders cpo
      SET coating_specs = parent.notes
      FROM job_cards parent
      WHERE parent.cpo_id = cpo.id
        AND parent.parent_job_card_id IS NULL
        AND (cpo.coating_specs IS NULL OR cpo.coating_specs = '')
        AND parent.notes IS NOT NULL
        AND parent.notes != ''
    `);

    // Step 2: Backfill parent JC notes from CPO coatingSpecs where parent has no notes
    await queryRunner.query(`
      UPDATE job_cards parent
      SET notes = cpo.coating_specs
      FROM customer_purchase_orders cpo
      WHERE parent.cpo_id = cpo.id
        AND parent.parent_job_card_id IS NULL
        AND (parent.notes IS NULL OR parent.notes = '')
        AND cpo.coating_specs IS NOT NULL
        AND cpo.coating_specs != ''
    `);

    // Step 3: Backfill parent JC notes from coating analysis if still empty
    await queryRunner.query(`
      UPDATE job_cards jc
      SET notes = ca.raw_notes
      FROM job_card_coating_analyses ca
      WHERE ca.job_card_id = jc.id
        AND jc.is_cpo_calloff = true
        AND jc.parent_job_card_id IS NULL
        AND (jc.notes IS NULL OR jc.notes = '')
        AND ca.raw_notes IS NOT NULL
        AND ca.raw_notes != ''
    `);

    // Step 4: Sync those newly-filled parent notes back to CPO coatingSpecs
    await queryRunner.query(`
      UPDATE customer_purchase_orders cpo
      SET coating_specs = parent.notes
      FROM job_cards parent
      WHERE parent.cpo_id = cpo.id
        AND parent.parent_job_card_id IS NULL
        AND (cpo.coating_specs IS NULL OR cpo.coating_specs = '')
        AND parent.notes IS NOT NULL
        AND parent.notes != ''
    `);

    // Step 5: Propagate parent JC notes to all child JCs missing notes
    await queryRunner.query(`
      UPDATE job_cards child
      SET notes = parent.notes
      FROM job_cards parent
      WHERE child.parent_job_card_id = parent.id
        AND (child.notes IS NULL OR child.notes = '')
        AND parent.notes IS NOT NULL
        AND parent.notes != ''
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
