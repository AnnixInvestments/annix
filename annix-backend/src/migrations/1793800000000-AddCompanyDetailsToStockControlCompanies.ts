import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyDetailsToStockControlCompanies1793800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_control_companies"
        ADD COLUMN "registration_number" VARCHAR(50),
        ADD COLUMN "vat_number" VARCHAR(50),
        ADD COLUMN "street_address" VARCHAR(500),
        ADD COLUMN "city" VARCHAR(100),
        ADD COLUMN "province" VARCHAR(50),
        ADD COLUMN "postal_code" VARCHAR(10),
        ADD COLUMN "phone" VARCHAR(30),
        ADD COLUMN "email" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_control_companies"
        DROP COLUMN IF EXISTS "registration_number",
        DROP COLUMN IF EXISTS "vat_number",
        DROP COLUMN IF EXISTS "street_address",
        DROP COLUMN IF EXISTS "city",
        DROP COLUMN IF EXISTS "province",
        DROP COLUMN IF EXISTS "postal_code",
        DROP COLUMN IF EXISTS "phone",
        DROP COLUMN IF EXISTS "email"
    `);
  }
}
