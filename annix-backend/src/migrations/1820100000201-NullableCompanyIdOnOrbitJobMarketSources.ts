import { MigrationInterface, QueryRunner } from "typeorm";

export class NullableCompanyIdOnOrbitJobMarketSources1820100000201 implements MigrationInterface {
  name = "NullableCompanyIdOnOrbitJobMarketSources1820100000201";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      ALTER COLUMN "company_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        fk_name text;
      BEGIN
        SELECT conname INTO fk_name
        FROM pg_constraint
        WHERE conrelid = 'cv_assistant_job_market_sources'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[
            (SELECT attnum FROM pg_attribute
             WHERE attrelid = 'cv_assistant_job_market_sources'::regclass
               AND attname = 'company_id')
          ];
        IF fk_name IS NOT NULL THEN
          EXECUTE format(
            'ALTER TABLE cv_assistant_job_market_sources DROP CONSTRAINT %I',
            fk_name
          );
        END IF;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      ADD CONSTRAINT "FK_cv_assistant_job_market_sources_company_id"
      FOREIGN KEY ("company_id")
      REFERENCES "cv_assistant_companies"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      DROP CONSTRAINT IF EXISTS "FK_cv_assistant_job_market_sources_company_id"
    `);

    await queryRunner.query(`
      UPDATE "cv_assistant_job_market_sources"
      SET "company_id" = (SELECT MIN(id) FROM "cv_assistant_companies")
      WHERE "company_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      ALTER COLUMN "company_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      ADD CONSTRAINT "FK_cv_assistant_job_market_sources_company_id"
      FOREIGN KEY ("company_id")
      REFERENCES "cv_assistant_companies"("id")
      ON DELETE CASCADE
    `);
  }
}
