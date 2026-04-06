import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddTemperatureHumidityToDftReadings1815900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'qc_dft_readings' AND column_name = 'temperature'
        ) THEN
          ALTER TABLE qc_dft_readings ADD COLUMN temperature NUMERIC(5,1);
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'qc_dft_readings' AND column_name = 'humidity'
        ) THEN
          ALTER TABLE qc_dft_readings ADD COLUMN humidity NUMERIC(5,1);
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE qc_dft_readings DROP COLUMN IF EXISTS temperature");
    await queryRunner.query("ALTER TABLE qc_dft_readings DROP COLUMN IF EXISTS humidity");
  }
}
