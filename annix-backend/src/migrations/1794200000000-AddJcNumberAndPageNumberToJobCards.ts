import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJcNumberAndPageNumberToJobCards1794200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_cards" ADD COLUMN IF NOT EXISTS "jc_number" VARCHAR(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_cards" ADD COLUMN IF NOT EXISTS "page_number" VARCHAR(50)`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_job_cards_company_job_number"`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_job_cards_company_job_number" ON "job_cards" ("company_id", "job_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_cards_company_job_number"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_job_cards_company_job_number" ON "job_cards" ("company_id", "job_number")`,
    );

    await queryRunner.query(`ALTER TABLE "job_cards" DROP COLUMN IF EXISTS "page_number"`);
    await queryRunner.query(`ALTER TABLE "job_cards" DROP COLUMN IF EXISTS "jc_number"`);
  }
}
