import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserCompanyAndSeedAuIndustriesTenant1820100002200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS company_id integer NULL
    `);
    await queryRunner.query(`
      INSERT INTO companies (name)
      SELECT 'AU Industries'
      WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'AU Industries')
    `);
    await queryRunner.query(`
      INSERT INTO module_license (company_id, module_key, tier, active)
      SELECT c.id, 'au-rubber', 'complete', true
      FROM companies c
      WHERE c.name = 'AU Industries'
        AND NOT EXISTS (
          SELECT 1 FROM module_license ml
          WHERE ml.company_id = c.id AND ml.module_key = 'au-rubber'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM module_license
      WHERE module_key = 'au-rubber'
        AND company_id IN (SELECT id FROM companies WHERE name = 'AU Industries')
    `);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS company_id`);
  }
}
