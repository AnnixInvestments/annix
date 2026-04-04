import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobNumberToControlPlans1814100000000 implements MigrationInterface {
  name = "AddJobNumberToControlPlans1814100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_control_plans
      ADD COLUMN IF NOT EXISTS job_number VARCHAR(50)
    `);

    await queryRunner.query(`
      UPDATE qc_control_plans qcp
      SET job_number = jc.job_number,
          job_name = jc.job_name
      FROM job_cards jc
      WHERE qcp.job_card_id = jc.id
        AND qcp.job_number IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_control_plans
      DROP COLUMN IF EXISTS job_number
    `);
  }
}
