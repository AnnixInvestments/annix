import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaAddTermsAcceptance1808000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "comply_sa_users"
      ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "terms_version" VARCHAR(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "comply_sa_users"
      DROP COLUMN IF EXISTS "terms_version",
      DROP COLUMN IF EXISTS "terms_accepted_at"
    `);
  }
}
