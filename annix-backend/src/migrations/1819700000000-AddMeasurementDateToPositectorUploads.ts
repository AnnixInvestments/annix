import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMeasurementDateToPositectorUploads1819700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE positector_uploads
      ADD COLUMN IF NOT EXISTS measurement_date date
    `);

    await queryRunner.query(`
      UPDATE positector_uploads
      SET measurement_date = (substring(header_data->>'Created' from '(\\d{4}-\\d{2}-\\d{2})'))::date
      WHERE measurement_date IS NULL
        AND header_data ? 'Created'
        AND header_data->>'Created' ~ '^\\d{4}-\\d{2}-\\d{2}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE positector_uploads DROP COLUMN IF EXISTS measurement_date
    `);
  }
}
