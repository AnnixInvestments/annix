import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExternalJobCanonicalCategory1820100001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cv_assistant_external_jobs
        ADD COLUMN IF NOT EXISTS canonical_category VARCHAR(64)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_external_jobs_canonical_category
        ON cv_assistant_external_jobs (canonical_category)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_external_jobs_canonical_category");
    await queryRunner.query(
      "ALTER TABLE cv_assistant_external_jobs DROP COLUMN IF EXISTS canonical_category",
    );
  }
}
