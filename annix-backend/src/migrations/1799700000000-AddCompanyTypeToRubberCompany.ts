import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyTypeToRubberCompany1799700000000 implements MigrationInterface {
  name = "AddCompanyTypeToRubberCompany1799700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_company"
      ADD COLUMN "company_type" character varying(20) NOT NULL DEFAULT 'CUSTOMER'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rubber_company"
      DROP COLUMN "company_type"
    `);
  }
}
