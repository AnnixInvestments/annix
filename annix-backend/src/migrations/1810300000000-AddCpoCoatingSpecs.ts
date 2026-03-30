import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCpoCoatingSpecs1810300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_purchase_orders
      ADD COLUMN IF NOT EXISTS coating_specs TEXT
    `);

    await queryRunner.query(`
      UPDATE job_cards jc
      SET notes = ca.raw_notes
      FROM job_card_coating_analyses ca
      WHERE ca.job_card_id = jc.id
        AND jc.is_cpo_calloff = true
        AND jc.notes IS NULL
        AND ca.raw_notes IS NOT NULL
        AND ca.raw_notes != ''
    `);

    await queryRunner.query(`
      UPDATE customer_purchase_orders cpo
      SET coating_specs = sub.specs
      FROM (
        SELECT DISTINCT ON (jc.cpo_id)
          jc.cpo_id,
          jc.notes AS specs
        FROM job_cards jc
        WHERE jc.cpo_id IS NOT NULL
          AND jc.notes IS NOT NULL
          AND jc.notes != ''
          AND jc.parent_job_card_id IS NULL
        ORDER BY jc.cpo_id, jc.id
      ) sub
      WHERE sub.cpo_id = cpo.id
        AND cpo.coating_specs IS NULL
    `);

    await queryRunner.query(`
      UPDATE job_cards child
      SET notes = parent.notes
      FROM job_cards parent
      WHERE child.parent_job_card_id = parent.id
        AND child.is_cpo_calloff = true
        AND child.notes IS NULL
        AND parent.notes IS NOT NULL
        AND parent.notes != ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_purchase_orders
      DROP COLUMN IF EXISTS coating_specs
    `);
  }
}
