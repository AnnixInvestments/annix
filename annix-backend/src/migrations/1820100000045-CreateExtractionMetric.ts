import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExtractionMetric1820100000045 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS extraction_metric (
        id SERIAL PRIMARY KEY,
        category varchar(64) NOT NULL,
        operation varchar(64) NOT NULL DEFAULT '',
        duration_ms integer NOT NULL,
        payload_size_bytes integer,
        succeeded boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_extraction_metric_lookup
      ON extraction_metric (category, operation, succeeded, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_extraction_metric_lookup");
    await queryRunner.query("DROP TABLE IF EXISTS extraction_metric");
  }
}
