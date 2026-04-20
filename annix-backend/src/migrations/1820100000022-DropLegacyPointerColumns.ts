import { MigrationInterface, QueryRunner } from "typeorm";

export class DropLegacyPointerColumns1820100000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies" DROP COLUMN IF EXISTS "legacy_sc_company_id";
      ALTER TABLE "companies" DROP COLUMN IF EXISTS "legacy_rubber_company_id";
      ALTER TABLE "companies" DROP COLUMN IF EXISTS "legacy_comply_company_id";
      ALTER TABLE "companies" DROP COLUMN IF EXISTS "legacy_cv_company_id";

      ALTER TABLE "contacts" DROP COLUMN IF EXISTS "legacy_sc_supplier_id";
      ALTER TABLE "contacts" DROP COLUMN IF EXISTS "legacy_rubber_company_id";

      ALTER TABLE "stock_control_profiles" DROP COLUMN IF EXISTS "legacy_sc_user_id";
      ALTER TABLE "cv_assistant_profiles" DROP COLUMN IF EXISTS "legacy_cv_user_id";
      ALTER TABLE "comply_sa_profiles" DROP COLUMN IF EXISTS "legacy_comply_user_id";

      ALTER TABLE "user" DROP COLUMN IF EXISTS "password";
      ALTER TABLE "user" DROP COLUMN IF EXISTS "salt";

      DROP INDEX IF EXISTS "idx_companies_legacy_sc_company_id";
      DROP INDEX IF EXISTS "idx_companies_legacy_rubber_company_id";
      DROP INDEX IF EXISTS "idx_companies_legacy_comply_company_id";
      DROP INDEX IF EXISTS "idx_companies_legacy_cv_company_id";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "legacy_sc_company_id" integer;
      ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "legacy_rubber_company_id" integer;
      ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "legacy_comply_company_id" integer;
      ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "legacy_cv_company_id" integer;

      ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "legacy_sc_supplier_id" integer;
      ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "legacy_rubber_company_id" integer;

      ALTER TABLE "stock_control_profiles" ADD COLUMN IF NOT EXISTS "legacy_sc_user_id" integer;
      ALTER TABLE "cv_assistant_profiles" ADD COLUMN IF NOT EXISTS "legacy_cv_user_id" integer;
      ALTER TABLE "comply_sa_profiles" ADD COLUMN IF NOT EXISTS "legacy_comply_user_id" integer;

      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password" varchar;
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "salt" varchar;
    `);
  }
}
