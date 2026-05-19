import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentsNeedReviewToOnboarding1820100000112 implements MigrationInterface {
  name = "AddDocumentsNeedReviewToOnboarding1820100000112";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "supplier_onboarding"
      ADD COLUMN IF NOT EXISTS "documents_need_review" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_onboarding"
      ADD COLUMN IF NOT EXISTS "documents_need_review" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "supplier_onboarding" DROP COLUMN IF EXISTS "documents_need_review"
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_onboarding" DROP COLUMN IF EXISTS "documents_need_review"
    `);
  }
}
