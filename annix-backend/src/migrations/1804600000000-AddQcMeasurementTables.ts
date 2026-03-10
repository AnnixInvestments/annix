import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddQcMeasurementTables1804600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_shore_hardness (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        rubber_spec varchar(255) NOT NULL,
        rubber_batch_number varchar(255),
        required_shore integer NOT NULL,
        readings jsonb NOT NULL,
        averages jsonb NOT NULL,
        reading_date date NOT NULL,
        captured_by_name varchar(255) NOT NULL,
        captured_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_shore_hardness_company
        ON qc_shore_hardness (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_shore_hardness_job_card
        ON qc_shore_hardness (job_card_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_dft_readings (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        coat_type varchar(20) NOT NULL,
        paint_product varchar(255) NOT NULL,
        batch_number varchar(255),
        spec_min_microns numeric(8,2) NOT NULL,
        spec_max_microns numeric(8,2) NOT NULL,
        readings jsonb NOT NULL,
        average_microns numeric(8,2),
        reading_date date NOT NULL,
        captured_by_name varchar(255) NOT NULL,
        captured_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_dft_readings_company
        ON qc_dft_readings (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_dft_readings_job_card
        ON qc_dft_readings (job_card_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_dft_readings_coat_type
        ON qc_dft_readings (job_card_id, coat_type)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_blast_profiles (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        spec_microns numeric(8,2) NOT NULL,
        readings jsonb NOT NULL,
        average_microns numeric(8,2),
        temperature numeric(5,1),
        humidity numeric(5,1),
        reading_date date NOT NULL,
        captured_by_name varchar(255) NOT NULL,
        captured_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_blast_profiles_company
        ON qc_blast_profiles (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_blast_profiles_job_card
        ON qc_blast_profiles (job_card_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_dust_debris_tests (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        tests jsonb NOT NULL,
        reading_date date NOT NULL,
        captured_by_name varchar(255) NOT NULL,
        captured_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_dust_debris_tests_company
        ON qc_dust_debris_tests (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_dust_debris_tests_job_card
        ON qc_dust_debris_tests (job_card_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_pull_tests (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        item_description varchar(255),
        quantity integer,
        solutions jsonb NOT NULL,
        force_gauge jsonb NOT NULL,
        area_readings jsonb NOT NULL,
        comments text,
        reading_date date NOT NULL,
        final_approval_name varchar(255),
        final_approval_date date,
        captured_by_name varchar(255) NOT NULL,
        captured_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_pull_tests_company
        ON qc_pull_tests (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_pull_tests_job_card
        ON qc_pull_tests (job_card_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS qc_pull_tests");
    await queryRunner.query("DROP TABLE IF EXISTS qc_dust_debris_tests");
    await queryRunner.query("DROP TABLE IF EXISTS qc_blast_profiles");
    await queryRunner.query("DROP TABLE IF EXISTS qc_dft_readings");
    await queryRunner.query("DROP TABLE IF EXISTS qc_shore_hardness");
  }
}
