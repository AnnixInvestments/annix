import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSageContactIdToRubberCompany1804000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_company
      ADD COLUMN IF NOT EXISTS sage_contact_id INTEGER,
      ADD COLUMN IF NOT EXISTS sage_contact_type VARCHAR(20);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_company
      DROP COLUMN IF EXISTS sage_contact_id,
      DROP COLUMN IF EXISTS sage_contact_type;
    `);
  }
}
