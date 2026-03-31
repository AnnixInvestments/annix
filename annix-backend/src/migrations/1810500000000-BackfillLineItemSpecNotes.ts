import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillLineItemSpecNotes1810500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE job_card_line_items li
      SET notes = jc.notes
      FROM job_cards jc
      WHERE li.job_card_id = jc.id
        AND jc.parent_job_card_id IS NOT NULL
        AND jc.notes IS NOT NULL
        AND jc.notes != ''
        AND (li.notes IS NULL OR li.notes = '')
        AND li.item_description IS NOT NULL
        AND li.item_description != ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE job_card_line_items li
      SET notes = NULL
      FROM job_cards jc
      WHERE li.job_card_id = jc.id
        AND jc.parent_job_card_id IS NOT NULL
        AND li.notes IS NOT NULL
    `);
  }
}
