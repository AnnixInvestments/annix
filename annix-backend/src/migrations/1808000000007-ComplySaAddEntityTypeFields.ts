import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaAddEntityTypeFields1808000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "comply_sa_companies"
      ADD COLUMN IF NOT EXISTS "entity_type" VARCHAR(20) NOT NULL DEFAULT 'company',
      ADD COLUMN IF NOT EXISTS "compliance_areas" JSONB,
      ADD COLUMN IF NOT EXISTS "id_number" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "passport_number" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "passport_country" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "sars_tax_reference" VARCHAR(30),
      ADD COLUMN IF NOT EXISTS "date_of_birth" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "trust_registration_number" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "masters_office" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "trustee_count" INT,
      ADD COLUMN IF NOT EXISTS "employee_count_range" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "profile_complete" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "business_address" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "comply_sa_companies"
      DROP COLUMN IF EXISTS "business_address",
      DROP COLUMN IF EXISTS "profile_complete",
      DROP COLUMN IF EXISTS "employee_count_range",
      DROP COLUMN IF EXISTS "trustee_count",
      DROP COLUMN IF EXISTS "masters_office",
      DROP COLUMN IF EXISTS "trust_registration_number",
      DROP COLUMN IF EXISTS "phone",
      DROP COLUMN IF EXISTS "date_of_birth",
      DROP COLUMN IF EXISTS "sars_tax_reference",
      DROP COLUMN IF EXISTS "passport_country",
      DROP COLUMN IF EXISTS "passport_number",
      DROP COLUMN IF EXISTS "id_number",
      DROP COLUMN IF EXISTS "compliance_areas",
      DROP COLUMN IF EXISTS "entity_type"
    `);
  }
}
