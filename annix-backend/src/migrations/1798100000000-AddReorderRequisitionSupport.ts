import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReorderRequisitionSupport1798100000000 implements MigrationInterface {
  name = "AddReorderRequisitionSupport1798100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE requisitions
        ALTER COLUMN job_card_id DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE requisitions
        ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'job_card'
    `);

    await queryRunner.query(`
      ALTER TABLE requisition_items
        ADD COLUMN quantity_required INTEGER
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE requisition_items
        DROP COLUMN IF EXISTS quantity_required
    `);

    await queryRunner.query(`
      ALTER TABLE requisitions
        DROP COLUMN IF EXISTS source
    `);

    await queryRunner.query(`
      UPDATE requisitions SET job_card_id = 0 WHERE job_card_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE requisitions
        ALTER COLUMN job_card_id SET NOT NULL
    `);
  }
}
