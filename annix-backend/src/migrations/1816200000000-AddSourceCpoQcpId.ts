import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourceCpoQcpId1816200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_control_plans
      ADD COLUMN IF NOT EXISTS source_cpo_qcp_id INTEGER REFERENCES qc_control_plans(id) ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE qc_control_plans DROP COLUMN IF EXISTS source_cpo_qcp_id;
    `);
  }
}
